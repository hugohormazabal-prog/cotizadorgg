import {
  DEFAULT_BOARD_TO_METER_METERS,
  DEFAULT_DC_RUN_METERS,
  DEFAULT_INVERTER_TO_BOARD_METERS,
  MONTHLY_YIELD_KWH_PER_KWP,
  MONTHS,
  REGIONAL_SERVICE_COSTS,
  ROOF_PRESETS,
  defaultBusinessSettings,
  type BusinessSettings,
} from "@/lib/config";
import type { MarketDataSnapshot } from "@/lib/market-data";
import {
  catalog,
  catalogDiagnostics,
  findBatteryByName,
  findCableByName,
  findGeneratorByName,
  findInverterByName,
  findServiceByName,
  findStructureByName,
  getFallbackInverters,
  getBestValuePanel,
  selectAerialCable,
  selectAcBoard,
  selectAcCable,
  selectBatteryAccessories,
  selectBreaker,
  selectClamp,
  selectConmutator,
  selectConduitByName,
  selectDifferential,
  selectInverterByTarget,
  selectCommunicationProduct,
  selectSolarCable,
  type BatteryProduct,
  type CatalogProduct,
  type GeneratorProduct,
  type InverterProduct,
  type PanelProduct,
} from "@/lib/catalog";
import { clamp } from "@/lib/utils";

export type QuickStartInput = {
  mode: "bill" | "kwh";
  amount: number;
  regionId: string;
  roofTypeId: string;
};

export type TechnicalConfig = {
  dcRunMeters: number;
  dcUndergroundMeters: number;
  inverterToBoardMeters: number;
  inverterToBoardUndergroundMeters: number;
  boardToMeterMeters: number;
  boardToMeterUndergroundMeters: number;
  boardToMeterAerialMeters: number;
  indoorPvcMeters: number;
  includeMaintenance: boolean;
  isCoastal: boolean;
  includeMeter: boolean;
  includeMonitoring: boolean;
  acCouplingEnabled: boolean;
  manualInverterName: string;
  manualStructureName: string;
  batteryName: string;
  batteryQuantity: number;
  generatorName: string;
  includeConmutator: boolean;
  extraServiceNames: string[];
};

export type CustomerDraft = {
  customerName: string;
  companyName: string;
  address: string;
  phone: string;
  email: string;
};

export type QuoteLineItem = {
  id: string;
  category: string;
  name: string;
  quantity: number;
  unitCost: number;
  unitNetSale: number;
  totalCost: number;
  totalNetSale: number;
  totalGrossSale: number;
  note?: string;
};

export type QuoteResult = {
  region: {
    id: string;
    label: string;
    peakSunHours: number;
    averagePricePerKwh: number;
    injectionPricePerKwh: number;
  };
  roof: {
    id: string;
    label: string;
    structureName: string;
    note: string;
  };
  monthlyConsumptionKwh: number;
  monthlyBill: number;
  targetPowerKw: number;
  selectedPanel: PanelProduct;
  selectedInverter: InverterProduct;
  selectedBattery: BatteryProduct | null;
  selectedGenerator: GeneratorProduct | null;
  panelCount: number;
  installedPowerKw: number;
  monthlyGenerationKwh: number;
  annualGenerationKwh: number;
  monthlyBreakdown: Array<{
    month: string;
    consumptionKwh: number;
    generationKwh: number;
    autoconsumptionKwh: number;
    injectionKwh: number;
    savings: number;
  }>;
  autoconsumptionKwh: number;
  injectionKwh: number;
  monthlySavings: number;
  annualSavings: number;
  offsetPercent: number;
  autonomyNote: string;
  nominalCurrent: number;
  lineItems: QuoteLineItem[];
  totals: {
    cost: number;
    netSale: number;
    vat: number;
    grossSale: number;
  };
  marketData: {
    ufValue: number | null;
    ufDate: string | null;
    ufLabel: string;
    warning: string | null;
  };
  finance: {
    enabled: boolean;
    ufValue: number | null;
    totalProjectClp: number;
    monthlyInstallmentClp: number;
    monthlyInstallmentUf: number;
    termMonths: number;
    graceMonths: number;
    annualInterestRate: number;
    financedToPropertyRatio: number;
    paymentToIncomeRatio: number;
    savingsCoverageRatio: number;
    projectedAgeAtEnd: number;
  } | null;
  paybackYears: number;
  warnings: string[];
};

export const defaultQuickStartInput: QuickStartInput = {
  mode: "bill",
  amount: 180000,
  regionId: "metropolitana",
  roofTypeId: "teja",
};

export const defaultTechnicalConfig: TechnicalConfig = {
  dcRunMeters: DEFAULT_DC_RUN_METERS,
  dcUndergroundMeters: 0,
  inverterToBoardMeters: DEFAULT_INVERTER_TO_BOARD_METERS,
  inverterToBoardUndergroundMeters: 0,
  boardToMeterMeters: DEFAULT_BOARD_TO_METER_METERS,
  boardToMeterUndergroundMeters: 0,
  boardToMeterAerialMeters: 0,
  indoorPvcMeters: 0,
  includeMaintenance: false,
  isCoastal: false,
  includeMeter: false,
  includeMonitoring: false,
  acCouplingEnabled: false,
  manualInverterName: "",
  manualStructureName: "",
  batteryName: "",
  batteryQuantity: 1,
  generatorName: "",
  includeConmutator: false,
  extraServiceNames: [],
};

const placeholderPanel: PanelProduct = {
  id: "panel-placeholder",
  name: "Panel referencial",
  watts: 550,
  amps: 13,
  thickness: 35,
  provider: "Placeholder",
  pricePerWp: 0,
  cost: 0,
  netSale: 0,
  grossSale: 0,
  stock: true,
};

const placeholderInverter: InverterProduct = {
  id: "inverter-placeholder",
  name: "Inversor referencial",
  brand: "Placeholder",
  line: "On-Grid",
  acCoupling: false,
  phases: 1,
  acPowerKw: 5,
  dcPowerKw: 6,
  strings: 2,
  supportsBatteries: false,
  cost: 0,
  netSale: 0,
  grossSale: 0,
  stock: true,
};

function safeQuantity(quantity: number) {
  return Math.max(0, Number.isFinite(quantity) ? quantity : 0);
}

function getCategoryMargin(category: string, settings: Pick<BusinessSettings, "margin" | "pricing">) {
  const normalized = category.toLowerCase();
  const margins = settings.pricing.categoryMargins;

  if (normalized.includes("panel") || normalized.includes("inversor")) return margins.equipment;
  if (normalized.includes("estructura")) return margins.structure;
  if (normalized.includes("cable") || normalized.includes("canal")) return margins.wiring;
  if (normalized.includes("proteccion")) return margins.protections;
  if (normalized.includes("servicio")) return margins.services;
  if (normalized.includes("bateria")) return margins.batteries;
  if (normalized.includes("generador")) return margins.generator;

  return margins.default ?? settings.margin;
}

function applyPriceRounding(value: number, settings: Pick<BusinessSettings, "pricing">) {
  const roundTo = settings.pricing.priceRoundTo;

  if (!roundTo || roundTo <= 0) {
    return value;
  }

  return Math.ceil(value / roundTo) * roundTo;
}

function buildLineItem(
  category: string,
  product: Pick<CatalogProduct, "id" | "name" | "cost" | "netSale">,
  quantity: number,
  settings: Pick<BusinessSettings, "margin" | "vatRate" | "pricing">,
  note?: string,
): QuoteLineItem {
  const safe = safeQuantity(quantity);
  const margin = getCategoryMargin(category, settings);
  const unitCost = product.cost * settings.pricing.catalogCostMultiplier;
  const unitNetSale = applyPriceRounding(unitCost / (1 - margin), settings);

  return {
    id: `${product.id}-${category}`,
    category,
    name: product.name,
    quantity: safe,
    unitCost,
    unitNetSale,
    totalCost: unitCost * safe,
    totalNetSale: unitNetSale * safe,
    totalGrossSale: unitNetSale * safe * (1 + settings.vatRate),
    note,
  };
}

function buildManualLineItem(
  category: string,
  name: string,
  unitCost: number,
  quantity: number,
  settings: Pick<BusinessSettings, "margin" | "vatRate" | "pricing">,
  note?: string,
): QuoteLineItem {
  return buildLineItem(
    category,
    {
      id: `manual-${category.toLowerCase().replace(/\s+/g, "-")}-${name
        .toLowerCase()
        .replace(/\s+/g, "-")}`,
      name,
      cost: unitCost,
      netSale: unitCost / (1 - settings.margin),
    },
    quantity,
    settings,
    note,
  );
}

function sumBy<T>(rows: T[], accessor: (row: T) => number) {
  return rows.reduce((accumulator, row) => accumulator + accessor(row), 0);
}

function calculatePmt(rate: number, periods: number, presentValue: number) {
  if (periods <= 0) {
    return 0;
  }

  if (rate === 0) {
    return presentValue / periods;
  }

  return (rate * presentValue) / (1 - (1 + rate) ** -periods);
}

function uniqueSorted(values: string[]) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));
}

function getRegion(regionId: string) {
  return (
    defaultBusinessSettings.regions.find((region) => region.id === regionId) ??
    defaultBusinessSettings.regions[0]
  );
}

function getRoof(roofTypeId: string) {
  return ROOF_PRESETS.find((roof) => roof.id === roofTypeId) ?? ROOF_PRESETS[0];
}

function calculateMonthlyConsumption(input: QuickStartInput, averagePricePerKwh: number) {
  if (input.mode === "kwh") {
    return Math.max(0, input.amount);
  }

  return averagePricePerKwh > 0 ? Math.max(0, input.amount / averagePricePerKwh) : 0;
}

function calculateNominalCurrent(inverter: InverterProduct) {
  return inverter.phases === 1
    ? (inverter.acPowerKw * 1000) / 220
    : (inverter.acPowerKw * 1000) / (Math.sqrt(3) * 380);
}

function getRegionalServiceCost(regionId: string, serviceName: string) {
  const regional = REGIONAL_SERVICE_COSTS[regionId] ?? {};
  const fallback = REGIONAL_SERVICE_COSTS.metropolitana;

  if (serviceName === "Gestion del proyecto") {
    return regional.projectManagement ?? fallback.projectManagement;
  }

  if (serviceName === "Instalacion Paneles") {
    return regional.installationPerKwp ?? fallback.installationPerKwp;
  }

  if (serviceName === "Ingenieria TE4 y Tramite de Conexion") {
    return regional.engineering ?? fallback.engineering;
  }

  if (serviceName === "Mantenimiento 5 años") {
    return regional.maintenanceFiveYears ?? fallback.maintenanceFiveYears;
  }

  return undefined;
}

function buildServiceLineItem(
  serviceName: string,
  quantity: number,
  regionId: string,
  settings: BusinessSettings,
  note?: string,
) {
  const regionalCost = settings.useRegionalServicePricing
    ? getRegionalServiceCost(regionId, serviceName)
    : undefined;

  if (regionalCost !== undefined) {
    return buildManualLineItem("Servicios", serviceName, regionalCost, quantity, settings, note);
  }

  const service = findServiceByName(serviceName);
  return service ? buildLineItem("Servicios", service, quantity, settings, note) : null;
}

function buildMonthlyGenerationProfile(
  regionId: string,
  installedPowerKw: number,
  monthlyConsumptionKwh: number,
  settings: BusinessSettings,
  regionPeakSunHours: number,
  averagePricePerKwh: number,
  injectionPricePerKwh: number,
) {
  const profile =
    settings.useMonthlyGenerationProfile && MONTHLY_YIELD_KWH_PER_KWP[regionId]
      ? MONTHLY_YIELD_KWH_PER_KWP[regionId]
      : MONTHS.map(() => regionPeakSunHours * 30 * settings.systemEfficiency);
  const monthlyConsumption = monthlyConsumptionKwh;

  return profile.map((yieldPerKwp, index) => {
    const generationKwh = installedPowerKw * yieldPerKwp;
    const autoconsumptionKwh = Math.min(
      monthlyConsumption,
      generationKwh * settings.autoconsumptionRatio,
    );
    const injectionKwh = Math.max(0, generationKwh - autoconsumptionKwh);

    return {
      month: MONTHS[index],
      consumptionKwh: monthlyConsumption,
      generationKwh,
      autoconsumptionKwh,
      injectionKwh,
      savings: autoconsumptionKwh * averagePricePerKwh + injectionKwh * injectionPricePerKwh,
    };
  });
}

function dedupeLineItems(items: QuoteLineItem[]) {
  const grouped = new Map<string, QuoteLineItem>();

  for (const item of items) {
    const existing = grouped.get(item.name);

    if (existing) {
      existing.quantity += item.quantity;
      existing.totalCost += item.totalCost;
      existing.totalNetSale += item.totalNetSale;
      existing.totalGrossSale += item.totalGrossSale;
      continue;
    }

    grouped.set(item.name, { ...item });
  }

  return [...grouped.values()].filter((item) => item.quantity > 0);
}

export function buildQuote(
  input: QuickStartInput,
  technical: TechnicalConfig,
  settings: BusinessSettings = defaultBusinessSettings,
  marketData?: MarketDataSnapshot | null,
): QuoteResult {
  const region =
    settings.regions.find((configuredRegion) => configuredRegion.id === input.regionId) ??
    getRegion(input.regionId);
  const roof = getRoof(input.roofTypeId);
  const selectedPanel = getBestValuePanel() ?? placeholderPanel;
  const warnings: string[] = [];

  if (selectedPanel.id === placeholderPanel.id) {
    warnings.push(
      `No se encontraron paneles validos en el catalogo del cliente. Se uso un panel referencial para evitar que la aplicacion se caiga.`,
    );
  }

  const monthlyConsumptionKwh = calculateMonthlyConsumption(input, region.averagePricePerKwh);
  const monthlyBill = monthlyConsumptionKwh * region.averagePricePerKwh;
  const targetPowerKw =
    monthlyConsumptionKwh <= 0
      ? 0
      : (monthlyConsumptionKwh / 30) / (region.peakSunHours * settings.systemEfficiency);
  const panelCount =
    targetPowerKw > 0 ? Math.max(1, Math.ceil((targetPowerKw * 1000) / selectedPanel.watts)) : 0;
  const installedPowerKw = (panelCount * selectedPanel.watts) / 1000;
  const autoInverter = selectInverterByTarget(Math.max(targetPowerKw, installedPowerKw * 0.8));
  const fallbackInverter = getFallbackInverters()[0] ?? null;
  const manualInverter = technical.manualInverterName
    ? findInverterByName(technical.manualInverterName)
    : null;
  const selectedInverter =
    manualInverter ??
    autoInverter ??
    fallbackInverter ??
    placeholderInverter;

  const structureName = technical.manualStructureName || roof.structureName;
  const selectedStructure = findStructureByName(structureName);

  if (!autoInverter && fallbackInverter) {
    warnings.push(
      `No se encontro un inversor On-Grid exacto para el filtro actual. Se uso "${fallbackInverter.name}" como respaldo comercial.`,
    );
  }

  if (!autoInverter && !fallbackInverter) {
    warnings.push(
      `No se encontraron inversores validos en el catalogo del cliente. Se uso un inversor referencial para mantener operativa la propuesta. Conteos detectados: ${catalogDiagnostics.inverters} inversores, ${catalogDiagnostics.onGridInverters} On-Grid.`,
    );
  }

  const nominalCurrent = calculateNominalCurrent(selectedInverter);
  const breaker = selectBreaker(selectedInverter.phases, nominalCurrent);
  const differential = selectDifferential(selectedInverter.phases, breaker?.amps ?? nominalCurrent);
  const acBoard = selectAcBoard(selectedInverter.phases);
  const conmutator = selectConmutator(selectedInverter.phases, breaker?.amps ?? nominalCurrent);
  const acCable = selectAcCable(
    selectedInverter.phases,
    (breaker?.amps ?? nominalCurrent) * 1.05,
  );
  const redSolarCable = selectSolarCable("Rojo", selectedPanel.amps);
  const blackSolarCable = selectSolarCable("Negro", selectedPanel.amps);
  const groundCable = findCableByName("Cable Verde H07Z1-K 4mm");
  const mc4Connector = findCableByName("MC4 Simple");
  const communicationCable = findCableByName("Apantallado 4 hebras");
  const aerialCable = selectAerialCable(
    selectedInverter.phases,
    (breaker?.amps ?? nominalCurrent) * 1.05,
  );

  const conduitTube = selectConduitByName(
    technical.isCoastal ? "Tuberia RMC Galvanizada 3m" : "Tuberia EMT 3m",
  );
  const conduitConnector = selectConduitByName(
    technical.isCoastal ? "Conector Tuberia RMC a Flexible" : "Conector Tuberia EMT a Flexible",
  );
  const conduitCoupler = selectConduitByName(technical.isCoastal ? "Copla RMC" : "Copla EMT");
  const conduitCurve = selectConduitByName(technical.isCoastal ? "Curva RMC" : "Curva EMT");
  const conduitTerminal = selectConduitByName(
    technical.isCoastal ? "Bushing" : "Terminal Electro Galvanizado",
  );
  const pvcTube = selectConduitByName("Tuberia PVC Conduit 3m");
  const pvcCurve = selectConduitByName("Curva PVC");
  const pvcCoupler = selectConduitByName("Copla PVC");
  const pvcExit = selectConduitByName("Salida de Caja PVC");
  const hazardTape = selectConduitByName("Cinta peligro 100m");
  const fiscalBrick = selectConduitByName("Ladrillo Fiscal 30cm");
  const flexibleTube = selectConduitByName("Tuberia Flexible");
  const flexibleConnector = selectConduitByName("Conector Flexible a HE");
  const clampStrap = selectConduitByName("Abrazadera");
  const junctionBox = selectConduitByName("Caja Galvanizada");
  const splitBolt = selectConduitByName("Perno Partido");
  const pvcTrunking = selectConduitByName("Canaleta PVC 40x16 2m");
  const pvcInnerCorner = selectConduitByName("Canaleta PVC 40x16 ángulo interior");
  const pvcFlatCorner = selectConduitByName("Canaleta PVC 40x16 ángulo plano");
  const aerialClamp = selectConduitByName("Grampa de Retención + Soporte");
  const bimetalClamp = selectConduitByName("Prensa Bimetalica 16-70 mm Al / 6-50 mm Cu");

  const midClamp = selectClamp(selectedPanel.thickness, "mid");
  const endClamp = selectClamp(selectedPanel.thickness, "end");
  const rail = findStructureByName("Riel aluminio 5000 mm");
  const unionRail = findStructureByName("Union riel");
  const groundingPlate = findStructureByName("Placa de Aterrizaje");
  const groundingConnector = findStructureByName("Conector tierra");

  const stringCount = Math.max(1, selectedInverter.strings || 1);
  const conduitMultiplier = stringCount > 6 ? 2 : 1;
  const dcRouteMeters = technical.dcRunMeters + technical.dcUndergroundMeters;
  const inverterToBoardRouteMeters =
    technical.inverterToBoardMeters + technical.inverterToBoardUndergroundMeters;
  const boardToMeterWiredMeters = technical.boardToMeterMeters + technical.boardToMeterUndergroundMeters;
  const dcCableMetersPerColor = Math.ceil(dcRouteMeters * stringCount * 1.25);
  const groundCableMeters = Math.ceil(
    (dcRouteMeters + inverterToBoardRouteMeters + technical.boardToMeterMeters) * 1.25,
  );
  const acInverterToBoardCableMeters = Math.ceil(inverterToBoardRouteMeters * 1.25);
  const acBoardToMeterCableMeters = Math.ceil(boardToMeterWiredMeters * 2 * 1.25);
  const aerialCableMeters =
    technical.boardToMeterAerialMeters > 0 ? technical.boardToMeterAerialMeters + 20 : 0;
  const communicationCableMeters = Math.ceil(inverterToBoardRouteMeters * 1.5);
  const exteriorConduitMeters =
    technical.dcRunMeters + technical.inverterToBoardMeters + technical.boardToMeterMeters;
  const undergroundConduitMeters =
    technical.dcUndergroundMeters +
    technical.inverterToBoardUndergroundMeters +
    technical.boardToMeterUndergroundMeters;
  const conduitTubeUnits = Math.ceil((exteriorConduitMeters / 3) * conduitMultiplier);
  const conduitAccessoryUnits = Math.max(0, Math.ceil(conduitTubeUnits / 2));
  const undergroundTubeUnits = Math.ceil((undergroundConduitMeters / 3) * conduitMultiplier);
  const undergroundAccessoryUnits = Math.max(0, Math.ceil(undergroundTubeUnits / 2));
  const indoorPvcUnits = Math.ceil(technical.indoorPvcMeters / 2);

  const lineItems: QuoteLineItem[] = [
    buildLineItem("Paneles", selectedPanel, panelCount, settings),
    buildLineItem("Inversor", selectedInverter, 1, settings),
  ];

  if (selectedStructure) {
    lineItems.push(
      buildLineItem(
        "Estructura",
        selectedStructure,
        Math.max(1, Math.ceil(panelCount * roof.unitsPerPanel)),
        settings,
        roof.note,
      ),
    );
  } else {
    warnings.push(`No se encontro la estructura "${structureName}" en el catalogo.`);
  }

  if (rail) {
    lineItems.push(buildLineItem("Estructura", rail, Math.max(2, Math.ceil(panelCount / 2)), settings));
  }

  if (unionRail) {
    lineItems.push(
      buildLineItem("Estructura", unionRail, Math.max(1, Math.ceil(panelCount / 2) - 1), settings),
    );
  }

  if (midClamp) {
    lineItems.push(buildLineItem("Estructura", midClamp, Math.max(0, panelCount - 2), settings));
  }

  if (endClamp) {
    lineItems.push(buildLineItem("Estructura", endClamp, panelCount > 1 ? 4 : 2, settings));
  }

  if (groundingPlate) {
    lineItems.push(
      buildLineItem("Estructura", groundingPlate, Math.max(1, Math.ceil(panelCount / 4)), settings),
    );
  }

  if (groundingConnector) {
    lineItems.push(
      buildLineItem("Estructura", groundingConnector, Math.max(1, Math.ceil(panelCount / 8)), settings),
    );
  }

  if (redSolarCable) {
    lineItems.push(
      buildLineItem(
        "Cableado",
        redSolarCable,
        dcCableMetersPerColor,
        settings,
        "Cable solar rojo calculado con distancia DC total por strings y holgura 1.25.",
      ),
    );
  }

  if (blackSolarCable) {
    lineItems.push(
      buildLineItem(
        "Cableado",
        blackSolarCable,
        dcCableMetersPerColor,
        settings,
        "Cable solar negro calculado con distancia DC total por strings y holgura 1.25.",
      ),
    );
  }

  if (groundCable) {
    lineItems.push(
      buildLineItem(
        "Cableado",
        groundCable,
        groundCableMeters,
        settings,
        "Tierra de seguridad según rutas DC, INV-TAB y TAB-PC exterior.",
      ),
    );
  }

  if (mc4Connector) {
    lineItems.push(
      buildLineItem(
        "Cableado",
        mc4Connector,
        panelCount > 0 ? stringCount * 5 : 0,
        settings,
        "Conectores MC4 estimados por strings del inversor seleccionado.",
      ),
    );
  }

  if (acCable) {
    lineItems.push(
      buildLineItem(
        "Cableado",
        acCable,
        acInverterToBoardCableMeters,
        settings,
        "Cable AC INV-TAB con holgura 1.25.",
      ),
    );
    lineItems.push(
      buildLineItem(
        "Cableado",
        acCable,
        acBoardToMeterCableMeters,
        settings,
        "Cable AC TAB-PC con doble tramo y holgura 1.25, siguiendo el Excel.",
      ),
    );
  } else {
    warnings.push("No se encontro un cable AC compatible para la corriente del inversor.");
  }

  if (aerialCable && aerialCableMeters > 0) {
    lineItems.push(
      buildLineItem(
        "Cableado",
        aerialCable,
        aerialCableMeters,
        settings,
        "Cable aereo TAB-PC con reserva de 20 m.",
      ),
    );
  }

  if (communicationCable && communicationCableMeters > 0) {
    lineItems.push(
      buildLineItem(
        "Cableado",
        communicationCable,
        communicationCableMeters,
        settings,
        "Cable de comunicacion para monitoreo/meter.",
      ),
    );
  }

  if (breaker) {
    lineItems.push(buildLineItem("Protecciones AC", breaker, 1, settings));
  } else {
    warnings.push("No se encontro un automatico AC compatible.");
  }

  if (differential) {
    lineItems.push(buildLineItem("Protecciones AC", differential, 1, settings));
  } else {
    warnings.push("No se encontro un diferencial AC compatible.");
  }

  if (acBoard) {
    lineItems.push(buildLineItem("Protecciones AC", acBoard, 1, settings));
  } else {
    warnings.push("No se encontro un tablero AC compatible.");
  }

  const selectedGenerator = technical.generatorName
    ? findGeneratorByName(technical.generatorName)
    : null;

  if (selectedGenerator) {
    lineItems.push(buildLineItem("Generador", selectedGenerator, 1, settings));
  }

  if ((technical.includeConmutator || selectedGenerator) && conmutator) {
    lineItems.push(
      buildLineItem(
        "Protecciones AC",
        conmutator,
        1,
        settings,
        selectedGenerator
          ? "Conmutador agregado por generador de respaldo."
          : "Conmutador agregado manualmente por el asesor.",
      ),
    );
  } else if (technical.includeConmutator || selectedGenerator) {
    warnings.push("Se solicito conmutador, pero no se encontro uno compatible en TAB.");
  }

  const shouldIncludeMeter = technical.includeMeter || selectedInverter.brand !== "Solis";
  const shouldIncludeMonitoring =
    technical.includeMonitoring ||
    (selectedInverter.brand !== "Solis" && selectedInverter.phases === 3);
  const meter = shouldIncludeMeter
    ? selectCommunicationProduct(selectedInverter.brand, selectedInverter.phases, "Meter")
    : null;
  const monitoring = shouldIncludeMonitoring
    ? selectCommunicationProduct(selectedInverter.brand, selectedInverter.phases, "Monitoreo")
    : null;

  if (meter) {
    lineItems.push(
      buildLineItem(
        "Comunicacion",
        meter,
        1,
        settings,
        "Meter agregado segun regla del Excel: se omite por defecto para Solis.",
      ),
    );
  } else if (shouldIncludeMeter) {
    warnings.push(`No se encontro meter compatible para marca ${selectedInverter.brand}.`);
  }

  if (monitoring) {
    lineItems.push(
      buildLineItem(
        "Comunicacion",
        monitoring,
        1,
        settings,
        "Monitoreo agregado por marca/fases del inversor o forzado por asesor.",
      ),
    );
  } else if (shouldIncludeMonitoring) {
    warnings.push(`No se encontro monitoreo compatible para marca ${selectedInverter.brand}.`);
  }

  if (technical.acCouplingEnabled && !selectedInverter.acCoupling) {
    warnings.push(
      `AC coupling fue activado, pero el inversor "${selectedInverter.name}" no figura como compatible en el catalogo.`,
    );
  }

  if (conduitTube && conduitTubeUnits > 0) {
    lineItems.push(buildLineItem("Canalizacion", conduitTube, conduitTubeUnits, settings));
  }

  if (conduitConnector && conduitAccessoryUnits > 0) {
    lineItems.push(buildLineItem("Canalizacion", conduitConnector, conduitAccessoryUnits, settings));
  }

  if (conduitCoupler && conduitTubeUnits > 1) {
    lineItems.push(
      buildLineItem("Canalizacion", conduitCoupler, Math.max(1, conduitTubeUnits - 1), settings),
    );
  }

  if (conduitCurve && conduitTubeUnits > 0) {
    lineItems.push(buildLineItem("Canalizacion", conduitCurve, 2, settings));
  }

  if (conduitTerminal && conduitTubeUnits > 0) {
    lineItems.push(buildLineItem("Canalizacion", conduitTerminal, 2, settings));
  }

  if (pvcTube && undergroundTubeUnits > 0) {
    lineItems.push(
      buildLineItem(
        "Canalizacion soterrada",
        pvcTube,
        undergroundTubeUnits,
        settings,
        "Tuberia PVC para tramos soterrados.",
      ),
    );
  }

  if (pvcCurve && undergroundAccessoryUnits > 0) {
    lineItems.push(buildLineItem("Canalizacion soterrada", pvcCurve, 2, settings));
  }

  if (pvcCoupler && undergroundTubeUnits > 1) {
    lineItems.push(
      buildLineItem("Canalizacion soterrada", pvcCoupler, undergroundTubeUnits - 1, settings),
    );
  }

  if (pvcExit && undergroundAccessoryUnits > 0) {
    lineItems.push(buildLineItem("Canalizacion soterrada", pvcExit, 2, settings));
  }

  if (fiscalBrick && undergroundConduitMeters > 0) {
    lineItems.push(
      buildLineItem(
        "Canalizacion soterrada",
        fiscalBrick,
        Math.ceil(undergroundConduitMeters / 0.3),
        settings,
      ),
    );
  }

  if (hazardTape && undergroundConduitMeters > 0) {
    lineItems.push(
      buildLineItem(
        "Canalizacion soterrada",
        hazardTape,
        Math.max(1, Math.ceil(undergroundConduitMeters / 100)),
        settings,
      ),
    );
  }

  if (flexibleTube && exteriorConduitMeters > 0) {
    lineItems.push(buildLineItem("Canalizacion", flexibleTube, 2 * conduitMultiplier, settings));
  }

  if (flexibleConnector && exteriorConduitMeters > 0) {
    lineItems.push(buildLineItem("Canalizacion", flexibleConnector, 2 * conduitMultiplier, settings));
  }

  if (clampStrap && exteriorConduitMeters > 0) {
    lineItems.push(
      buildLineItem("Canalizacion", clampStrap, Math.ceil(exteriorConduitMeters / 1.5), settings),
    );
  }

  if (junctionBox && exteriorConduitMeters > 0) {
    lineItems.push(buildLineItem("Canalizacion", junctionBox, 1, settings));
  }

  if (splitBolt && exteriorConduitMeters > 0) {
    lineItems.push(buildLineItem("Canalizacion", splitBolt, 1, settings));
  }

  if (pvcTrunking && indoorPvcUnits > 0) {
    lineItems.push(buildLineItem("Canaleta interior", pvcTrunking, indoorPvcUnits, settings));
  }

  if (pvcInnerCorner && indoorPvcUnits > 0) {
    lineItems.push(buildLineItem("Canaleta interior", pvcInnerCorner, 1, settings));
  }

  if (pvcFlatCorner && indoorPvcUnits > 0) {
    lineItems.push(buildLineItem("Canaleta interior", pvcFlatCorner, 1, settings));
  }

  if (aerialClamp && technical.boardToMeterAerialMeters > 0) {
    lineItems.push(
      buildLineItem(
        "Canalizacion aerea",
        aerialClamp,
        Math.floor(technical.boardToMeterAerialMeters / 20) + 2,
        settings,
      ),
    );
  }

  if (bimetalClamp && technical.boardToMeterAerialMeters > 0) {
    lineItems.push(
      buildLineItem(
        "Canalizacion aerea",
        bimetalClamp,
        4 + 2 * (selectedInverter.phases - 1),
        settings,
      ),
    );
  }

  for (const serviceName of settings.defaultIncludedServices) {
    const quantity = serviceName === "Instalacion Paneles" ? installedPowerKw : 1;
    const serviceItem = buildServiceLineItem(
      serviceName,
      quantity,
      region.id,
      settings,
      settings.useRegionalServicePricing
        ? "Costo regional tomado desde la matriz SERVBACK del Excel."
        : undefined,
    );

    if (serviceItem) {
      lineItems.push(serviceItem);
    }
  }

  if (technical.includeMaintenance) {
    const maintenance = buildServiceLineItem(
      "Mantenimiento 5 años",
      1,
      region.id,
      settings,
      "Servicio opcional activado por el asesor.",
    );

    if (maintenance) {
      lineItems.push(maintenance);
    }
  }

  for (const extraServiceName of technical.extraServiceNames) {
    const service = findServiceByName(extraServiceName);

    if (service) {
      lineItems.push(buildLineItem("Servicios", service, 1, settings));
    }
  }

  const selectedBattery =
    technical.batteryName && technical.batteryQuantity > 0
      ? findBatteryByName(technical.batteryName)
      : null;

  if (selectedBattery) {
    lineItems.push(
      buildLineItem(
        "Baterias",
        selectedBattery,
        Math.max(1, Math.round(technical.batteryQuantity)),
        settings,
      ),
    );

    const batteryInstallation = findServiceByName("Instalacion Bateria");
    if (batteryInstallation) {
      lineItems.push(buildLineItem("Servicios", batteryInstallation, 1, settings));
    }

    for (const accessory of selectBatteryAccessories(selectedBattery, selectedInverter)) {
      const quantity = accessory.role === "cabinet" ? Math.max(1, Math.ceil(technical.batteryQuantity / 4)) : 1;
      lineItems.push(
        buildLineItem(
          "Accesorios bateria",
          accessory,
          quantity,
          settings,
          "Accesorio seleccionado segun matriz COMPBAT del Excel.",
        ),
      );
    }

    if (!selectedInverter.supportsBatteries) {
      warnings.push(
        "La bateria fue agregada, pero el inversor seleccionado no figura como compatible con baterias.",
      );
    }
  }

  const dedupedItems = dedupeLineItems(lineItems);
  const totalCost = sumBy(dedupedItems, (item) => item.totalCost);
  const totalNetSale = sumBy(dedupedItems, (item) => item.totalNetSale);
  const totalVat = totalNetSale * settings.vatRate;
  const totalGrossSale = totalNetSale + totalVat;

  const monthlyBreakdown = buildMonthlyGenerationProfile(
    region.id,
    installedPowerKw,
    monthlyConsumptionKwh,
    settings,
    region.peakSunHours,
    region.averagePricePerKwh,
    region.injectionPricePerKwh,
  );
  const annualGenerationKwh = sumBy(monthlyBreakdown, (month) => month.generationKwh);
  const monthlyGenerationKwh = annualGenerationKwh / 12;
  const autoconsumptionKwh = sumBy(monthlyBreakdown, (month) => month.autoconsumptionKwh) / 12;
  const injectionKwh = sumBy(monthlyBreakdown, (month) => month.injectionKwh) / 12;
  const annualSavings = sumBy(monthlyBreakdown, (month) => month.savings);
  const monthlySavings = annualSavings / 12;
  const offsetPercent = monthlyBill > 0 ? clamp(monthlySavings / monthlyBill, 0, 1.25) : 0;
  const paybackYears = annualSavings > 0 ? totalGrossSale / annualSavings : 0;
  const resolvedUfValue =
    settings.externalData.ufMode === "manual"
      ? settings.externalData.manualUfValue
      : marketData?.ufValue ?? settings.externalData.manualUfValue;
  const resolvedMarketData = {
    ufValue: resolvedUfValue,
    ufDate: marketData?.ufDate ?? null,
    ufLabel:
      settings.externalData.ufMode === "manual"
        ? "Valor manual"
        : (marketData?.ufLabel ?? "UF en linea"),
    warning: marketData?.warning ?? null,
  };
  const termMonths = settings.finance.creditTermYears * 12;
  const monthlyInterestRate = (1 + settings.finance.annualInterestRate) ** (1 / 12) - 1;
  const financingBaseCostsGross =
    (((resolvedUfValue ?? 0) *
      (settings.finance.legalCostsUf + settings.finance.operationalCostsUf)) +
      settings.finance.fixedClosingCostClp) *
    (1 + settings.vatRate);
  const plantNet = Math.max(0, (totalGrossSale - settings.finance.downPayment) / (1 + settings.vatRate));
  const guaranteeNet =
    settings.finance.enabled && plantNet > 0
      ? ((settings.finance.plantGuaranteeRate * plantNet +
          settings.finance.financingCostsGuaranteeRate * financingBaseCostsGross +
          settings.finance.plantGuaranteeRate * settings.finance.financialFeeRate * plantNet +
          settings.finance.financingCostsGuaranteeRate *
            financingBaseCostsGross *
            settings.finance.financialFeeRate) /
          (1 -
            settings.finance.plantGuaranteeRate -
            settings.finance.plantGuaranteeRate * settings.finance.financialFeeRate))
      : 0;
  const totalInstallerNet = plantNet + guaranteeNet;
  const financingVat = totalInstallerNet * settings.vatRate;
  const subtotalForCredit = totalInstallerNet + financingBaseCostsGross + financingVat;
  const financialFee = subtotalForCredit * settings.finance.financialFeeRate;
  const totalCreditProject = subtotalForCredit + financialFee;
  const monthlyInstallmentClp =
    settings.finance.enabled && totalCreditProject > 0
      ? calculatePmt(
          monthlyInterestRate,
          termMonths,
          totalCreditProject * (1 + monthlyInterestRate) ** settings.finance.graceMonths,
        )
      : 0;
  const monthlyInstallmentUf =
    resolvedUfValue && resolvedUfValue > 0 ? monthlyInstallmentClp / resolvedUfValue : 0;
  const finance =
    settings.finance.enabled && resolvedUfValue
      ? {
          enabled: true,
          ufValue: resolvedUfValue,
          totalProjectClp: totalCreditProject,
          monthlyInstallmentClp,
          monthlyInstallmentUf,
          termMonths,
          graceMonths: settings.finance.graceMonths,
          annualInterestRate: settings.finance.annualInterestRate,
          financedToPropertyRatio:
            settings.finance.propertyValueReference > 0
              ? totalCreditProject / settings.finance.propertyValueReference
              : 0,
          paymentToIncomeRatio:
            settings.finance.salaryReference > 0
              ? monthlyInstallmentClp / settings.finance.salaryReference
              : 0,
          savingsCoverageRatio:
            monthlyBill > 0
              ? (Math.min(monthlyBill * 12, annualSavings) - monthlyInstallmentClp * 12) /
                (monthlyBill * 12)
              : 0,
          projectedAgeAtEnd:
            settings.finance.customerAgeReference + settings.finance.creditTermYears,
        }
      : null;

  return {
    region,
    roof: {
      id: roof.id,
      label: roof.label,
      structureName,
      note: roof.note,
    },
    monthlyConsumptionKwh,
    monthlyBill,
    targetPowerKw,
    selectedPanel,
    selectedInverter,
    selectedBattery,
    selectedGenerator,
    panelCount,
    installedPowerKw,
    monthlyGenerationKwh,
    annualGenerationKwh,
    monthlyBreakdown,
    autoconsumptionKwh,
    injectionKwh,
    monthlySavings,
    annualSavings,
    offsetPercent,
    autonomyNote:
      "La etapa preliminar usa autoconsumo e inyeccion estimados. En la etapa tecnica puedes ajustar distancias, inversor, bateria y servicios.",
    nominalCurrent,
    lineItems: dedupedItems,
    totals: {
      cost: totalCost,
      netSale: totalNetSale,
      vat: totalVat,
      grossSale: totalGrossSale,
    },
    marketData: resolvedMarketData,
    finance,
    paybackYears,
    warnings,
  };
}

export function getAvailableServiceNames() {
  return uniqueSorted(
    catalog.services
      .map((service) => service.name)
      .filter((name) => !defaultBusinessSettings.defaultIncludedServices.includes(name)),
  );
}

export function getAllServiceNames() {
  return uniqueSorted(catalog.services.map((service) => service.name));
}

export function getAvailableBatteryNames() {
  return uniqueSorted(
    catalog.batteries.filter((battery) => battery.stock).map((battery) => battery.name),
  );
}

export function getAvailableGeneratorNames() {
  return uniqueSorted(
    catalog.generators.filter((generator) => generator.stock).map((generator) => generator.name),
  );
}

export function getAvailableInverterNames() {
  const preferred = catalog.inverters
    .filter((inverter) => {
      if (!inverter.stock) return false;

      const normalizedLine = inverter.line.toLowerCase();
      return (
        normalizedLine === "on-grid" ||
        normalizedLine === "on grid" ||
        (normalizedLine.includes("grid") && !normalizedLine.includes("off"))
      );
    })
    .map((inverter) => inverter.name);

  return uniqueSorted(
    preferred.length > 0
      ? preferred
      : catalog.inverters.filter((inverter) => inverter.stock).map((inverter) => inverter.name),
  );
}

export function getAvailableStructureNames() {
  return uniqueSorted(
    catalog.structures.filter((structure) => structure.stock).map((structure) => structure.name),
  );
}
