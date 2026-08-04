import type { BusinessSettings } from "@/lib/config";

export type MarketDataSnapshot = {
  ufValue: number | null;
  ufDate: string | null;
  ufSource: "manual" | "mindicador" | "cmf";
  ufLabel: string;
  warning: string | null;
  fetchedAt: string;
};

export function createFallbackMarketData(
  settings: Pick<BusinessSettings, "externalData">,
  warning = "No se pudo actualizar la UF. Se está usando el valor local de respaldo.",
): MarketDataSnapshot {
  return {
    ufValue: settings.externalData.manualUfValue,
    ufDate: null,
    ufSource: "manual",
    ufLabel: "Valor local de respaldo",
    warning,
    fetchedAt: new Date().toISOString(),
  };
}
