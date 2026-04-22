import "server-only";

import type { BusinessSettings } from "@/lib/config";
import type { MarketDataSnapshot } from "@/lib/market-data";

function parseChileanNumber(value: unknown) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

async function fetchMindicadorUf(): Promise<MarketDataSnapshot> {
  const response = await fetch("https://mindicador.cl/api/uf", {
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`mindicador respondio ${response.status}`);
  }

  const payload = (await response.json()) as {
    serie?: Array<{ fecha?: string; valor?: number }>;
  };
  const latest = payload.serie?.[0];

  if (!latest?.valor || !latest.fecha) {
    throw new Error("mindicador no devolvio UF utilizable");
  }

  return {
    ufValue: latest.valor,
    ufDate: latest.fecha,
    ufSource: "mindicador",
    ufLabel: "mindicador.cl",
    warning: null,
    fetchedAt: new Date().toISOString(),
  };
}

async function fetchCmfUf(apiKey: string): Promise<MarketDataSnapshot> {
  const url = new URL("https://api.cmfchile.cl/api-sbifv3/recursos_api/uf");
  url.searchParams.set("apikey", apiKey);
  url.searchParams.set("formato", "json");

  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`CMF respondio ${response.status}`);
  }

  const payload = (await response.json()) as {
    UFs?: Array<{ Valor?: string; Fecha?: string }>;
  };
  const latest = payload.UFs?.[0];
  const ufValue = parseChileanNumber(latest?.Valor);

  if (!ufValue || !latest?.Fecha) {
    throw new Error("CMF no devolvio UF utilizable");
  }

  return {
    ufValue,
    ufDate: latest.Fecha,
    ufSource: "cmf",
    ufLabel: "CMF Chile",
    warning: null,
    fetchedAt: new Date().toISOString(),
  };
}

export async function loadMarketData(settings: BusinessSettings): Promise<MarketDataSnapshot> {
  if (settings.externalData.ufMode === "manual") {
    return {
      ufValue: settings.externalData.manualUfValue,
      ufDate: null,
      ufSource: "manual",
      ufLabel: "Valor manual",
      warning: null,
      fetchedAt: new Date().toISOString(),
    };
  }

  if (settings.externalData.ufApiSource === "cmf") {
    const apiKey = process.env.CMF_API_KEY;

    if (apiKey) {
      try {
        return await fetchCmfUf(apiKey);
      } catch (error) {
        const fallback = await fetchMindicadorUf();
        return {
          ...fallback,
          warning:
            error instanceof Error
              ? `No se pudo usar CMF; se utilizo fallback publico (${error.message}).`
              : "No se pudo usar CMF; se utilizo fallback publico.",
        };
      }
    }
  }

  try {
    return await fetchMindicadorUf();
  } catch (error) {
    return {
      ufValue: settings.externalData.manualUfValue,
      ufDate: null,
      ufSource: "manual",
      ufLabel: "Valor manual de respaldo",
      warning:
        error instanceof Error
          ? `No se pudo consultar UF en linea; se uso valor manual (${error.message}).`
          : "No se pudo consultar UF en linea; se uso valor manual.",
      fetchedAt: new Date().toISOString(),
    };
  }
}
