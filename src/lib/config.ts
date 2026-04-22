export const DEFAULT_MARGIN = 0.2;
export const VAT_RATE = 0.19;
export const SYSTEM_EFFICIENCY = 0.82;
export const DEFAULT_AUTOCONSUMPTION_RATIO = 0.5;
export const DEFAULT_DC_RUN_METERS = 20;
export const DEFAULT_INVERTER_TO_BOARD_METERS = 10;
export const DEFAULT_BOARD_TO_METER_METERS = 1;

export const MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
] as const;

export const MONTHLY_YIELD_KWH_PER_KWP: Record<string, number[]> = {
  "arica-parinacota": [131, 124, 147, 136, 127, 107, 107, 111, 119, 136, 130, 130],
  tarapaca: [142, 132, 155, 145, 139, 127, 134, 140, 146, 151, 142, 141],
  antofagasta: [136, 130, 145, 130, 118, 109, 111, 114, 117, 128, 130, 136],
  coquimbo: [164, 146, 134, 101, 87, 83, 90, 102, 115, 140, 144, 163],
  valparaiso: [164, 144, 145, 112, 84, 70, 73, 86, 108, 132, 150, 164],
  metropolitana: [164, 144, 145, 112, 84, 70, 73, 86, 108, 132, 150, 164],
  ohiggins: [164, 144, 145, 112, 84, 70, 73, 86, 108, 132, 150, 164],
  maule: [154, 135, 137, 101, 67, 52, 58, 77, 103, 123, 141, 150],
  nuble: [156, 136, 134, 101, 68, 56, 59, 77, 106, 125, 143, 153],
  biobio: [156, 136, 134, 101, 68, 56, 59, 77, 106, 125, 143, 153],
  araucania: [149, 124, 115, 79, 59, 45, 49, 63, 89, 107, 123, 141],
  "los-rios": [147, 121, 109, 71, 47, 37, 38, 54, 86, 103, 121, 140],
  "los-lagos": [133, 106, 93, 62, 50, 40, 42, 57, 79, 92, 106, 125],
  aysen: [138, 110, 99, 79, 67, 62, 65, 76, 91, 115, 126, 140],
};

export const REGIONAL_SERVICE_COSTS: Record<
  string,
  {
    projectManagement?: number;
    installationPerKwp?: number;
    engineering?: number;
    maintenanceFiveYears?: number;
  }
> = {
  coquimbo: {
    projectManagement: 777600,
    installationPerKwp: 160000,
    engineering: 312499.1596638656,
  },
  valparaiso: {
    projectManagement: 305594.1002949852,
    installationPerKwp: 160000,
    engineering: 562499.1596638656,
    maintenanceFiveYears: 750000,
  },
  metropolitana: {
    projectManagement: 277594.1002949852,
    installationPerKwp: 140000,
    engineering: 312499.1596638656,
    maintenanceFiveYears: 400000,
  },
  ohiggins: {
    projectManagement: 305594.1002949852,
    installationPerKwp: 160000,
    engineering: 312499.1596638656,
    maintenanceFiveYears: 750000,
  },
  maule: {
    projectManagement: 477600,
    installationPerKwp: 160000,
    engineering: 312499.1596638656,
  },
  nuble: {
    projectManagement: 677600,
    installationPerKwp: 160000,
    engineering: 312499.1596638656,
  },
};

export type RegionConfig = {
  id: string;
  label: string;
  peakSunHours: number;
  averagePricePerKwh: number;
  injectionPricePerKwh: number;
};

export const REGIONS: RegionConfig[] = [
  {
    id: "arica-parinacota",
    label: "Arica y Parinacota",
    peakSunHours: 5.9,
    averagePricePerKwh: 188,
    injectionPricePerKwh: 94,
  },
  {
    id: "tarapaca",
    label: "Tarapaca",
    peakSunHours: 5.8,
    averagePricePerKwh: 190,
    injectionPricePerKwh: 95,
  },
  {
    id: "antofagasta",
    label: "Antofagasta",
    peakSunHours: 6.1,
    averagePricePerKwh: 192,
    injectionPricePerKwh: 96,
  },
  {
    id: "atacama",
    label: "Atacama",
    peakSunHours: 5.7,
    averagePricePerKwh: 188,
    injectionPricePerKwh: 94,
  },
  {
    id: "coquimbo",
    label: "Coquimbo",
    peakSunHours: 5.3,
    averagePricePerKwh: 200,
    injectionPricePerKwh: 100,
  },
  {
    id: "valparaiso",
    label: "Valparaiso",
    peakSunHours: 4.9,
    averagePricePerKwh: 215,
    injectionPricePerKwh: 108,
  },
  {
    id: "metropolitana",
    label: "Metropolitana",
    peakSunHours: 4.6,
    averagePricePerKwh: 250,
    injectionPricePerKwh: 126,
  },
  {
    id: "ohiggins",
    label: "O'Higgins",
    peakSunHours: 4.8,
    averagePricePerKwh: 215,
    injectionPricePerKwh: 108,
  },
  {
    id: "maule",
    label: "Maule",
    peakSunHours: 4.7,
    averagePricePerKwh: 210,
    injectionPricePerKwh: 105,
  },
  {
    id: "nuble",
    label: "Nuble",
    peakSunHours: 4.5,
    averagePricePerKwh: 208,
    injectionPricePerKwh: 104,
  },
  {
    id: "biobio",
    label: "Biobio",
    peakSunHours: 4.3,
    averagePricePerKwh: 205,
    injectionPricePerKwh: 103,
  },
  {
    id: "araucania",
    label: "Araucania",
    peakSunHours: 4,
    averagePricePerKwh: 202,
    injectionPricePerKwh: 101,
  },
  {
    id: "los-rios",
    label: "Los Rios",
    peakSunHours: 3.8,
    averagePricePerKwh: 198,
    injectionPricePerKwh: 99,
  },
  {
    id: "los-lagos",
    label: "Los Lagos",
    peakSunHours: 3.6,
    averagePricePerKwh: 198,
    injectionPricePerKwh: 99,
  },
  {
    id: "aysen",
    label: "Aysen",
    peakSunHours: 3.2,
    averagePricePerKwh: 192,
    injectionPricePerKwh: 96,
  },
  {
    id: "magallanes",
    label: "Magallanes",
    peakSunHours: 2.8,
    averagePricePerKwh: 185,
    injectionPricePerKwh: 93,
  },
];

export type RoofPreset = {
  id: string;
  label: string;
  structureName: string;
  unitsPerPanel: number;
  note: string;
};

export const ROOF_PRESETS: RoofPreset[] = [
  {
    id: "teja",
    label: "Teja / losa inclinada",
    structureName: "Fijacion Tipo L",
    unitsPerPanel: 4,
    note: "Pensado para cubiertas residenciales tradicionales.",
  },
  {
    id: "metalica",
    label: "Metalica trapezoidal",
    structureName: "Anclaje Doble Hilo + Fijacion L",
    unitsPerPanel: 4,
    note: "Preseleccion adecuada para cubierta metalica industrial o habitacional.",
  },
  {
    id: "standing-seam",
    label: "Standing seam",
    structureName: "Costura de pie",
    unitsPerPanel: 4,
    note: "Evita perforacion directa en techos engatillados.",
  },
  {
    id: "plano",
    label: "Techo plano",
    structureName: "Base Ajustable 15-30° (Del y Trasera)",
    unitsPerPanel: 1,
    note: "Configura inclinacion preliminar sobre cubierta plana.",
  },
  {
    id: "suelo",
    label: "Suelo / estructura inclinada",
    structureName: "Inclinada Triangulo",
    unitsPerPanel: 1,
    note: "Usa estructura inclinada para una propuesta en superficie.",
  },
];

export const DEFAULT_INCLUDED_SERVICES = [
  "Gestion del proyecto",
  "Instalacion Paneles",
  "Ingenieria TE4 y Tramite de Conexion",
];

export type ExternalDataSettings = {
  ufMode: "api" | "manual";
  ufApiSource: "mindicador" | "cmf";
  manualUfValue: number;
};

export type FinanceSettings = {
  enabled: boolean;
  graceMonths: number;
  creditTermYears: number;
  annualInterestRate: number;
  downPayment: number;
  financialFeeRate: number;
  plantGuaranteeRate: number;
  financingCostsGuaranteeRate: number;
  legalCostsUf: number;
  operationalCostsUf: number;
  fixedClosingCostClp: number;
  propertyValueReference: number;
  salaryReference: number;
  customerAgeReference: number;
};

export type PricingSettings = {
  catalogCostMultiplier: number;
  priceRoundTo: number;
  categoryMargins: {
    equipment: number;
    structure: number;
    wiring: number;
    protections: number;
    services: number;
    batteries: number;
    generator: number;
    default: number;
  };
};

export type BusinessSettings = {
  companyName: string;
  customerHeroTitle: string;
  customerHeroDescription: string;
  proposalCallout: string;
  contactPhone: string;
  contactEmail: string;
  margin: number;
  vatRate: number;
  systemEfficiency: number;
  autoconsumptionRatio: number;
  defaultDcRunMeters: number;
  defaultInverterToBoardMeters: number;
  defaultBoardToMeterMeters: number;
  useMonthlyGenerationProfile: boolean;
  useRegionalServicePricing: boolean;
  pricing: PricingSettings;
  defaultIncludedServices: string[];
  regions: RegionConfig[];
  externalData: ExternalDataSettings;
  finance: FinanceSettings;
};

export const defaultBusinessSettings: BusinessSettings = {
  companyName: "GGelectrics",
  customerHeroTitle: "Cotiza tu sistema solar en minutos",
  customerHeroDescription:
    "Ingresa tu gasto de luz o tu consumo mensual y te mostraremos una estimación cercana, simple y lista para conversar con nuestro equipo.",
  proposalCallout:
    "Esta propuesta es preliminar. Luego un asesor de GGelectrics puede afinar equipos, distancias y servicios para la cotización final.",
  contactPhone: "+56 9 9999 9999",
  contactEmail: "contacto@ggelectrics.cl",
  margin: DEFAULT_MARGIN,
  vatRate: VAT_RATE,
  systemEfficiency: SYSTEM_EFFICIENCY,
  autoconsumptionRatio: DEFAULT_AUTOCONSUMPTION_RATIO,
  defaultDcRunMeters: DEFAULT_DC_RUN_METERS,
  defaultInverterToBoardMeters: DEFAULT_INVERTER_TO_BOARD_METERS,
  defaultBoardToMeterMeters: DEFAULT_BOARD_TO_METER_METERS,
  useMonthlyGenerationProfile: true,
  useRegionalServicePricing: true,
  pricing: {
    catalogCostMultiplier: 1,
    priceRoundTo: 1000,
    categoryMargins: {
      equipment: DEFAULT_MARGIN,
      structure: DEFAULT_MARGIN,
      wiring: DEFAULT_MARGIN,
      protections: DEFAULT_MARGIN,
      services: DEFAULT_MARGIN,
      batteries: DEFAULT_MARGIN,
      generator: DEFAULT_MARGIN,
      default: DEFAULT_MARGIN,
    },
  },
  defaultIncludedServices: DEFAULT_INCLUDED_SERVICES,
  regions: REGIONS,
  externalData: {
    ufMode: "api",
    ufApiSource: "mindicador",
    manualUfValue: 39625,
  },
  finance: {
    enabled: true,
    graceMonths: 3,
    creditTermYears: 25,
    annualInterestRate: 0.0663,
    downPayment: 0,
    financialFeeRate: 0.241,
    plantGuaranteeRate: 0.119,
    financingCostsGuaranteeRate: 0.1,
    legalCostsUf: 4.27,
    operationalCostsUf: 3.2,
    fixedClosingCostClp: 350000,
    propertyValueReference: 320000000,
    salaryReference: 2000000,
    customerAgeReference: 45,
  },
};

export function normalizeBusinessSettings(
  input?: Partial<BusinessSettings> | null,
): BusinessSettings {
  const source = input ?? {};

  return {
    ...defaultBusinessSettings,
    ...source,
    defaultIncludedServices:
      source.defaultIncludedServices ?? defaultBusinessSettings.defaultIncludedServices,
    regions:
      source.regions?.map((region, index) => ({
        ...(defaultBusinessSettings.regions[index] ?? defaultBusinessSettings.regions[0]),
        ...region,
      })) ?? defaultBusinessSettings.regions,
    externalData: {
      ...defaultBusinessSettings.externalData,
      ...source.externalData,
    },
    finance: {
      ...defaultBusinessSettings.finance,
      ...source.finance,
    },
    pricing: {
      ...defaultBusinessSettings.pricing,
      ...source.pricing,
      categoryMargins: {
        ...defaultBusinessSettings.pricing.categoryMargins,
        ...source.pricing?.categoryMargins,
      },
    },
  };
}
