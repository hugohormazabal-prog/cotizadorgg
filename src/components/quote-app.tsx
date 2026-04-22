"use client";

import type {
  ComponentType,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BatteryCharging,
  Cable,
  CircleDollarSign,
  FileText,
  Gauge,
  LineChart,
  Mail,
  MapPinned,
  Phone,
  RotateCcw,
  Settings2,
  ShieldCheck,
  Sun,
  UserRound,
  Wrench,
} from "lucide-react";
import { ROOF_PRESETS } from "@/lib/config";
import type { MarketDataSnapshot } from "@/lib/market-data";
import {
  buildQuote,
  defaultTechnicalConfig,
  getAvailableBatteryNames,
  getAvailableGeneratorNames,
  getAllServiceNames,
  getAvailableInverterNames,
  getAvailableServiceNames,
  getAvailableStructureNames,
} from "@/lib/quote-engine";
import { cn, formatCurrency, formatNumber } from "@/lib/utils";
import { useQuoteStore } from "@/store/quote-store";

type QuoteAppMode = "client" | "advisor" | "settings";

const serviceOptions = getAvailableServiceNames();
const allServiceOptions = getAllServiceNames();
const batteryOptions = getAvailableBatteryNames();
const generatorOptions = getAvailableGeneratorNames();
const inverterOptions = getAvailableInverterNames();
const structureOptions = getAvailableStructureNames();

export function QuoteApp({ mode }: { mode: QuoteAppMode }) {
  const {
    hydrated,
    settings,
    quickStart,
    technical,
    customer,
    replaceSettings,
    updateSettings,
    updateQuickStart,
    updateTechnical,
    updateCustomer,
    reset,
    resetSettings,
  } = useQuoteStore();
  const [marketData, setMarketData] = useState<MarketDataSnapshot | null>(null);
  const [bootstrapError, setBootstrapError] = useState("");
  const [settingsSaveState, setSettingsSaveState] = useState<{
    status: "idle" | "saving" | "saved" | "error";
    message: string;
  }>({
    status: "idle",
    message: "",
  });

  useEffect(() => {
    let cancelled = false;

    async function loadRemoteConfig() {
      try {
        const endpoint = mode === "settings" ? "/api/admin/config" : "/api/public-config";
        const response = await fetch(endpoint, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`No se pudo cargar configuración remota (${response.status}).`);
        }

        const payload = (await response.json()) as {
          settings: ReturnType<typeof useQuoteStore.getState>["settings"];
          marketData: MarketDataSnapshot;
        };

        if (cancelled) {
          return;
        }

        replaceSettings(payload.settings);
        setMarketData(payload.marketData);
        setBootstrapError("");
      } catch (error) {
        if (cancelled) {
          return;
        }

        setBootstrapError(
          error instanceof Error
            ? error.message
            : "No se pudo sincronizar la configuración remota.",
        );
      }
    }

    void loadRemoteConfig();

    return () => {
      cancelled = true;
    };
  }, [mode, replaceSettings]);

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-slate-100 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-4">
          <div className="h-28 animate-pulse rounded-2xl bg-white" />
          <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="h-[30rem] animate-pulse rounded-2xl bg-white" />
            <div className="h-[30rem] animate-pulse rounded-2xl bg-white" />
          </div>
        </div>
      </div>
    );
  }

  const normalizedTechnical = {
    ...defaultTechnicalConfig,
    ...technical,
  };
  const syncedTechnical =
    ((normalizedTechnical.dcRunMeters === 20 &&
      normalizedTechnical.inverterToBoardMeters === 10 &&
      normalizedTechnical.boardToMeterMeters === 1) ||
      (normalizedTechnical.dcRunMeters === 15 &&
        normalizedTechnical.inverterToBoardMeters === 15 &&
        normalizedTechnical.boardToMeterMeters === 15))
      ? {
          ...normalizedTechnical,
          dcRunMeters: settings.defaultDcRunMeters,
          inverterToBoardMeters: settings.defaultInverterToBoardMeters,
          boardToMeterMeters: settings.defaultBoardToMeterMeters,
        }
      : normalizedTechnical;

  let quote: ReturnType<typeof buildQuote>;

  try {
    quote = buildQuote(quickStart, syncedTechnical, settings, marketData);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";

    return (
      <div className="min-h-screen bg-slate-100 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-red-700">Error controlado</p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-2xl tracking-tight text-slate-950">
            La propuesta no pudo calcularse
          </h1>
          <pre className="mt-5 overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            {message}
          </pre>
          <div className="mt-5">
            <SecondaryButton onClick={() => reset()}>
              <RotateCcw className="h-4 w-4" />
              Limpiar estado persistido
            </SecondaryButton>
          </div>
        </div>
      </div>
    );
  }

  const summaryMessage = [
    `${settings.companyName} - propuesta solar preliminar`,
    `Región: ${quote.region.label}`,
    `Sistema sugerido: ${quote.panelCount} paneles y ${formatNumber(quote.installedPowerKw, 2)} kWp`,
    `Ahorro mensual estimado: ${formatCurrency(quote.monthlySavings)}`,
    `Inversión estimada: ${formatCurrency(quote.totals.grossSale)} IVA incluido`,
    quote.finance
      ? `Pago mensual referencial: ${formatCurrency(quote.finance.monthlyInstallmentClp)}`
      : null,
    `Contacto: ${settings.contactPhone} / ${settings.contactEmail}`,
  ]
    .filter(Boolean)
    .join("\n");

  async function handleSaveSettings() {
    try {
      setSettingsSaveState({
        status: "saving",
        message: "Guardando configuración pública...",
      });

      const response = await fetch("/api/admin/config", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ settings }),
      });

      if (!response.ok) {
        throw new Error(`No se pudo guardar (${response.status}).`);
      }

      const payload = (await response.json()) as {
        settings: ReturnType<typeof useQuoteStore.getState>["settings"];
        marketData: MarketDataSnapshot;
      };

      replaceSettings(payload.settings);
      setMarketData(payload.marketData);
      setSettingsSaveState({
        status: "saved",
        message: "Configuración pública actualizada.",
      });
    } catch (error) {
      setSettingsSaveState({
        status: "error",
        message:
          error instanceof Error ? error.message : "No se pudo guardar la configuración.",
      });
    }
  }

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(summaryMessage)}`;
  const mailtoHref = `mailto:${settings.contactEmail}?subject=${encodeURIComponent(
    "Quiero mi propuesta solar",
  )}&body=${encodeURIComponent(summaryMessage)}`;

  return (
    <div className={getShellClass(mode)}>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
        <header className={getHeaderClass(mode)}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className={getEyebrowClass(mode)}>
                {settings.companyName}
              </p>
              <h1 className={getHeroTitleClass(mode)}>
                {mode === "client" ? settings.customerHeroTitle : getInternalTitle(mode)}
              </h1>
              <p className={getHeroDescriptionClass(mode)}>
                {mode === "client"
                  ? settings.customerHeroDescription
                  : getInternalDescription(mode)}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 md:min-w-[340px]">
              <MiniStat
                icon={Sun}
                label="Potencia"
                value={`${formatNumber(quote.installedPowerKw, 2)} kWp`}
              />
              <MiniStat
                icon={CircleDollarSign}
                label="Total estimado"
                value={formatCurrency(quote.totals.grossSale)}
              />
              <MiniStat
                icon={LineChart}
                label="Ahorro mensual"
                value={formatCurrency(quote.monthlySavings)}
              />
              <MiniStat
                icon={ShieldCheck}
                label="Cobertura"
                value={`${formatNumber(quote.offsetPercent * 100)}%`}
              />
            </div>
          </div>

          {mode !== "client" ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <InternalLink href="/asesor" active={mode === "advisor"}>
                <Wrench className="h-4 w-4" />
                Vista asesor
              </InternalLink>
              <InternalLink href="/admin/cotizador" active={mode === "settings"}>
                <Settings2 className="h-4 w-4" />
                Configuración GGelectrics
              </InternalLink>
              <InternalLink href="/" active={false}>
                <UserRound className="h-4 w-4" />
                Ver sitio público
              </InternalLink>
            </div>
          ) : null}

          {bootstrapError ? (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {bootstrapError}
            </div>
          ) : null}
        </header>

        {mode === "client" ? (
          <ClientView
            quote={quote}
            quickStart={quickStart}
            settings={settings}
            updateQuickStart={updateQuickStart}
            whatsappHref={whatsappHref}
            mailtoHref={mailtoHref}
          />
        ) : null}

        {mode === "advisor" ? (
          <AdvisorView
            quote={quote}
            settings={settings}
            quickStart={quickStart}
            technical={syncedTechnical}
            customer={customer}
            marketData={marketData}
            updateQuickStart={updateQuickStart}
            updateTechnical={updateTechnical}
            updateCustomer={updateCustomer}
            whatsappHref={whatsappHref}
            mailtoHref={mailtoHref}
          />
        ) : null}

        {mode === "settings" ? (
          <SettingsView
            settings={settings}
            marketData={marketData}
            updateSettings={updateSettings}
            resetSettings={resetSettings}
            resetQuote={reset}
            saveSettings={handleSaveSettings}
            settingsSaveState={settingsSaveState}
          />
        ) : null}
      </div>
    </div>
  );
}

function ClientView({
  quote,
  quickStart,
  settings,
  updateQuickStart,
  whatsappHref,
  mailtoHref,
}: {
  quote: ReturnType<typeof buildQuote>;
  quickStart: ReturnType<typeof useQuoteStore.getState>["quickStart"];
  settings: ReturnType<typeof useQuoteStore.getState>["settings"];
  updateQuickStart: ReturnType<typeof useQuoteStore.getState>["updateQuickStart"];
  whatsappHref: string;
  mailtoHref: string;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[0.92fr_1.08fr] lg:items-start">
      <Card className="border-emerald-100 bg-white/95 shadow-md shadow-emerald-950/5">
        <SectionHeader
          eyebrow="Paso 1 de 2"
          title="Calcula tu potencial solar"
          description="Ingresa lo que tienes a mano. No necesitas saber de paneles ni revisar tu tablero eléctrico para partir."
        />

        <div className="mt-5 grid gap-4">
          <Field label="¿Qué quieres ingresar?">
            <div className="grid grid-cols-2 gap-2">
              <ToggleButton
                active={quickStart.mode === "bill"}
                onClick={() => updateQuickStart({ mode: "bill" })}
              >
                Gasto mensual
              </ToggleButton>
              <ToggleButton
                active={quickStart.mode === "kwh"}
                onClick={() => updateQuickStart({ mode: "kwh" })}
              >
                Consumo en kWh
              </ToggleButton>
            </div>
          </Field>

          <Field
            label={
              quickStart.mode === "bill"
                ? "¿Cuánto pagas al mes?"
                : "¿Cuántos kWh consumes al mes?"
            }
            hint={
              quickStart.mode === "bill"
                ? "Si no sabes tu consumo, usa el monto de tu cuenta."
                : "Si lo ves en tu boleta, puedes ingresarlo directo."
            }
          >
            <Input
              type="number"
              min={0}
              value={quickStart.amount}
              onChange={(event) =>
                updateQuickStart({ amount: Number(event.target.value || 0) })
              }
            />
          </Field>

          <Field label="¿Dónde está tu propiedad?">
            <Select
              value={quickStart.regionId}
              onChange={(event) => updateQuickStart({ regionId: event.target.value })}
            >
              {settings.regions.map((region) => (
                <option key={region.id} value={region.id}>
                  {region.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="¿Qué tipo de techo tienes?">
            <Select
              value={quickStart.roofTypeId}
              onChange={(event) => updateQuickStart({ roofTypeId: event.target.value })}
            >
              {ROOF_PRESETS.map((roof) => (
                <option key={roof.id} value={roof.id}>
                  {roof.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="mt-6 grid gap-2 sm:grid-cols-3">
          <ClientTrustPill label="Sin visita inicial" value="Estimación inmediata" />
          <ClientTrustPill label="Datos simples" value="Boleta o kWh" />
          <ClientTrustPill label="Revisión humana" value="Asesor GGelectrics" />
        </div>
      </Card>

      <Card className="overflow-hidden border-slate-200 bg-white p-0 shadow-md shadow-slate-950/10">
        <div className="border-b border-slate-800 bg-[#12251f] p-5 text-white md:p-6">
          <SectionHeader
            eyebrow="Resultado preliminar"
            title="Tu sistema recomendado"
            description="Una primera lectura para saber tamaño, ahorro e inversión antes de hablar con un asesor."
            tone="dark"
          />

          <div className="mt-5 rounded-2xl border border-white/20 bg-white/[0.08] p-5">
            <p className="text-sm font-medium text-emerald-100">Potencia sugerida</p>
            <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
              <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-tight text-white sm:text-3xl">
                {formatNumber(quote.installedPowerKw, 2)} kWp
              </h2>
              <span className="rounded-xl bg-emerald-300 px-3 py-1.5 text-sm font-bold text-emerald-950">
                {quote.panelCount} paneles
              </span>
            </div>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <HighlightStat
              icon={Gauge}
              label="Consumo estimado"
              value={`${formatNumber(quote.monthlyConsumptionKwh)} kWh/mes`}
            />
            <HighlightStat
              icon={Sun}
              label="Paneles sugeridos"
              value={`${quote.panelCount} paneles`}
            />
            <HighlightStat
              icon={LineChart}
              label="Ahorro estimado"
              value={formatCurrency(quote.monthlySavings)}
            />
            <HighlightStat
              icon={CircleDollarSign}
              label="Inversión estimada"
              value={formatCurrency(quote.totals.grossSale)}
            />
            {quote.finance ? (
              <HighlightStat
                icon={CircleDollarSign}
                label="Pago mensual ref."
                value={formatCurrency(quote.finance.monthlyInstallmentClp)}
              />
            ) : null}
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/30 p-5 text-white">
            <p className="text-sm font-semibold text-emerald-100">Qué considera esta estimación</p>
            <div className="mt-4 space-y-3 text-sm text-slate-200">
              <InfoRow
                icon={Sun}
                label="Paneles"
                value={`${quote.panelCount} x ${quote.selectedPanel.watts} W`}
              />
              <InfoRow icon={Gauge} label="Inversor" value={quote.selectedInverter.name} />
              <InfoRow icon={MapPinned} label="Región" value={quote.region.label} />
              <InfoRow
                icon={Cable}
                label="Cobertura estimada"
                value={`${formatNumber(quote.offsetPercent * 100)}% de tu cuenta`}
              />
            </div>
          </div>
        </div>

        <div className="bg-white p-5 text-slate-950 md:p-6">
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
            <p className="text-sm leading-6 text-emerald-950">{settings.proposalCallout}</p>
          </div>

          {quote.finance ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">Opción de pago referencial</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Para evaluar financiamiento, el pago mensual estimado sería desde{" "}
                <span className="font-semibold text-slate-950">
                  {formatCurrency(quote.finance.monthlyInstallmentClp)}
                </span>
                . El detalle final lo confirma el equipo comercial según perfil y condiciones
                vigentes.
              </p>
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-2">
            <LinkButton href={whatsappHref}>
              <Phone className="h-4 w-4" />
              Quiero que me contacten
            </LinkButton>
            <LinkButton href={mailtoHref}>
              <Mail className="h-4 w-4" />
              Recibir por correo
            </LinkButton>
          </div>
        </div>
      </Card>
    </div>
  );
}

function AdvisorView({
  quote,
  settings,
  quickStart,
  technical,
  customer,
  marketData,
  updateQuickStart,
  updateTechnical,
  updateCustomer,
  whatsappHref,
  mailtoHref,
}: {
  quote: ReturnType<typeof buildQuote>;
  settings: ReturnType<typeof useQuoteStore.getState>["settings"];
  quickStart: ReturnType<typeof useQuoteStore.getState>["quickStart"];
  technical: ReturnType<typeof useQuoteStore.getState>["technical"];
  customer: ReturnType<typeof useQuoteStore.getState>["customer"];
  marketData: MarketDataSnapshot | null;
  updateQuickStart: ReturnType<typeof useQuoteStore.getState>["updateQuickStart"];
  updateTechnical: ReturnType<typeof useQuoteStore.getState>["updateTechnical"];
  updateCustomer: ReturnType<typeof useQuoteStore.getState>["updateCustomer"];
  whatsappHref: string;
  mailtoHref: string;
}) {
  return (
    <>
      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr_0.8fr]">
        <AdvisorCommandCard
          title="Estado de propuesta"
          value={quote.warnings.length > 0 ? "Requiere revisión" : "Lista para enviar"}
          caption={`${quote.lineItems.length} partidas calculadas · ${formatCurrency(quote.totals.grossSale)} final`}
        />
        <AdvisorCommandCard
          title="Margen directo"
          value={`${formatNumber(((quote.totals.netSale - quote.totals.cost) / Math.max(quote.totals.netSale, 1)) * 100, 1)}%`}
          caption="Antes de IVA, según configuración vigente"
        />
        <AdvisorCommandCard
          title="Payback estimado"
          value={`${formatNumber(quote.paybackYears, 1)} años`}
          caption={`${formatCurrency(quote.annualSavings)} de ahorro anual`}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-blue-100 bg-[#f8fbff] shadow-sm">
          <SectionHeader
            eyebrow="Base comercial"
            title="Datos del cliente y propuesta"
            description="Aquí parte la propuesta pública y luego puedes afinarla antes de cerrar."
          />

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Field label="Entrada principal">
              <div className="grid grid-cols-2 gap-2">
                <ToggleButton
                  active={quickStart.mode === "bill"}
                  onClick={() => updateQuickStart({ mode: "bill" })}
                >
                  Gasto mensual
                </ToggleButton>
                <ToggleButton
                  active={quickStart.mode === "kwh"}
                  onClick={() => updateQuickStart({ mode: "kwh" })}
                >
                  Consumo kWh
                </ToggleButton>
              </div>
            </Field>

            <Field label={quickStart.mode === "bill" ? "Monto mensual" : "Consumo mensual"}>
              <Input
                type="number"
                min={0}
                value={quickStart.amount}
                onChange={(event) =>
                  updateQuickStart({ amount: Number(event.target.value || 0) })
                }
              />
            </Field>

            <Field label="Región">
              <Select
                value={quickStart.regionId}
                onChange={(event) => updateQuickStart({ regionId: event.target.value })}
              >
                {settings.regions.map((region) => (
                  <option key={region.id} value={region.id}>
                    {region.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Tipo de techo">
              <Select
                value={quickStart.roofTypeId}
                onChange={(event) => updateQuickStart({ roofTypeId: event.target.value })}
              >
                {ROOF_PRESETS.map((roof) => (
                  <option key={roof.id} value={roof.id}>
                    {roof.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Nombre cliente">
              <Input
                value={customer.customerName}
                onChange={(event) => updateCustomer({ customerName: event.target.value })}
              />
            </Field>
            <Field label="Empresa">
              <Input
                value={customer.companyName}
                onChange={(event) => updateCustomer({ companyName: event.target.value })}
              />
            </Field>
            <Field label="Dirección">
              <Input
                value={customer.address}
                onChange={(event) => updateCustomer({ address: event.target.value })}
              />
            </Field>
            <Field label="Teléfono">
              <Input
                value={customer.phone}
                onChange={(event) => updateCustomer({ phone: event.target.value })}
              />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                value={customer.email}
                onChange={(event) => updateCustomer({ email: event.target.value })}
              />
            </Field>
          </div>
        </Card>

        <Card className="bg-white shadow-sm">
          <SectionHeader
            eyebrow="Resumen"
            title="Propuesta ajustable"
            description="El cliente ve esta estimación; tú puedes refinarla abajo."
          />
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <HighlightStat
              icon={Sun}
              label="Potencia"
              value={`${formatNumber(quote.installedPowerKw, 2)} kWp`}
            />
            <HighlightStat
              icon={CircleDollarSign}
              label="Total"
              value={formatCurrency(quote.totals.grossSale)}
            />
            <HighlightStat
              icon={LineChart}
              label="Ahorro mensual"
              value={formatCurrency(quote.monthlySavings)}
            />
            <HighlightStat
              icon={ShieldCheck}
              label="Cobertura"
              value={`${formatNumber(quote.offsetPercent * 100)}%`}
            />
            {quote.finance ? (
              <HighlightStat
                icon={CircleDollarSign}
                label="Pago mensual"
                value={formatCurrency(quote.finance.monthlyInstallmentClp)}
              />
            ) : null}
          </div>
          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
            {settings.proposalCallout}
          </div>
          <div className="mt-5 flex flex-wrap gap-2 no-print">
            <PrimaryButton onClick={() => window.print()}>
              <FileText className="h-4 w-4" />
              Generar PDF
            </PrimaryButton>
            <LinkButton href={whatsappHref}>
              <Phone className="h-4 w-4" />
              Compartir por WhatsApp
            </LinkButton>
            <LinkButton href={mailtoHref}>
              <Mail className="h-4 w-4" />
              Enviar por email
            </LinkButton>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="bg-white shadow-sm">
          <SectionHeader
            eyebrow="Ajuste técnico"
            title="Configuración del asesor"
            description="Corrige distancias, cambia equipos o agrega servicios especiales."
          />

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Field label="Distancia DC paneles a inversor (m)">
              <Input
                type="number"
                min={0}
                value={technical.dcRunMeters}
                onChange={(event) =>
                  updateTechnical({ dcRunMeters: Number(event.target.value || 0) })
                }
              />
            </Field>
            <Field label="DC soterrado (m)">
              <Input
                type="number"
                min={0}
                value={technical.dcUndergroundMeters}
                onChange={(event) =>
                  updateTechnical({
                    dcUndergroundMeters: Number(event.target.value || 0),
                  })
                }
              />
            </Field>
            <Field label="Distancia inversor a tablero AC (m)">
              <Input
                type="number"
                min={0}
                value={technical.inverterToBoardMeters}
                onChange={(event) =>
                  updateTechnical({
                    inverterToBoardMeters: Number(event.target.value || 0),
                  })
                }
              />
            </Field>
            <Field label="INV-TAB soterrado (m)">
              <Input
                type="number"
                min={0}
                value={technical.inverterToBoardUndergroundMeters}
                onChange={(event) =>
                  updateTechnical({
                    inverterToBoardUndergroundMeters: Number(event.target.value || 0),
                  })
                }
              />
            </Field>
            <Field label="Distancia tablero a empalme (m)">
              <Input
                type="number"
                min={0}
                value={technical.boardToMeterMeters}
                onChange={(event) =>
                  updateTechnical({ boardToMeterMeters: Number(event.target.value || 0) })
                }
              />
            </Field>
            <Field label="TAB-PC soterrado (m)">
              <Input
                type="number"
                min={0}
                value={technical.boardToMeterUndergroundMeters}
                onChange={(event) =>
                  updateTechnical({
                    boardToMeterUndergroundMeters: Number(event.target.value || 0),
                  })
                }
              />
            </Field>
            <Field label="TAB-PC aéreo (m)">
              <Input
                type="number"
                min={0}
                value={technical.boardToMeterAerialMeters}
                onChange={(event) =>
                  updateTechnical({
                    boardToMeterAerialMeters: Number(event.target.value || 0),
                  })
                }
              />
            </Field>
            <Field label="Canaleta PVC interior (m)">
              <Input
                type="number"
                min={0}
                value={technical.indoorPvcMeters}
                onChange={(event) =>
                  updateTechnical({ indoorPvcMeters: Number(event.target.value || 0) })
                }
              />
            </Field>
            <Field label="Zona costera">
              <Select
                value={technical.isCoastal ? "si" : "no"}
                onChange={(event) =>
                  updateTechnical({ isCoastal: event.target.value === "si" })
                }
              >
                <option value="no">No</option>
                <option value="si">Sí, usar RMC</option>
              </Select>
            </Field>
            <Field label="Mantenimiento 5 años">
              <Select
                value={technical.includeMaintenance ? "si" : "no"}
                onChange={(event) =>
                  updateTechnical({ includeMaintenance: event.target.value === "si" })
                }
              >
                <option value="no">No incluido</option>
                <option value="si">Incluir</option>
              </Select>
            </Field>
            <Field label="Meter">
              <Select
                value={technical.includeMeter ? "si" : "auto"}
                onChange={(event) =>
                  updateTechnical({ includeMeter: event.target.value === "si" })
                }
              >
                <option value="auto">Automático por marca</option>
                <option value="si">Forzar meter</option>
              </Select>
            </Field>
            <Field label="Monitoreo">
              <Select
                value={technical.includeMonitoring ? "si" : "auto"}
                onChange={(event) =>
                  updateTechnical({ includeMonitoring: event.target.value === "si" })
                }
              >
                <option value="auto">Automático por marca/fases</option>
                <option value="si">Forzar monitoreo</option>
              </Select>
            </Field>
            <Field label="AC coupling">
              <Select
                value={technical.acCouplingEnabled ? "si" : "no"}
                onChange={(event) =>
                  updateTechnical({ acCouplingEnabled: event.target.value === "si" })
                }
              >
                <option value="no">No</option>
                <option value="si">Activar validación</option>
              </Select>
            </Field>
            <Field label="Inversor manual">
              <Select
                value={technical.manualInverterName}
                onChange={(event) =>
                  updateTechnical({ manualInverterName: event.target.value })
                }
              >
                <option value="">Automático</option>
                {inverterOptions.map((name, index) => (
                  <option key={`${name}-${index}`} value={name}>
                    {name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Estructura manual">
              <Select
                value={technical.manualStructureName}
                onChange={(event) =>
                  updateTechnical({ manualStructureName: event.target.value })
                }
              >
                <option value="">Según techo</option>
                {structureOptions.map((name, index) => (
                  <option key={`${name}-${index}`} value={name}>
                    {name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Batería">
              <Select
                value={technical.batteryName}
                onChange={(event) => updateTechnical({ batteryName: event.target.value })}
              >
                <option value="">Sin batería</option>
                {batteryOptions.map((name, index) => (
                  <option key={`${name}-${index}`} value={name}>
                    {name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Cantidad de baterías">
              <Input
                type="number"
                min={1}
                value={technical.batteryQuantity}
                onChange={(event) =>
                  updateTechnical({ batteryQuantity: Number(event.target.value || 1) })
                }
              />
            </Field>
            <Field label="Generador de respaldo">
              <Select
                value={technical.generatorName}
                onChange={(event) => updateTechnical({ generatorName: event.target.value })}
              >
                <option value="">Sin generador</option>
                {generatorOptions.map((name, index) => (
                  <option key={`${name}-${index}`} value={name}>
                    {name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Conmutador">
              <Select
                value={technical.includeConmutator ? "si" : "no"}
                onChange={(event) =>
                  updateTechnical({ includeConmutator: event.target.value === "si" })
                }
              >
                <option value="no">Automático según generador</option>
                <option value="si">Forzar conmutador</option>
              </Select>
            </Field>
            <Field label="Servicios adicionales">
              <div className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
              {serviceOptions.map((service, index) => {
                  const checked = technical.extraServiceNames.includes(service);
                  return (
                    <label
                      key={`${service}-${index}`}
                      className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-sm text-slate-700"
                    >
                      <span>{service}</span>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          updateTechnical({
                            extraServiceNames: checked
                              ? technical.extraServiceNames.filter((item) => item !== service)
                              : [...technical.extraServiceNames, service],
                          })
                        }
                      />
                    </label>
                  );
                })}
              </div>
            </Field>
          </div>
        </Card>

        <Card>
          <SectionHeader
            eyebrow="Detalle"
            title="Componentes calculados"
            description="Desglose de la propuesta para revisión interna."
          />
          <div className="mt-5 space-y-3">
            <MetricCard
              icon={MapPinned}
              label="Región"
              value={quote.region.label}
              caption={`HSP ${formatNumber(quote.region.peakSunHours, 1)} · tarifa ${formatCurrency(quote.region.averagePricePerKwh)} /kWh`}
            />
            <MetricCard
              icon={Sun}
              label="Generación estimada"
              value={`${formatNumber(quote.monthlyGenerationKwh)} kWh/mes`}
              caption={`${formatNumber(quote.annualGenerationKwh)} kWh al año`}
            />
            <MetricCard
              icon={BatteryCharging}
              label="Equipo principal"
              value={`${quote.panelCount} paneles + ${quote.selectedInverter.acPowerKw} kW`}
              caption={quote.selectedInverter.name}
            />
            {quote.finance ? (
              <MetricCard
                icon={CircleDollarSign}
                label="Financiamiento"
                value={formatCurrency(quote.finance.monthlyInstallmentClp)}
                caption="Pago mensual referencial calculado con modelo de crédito largo plazo."
              />
            ) : null}
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">Generación mensual</p>
            <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
              {quote.monthlyBreakdown.map((month) => (
                <div key={month.month} className="flex items-center justify-between gap-3">
                  <span>{month.month}</span>
                  <span className="font-medium text-slate-900">
                    {formatNumber(month.generationKwh)} kWh
                  </span>
                </div>
              ))}
            </div>
          </div>

          {marketData?.warning ? (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              {marketData.warning}
            </div>
          ) : null}
        </Card>
      </div>

      <Card>
        <SectionHeader
          eyebrow="Desglose"
          title="Componentes y servicios"
          description="Valores comerciales calculados con la configuración actual de GGelectrics."
        />
        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
          <div className="hidden grid-cols-[1.4fr_0.75fr_0.45fr_0.8fr_0.9fr] gap-3 bg-slate-100 px-4 py-3 text-xs font-semibold text-slate-500 md:grid">
            <span>Item</span>
            <span>Categoría</span>
            <span>Cant.</span>
            <span>Unitario</span>
            <span>Total</span>
          </div>
          <div className="divide-y divide-slate-200 bg-white">
            {quote.lineItems.map((item) => (
              <div
                key={item.id}
                className="grid gap-3 px-4 py-4 md:grid-cols-[1.4fr_0.75fr_0.45fr_0.8fr_0.9fr] md:items-center"
              >
                <div>
                  <p className="font-medium text-slate-900">{item.name}</p>
                  {item.note ? (
                    <p className="mt-1 text-sm text-slate-500">{item.note}</p>
                  ) : null}
                </div>
                <p className="text-sm text-slate-500">{item.category}</p>
                <p className="text-sm text-slate-700">{formatNumber(item.quantity, 2)}</p>
                <p className="text-sm text-slate-700">{formatCurrency(item.unitNetSale)}</p>
                <p className="font-medium text-slate-950">{formatCurrency(item.totalGrossSale)}</p>
              </div>
            ))}
          </div>
        </div>

        {quote.warnings.length > 0 ? (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold">Advertencias técnicas</p>
            <ul className="mt-2 space-y-1">
              {quote.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </Card>
    </>
  );
}

function SettingsView({
  settings,
  marketData,
  updateSettings,
  resetSettings,
  resetQuote,
  saveSettings,
  settingsSaveState,
}: {
  settings: ReturnType<typeof useQuoteStore.getState>["settings"];
  marketData: MarketDataSnapshot | null;
  updateSettings: ReturnType<typeof useQuoteStore.getState>["updateSettings"];
  resetSettings: ReturnType<typeof useQuoteStore.getState>["resetSettings"];
  resetQuote: ReturnType<typeof useQuoteStore.getState>["reset"];
  saveSettings: () => Promise<void>;
  settingsSaveState: {
    status: "idle" | "saving" | "saved" | "error";
    message: string;
  };
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-[0.82fr_1.18fr]">
      <Card className="border-amber-200 bg-[#fffaf0] shadow-sm xl:sticky xl:top-6 xl:self-start">
        <SectionHeader
          eyebrow="Centro de control"
          title="Entorno GGelectrics"
          description="Define la experiencia pública, datos comerciales y comportamiento del cotizador sin tocar código."
        />

        <div className="mt-5 grid gap-2">
          <AdminStatusCard
            label="Fuente de configuración"
            value={settingsSaveState.status === "saved" ? "Sincronizada" : "Editable"}
          />
          <AdminStatusCard
            label="Modo de precios"
            value={`Catálogo x${formatNumber(settings.pricing.catalogCostMultiplier, 2)}`}
          />
          <AdminStatusCard
            label="Redondeo comercial"
            value={formatCurrency(settings.pricing.priceRoundTo)}
          />
        </div>

        <div className="mt-5 grid gap-4">
          <Field label="Nombre empresa">
            <Input
              value={settings.companyName}
              onChange={(event) => updateSettings({ companyName: event.target.value })}
            />
          </Field>
          <Field label="Título público">
            <Input
              value={settings.customerHeroTitle}
              onChange={(event) => updateSettings({ customerHeroTitle: event.target.value })}
            />
          </Field>
          <Field label="Descripción pública">
            <Textarea
              value={settings.customerHeroDescription}
              onChange={(event) =>
                updateSettings({ customerHeroDescription: event.target.value })
              }
            />
          </Field>
          <Field label="Texto de propuesta preliminar">
            <Textarea
              value={settings.proposalCallout}
              onChange={(event) => updateSettings({ proposalCallout: event.target.value })}
            />
          </Field>
          <Field label="Teléfono comercial">
            <Input
              value={settings.contactPhone}
              onChange={(event) => updateSettings({ contactPhone: event.target.value })}
            />
          </Field>
          <Field label="Email comercial">
            <Input
              value={settings.contactEmail}
              onChange={(event) => updateSettings({ contactEmail: event.target.value })}
            />
          </Field>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <PrimaryButton onClick={() => void saveSettings()}>
            <ShieldCheck className="h-4 w-4" />
            {settingsSaveState.status === "saving"
              ? "Guardando..."
              : "Guardar configuración pública"}
          </PrimaryButton>
          <SecondaryButton onClick={() => resetSettings()}>
            <RotateCcw className="h-4 w-4" />
            Restaurar configuración
          </SecondaryButton>
          <SecondaryButton onClick={() => resetQuote()}>
            <RotateCcw className="h-4 w-4" />
            Reiniciar cotización
          </SecondaryButton>
        </div>

        {settingsSaveState.message ? (
          <div
            className={cn(
              "mt-4 rounded-2xl px-4 py-3 text-sm",
              settingsSaveState.status === "error"
                ? "border border-red-200 bg-red-50 text-red-700"
                : "border border-emerald-200 bg-emerald-50 text-emerald-800",
            )}
          >
            {settingsSaveState.message}
          </div>
        ) : null}
      </Card>

      <div className="space-y-4">
        <Card className="border-amber-100 bg-white shadow-sm">
          <SectionHeader
            eyebrow="Indicadores internos"
            title="Parámetros financieros de respaldo"
            description="Se usan para cálculos de financiamiento, pero no se exponen como dato crudo en la cotización del cliente."
          />
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Field label="Modo UF">
              <Select
                value={settings.externalData.ufMode}
                onChange={(event) =>
                  updateSettings((current) => ({
                    ...current,
                    externalData: {
                      ...current.externalData,
                      ufMode: event.target.value as "api" | "manual",
                    },
                  }))
                }
              >
                <option value="api">En línea</option>
                <option value="manual">Manual</option>
              </Select>
            </Field>
            <Field label="Fuente API">
              <Select
                value={settings.externalData.ufApiSource}
                onChange={(event) =>
                  updateSettings((current) => ({
                    ...current,
                    externalData: {
                      ...current.externalData,
                      ufApiSource: event.target.value as "mindicador" | "cmf",
                    },
                  }))
                }
              >
                <option value="mindicador">mindicador.cl</option>
                <option value="cmf">CMF Chile</option>
              </Select>
            </Field>
            <Field label="UF manual de respaldo">
              <Input
                type="number"
                min={0}
                value={settings.externalData.manualUfValue}
                onChange={(event) =>
                  updateSettings((current) => ({
                    ...current,
                    externalData: {
                      ...current.externalData,
                      manualUfValue: Number(event.target.value || 0),
                    },
                  }))
                }
              />
            </Field>
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">Estado actual</p>
            <p className="mt-2">
              UF activa:{" "}
              <span className="font-semibold">
                {marketData?.ufValue ? formatCurrency(marketData.ufValue) : "Sin dato"}
              </span>
            </p>
            <p className="mt-1">
              Fuente: {marketData?.ufLabel ?? "Sin sincronizar"}
              {marketData?.ufDate ? ` · ${formatDateLabel(marketData.ufDate)}` : ""}
            </p>
            {marketData?.warning ? <p className="mt-2 text-amber-700">{marketData.warning}</p> : null}
          </div>
        </Card>

        <Card className="border-amber-100 bg-white shadow-sm">
          <SectionHeader
            eyebrow="Variables de cálculo"
            title="Negocio y performance"
            description="Ajusta el motor de precios y la lógica preliminar."
          />
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Field label="Margen comercial">
              <Input
                type="number"
                step="0.01"
                min={0}
                max={0.95}
                value={settings.margin}
                onChange={(event) => updateSettings({ margin: Number(event.target.value || 0) })}
              />
            </Field>
            <Field label="IVA">
              <Input
                type="number"
                step="0.01"
                min={0}
                max={1}
                value={settings.vatRate}
                onChange={(event) =>
                  updateSettings({ vatRate: Number(event.target.value || 0) })
                }
              />
            </Field>
            <Field label="Eficiencia sistema">
              <Input
                type="number"
                step="0.01"
                min={0.1}
                max={1}
                value={settings.systemEfficiency}
                onChange={(event) =>
                  updateSettings({ systemEfficiency: Number(event.target.value || 0) })
                }
              />
            </Field>
            <Field label="Autoconsumo preliminar">
              <Input
                type="number"
                step="0.01"
                min={0.1}
                max={1}
                value={settings.autoconsumptionRatio}
                onChange={(event) =>
                  updateSettings({ autoconsumptionRatio: Number(event.target.value || 0) })
                }
              />
            </Field>
            <Field label="Curva mensual del Excel">
              <Select
                value={settings.useMonthlyGenerationProfile ? "si" : "no"}
                onChange={(event) =>
                  updateSettings({ useMonthlyGenerationProfile: event.target.value === "si" })
                }
              >
                <option value="si">Usar GEN Zona</option>
                <option value="no">Usar HSP promedio</option>
              </Select>
            </Field>
            <Field label="Servicios regionales">
              <Select
                value={settings.useRegionalServicePricing ? "si" : "no"}
                onChange={(event) =>
                  updateSettings({ useRegionalServicePricing: event.target.value === "si" })
                }
              >
                <option value="si">Usar SERVBACK</option>
                <option value="no">Usar catálogo SERV</option>
              </Select>
            </Field>
            <Field label="Distancia DC por defecto (m)">
              <Input
                type="number"
                min={0}
                value={settings.defaultDcRunMeters}
                onChange={(event) =>
                  updateSettings({
                    defaultDcRunMeters: Number(event.target.value || 0),
                  })
                }
              />
            </Field>
            <Field label="Distancia inversor-tablero (m)">
              <Input
                type="number"
                min={0}
                value={settings.defaultInverterToBoardMeters}
                onChange={(event) =>
                  updateSettings({
                    defaultInverterToBoardMeters: Number(event.target.value || 0),
                  })
                }
              />
            </Field>
            <Field label="Distancia tablero-empalme (m)">
              <Input
                type="number"
                min={0}
                value={settings.defaultBoardToMeterMeters}
                onChange={(event) =>
                  updateSettings({
                    defaultBoardToMeterMeters: Number(event.target.value || 0),
                  })
                }
              />
            </Field>
          </div>
        </Card>

        <Card className="border-amber-100 bg-white shadow-sm">
          <SectionHeader
            eyebrow="Motor de precios"
            title="Precios, márgenes y redondeos"
            description="Controla cómo se transforman los costos del catálogo en precios comerciales por tipo de partida."
          />
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Field label="Ajuste global catálogo">
              <Input
                type="number"
                step="0.01"
                min={0.1}
                value={settings.pricing.catalogCostMultiplier}
                onChange={(event) =>
                  updateSettings((current) => ({
                    ...current,
                    pricing: {
                      ...current.pricing,
                      catalogCostMultiplier: Number(event.target.value || 1),
                    },
                  }))
                }
              />
            </Field>
            <Field label="Redondear venta neta a">
              <Input
                type="number"
                min={0}
                value={settings.pricing.priceRoundTo}
                onChange={(event) =>
                  updateSettings((current) => ({
                    ...current,
                    pricing: {
                      ...current.pricing,
                      priceRoundTo: Number(event.target.value || 0),
                    },
                  }))
                }
              />
            </Field>
            <MarginField
              label="Margen equipos"
              marginKey="equipment"
              settings={settings}
              updateSettings={updateSettings}
            />
            <MarginField
              label="Margen estructura"
              marginKey="structure"
              settings={settings}
              updateSettings={updateSettings}
            />
            <MarginField
              label="Margen cableado/canalización"
              marginKey="wiring"
              settings={settings}
              updateSettings={updateSettings}
            />
            <MarginField
              label="Margen protecciones"
              marginKey="protections"
              settings={settings}
              updateSettings={updateSettings}
            />
            <MarginField
              label="Margen servicios"
              marginKey="services"
              settings={settings}
              updateSettings={updateSettings}
            />
            <MarginField
              label="Margen baterías"
              marginKey="batteries"
              settings={settings}
              updateSettings={updateSettings}
            />
            <MarginField
              label="Margen generador"
              marginKey="generator"
              settings={settings}
              updateSettings={updateSettings}
            />
            <MarginField
              label="Margen por defecto"
              marginKey="default"
              settings={settings}
              updateSettings={updateSettings}
            />
          </div>
        </Card>

        <Card className="border-amber-100 bg-white shadow-sm">
          <SectionHeader
            eyebrow="Financiamiento"
            title="Modelo de pago referencial"
            description="Replica la lógica base del Excel para calcular pago mensual sin mostrar indicadores técnicos al usuario final."
          />
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Field label="Mostrar financiamiento">
              <Select
                value={settings.finance.enabled ? "si" : "no"}
                onChange={(event) =>
                  updateSettings((current) => ({
                    ...current,
                    finance: {
                      ...current.finance,
                      enabled: event.target.value === "si",
                    },
                  }))
                }
              >
                <option value="si">Sí</option>
                <option value="no">No</option>
              </Select>
            </Field>
            <Field label="Años de crédito">
              <Input
                type="number"
                min={1}
                value={settings.finance.creditTermYears}
                onChange={(event) =>
                  updateSettings((current) => ({
                    ...current,
                    finance: {
                      ...current.finance,
                      creditTermYears: Number(event.target.value || 0),
                    },
                  }))
                }
              />
            </Field>
            <Field label="Meses de gracia">
              <Input
                type="number"
                min={0}
                value={settings.finance.graceMonths}
                onChange={(event) =>
                  updateSettings((current) => ({
                    ...current,
                    finance: {
                      ...current.finance,
                      graceMonths: Number(event.target.value || 0),
                    },
                  }))
                }
              />
            </Field>
            <Field label="Interés anual">
              <Input
                type="number"
                step="0.0001"
                min={0}
                value={settings.finance.annualInterestRate}
                onChange={(event) =>
                  updateSettings((current) => ({
                    ...current,
                    finance: {
                      ...current.finance,
                      annualInterestRate: Number(event.target.value || 0),
                    },
                  }))
                }
              />
            </Field>
            <Field label="Pie">
              <Input
                type="number"
                min={0}
                value={settings.finance.downPayment}
                onChange={(event) =>
                  updateSettings((current) => ({
                    ...current,
                    finance: {
                      ...current.finance,
                      downPayment: Number(event.target.value || 0),
                    },
                  }))
                }
              />
            </Field>
            <Field label="Financial fee">
              <Input
                type="number"
                step="0.0001"
                min={0}
                value={settings.finance.financialFeeRate}
                onChange={(event) =>
                  updateSettings((current) => ({
                    ...current,
                    finance: {
                      ...current.finance,
                      financialFeeRate: Number(event.target.value || 0),
                    },
                  }))
                }
              />
            </Field>
            <Field label="Tasa garantía planta">
              <Input
                type="number"
                step="0.0001"
                min={0}
                value={settings.finance.plantGuaranteeRate}
                onChange={(event) =>
                  updateSettings((current) => ({
                    ...current,
                    finance: {
                      ...current.finance,
                      plantGuaranteeRate: Number(event.target.value || 0),
                    },
                  }))
                }
              />
            </Field>
            <Field label="Tasa garantía costos">
              <Input
                type="number"
                step="0.0001"
                min={0}
                value={settings.finance.financingCostsGuaranteeRate}
                onChange={(event) =>
                  updateSettings((current) => ({
                    ...current,
                    finance: {
                      ...current.finance,
                      financingCostsGuaranteeRate: Number(event.target.value || 0),
                    },
                  }))
                }
              />
            </Field>
            <Field label="Costos legales (UF)">
              <Input
                type="number"
                step="0.01"
                min={0}
                value={settings.finance.legalCostsUf}
                onChange={(event) =>
                  updateSettings((current) => ({
                    ...current,
                    finance: {
                      ...current.finance,
                      legalCostsUf: Number(event.target.value || 0),
                    },
                  }))
                }
              />
            </Field>
            <Field label="Costos operacionales (UF)">
              <Input
                type="number"
                step="0.01"
                min={0}
                value={settings.finance.operationalCostsUf}
                onChange={(event) =>
                  updateSettings((current) => ({
                    ...current,
                    finance: {
                      ...current.finance,
                      operationalCostsUf: Number(event.target.value || 0),
                    },
                  }))
                }
              />
            </Field>
            <Field label="Costo fijo cierre (CLP)">
              <Input
                type="number"
                min={0}
                value={settings.finance.fixedClosingCostClp}
                onChange={(event) =>
                  updateSettings((current) => ({
                    ...current,
                    finance: {
                      ...current.finance,
                      fixedClosingCostClp: Number(event.target.value || 0),
                    },
                  }))
                }
              />
            </Field>
            <Field label="Valor propiedad referencia">
              <Input
                type="number"
                min={0}
                value={settings.finance.propertyValueReference}
                onChange={(event) =>
                  updateSettings((current) => ({
                    ...current,
                    finance: {
                      ...current.finance,
                      propertyValueReference: Number(event.target.value || 0),
                    },
                  }))
                }
              />
            </Field>
            <Field label="Sueldo líquido referencia">
              <Input
                type="number"
                min={0}
                value={settings.finance.salaryReference}
                onChange={(event) =>
                  updateSettings((current) => ({
                    ...current,
                    finance: {
                      ...current.finance,
                      salaryReference: Number(event.target.value || 0),
                    },
                  }))
                }
              />
            </Field>
            <Field label="Edad referencia">
              <Input
                type="number"
                min={18}
                value={settings.finance.customerAgeReference}
                onChange={(event) =>
                  updateSettings((current) => ({
                    ...current,
                    finance: {
                      ...current.finance,
                      customerAgeReference: Number(event.target.value || 0),
                    },
                  }))
                }
              />
            </Field>
          </div>
        </Card>

        <Card className="border-amber-100 bg-white shadow-sm">
          <SectionHeader
            eyebrow="Servicios base"
            title="Incluidos por defecto"
            description="Selecciona los servicios que deben entrar automáticamente en la propuesta."
          />
          <div className="mt-5 grid gap-2">
            {allServiceOptions.map((service, index) => {
              const included = settings.defaultIncludedServices.includes(service);
              return (
                <label
                  key={`${service}-${index}`}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                >
                  <span>{service}</span>
                  <input
                    type="checkbox"
                    checked={included}
                    onChange={() =>
                      updateSettings((current) => ({
                        ...current,
                        defaultIncludedServices: included
                          ? current.defaultIncludedServices.filter((item) => item !== service)
                          : [...current.defaultIncludedServices, service],
                      }))
                    }
                  />
                </label>
              );
            })}
          </div>
        </Card>

        <Card className="border-amber-100 bg-white shadow-sm">
          <SectionHeader
            eyebrow="Tabla regional"
            title="Tarifas y radiación"
            description="Cada cambio afecta el cálculo preliminar que verá el cliente."
          />
          <div className="mt-5 space-y-3">
            {settings.regions.map((region, index) => (
              <div
                key={region.id}
                className="rounded-xl border border-slate-200 bg-slate-50 p-4"
              >
                <p className="text-sm font-semibold text-slate-900">{region.label}</p>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <Field label="HSP">
                    <Input
                      type="number"
                      step="0.1"
                      value={region.peakSunHours}
                      onChange={(event) =>
                        updateSettings((current) => ({
                          ...current,
                          regions: current.regions.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, peakSunHours: Number(event.target.value || 0) }
                              : item,
                          ),
                        }))
                      }
                    />
                  </Field>
                  <Field label="Tarifa consumo">
                    <Input
                      type="number"
                      value={region.averagePricePerKwh}
                      onChange={(event) =>
                        updateSettings((current) => ({
                          ...current,
                          regions: current.regions.map((item, itemIndex) =>
                            itemIndex === index
                              ? {
                                  ...item,
                                  averagePricePerKwh: Number(event.target.value || 0),
                                }
                              : item,
                          ),
                        }))
                      }
                    />
                  </Field>
                  <Field label="Tarifa inyección">
                    <Input
                      type="number"
                      value={region.injectionPricePerKwh}
                      onChange={(event) =>
                        updateSettings((current) => ({
                          ...current,
                          regions: current.regions.map((item, itemIndex) =>
                            itemIndex === index
                              ? {
                                  ...item,
                                  injectionPricePerKwh: Number(event.target.value || 0),
                                }
                              : item,
                          ),
                        }))
                      }
                    />
                  </Field>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function getInternalTitle(mode: Exclude<QuoteAppMode, "client">) {
  return mode === "advisor" ? "Panel de asesor" : "Configuración privada del cotizador";
}

function getShellClass(mode: QuoteAppMode) {
  if (mode === "client") {
    return "min-h-screen bg-[#f5f3eb] text-slate-950";
  }

  if (mode === "advisor") {
    return "min-h-screen bg-[#edf2f7] text-slate-950";
  }

  return "min-h-screen bg-[#f8f1e4] text-slate-950";
}

function getHeaderClass(mode: QuoteAppMode) {
  if (mode === "client") {
    return "rounded-2xl border border-emerald-900/20 bg-[#12251f] p-4 text-white shadow-md shadow-emerald-950/10 md:p-5";
  }

  if (mode === "advisor") {
    return "rounded-2xl border border-blue-100 bg-white/95 p-4 shadow-sm md:p-5";
  }

  return "rounded-2xl border border-amber-200 bg-white/95 p-4 shadow-sm md:p-5";
}

function getEyebrowClass(mode: QuoteAppMode) {
  return cn(
    "text-sm font-semibold tracking-wide",
    mode === "client" ? "text-emerald-100" : mode === "advisor" ? "text-blue-700" : "text-amber-700",
  );
}

function getHeroTitleClass(mode: QuoteAppMode) {
  return cn(
    "mt-1 font-[family-name:var(--font-display)] text-xl tracking-tight sm:text-2xl",
    mode === "client" ? "text-white" : "text-slate-950",
  );
}

function getHeroDescriptionClass(mode: QuoteAppMode) {
  return cn(
    "mt-2 max-w-xl text-xs leading-5 sm:text-sm sm:leading-6",
    mode === "client" ? "text-slate-200" : "text-slate-600",
  );
}

function getInternalDescription(mode: Exclude<QuoteAppMode, "client">) {
  return mode === "advisor"
    ? "Herramienta interna para revisar, ajustar y cerrar propuestas."
    : "Parámetros privados de GGelectrics para controlar la lógica y el contenido público.";
}

function ClientTrustPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{label}</p>
      <p className="mt-1 text-sm font-semibold text-emerald-950">{value}</p>
    </div>
  );
}

function AdvisorCommandCard({
  title,
  value,
  caption,
}: {
  title: string;
  value: string;
  caption: string;
}) {
  return (
    <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">{title}</p>
      <p className="mt-2 font-[family-name:var(--font-display)] text-xl tracking-tight text-slate-950">
        {value}
      </p>
      <p className="mt-2 text-xs leading-5 text-slate-500">{caption}</p>
    </div>
  );
}

function AdminStatusCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-amber-200 bg-white/80 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function MarginField({
  label,
  marginKey,
  settings,
  updateSettings,
}: {
  label: string;
  marginKey: keyof ReturnType<typeof useQuoteStore.getState>["settings"]["pricing"]["categoryMargins"];
  settings: ReturnType<typeof useQuoteStore.getState>["settings"];
  updateSettings: ReturnType<typeof useQuoteStore.getState>["updateSettings"];
}) {
  return (
    <Field label={label}>
      <Input
        type="number"
        step="0.01"
        min={0}
        max={0.95}
        value={settings.pricing.categoryMargins[marginKey]}
        onChange={(event) =>
          updateSettings((current) => ({
            ...current,
            pricing: {
              ...current.pricing,
              categoryMargins: {
                ...current.pricing.categoryMargins,
                [marginKey]: Number(event.target.value || 0),
              },
            },
          }))
        }
      />
    </Field>
  );
}

function formatDateLabel(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6",
        className,
      )}
    >
      {children}
    </section>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
  tone = "light",
}: {
  eyebrow: string;
  title: string;
  description: string;
  tone?: "light" | "dark";
}) {
  return (
    <div>
      <p className={cn("text-sm font-semibold", tone === "dark" ? "text-emerald-100" : "text-slate-500")}>
        {eyebrow}
      </p>
      <h2
        className={cn(
          "mt-1 font-[family-name:var(--font-display)] text-xl tracking-tight",
          tone === "dark" ? "text-white" : "text-slate-950",
        )}
      >
        {title}
      </h2>
      <p
        className={cn(
          "mt-2 max-w-2xl text-sm leading-5",
          tone === "dark" ? "text-slate-200" : "text-slate-600",
        )}
      >
        {description}
      </p>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
      {hint ? <span className="text-xs text-slate-500">{hint}</span> : null}
    </label>
  );
}

function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-4 focus:ring-slate-200",
        props.className,
      )}
    />
  );
}

function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "min-h-24 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-4 focus:ring-slate-200",
        props.className,
      )}
    />
  );
}

function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-4 focus:ring-slate-200",
        props.className,
      )}
    />
  );
}

function ToggleButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl border px-3 py-2 text-sm font-medium transition",
        active
          ? "border-slate-900 bg-slate-900 text-white"
          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
      )}
    >
      {children}
    </button>
  );
}

function PrimaryButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
    >
      {children}
    </button>
  );
}

function SecondaryButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
    >
      {children}
    </button>
  );
}

function LinkButton({ children, href }: { children: ReactNode; href: string }) {
  return (
    <a
      href={href}
      className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
    >
      {children}
    </a>
  );
}

function InternalLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition",
        active
          ? "border-slate-900 bg-slate-900 text-white"
          : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
      )}
    >
      {children}
    </Link>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 text-slate-950">
      <Icon className="h-4 w-4 text-slate-500" />
      <p className="mt-2 text-xs font-medium text-current opacity-70">{label}</p>
      <p className="mt-1 text-sm font-semibold text-current">{value}</p>
    </div>
  );
}

function HighlightStat({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-white p-2 text-slate-700 shadow-sm">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="mt-1 text-sm font-semibold text-slate-950">{value}</p>
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 text-slate-400" />
      <div className="flex-1">
        <p className="text-xs font-medium text-slate-400">{label}</p>
        <p className="mt-1 text-sm text-slate-100">{value}</p>
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  caption,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  caption: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-slate-100 p-2 text-slate-700">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-500">{label}</p>
          <p className="mt-1 text-lg font-semibold tracking-tight text-slate-950">{value}</p>
        </div>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-600">{caption}</p>
    </div>
  );
}
