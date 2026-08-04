import type { BusinessSettings } from "@/lib/config";
import type { MarketDataSnapshot } from "@/lib/market-data";
import {
  buildQuote,
  getAvailableBatteryNames,
  getAvailableInverterNames,
  type CustomerDraft,
  type QuickStartInput,
  type QuoteResult,
  type TechnicalConfig,
} from "@/lib/quote-engine";

const CASH_DISCOUNT_RATE = 0.155;
const CARD_INSTALLMENTS = 12;
const SANTANDER_INSTALLMENTS = 48;
const PROJECTION_YEARS = 25;
const VALIDITY_DAYS = 15;

export type QuoteExpansionOption = {
  title: string;
  name: string;
  capacityLabel: string;
  additionalPrice: number;
  image: string;
};

export type QuoteDocumentModel = {
  quoteNumber: string;
  projectName: string;
  customerName: string;
  location: string;
  validityLabel: string;
  monthlyBill: number;
  monthlySavings: number;
  remainingMonthlyBill: number;
  offsetPercent: number;
  transferListPrice: number;
  transferPrice: number;
  transferSavings: number;
  cardInstallment: number;
  santanderInstallment: number;
  santanderDifference: number;
  creditMonths: number;
  creditInstallmentUf: number | null;
  creditDifference: number | null;
  batteryIncluded: boolean;
  batteryName: string;
  batteryCapacityLabel: string;
  gasSystemIncluded: boolean;
  gasServiceName: string;
  otherServicesIncluded: boolean;
  otherServicesLabel: string;
  annualBill: number;
  annualSavings: number;
  annualAutoconsumptionKwh: number;
  annualInjectionKwh: number;
  paybackYears: number;
  savingsIn25Years: number;
  costOfDoingNothing: number;
  hybridUpgrade: QuoteExpansionOption | null;
  batteryUpgrades: QuoteExpansionOption[];
};

type BuildQuoteDocumentModelInput = {
  quote: QuoteResult;
  settings: BusinessSettings;
  customer: CustomerDraft;
  quickStart: QuickStartInput;
  technical: TechnicalConfig;
  marketData: MarketDataSnapshot | null;
};

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function buildQuoteNumber(customer: CustomerDraft, quote: QuoteResult) {
  const seed = [
    customer.customerName,
    customer.email,
    customer.phone,
    customer.address,
    Math.round(quote.totals.grossSale),
    quote.panelCount,
  ].join("|");
  let hash = 2166136261;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return String(10000 + (Math.abs(hash) % 90000));
}

function formatCapacity(wh: number) {
  if (!wh || wh <= 0) return "capacidad por definir";
  return `${new Intl.NumberFormat("es-CL", { maximumFractionDigits: 2 }).format(wh / 1000)} kWh`;
}

function getProjectName(quote: QuoteResult, technical: TechnicalConfig) {
  const additions: string[] = [];
  if (quote.selectedBattery) additions.push("Respaldo");
  if (technical.extraServiceNames.length > 0) additions.push("Servicios");
  return additions.length > 0 ? `Residencial Solar + ${additions.join(" + ")}` : "Residencial Solar";
}

function selectEvenly<T>(items: T[], count: number) {
  if (items.length <= count) return items;
  if (count === 1) return [items[Math.floor(items.length / 2)]];

  return Array.from({ length: count }, (_, index) => {
    const position = Math.round((index * (items.length - 1)) / (count - 1));
    return items[position];
  });
}

function getBatteryUpgrades({
  quote,
  quickStart,
  technical,
  settings,
  marketData,
}: Omit<BuildQuoteDocumentModelInput, "customer">) {
  const preferred = getAvailableBatteryNames().filter((name) =>
    normalizeText(name).includes("pylontech"),
  );
  const names = selectEvenly(
    preferred.length >= 3 ? preferred : getAvailableBatteryNames(),
    3,
  );

  return names.flatMap((batteryName, index) => {
    try {
      const variant = buildQuote(
        quickStart,
        { ...technical, batteryName, batteryQuantity: 1 },
        settings,
        marketData,
      );
      const selected = variant.selectedBattery;
      if (!selected) return [];

      return [
        {
          title: `Opción ${index + 1}`,
          name: selected.name,
          capacityLabel: formatCapacity(selected.wh),
          additionalPrice: Math.max(0, variant.totals.grossSale - quote.totals.grossSale),
          image: index === 2 ? "/quote-assets/sigenergy-system.png" : index === 1 ? "/quote-assets/battery-tower.png" : "/quote-assets/battery-pylontech.png",
        },
      ];
    } catch {
      return [];
    }
  });
}

function getHybridUpgrade({
  quote,
  quickStart,
  technical,
  settings,
  marketData,
}: Omit<BuildQuoteDocumentModelInput, "customer">) {
  const hybridNames = getAvailableInverterNames().filter((name) =>
    normalizeText(name).includes("hibrido"),
  );
  let best: { name: string; distance: number } | null = null;

  for (const name of hybridNames) {
    try {
      const variant = buildQuote(
        quickStart,
        { ...technical, manualInverterName: name },
        settings,
        marketData,
      );
      const distance = Math.abs(variant.selectedInverter.acPowerKw - quote.selectedInverter.acPowerKw);
      if (!best || distance < best.distance) best = { name, distance };
    } catch {
      // A malformed catalog option should not block the customer PDF.
    }
  }

  if (!best) return null;

  try {
    const variant = buildQuote(
      quickStart,
      { ...technical, manualInverterName: best.name },
      settings,
      marketData,
    );

    return {
      title: "Si cambias a un inversor híbrido",
      name: variant.selectedInverter.name,
      capacityLabel: `${variant.selectedInverter.acPowerKw} kW`,
      additionalPrice: Math.max(0, variant.totals.grossSale - quote.totals.grossSale),
      image: "/quote-assets/hybrid-inverter.png",
    };
  } catch {
    return null;
  }
}

export function buildQuoteDocumentModel(
  input: BuildQuoteDocumentModelInput,
): QuoteDocumentModel {
  const { quote, settings, customer, quickStart, technical, marketData } = input;
  const transferListPrice = quote.totals.grossSale;
  const transferPrice = transferListPrice * (1 - CASH_DISCOUNT_RATE);
  const monthlySavings = Math.min(quote.monthlySavings, quote.monthlyBill);
  const santanderInstallment = transferListPrice / SANTANDER_INSTALLMENTS;
  const cardInstallment = transferListPrice / CARD_INSTALLMENTS;
  const creditInstallmentUf = quote.finance?.monthlyInstallmentUf ?? null;
  const creditInstallmentClp = quote.finance?.monthlyInstallmentClp ?? null;
  const normalizedServices = technical.extraServiceNames.map(normalizeText);
  const gasServiceIndex = normalizedServices.findIndex((name) =>
    name.includes("bomba de calor"),
  );
  const otherServices = technical.extraServiceNames.filter((_, index) => index !== gasServiceIndex);

  return {
    quoteNumber: buildQuoteNumber(customer, quote),
    projectName: getProjectName(quote, technical),
    customerName: customer.customerName.trim() || customer.companyName.trim() || "Cliente por confirmar",
    location: customer.address.trim() || `${quote.region.label}, Chile`,
    validityLabel: `${VALIDITY_DAYS} días`,
    monthlyBill: quote.monthlyBill,
    monthlySavings,
    remainingMonthlyBill: Math.max(0, quote.monthlyBill - monthlySavings),
    offsetPercent: Math.min(1, quote.offsetPercent),
    transferListPrice,
    transferPrice,
    transferSavings: transferListPrice - transferPrice,
    cardInstallment,
    santanderInstallment,
    santanderDifference: santanderInstallment - monthlySavings,
    creditMonths: quote.finance?.termMonths ?? settings.finance.creditTermYears * 12,
    creditInstallmentUf,
    creditDifference: creditInstallmentClp === null ? null : creditInstallmentClp - monthlySavings,
    batteryIncluded: Boolean(quote.selectedBattery),
    batteryName: quote.selectedBattery?.name ?? "Batería de respaldo",
    batteryCapacityLabel: quote.selectedBattery
      ? formatCapacity(quote.selectedBattery.wh * Math.max(1, technical.batteryQuantity))
      : "no incluida",
    gasSystemIncluded: gasServiceIndex >= 0,
    gasServiceName:
      gasServiceIndex >= 0 ? technical.extraServiceNames[gasServiceIndex] : "Bomba de calor ACS",
    otherServicesIncluded: otherServices.length > 0,
    otherServicesLabel: otherServices.length > 0 ? otherServices.join(" · ") : "Cargador EV, climatización y piscina",
    annualBill: quote.monthlyBill * 12,
    annualSavings: quote.annualSavings,
    annualAutoconsumptionKwh: quote.autoconsumptionKwh * 12,
    annualInjectionKwh: quote.injectionKwh * 12,
    paybackYears: quote.paybackYears,
    savingsIn25Years: quote.annualSavings * PROJECTION_YEARS,
    costOfDoingNothing: quote.monthlyBill * 12 * PROJECTION_YEARS,
    hybridUpgrade: getHybridUpgrade({ quote, quickStart, technical, settings, marketData }),
    batteryUpgrades: getBatteryUpgrades({ quote, quickStart, technical, settings, marketData }),
  };
}
