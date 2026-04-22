import rawCatalog from "@/data/full_catalog.json";
import { DEFAULT_MARGIN, ROOF_PRESETS } from "@/lib/config";
import { toSlug } from "@/lib/utils";

type RawRow = Record<string, unknown>;

export type CatalogProduct = {
  id: string;
  name: string;
  cost: number;
  netSale: number;
  grossSale: number;
  stock: boolean;
};

export type PanelProduct = CatalogProduct & {
  watts: number;
  amps: number;
  thickness: number;
  provider: string;
  pricePerWp: number;
};

export type InverterProduct = CatalogProduct & {
  brand: string;
  line: string;
  acCoupling: boolean;
  phases: 1 | 3;
  acPowerKw: number;
  dcPowerKw: number;
  strings: number;
  supportsBatteries: boolean;
};

export type StructureProduct = CatalogProduct & {
  widthMm: number;
};

export type CableProduct = CatalogProduct & {
  amps: number;
  family: string;
  variant: string;
};

export type ProtectionProduct = CatalogProduct & {
  kind: string;
  type: string;
  subtype: string;
  amps: number;
  phases: 1 | 3 | 0;
  milliAmps: number;
  slots: number;
};

export type ServiceProduct = CatalogProduct;

export type BatteryProduct = CatalogProduct & {
  brand: string;
  chemistry: string;
  wh: number;
  voltage: number;
  searchCode: string;
};

export type GeneratorProduct = CatalogProduct & {
  watts: number;
  phases: 1 | 3;
  brand: string;
};

export type AccessoryProduct = CatalogProduct & {
  brand: string;
  family: string;
  phases: 1 | 3;
  priority: number;
  searchCode: string;
  role: "smartguard" | "dc-dc" | "cabinet" | "cable" | "switch" | "fuse" | "terminal" | "other";
};

export type CommunicationProduct = CatalogProduct & {
  brand: string;
  line: string;
  kind: "Meter" | "Monitoreo" | "Accesorio";
  phases: 1 | 3;
};

export type ConduitProduct = {
  id: string;
  name: string;
  sizeMm: 25 | 32 | 40 | 50;
  cost: number;
  netSale: number;
  grossSale: number;
};

function toNumber(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const normalized = Number(value.replace(",", "."));
    return Number.isFinite(normalized) ? normalized : 0;
  }

  return 0;
}

function toText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function toStock(value: unknown) {
  return toText(value).toUpperCase() !== "NO";
}

function calculateNetSale(cost: number) {
  return cost / (1 - DEFAULT_MARGIN);
}

function buildProductId(prefix: string, name: string) {
  return `${prefix}-${toSlug(name)}`;
}

function normalizePanel(row: RawRow): PanelProduct | null {
  const name = toText(row["-"]);
  const watts = toNumber(row.W);
  const cost = toNumber(row.Costo);

  if (!name || watts <= 0 || cost <= 0) {
    return null;
  }

  const netSale = calculateNetSale(cost);

  return {
    id: buildProductId("panel", name),
    name,
    watts,
    amps: toNumber(row.A),
    thickness: toNumber(row.Espesor),
    provider: toText(row.col_11),
    cost,
    netSale,
    grossSale: netSale * 1.19,
    stock: true,
    pricePerWp: cost / watts,
  };
}

function normalizeInverter(row: RawRow): InverterProduct | null {
  const name = toText(row.col_0);
  const acPowerKw = toNumber(row["Potencia AC"]);
  const cost = toNumber(row["Costo NETO"]);

  if (!name || name === "NA" || acPowerKw <= 0 || cost <= 0) {
    return null;
  }

  const netSale = calculateNetSale(cost);

  return {
    id: buildProductId("inverter", name),
    name,
    brand: toText(row.Kehua) || "Sin marca",
    line: toText(row.Linea) || "Sin linea",
    acCoupling: toText(row["AC COUPLING"]).toUpperCase() === "SI",
    phases: toNumber(row.Fases) === 3 ? 3 : 1,
    acPowerKw,
    dcPowerKw: toNumber(row["Potencia DC Adm"]),
    strings: toNumber(row["N° Strings"]),
    supportsBatteries: toText(row["Soporta Baterías"]).toUpperCase() === "SI",
    cost,
    netSale,
    grossSale: netSale * 1.19,
    stock: toStock(row.STOCK),
  };
}

function normalizeStructure(row: RawRow): StructureProduct | null {
  const name = toText(row.col_0);
  const cost = toNumber(row.Costo);

  if (!name || name === "NA" || cost <= 0) {
    return null;
  }

  const netSale = calculateNetSale(cost);

  return {
    id: buildProductId("structure", name),
    name,
    widthMm: toNumber(row.col_3),
    cost,
    netSale,
    grossSale: netSale * 1.19,
    stock: toStock(row.col_1),
  };
}

function normalizeCable(row: RawRow): CableProduct | null {
  const name = toText(row.col_0);
  const cost = toNumber(row.Costo);

  if (!name || cost <= 0) {
    return null;
  }

  const netSale = calculateNetSale(cost);

  return {
    id: buildProductId("cable", name),
    name,
    amps: toNumber(row.A),
    family: toText(row["Tipo A"]),
    variant: String(row["Tipo B"] ?? ""),
    cost,
    netSale,
    grossSale: netSale * 1.19,
    stock: toStock(row.STOCK),
  };
}

function normalizeProtection(row: RawRow): ProtectionProduct | null {
  const name = toText(row.col_0);
  const kind = toText(row.Tipo);
  const cost = toNumber(row.Costo);

  if (!name || !kind || cost <= 0) {
    return null;
  }

  const netSale = calculateNetSale(cost);

  return {
    id: buildProductId("protection", name),
    name,
    kind,
    type: toText(row["Tipo 2"]),
    subtype: toText(row["Tipo 3"]),
    amps: toNumber(row.A),
    phases: toNumber(row.Fases) === 3 ? 3 : toNumber(row.Fases) === 1 ? 1 : 0,
    milliAmps: toNumber(row.mA),
    slots: toNumber(row["Tipo 4"]),
    cost,
    netSale,
    grossSale: netSale * 1.19,
    stock: toStock(row.STOCK),
  };
}

function normalizeService(row: RawRow): ServiceProduct | null {
  const originalName = toText(row.col_0);
  const cost = toNumber(row.Costo);

  if (!originalName || cost <= 0) {
    return null;
  }

  const normalizedName = originalName
    .replace("Gestión", "Gestion")
    .replace("Instalación", "Instalacion")
    .replace("Ingeniería", "Ingenieria")
    .replace("Trámite", "Tramite")
    .replace("Conexión", "Conexion")
    .replace("Batería", "Bateria");

  const netSale = calculateNetSale(cost);

  return {
    id: buildProductId("service", normalizedName),
    name: normalizedName,
    cost,
    netSale,
    grossSale: netSale * 1.19,
    stock: toStock(row.STOCK),
  };
}

function normalizeBattery(row: RawRow): BatteryProduct | null {
  const name = toText(row.col_0);
  const wh = toNumber(row.Wh);
  const cost = toNumber(row.Costo);

  if (!name || name === "NA" || wh <= 0 || cost <= 0) {
    return null;
  }

  const netSale = calculateNetSale(cost);

  return {
    id: buildProductId("battery", name),
    name,
    brand: toText(row.MARCA) || "Sin marca",
    chemistry: toText(row["Tipo Bateria"]),
    wh,
    voltage: toNumber(row.V),
    searchCode: toText(row["Código Busqueda"]),
    cost,
    netSale,
    grossSale: netSale * 1.19,
    stock: toStock(row.STOCK),
  };
}

function inferAccessoryRole(name: string): AccessoryProduct["role"] {
  const normalized = name.toLowerCase();

  if (normalized.includes("smartguard")) return "smartguard";
  if (normalized.includes("dc/dc") || normalized.includes("modulo dc")) return "dc-dc";
  if (normalized.includes("gabinete")) return "cabinet";
  if (normalized.includes("cable")) return "cable";
  if (normalized.includes("switch")) return "switch";
  if (normalized.includes("fusible")) return "fuse";
  if (normalized.includes("terminal")) return "terminal";

  return "other";
}

function normalizeAccessory(row: RawRow): AccessoryProduct | null {
  const name = toText(row.col_0);
  const cost = toNumber(row.Costo);

  if (!name || cost <= 0) {
    return null;
  }

  const netSale = calculateNetSale(cost);

  return {
    id: buildProductId("accessory", `${name}-${toText(row["Código Busqueda"])}`),
    name,
    brand: toText(row.MARCA) || "Sin marca",
    family: toText(row["Tipo Bateria"]),
    phases: toNumber(row.Fases) === 3 ? 3 : 1,
    priority: toNumber(row.Prioridad),
    searchCode: toText(row["Código Busqueda"]),
    role: inferAccessoryRole(name),
    cost,
    netSale,
    grossSale: netSale * 1.19,
    stock: toStock(row.STOCK),
  };
}

function normalizeCommunication(row: RawRow): CommunicationProduct | null {
  const name = toText(row.col_0);
  const cost = toNumber(row["Costo NETO"]);
  const kind = toText(row.col_3);

  if (!name || name === "NA" || cost <= 0) {
    return null;
  }

  const netSale = calculateNetSale(cost);

  return {
    id: buildProductId("communication", name),
    name,
    brand: toText(row.col_1) || "Sin marca",
    line: toText(row.col_2),
    kind: kind === "Meter" ? "Meter" : kind === "Monitoreo" ? "Monitoreo" : "Accesorio",
    phases: toNumber(row.col_4) === 3 ? 3 : 1,
    cost,
    netSale,
    grossSale: netSale * 1.19,
    stock: true,
  };
}

function normalizeGenerator(row: RawRow): GeneratorProduct | null {
  const name = toText(row.col_0);
  const watts = toNumber(row.W);
  const cost = toNumber(row.Costo);

  if (!name || watts <= 0 || cost <= 0) {
    return null;
  }

  const netSale = calculateNetSale(cost);

  return {
    id: buildProductId("generator", name),
    name,
    watts,
    phases: toNumber(row.Fases) === 3 ? 3 : 1,
    brand: toText(row.MARCA) || "Sin marca",
    cost,
    netSale,
    grossSale: netSale * 1.19,
    stock: toStock(row.STOCK),
  };
}

function normalizeConduits(rows: RawRow[]): ConduitProduct[] {
  return rows
    .filter((row) => toText(row["Canalización EMT"]))
    .map((row) => {
      const name = toText(row["Canalización EMT"]);
      const cost = toNumber(row["25mm"]);
      const netSale = calculateNetSale(cost);

      return {
        id: buildProductId("conduit", name),
        name,
        sizeMm: 25 as const,
        cost,
        netSale,
        grossSale: netSale * 1.19,
      };
    })
    .filter((row) => row.cost > 0);
}

const panels = (rawCatalog.PAN as RawRow[])
  .map(normalizePanel)
  .filter((row): row is PanelProduct => row !== null);

const inverters = (rawCatalog.INV as RawRow[])
  .map(normalizeInverter)
  .filter((row): row is InverterProduct => row !== null);

const structures = (rawCatalog.EST as RawRow[])
  .map(normalizeStructure)
  .filter((row): row is StructureProduct => row !== null);

const cables = (rawCatalog.CABLE as RawRow[])
  .map(normalizeCable)
  .filter((row): row is CableProduct => row !== null);

const protections = (rawCatalog.TAB as RawRow[])
  .map(normalizeProtection)
  .filter((row): row is ProtectionProduct => row !== null);

const services = (rawCatalog.SERV as RawRow[])
  .map(normalizeService)
  .filter((row): row is ServiceProduct => row !== null);

const batteries = (rawCatalog.BAT as RawRow[])
  .map(normalizeBattery)
  .filter((row): row is BatteryProduct => row !== null);

const accessories = (rawCatalog.COMPBAT as RawRow[])
  .map(normalizeAccessory)
  .filter((row): row is AccessoryProduct => row !== null);

const communications = (rawCatalog.COM as RawRow[])
  .map(normalizeCommunication)
  .filter((row): row is CommunicationProduct => row !== null);

const generators = (rawCatalog.GENERADOR as RawRow[])
  .map(normalizeGenerator)
  .filter((row): row is GeneratorProduct => row !== null);

const conduits = normalizeConduits(rawCatalog.CAN as RawRow[]);

export const catalog = {
  panels,
  inverters,
  structures,
  cables,
  protections,
  services,
  batteries,
  accessories,
  communications,
  generators,
  conduits,
};

export const catalogDiagnostics = {
  panels: panels.length,
  inverters: inverters.length,
  onGridInverters: inverters.filter((inverter) => {
    const normalizedLine = inverter.line.toLowerCase();
    return (
      normalizedLine === "on-grid" ||
      normalizedLine === "on grid" ||
      (normalizedLine.includes("grid") && !normalizedLine.includes("off"))
    );
  }).length,
  structures: structures.length,
  services: services.length,
  batteries: batteries.length,
  accessories: accessories.length,
  communications: communications.length,
  generators: generators.length,
};

export function getBestValuePanel() {
  return [...catalog.panels]
    .filter((panel) => panel.stock)
    .sort((a, b) => a.pricePerWp - b.pricePerWp || b.watts - a.watts)[0];
}

export function getOnGridInverters() {
  return [...catalog.inverters]
    .filter((inverter) => {
      const normalizedLine = inverter.line.toLowerCase();
      const looksOnGrid =
        normalizedLine === "on-grid" ||
        normalizedLine === "on grid" ||
        (normalizedLine.includes("grid") && !normalizedLine.includes("off"));

      return inverter.stock && looksOnGrid;
    })
    .sort((a, b) => a.acPowerKw - b.acPowerKw || a.cost - b.cost);
}

export function getFallbackInverters() {
  return [...catalog.inverters]
    .filter((inverter) => inverter.stock)
    .sort((a, b) => a.acPowerKw - b.acPowerKw || a.cost - b.cost);
}

export function getStructureOptions() {
  return ROOF_PRESETS.map((preset) => ({
    preset,
    product: catalog.structures.find((row) => row.name === preset.structureName) ?? null,
  }));
}

export function findStructureByName(name: string) {
  return catalog.structures.find((structure) => structure.name === name) ?? null;
}

export function findServiceByName(name: string) {
  return catalog.services.find((service) => service.name === name) ?? null;
}

export function findBatteryByName(name: string) {
  return catalog.batteries.find((battery) => battery.name === name) ?? null;
}

export function selectBatteryAccessories(battery: BatteryProduct, inverter: InverterProduct) {
  const selected: AccessoryProduct[] = [];
  const exactMatches = catalog.accessories.filter(
    (accessory) => accessory.stock && accessory.searchCode === battery.searchCode,
  );

  if (inverter.brand === "Huawei" || battery.brand === "Huawei") {
    const smartguard = exactMatches
      .filter((accessory) => accessory.role === "smartguard" && accessory.phases === inverter.phases)
      .sort((a, b) => a.priority - b.priority || a.cost - b.cost)[0];
    const dcDc = exactMatches
      .filter((accessory) => accessory.role === "dc-dc" && accessory.phases === inverter.phases)
      .sort((a, b) => a.priority - b.priority || a.cost - b.cost)[0];

    if (smartguard) selected.push(smartguard);
    if (dcDc) selected.push(dcDc);
  }

  if (battery.brand === "Pylontech") {
    const cable = exactMatches
      .filter((accessory) => accessory.role === "cable")
      .sort((a, b) => a.priority - b.priority || a.cost - b.cost)[0];

    if (cable) selected.push(cable);
  }

  if (battery.chemistry === "LITIO" && battery.brand !== "Huawei") {
    const cabinet = catalog.accessories
      .filter((accessory) => accessory.stock && accessory.role === "cabinet" && accessory.family === "LITIO")
      .sort((a, b) => a.cost - b.cost)[0];

    if (cabinet) selected.push(cabinet);
  }

  if (battery.chemistry === "GEL") {
    const cabinet = catalog.accessories
      .filter((accessory) => accessory.stock && accessory.role === "cabinet" && accessory.family === "GEL")
      .sort((a, b) => a.cost - b.cost)[0];

    if (cabinet) selected.push(cabinet);
  }

  return [...new Map(selected.map((accessory) => [accessory.id, accessory])).values()];
}

export function findInverterByName(name: string) {
  return catalog.inverters.find((inverter) => inverter.name === name) ?? null;
}

export function findGeneratorByName(name: string) {
  return catalog.generators.find((generator) => generator.name === name) ?? null;
}

function brandAliases(brand: string) {
  if (brand === "VictronMultiplusII") return ["VictronMultiplusII", "Victron"];
  if (brand === "Canadian Solar") return ["Canadian Solar", "Canadian"];
  return [brand];
}

export function selectCommunicationProduct(
  brand: string,
  phases: 1 | 3,
  kind: "Meter" | "Monitoreo",
) {
  const aliases = brandAliases(brand);

  return (
    [...catalog.communications]
      .filter(
        (product) =>
          product.stock &&
          product.kind === kind &&
          aliases.includes(product.brand) &&
          product.phases === phases,
      )
      .sort((a, b) => a.cost - b.cost)[0] ??
    [...catalog.communications]
      .filter(
        (product) =>
          product.stock && product.kind === kind && aliases.includes(product.brand),
      )
      .sort((a, b) => a.cost - b.cost)[0] ??
    null
  );
}

export function selectInverterByTarget(targetKw: number) {
  const candidates = getOnGridInverters();
  return (
    candidates.find((inverter) => inverter.acPowerKw >= targetKw) ??
    candidates[candidates.length - 1] ??
    null
  );
}

export function selectClamp(thickness: number, edge: "mid" | "end") {
  const preferredThickness = thickness >= 38 ? 40 : thickness >= 33 ? 35 : 30;
  const desiredName =
    edge === "mid"
      ? `Clamp intermedio ${preferredThickness}mm`
      : `Clamp Terminal ${preferredThickness}mm`;

  return (
    catalog.structures.find((structure) => structure.name === desiredName) ??
    catalog.structures.find((structure) =>
      structure.name.includes(edge === "mid" ? "Clamp intermedio" : "Clamp Terminal"),
    ) ??
    null
  );
}

export function selectSolarCable(color: "Rojo" | "Negro", requiredAmps = 40) {
  return (
    [...catalog.cables]
      .filter(
        (cable) =>
          cable.stock &&
          cable.family === "SOLAR" &&
          cable.name.includes(color) &&
          cable.amps >= requiredAmps,
      )
      .sort((a, b) => a.cost - b.cost)[0] ?? null
  );
}

export function findCableByName(name: string) {
  return catalog.cables.find((cable) => cable.name === name) ?? null;
}

export function selectAerialCable(phases: 1 | 3, requiredAmps: number) {
  return (
    [...catalog.cables]
      .filter(
        (cable) =>
          cable.stock &&
          cable.family === "AL" &&
          cable.amps >= requiredAmps &&
          (phases === 1 ? cable.name.includes("3x") : cable.name.includes("3x")),
      )
      .sort((a, b) => a.amps - b.amps || a.cost - b.cost)[0] ?? null
  );
}

export function selectAcCable(phases: 1 | 3, requiredAmps: number) {
  const desiredPattern = phases === 1 ? "Cordon RVK 3x" : "Cordon RVK 5x";

  return (
    [...catalog.cables]
      .filter(
        (cable) =>
          cable.stock &&
          cable.name.startsWith(desiredPattern) &&
          cable.amps >= requiredAmps,
      )
      .sort((a, b) => a.amps - b.amps || a.cost - b.cost)[0] ?? null
  );
}

export function selectBreaker(phases: 1 | 3, requiredAmps: number) {
  const type = phases === 1 ? "Bipolar" : "Tetrapolar";

  return (
    [...catalog.protections]
      .filter(
        (protection) =>
          protection.stock &&
          protection.kind === "Automático" &&
          protection.type === type &&
          protection.amps >= requiredAmps,
      )
      .sort((a, b) => a.amps - b.amps || a.cost - b.cost)[0] ?? null
  );
}

export function selectDifferential(phases: 1 | 3, requiredAmps: number) {
  const type = phases === 1 ? "Bipolar" : "Tetrapolar";

  return (
    [...catalog.protections]
      .filter(
        (protection) =>
          protection.stock &&
          protection.kind === "Diferencial" &&
          protection.type === type &&
          protection.amps >= requiredAmps,
      )
      .sort((a, b) => {
        if (a.subtype !== b.subtype) {
          if (a.subtype === "A") return -1;
          if (b.subtype === "A") return 1;
        }

        return a.amps - b.amps || a.cost - b.cost;
      })[0] ?? null
  );
}

export function selectAcBoard(phases: 1 | 3) {
  const minimumSlots = phases === 1 ? 18 : 36;

  return (
    [...catalog.protections]
      .filter(
        (protection) =>
          protection.stock &&
          protection.kind === "Tablero AC" &&
          protection.slots >= minimumSlots,
      )
      .sort((a, b) => a.slots - b.slots || a.cost - b.cost)[0] ?? null
  );
}

export function selectConmutator(phases: 1 | 3, requiredAmps: number) {
  return (
    [...catalog.protections]
      .filter(
        (protection) =>
          protection.stock &&
          protection.kind === "Conmutador" &&
          protection.phases === phases &&
          protection.amps >= requiredAmps,
      )
      .sort((a, b) => a.amps - b.amps || a.cost - b.cost)[0] ??
    [...catalog.protections]
      .filter((protection) => protection.stock && protection.kind === "Conmutador")
      .sort((a, b) => a.amps - b.amps || a.cost - b.cost)[0] ??
    null
  );
}

export function selectConduitByName(name: string) {
  return catalog.conduits.find((conduit) => conduit.name === name) ?? null;
}
