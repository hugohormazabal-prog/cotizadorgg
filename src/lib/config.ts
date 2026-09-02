import {
  DEFAULT_INVERTERS,
  DEFAULT_PANELS,
  normalizeInverters,
  normalizePanels,
  type InverterCatalogItem,
  type PanelCatalogItem,
} from './equipmentCatalog';

// Configuración del cotizador residencial.

export type Region =
  | 'De Arica'
  | 'De Tarapacá'
  | 'De Antofagasta'
  | 'De Coquimbo'
  | 'De Valparaíso'
  | 'Metropolitana'
  | "De O'Higgins"
  | 'Del Maule'
  | 'Del Ñuble'
  | 'Del Biobío'
  | 'De la Araucanía'
  | 'De los Ríos'
  | 'De los Lagos'
  | 'De Aysén';

export type GeneracionMensual = [number, number, number, number, number, number, number, number, number, number, number, number];
export type GeneracionPorZona = Record<Region, GeneracionMensual>;

export type CategoriaPartidaKwp = 'materiales' | 'servicios';
export type TipoCalculoPartida = 'fijo-variable' | 'fijo-regional' | 'variable-regional';

export const REGIONES: Region[] = [
  'De Arica', 'De Tarapacá', 'De Antofagasta', 'De Coquimbo',
  'De Valparaíso', 'Metropolitana', "De O'Higgins", 'Del Maule',
  'Del Ñuble', 'Del Biobío', 'De la Araucanía', 'De los Ríos',
  'De los Lagos', 'De Aysén',
];

export type CostosRegionales = Record<Region, number>;

export interface PartidaCostoKwp {
  id: string;
  nombre: string;
  categoria: CategoriaPartidaKwp;
  tipoCalculo: TipoCalculoPartida;
  costoFijoNetoClp: number;
  costoVariableNetoClpPorKwp: number;
  costosRegionalesNeto: CostosRegionales | null;
  activa: boolean;
  referenciaExcel: string;
}

export interface ReglaInversorPorPaneles {
  id: string;
  minPaneles: number;
  maxPaneles: number;
  inversorId: string;
  fases: 1 | 3;
}

/** Supuestos técnicos informativos. No vuelven a escalar las partidas de costo. */
export interface VariablesVinculantesKwp {
  proteccionGeneralAPorKwp: number;
  mesasPorKwp: number;
  redondeoProteccionA: number;
  fasesPredeterminadas: 1 | 3;
  tipoFijacionTecho: string;
}

function regional(defaultValue: number, overrides: Partial<CostosRegionales> = {}): CostosRegionales {
  return Object.fromEntries(REGIONES.map((region) => [region, overrides[region] ?? defaultValue])) as CostosRegionales;
}

const DEFAULT_PARTIDAS_COSTO_KWP: PartidaCostoKwp[] = [
  { id: 'estructura', nombre: 'Estructura y fijaciones', categoria: 'materiales', tipoCalculo: 'fijo-variable', costoFijoNetoClp: 0, costoVariableNetoClpPorKwp: 33_568, costosRegionalesNeto: null, activa: true, referenciaExcel: 'CUBICADOR!G15:G28' },
  { id: 'comunicacion', nombre: 'Comunicación y medición', categoria: 'materiales', tipoCalculo: 'fijo-variable', costoFijoNetoClp: 0, costoVariableNetoClpPorKwp: 12_412, costosRegionalesNeto: null, activa: true, referenciaExcel: 'CUBICADOR!G29:G32' },
  { id: 'cables-canalizacion', nombre: 'Cables y canalización', categoria: 'materiales', tipoCalculo: 'fijo-variable', costoFijoNetoClp: 0, costoVariableNetoClpPorKwp: 87_791, costosRegionalesNeto: null, activa: true, referenciaExcel: 'CUBICADOR!G33:G83' },
  { id: 'tableros-protecciones', nombre: 'Tableros y protecciones', categoria: 'materiales', tipoCalculo: 'fijo-variable', costoFijoNetoClp: 0, costoVariableNetoClpPorKwp: 25_543, costosRegionalesNeto: null, activa: true, referenciaExcel: 'CUBICADOR!G84:G101' },
  { id: 'puesta-marcha', nombre: 'Puesta en marcha, rotulación y logística', categoria: 'materiales', tipoCalculo: 'fijo-variable', costoFijoNetoClp: 0, costoVariableNetoClpPorKwp: 6_088, costosRegionalesNeto: null, activa: true, referenciaExcel: 'CUBICADOR!G107,G116:G130' },
  { id: 'gestion-proyecto', nombre: 'Gestión del proyecto', categoria: 'servicios', tipoCalculo: 'fijo-regional', costoFijoNetoClp: 0, costoVariableNetoClpPorKwp: 0, costosRegionalesNeto: regional(777_600, { 'De Valparaíso': 305_594, Metropolitana: 277_594, "De O'Higgins": 305_594, 'Del Maule': 477_600, 'Del Ñuble': 677_600 }), activa: true, referenciaExcel: 'CUBICADOR!G103' },
  { id: 'instalacion', nombre: 'Instalación', categoria: 'servicios', tipoCalculo: 'variable-regional', costoFijoNetoClp: 0, costoVariableNetoClpPorKwp: 0, costosRegionalesNeto: regional(160_000, { 'De Coquimbo': 150_000, 'De Valparaíso': 145_000, Metropolitana: 130_000, "De O'Higgins": 150_000 }), activa: true, referenciaExcel: 'CUBICADOR!G104' },
  { id: 'ingenieria-tramite', nombre: 'Ingeniería TE4 y conexión', categoria: 'servicios', tipoCalculo: 'fijo-regional', costoFijoNetoClp: 0, costoVariableNetoClpPorKwp: 0, costosRegionalesNeto: regional(562_499, { 'De Coquimbo': 312_499, Metropolitana: 312_499, "De O'Higgins": 312_499, 'Del Maule': 312_499, 'Del Ñuble': 312_499 }), activa: true, referenciaExcel: 'CUBICADOR!G105' },
];

const DEFAULT_VARIABLES_VINCULANTES_KWP: VariablesVinculantesKwp = {
  // Caso auditado del libro: 6,2 kWp, 40 A y 4 mesas.
  proteccionGeneralAPorKwp: 40 / 6.2,
  mesasPorKwp: 4 / 6.2,
  redondeoProteccionA: 10,
  fasesPredeterminadas: 1,
  tipoFijacionTecho: 'Coplanar Tipo L',
};

export const GENERACION_POR_ZONA: GeneracionPorZona = {
  'De Arica':        [131,124,147,136,127,107,107,111,119,136,130,130],
  'De Tarapacá':     [142,132,155,145,139,127,134,140,146,151,142,141],
  'De Antofagasta':  [136,130,145,130,118,109,111,114,117,128,130,136],
  'De Coquimbo':     [164,146,134,101, 87, 83, 90,102,115,140,144,163],
  'De Valparaíso':   [164,144,145,112, 84, 70, 73, 86,108,132,150,164],
  'Metropolitana':   [164,144,145,112, 84, 70, 73, 86,108,132,150,164],
  "De O'Higgins":    [164,144,145,112, 84, 70, 73, 86,108,132,150,164],
  'Del Maule':       [154,135,137,101, 67, 52, 58, 77,103,123,141,150],
  'Del Ñuble':       [156,136,134,101, 68, 56, 59, 77,106,125,143,153],
  'Del Biobío':      [156,136,134,101, 68, 56, 59, 77,106,125,143,153],
  'De la Araucanía': [149,124,115, 79, 59, 45, 49, 63, 89,107,123,141],
  'De los Ríos':     [147,121,109, 71, 47, 37, 38, 54, 86,103,121,140],
  'De los Lagos':    [133,106, 93, 62, 50, 40, 42, 57, 79, 92,106,125],
  'De Aysén':        [138,110, 99, 79, 67, 62, 65, 76, 91,115,126,140],
};

export interface ConfigCotizador {
  schemaVersion: number;

  // MAIN / INPUT / FINBACK
  precioKwhClp: number;
  precioNudoInyeccionClp: number;
  ivaInyeccion: number;
  limiteAutoconsumo: number;
  proyeccionConsumo: number;
  maxPanelesMonofasico: number;
  /** MAIN!C31 sube la cantidad de paneles al par siguiente. */
  redondearPanelesAPar: boolean;
  minPaneles: number;

  // PAN / INV
  panelPotenciaW: number;
  panelMarcaModelo: string;
  inversorMarcaModelo: string;
  inversorPotenciaMinKw: number;
  catalogoPaneles: PanelCatalogItem[];
  catalogoInversores: InverterCatalogItem[];
  panelActivoId: string;
  inversorActivoId: string;
  reglasInversorPorPaneles: ReglaInversorPorPaneles[];

  // Costos generales. Paneles e inversor se suman desde sus catálogos.
  partidasCostoKwp: PartidaCostoKwp[];
  variablesVinculantesKwp: VariablesVinculantesKwp;
  /** Campos de compatibilidad para configuraciones v4; se sincronizan desde las partidas. */
  costoMaterialesGeneralesPorKwpNeto: number;
  costoServiciosPorKwpNeto: number;
  margen: number;
  ivaVenta: number;
  redondeoPrecioClp: number;

  // Hojas FC
  ipcAnual: number;
  degradacionPaneles: number;
  periodoEvaluacionAnios: number;
  tasaDescuentoAnual: number;
  /** Serie MPC de las hojas FC, un valor por año del horizonte. */
  mpcAnualClpKwh: number[];
  anioReposicion1: number;
  inversionRespuesto10: number;
  anioReposicion2: number;
  inversionRespuesto22: number;

  // FC MP / FC SANTANDER
  factorMP: number;
  cuotasMP: number;
  factorSantander: number;
  cuotasSantander: number;

  // CREDITOALZA. La cuota se deriva de estas variables mediante PMT.
  alzaTasaAnual: number;
  alzaMesesGracia: number;
  cuotasALZA: number;
  alzaFinancialFee: number;
  /** Garantía como % del TOTAL del proyecto financiado (CREDITOALZA!E14). */
  alzaGarantiaPctTotal: number;
  alzaCantidadGastos: number;
  alzaCostoUnitarioClp: number;
  alzaPieClp: number;
  valorUfClp: number;

  // Garantías / impacto
  garantiaInstalacion: number;
  co2FactorKgPerKwh: number;
}

const EQUIPOS_REFERENCIA_NETO = 6 * 79_000 + 408_000;
const CAPACIDAD_REFERENCIA_KWP = 3.72;
const EQUIPOS_REFERENCIA_POR_KWP = EQUIPOS_REFERENCIA_NETO / CAPACIDAD_REFERENCIA_KWP;

export const CONFIG_DEFAULT: ConfigCotizador = {
  schemaVersion: 10,
  precioKwhClp: 250,
  precioNudoInyeccionClp: 125.786927,
  ivaInyeccion: 1,
  limiteAutoconsumo: 0.5,
  proyeccionConsumo: 1,
  maxPanelesMonofasico: 20,
  redondearPanelesAPar: true,
  minPaneles: 1,

  panelPotenciaW: 620,
  panelMarcaModelo: 'Panel Ulica 620 W',
  inversorMarcaModelo: 'Inversor Huawei Híbrido 6kW',
  inversorPotenciaMinKw: 6,
  catalogoPaneles: DEFAULT_PANELS,
  catalogoInversores: DEFAULT_INVERTERS,
  panelActivoId: 'panel-ulica-620-w',
  inversorActivoId: 'inverter-huawei-hibrido-6kw',
  reglasInversorPorPaneles: [
    { id: 'mono-1-7', minPaneles: 1, maxPaneles: 7, inversorId: 'inverter-huawei-hibrido-3kw', fases: 1 },
    { id: 'mono-8-10', minPaneles: 8, maxPaneles: 10, inversorId: 'inverter-huawei-hibrido-5kw', fases: 1 },
    { id: 'mono-11-12', minPaneles: 11, maxPaneles: 12, inversorId: 'inverter-huawei-hibrido-6kw', fases: 1 },
    { id: 'mono-13-20', minPaneles: 13, maxPaneles: 20, inversorId: 'inverter-huawei-hibrido-8kw', fases: 1 },
  ],

  // Base reconciliada contra CUBICADOR para el caso patrón de 6,2 kWp.
  // Paneles e inversor se cobran aparte para no duplicar equipos físicos.
  partidasCostoKwp: DEFAULT_PARTIDAS_COSTO_KWP,
  variablesVinculantesKwp: DEFAULT_VARIABLES_VINCULANTES_KWP,
  costoMaterialesGeneralesPorKwpNeto: 165_402,
  costoServiciosPorKwpNeto: 0,
  // Margen efectivo del caso auditado (CUBICADOR!L6). MAIN!C26 mantiene 19%
  // como objetivo, pero los precios unitarios redondeados producen 19,4089%.
  margen: 0.19408932625004194,
  ivaVenta: 1.19,
  redondeoPrecioClp: 1_000,

  ipcAnual: 1.03,
  degradacionPaneles: 0.005,
  periodoEvaluacionAnios: 25,
  tasaDescuentoAnual: 0,
  mpcAnualClpKwh: [
    22.27263112630642, 22.382627233079518, 9.022196427950734,
    9.0667536459996, 9.111530915307169, 9.15652932262344,
    9.20174996006545, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  ],
  anioReposicion1: 11,
  inversionRespuesto10: 819_000,
  anioReposicion2: 21,
  inversionRespuesto22: 819_000,

  // Comisión MP 6,99% + operación 3,19%, ambas con IVA.
  factorMP: 1 / (1 - 0.0699 * 1.19 - 0.0319 * 1.19),
  cuotasMP: 12,
  factorSantander: 1 / (1 - 0.13 * 1.19),
  cuotasSantander: 48,

  alzaTasaAnual: 0.0639,
  alzaMesesGracia: 3,
  cuotasALZA: 300,
  alzaFinancialFee: 0.238,
  alzaGarantiaPctTotal: 0.1,
  alzaCantidadGastos: 6,
  alzaCostoUnitarioClp: 41_000,
  alzaPieClp: 0,
  valorUfClp: 40_845,

  garantiaInstalacion: 1,
  co2FactorKgPerKwh: 0.5,
};

export interface ConfigBundle {
  config: ConfigCotizador;
  genZona: GeneracionPorZona;
  version: number;
  status: 'local' | 'draft' | 'published' | 'archived';
  updatedAt?: string;
  comment?: string;
}

export function precioInyeccionKwhClp(cfg: ConfigCotizador): number {
  return cfg.precioNudoInyeccionClp * cfg.ivaInyeccion;
}

export function getFactorGeneracion(cfg: ConfigCotizador): number {
  const inyeccion = precioInyeccionKwhClp(cfg);
  if (inyeccion <= 0) return 0;
  return cfg.limiteAutoconsumo
    + (cfg.precioKwhClp * (1 - cfg.limiteAutoconsumo)) / inyeccion;
}

/**
 * Costo neto de todas las partidas activas para un caso de referencia.
 * Suma fijo + variable + regional: una configuración solo-fija (variable 0)
 * es válida y no debe leerse como estructura de costo vacía.
 */
export function costoGeneralPorKwpNeto(
  cfg: ConfigCotizador,
  capacidadKwp = 1,
  region: Region = 'Metropolitana',
): number {
  return cfg.partidasCostoKwp
    .filter((partida) => partida.activa)
    .reduce((total, partida) => total + costoPartidaNeto(partida, capacidadKwp, region), 0);
}

export function costoPartidasPorCategoria(
  partidas: PartidaCostoKwp[],
  categoria: CategoriaPartidaKwp,
  capacidadKwp = 1,
  region: Region = 'Metropolitana',
): number {
  return partidas
    .filter((partida) => partida.activa && partida.categoria === categoria)
    .reduce((total, partida) => total + costoPartidaNeto(partida, capacidadKwp, region), 0);
}

export function costoPartidaNeto(
  partida: PartidaCostoKwp,
  capacidadKwp: number,
  region: Region,
): number {
  const regional = partida.costosRegionalesNeto?.[region] ?? 0;
  if (partida.tipoCalculo === 'fijo-regional') return regional;
  if (partida.tipoCalculo === 'variable-regional') return regional * capacidadKwp;
  return partida.costoFijoNetoClp + partida.costoVariableNetoClpPorKwp * capacidadKwp;
}

export function withSyncedCostItems(
  config: ConfigCotizador,
  partidasCostoKwp: PartidaCostoKwp[],
): ConfigCotizador {
  return {
    ...config,
    partidasCostoKwp,
    costoMaterialesGeneralesPorKwpNeto: partidasCostoKwp.filter((item) => item.activa && item.categoria === 'materiales').reduce((sum, item) => sum + item.costoVariableNetoClpPorKwp, 0),
    costoServiciosPorKwpNeto: partidasCostoKwp.filter((item) => item.activa && item.categoria === 'servicios').reduce((sum, item) => sum + item.costoVariableNetoClpPorKwp, 0),
  };
}

export function redondearHaciaArriba(valor: number, multiplo: number): number {
  if (!Number.isFinite(valor)) return valor;
  return multiplo > 0 ? Math.ceil(valor / multiplo) * multiplo : Math.round(valor);
}

export interface CalculoAlza {
  valorPlantaNeto: number;
  gastosFinancieros: number;
  garantia: number;
  totalFinanciado: number;
  tasaMensual: number;
  cuotaMensual: number;
  cuotaUf: number;
}

/** Réplica de CREDITOALZA!C13:C30 para que plazo/tasa/UF se mantengan coherentes. */
export function calcularCreditoAlza(precioProyectoIva: number, cfg: ConfigCotizador): CalculoAlza {
  const valorPlantaNeto = (precioProyectoIva - cfg.alzaPieClp) / cfg.ivaVenta;
  const gastosFinancieros = cfg.alzaCantidadGastos * cfg.alzaCostoUnitarioClp * cfg.ivaVenta;
  const fee = cfg.alzaFinancialFee;
  // La garantía del libro NO son dos parámetros. CREDITOALZA!C14 se ve como
  //   (0,119·V + 0,1·Gastos + 0,119·fee·V + 0,1·fee·Gastos) / (0,881 - 0,119·fee)
  // pero CREDITOALZA!E14 delata el diseño: garantía ≡ 10% del total del proyecto.
  // El 0,119 es simplemente 0,10 × 1,19 (el IVA). Despejando G = r·Total con
  //   Total = (iva·(V + G) + Gastos)·(1 + fee)
  // queda una sola incógnita y un solo parámetro de negocio: r.
  const r = cfg.alzaGarantiaPctTotal;
  const garantiaNumerador = r * (1 + fee) * (cfg.ivaVenta * valorPlantaNeto + gastosFinancieros);
  const garantiaDenominador = 1 - r * cfg.ivaVenta * (1 + fee);
  const garantia = garantiaDenominador > 0 ? garantiaNumerador / garantiaDenominador : Number.POSITIVE_INFINITY;
  const ivaProyecto = (valorPlantaNeto + garantia) * (cfg.ivaVenta - 1);
  const baseFinanciada = valorPlantaNeto + garantia + gastosFinancieros + ivaProyecto;
  const totalFinanciado = baseFinanciada * (1 + fee);
  const tasaMensual = Math.pow(1 + cfg.alzaTasaAnual, 1 / 12) - 1;
  const capitalConGracia = totalFinanciado * Math.pow(1 + tasaMensual, cfg.alzaMesesGracia);
  const cuotaSinRedondear = tasaMensual === 0
    ? capitalConGracia / cfg.cuotasALZA
    : (tasaMensual * capitalConGracia) / (1 - Math.pow(1 + tasaMensual, -cfg.cuotasALZA));
  const cuotaMensual = Math.ceil(cuotaSinRedondear * 100_000) / 100_000;
  return {
    valorPlantaNeto, gastosFinancieros, garantia, totalFinanciado, tasaMensual,
    cuotaMensual,
    cuotaUf: cuotaMensual / cfg.valorUfClp,
  };
}

export function generacionAnualPorKwp(region: Region, genZona = GENERACION_POR_ZONA): number {
  return genZona[region].reduce((total, month) => total + month, 0);
}

export function fasesPorTipoPropiedad(tipo: string | undefined | null): 1 | 3 {
  return tipo === 'empresa' ? 3 : 1;
}

export function requiereCotizacionDetallada(tipo: string | undefined | null): boolean {
  return tipo === 'empresa' || tipo === 'departamento';
}

export function muestraPrecios(tipo: string | undefined | null): boolean {
  return !requiereCotizacionDetallada(tipo);
}

const STORAGE_KEY = 'gg-config-mantenedor-v2';
const LEGACY_STORAGE_KEY = 'gg-config-mantenedor';
const GEN_ZONA_KEY = 'gg-gen-zona';
const BUNDLE_CACHE_KEY = 'gg-config-published-cache';
export const CONFIG_CHANGED_EVENT = 'gg-config-changed';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizePartidasCosto(
  value: unknown,
  legacyMateriales: number,
  legacyServicios: number,
): PartidaCostoKwp[] {
  const scaleDefaults = (categoria: CategoriaPartidaKwp, target: number): PartidaCostoKwp[] => {
    const defaults = DEFAULT_PARTIDAS_COSTO_KWP.filter((item) => item.categoria === categoria);
    const base = defaults.reduce((total, item) => total + item.costoVariableNetoClpPorKwp, 0);
    if (base <= 0) return defaults.map((item) => ({ ...item, costosRegionalesNeto: item.costosRegionalesNeto ? { ...item.costosRegionalesNeto } : null }));
    let assigned = 0;
    return defaults.map((item, index) => {
      const amount = index === defaults.length - 1
        ? Math.max(0, target - assigned)
        : Math.max(0, Math.round(target * item.costoVariableNetoClpPorKwp / base));
      assigned += amount;
      return { ...item, costoVariableNetoClpPorKwp: amount };
    });
  };

  if (!Array.isArray(value)) {
    return [
      ...scaleDefaults('materiales', legacyMateriales),
      ...scaleDefaults('servicios', legacyServicios),
    ];
  }

  const normalized = value.map((item, index): PartidaCostoKwp | null => {
    if (!isRecord(item)) return null;
    const fallback = DEFAULT_PARTIDAS_COSTO_KWP.find((entry) => entry.id === item.id)
      ?? DEFAULT_PARTIDAS_COSTO_KWP[index % DEFAULT_PARTIDAS_COSTO_KWP.length];
    const categoria = item.id === 'puesta-marcha' ? 'materiales' : item.categoria === 'servicios' ? 'servicios' : 'materiales';
    const tipoCalculo = item.tipoCalculo === 'fijo-regional' || item.tipoCalculo === 'variable-regional'
      ? item.tipoCalculo
      : fallback.tipoCalculo;
    const rawRegional = isRecord(item.costosRegionalesNeto) ? item.costosRegionalesNeto : null;
    const costosRegionalesNeto = tipoCalculo === 'fijo-variable' ? null : Object.fromEntries(
      REGIONES.map((region) => [region, typeof rawRegional?.[region] === 'number'
        ? rawRegional[region]
        : fallback.costosRegionalesNeto?.[region] ?? 0]),
    ) as CostosRegionales;
    return {
      id: typeof item.id === 'string' ? item.id.trim().slice(0, 80) : `partida-${index + 1}`,
      nombre: typeof item.nombre === 'string' ? item.nombre.trim().slice(0, 160) : '',
      categoria,
      tipoCalculo,
      costoFijoNetoClp: typeof item.costoFijoNetoClp === 'number' ? item.costoFijoNetoClp : fallback.costoFijoNetoClp,
      costoVariableNetoClpPorKwp: typeof item.costoVariableNetoClpPorKwp === 'number'
        ? item.costoVariableNetoClpPorKwp
        : typeof item.costoNetoClpPorKwp === 'number'
          ? item.costoNetoClpPorKwp
          : fallback.costoVariableNetoClpPorKwp,
      costosRegionalesNeto,
      activa: item.activa !== false,
      referenciaExcel: typeof item.referenciaExcel === 'string' ? item.referenciaExcel.trim().slice(0, 180) : '',
    };
  }).filter((item): item is PartidaCostoKwp => item !== null);
  return normalized.length > 0 ? normalized : [...DEFAULT_PARTIDAS_COSTO_KWP.map((item) => ({ ...item }))];
}

function normalizeVariablesVinculantes(value: unknown): VariablesVinculantesKwp {
  const raw = isRecord(value) ? value : {};
  const result = { ...DEFAULT_VARIABLES_VINCULANTES_KWP } as Record<string, unknown>;
  for (const [key, defaultValue] of Object.entries(DEFAULT_VARIABLES_VINCULANTES_KWP)) {
    if (!(key in raw)) continue;
    const incoming = raw[key];
    if (typeof defaultValue === 'number') result[key] = typeof incoming === 'number' ? incoming : Number.NaN;
    else if (typeof defaultValue === 'string') result[key] = typeof incoming === 'string' ? incoming.trim().slice(0, 160) : '';
  }
  result.fasesPredeterminadas = raw.fasesPredeterminadas === 3 ? 3 : 1;
  return result as unknown as VariablesVinculantesKwp;
}

export function normalizeConfig(value: unknown): ConfigCotizador {
  const raw = isRecord(value) ? value : {};
  const migratingToV7 = Number(raw.schemaVersion ?? 0) < 7;
  const migratingToV8 = Number(raw.schemaVersion ?? 0) < 8;
  const migratingToV9 = Number(raw.schemaVersion ?? 0) < 9;
  const migratingToV10 = Number(raw.schemaVersion ?? 0) < 10;
  const normalized: Record<string, unknown> = { ...CONFIG_DEFAULT };
  for (const [key, defaultValue] of Object.entries(CONFIG_DEFAULT)) {
    if (!(key in raw)) continue;
    const incoming = raw[key];
    if (key === 'catalogoPaneles') normalized[key] = normalizePanels(incoming);
    else if (key === 'catalogoInversores') normalized[key] = normalizeInverters(incoming);
    else if (key === 'mpcAnualClpKwh') {
      normalized[key] = Array.isArray(incoming)
        ? incoming.map((item) => typeof item === 'number' ? item : Number.NaN)
        : CONFIG_DEFAULT.mpcAnualClpKwh;
    }
    else if (key === 'partidasCostoKwp' || key === 'variablesVinculantesKwp' || key === 'reglasInversorPorPaneles') continue;
    else if (typeof defaultValue === 'boolean') normalized[key] = typeof incoming === 'boolean' ? incoming : defaultValue;
    else if (typeof defaultValue === 'number') normalized[key] = typeof incoming === 'number' ? incoming : Number.NaN;
    else if (typeof defaultValue === 'string') normalized[key] = typeof incoming === 'string' ? incoming : '';
  }
  const merged = normalized as unknown as ConfigCotizador;
  if (typeof raw.costoMaterialesGeneralesPorKwpNeto !== 'number') {
    if (typeof raw.costoMaterialesPorKwpNeto === 'number') {
      merged.costoMaterialesGeneralesPorKwpNeto = Math.max(0, Math.round(
        raw.costoMaterialesPorKwpNeto - EQUIPOS_REFERENCIA_POR_KWP,
      ));
    }
  }
  if (Number(raw.schemaVersion ?? 0) < 4 && typeof raw.costoServiciosPorKwpNeto === 'number') {
    merged.costoServiciosPorKwpNeto = Math.round(raw.costoServiciosPorKwpNeto);
  }
  if (Number(raw.schemaVersion ?? 0) < 6) {
    // La versión 5 usaba gastos en UF + un fijo de $350.000 y tasa 6,57%,
    // variables que no existen en CREDITOALZA del libro auditado.
    merged.alzaTasaAnual = CONFIG_DEFAULT.alzaTasaAnual;
    merged.alzaCantidadGastos = CONFIG_DEFAULT.alzaCantidadGastos;
    merged.alzaCostoUnitarioClp = CONFIG_DEFAULT.alzaCostoUnitarioClp;
    merged.alzaPieClp = CONFIG_DEFAULT.alzaPieClp;
    merged.valorUfClp = CONFIG_DEFAULT.valorUfClp;
  }
  if (migratingToV7) {
    // Corrige supuestos que divergían del libro auditado y agrega la serie MPC.
    merged.mpcAnualClpKwh = [...CONFIG_DEFAULT.mpcAnualClpKwh];
    merged.anioReposicion1 = CONFIG_DEFAULT.anioReposicion1;
    merged.inversionRespuesto10 = CONFIG_DEFAULT.inversionRespuesto10;
    merged.anioReposicion2 = CONFIG_DEFAULT.anioReposicion2;
    merged.inversionRespuesto22 = CONFIG_DEFAULT.inversionRespuesto22;
    merged.factorMP = CONFIG_DEFAULT.factorMP;
    merged.factorSantander = CONFIG_DEFAULT.factorSantander;
    merged.margen = CONFIG_DEFAULT.margen;
    if (raw.co2FactorKgPerKwh === 0.4) merged.co2FactorKgPerKwh = CONFIG_DEFAULT.co2FactorKgPerKwh;
  }
  if (
    typeof raw.costoPorKwpClpIva === 'number'
    && raw.costoMaterialesGeneralesPorKwpNeto == null
    && raw.costoMaterialesPorKwpNeto == null
    && raw.costoServiciosPorKwpNeto == null
  ) {
    const base = raw.costoPorKwpClpIva / merged.ivaVenta * (1 - merged.margen);
    const legacyMaterialShare = 396_411 / (396_411 + CONFIG_DEFAULT.costoServiciosPorKwpNeto);
    merged.costoMaterialesGeneralesPorKwpNeto = Math.max(0, Math.round(
      base * legacyMaterialShare - EQUIPOS_REFERENCIA_POR_KWP,
    ));
    merged.costoServiciosPorKwpNeto = Math.round(base * (1 - legacyMaterialShare));
  }
  merged.partidasCostoKwp = normalizePartidasCosto(
    migratingToV7 ? undefined : raw.partidasCostoKwp,
    merged.costoMaterialesGeneralesPorKwpNeto,
    merged.costoServiciosPorKwpNeto,
  );
  if (migratingToV10 && typeof raw.alzaGarantiaCapital === 'number' && raw.alzaGarantiaCapital > 0) {
    // El antiguo "garantía sobre capital" era r × IVA. Recuperamos r.
    const iva = typeof raw.ivaVenta === 'number' && raw.ivaVenta > 0 ? raw.ivaVenta : CONFIG_DEFAULT.ivaVenta;
    merged.alzaGarantiaPctTotal = raw.alzaGarantiaCapital / iva;
  }
  if (migratingToV9) {
    const legacyItems = Array.isArray(raw.partidasCostoKwp) ? raw.partidasCostoKwp : [];
    const legacyById = new Map(legacyItems.filter(isRecord).map((item) => [item.id, item]));
    merged.partidasCostoKwp = DEFAULT_PARTIDAS_COSTO_KWP.map((item) => {
      if (item.tipoCalculo !== 'fijo-variable') return { ...item, costosRegionalesNeto: item.costosRegionalesNeto ? { ...item.costosRegionalesNeto } : null };
      const legacy = legacyById.get(item.id);
      const variable = legacy && typeof legacy.costoNetoClpPorKwp === 'number'
        ? legacy.costoNetoClpPorKwp
        : item.costoVariableNetoClpPorKwp;
      return { ...item, costoVariableNetoClpPorKwp: variable, activa: legacy?.activa !== false };
    });
    merged.precioNudoInyeccionClp = typeof raw.precioNudoInyeccionClp === 'number'
      ? raw.precioNudoInyeccionClp * (typeof raw.ivaInyeccion === 'number' ? raw.ivaInyeccion : 1.19)
      : CONFIG_DEFAULT.precioNudoInyeccionClp;
    merged.ivaInyeccion = 1;
  }
  merged.variablesVinculantesKwp = normalizeVariablesVinculantes(raw.variablesVinculantesKwp);
  merged.reglasInversorPorPaneles = Array.isArray(raw.reglasInversorPorPaneles) && !migratingToV9
    ? raw.reglasInversorPorPaneles.map((rule, index): ReglaInversorPorPaneles | null => {
      if (!isRecord(rule)) return null;
      return {
        id: typeof rule.id === 'string' ? rule.id.slice(0, 80) : `regla-${index + 1}`,
        minPaneles: typeof rule.minPaneles === 'number' ? rule.minPaneles : Number.NaN,
        maxPaneles: typeof rule.maxPaneles === 'number' ? rule.maxPaneles : Number.NaN,
        inversorId: typeof rule.inversorId === 'string' ? rule.inversorId.slice(0, 100) : '',
        fases: rule.fases === 3 ? 3 : 1,
      };
    }).filter((rule): rule is ReglaInversorPorPaneles => rule !== null)
    : CONFIG_DEFAULT.reglasInversorPorPaneles.map((rule) => ({ ...rule }));
  merged.costoMaterialesGeneralesPorKwpNeto = merged.partidasCostoKwp.filter((item) => item.activa && item.categoria === 'materiales').reduce((sum, item) => sum + item.costoVariableNetoClpPorKwp, 0);
  merged.costoServiciosPorKwpNeto = merged.partidasCostoKwp.filter((item) => item.activa && item.categoria === 'servicios').reduce((sum, item) => sum + item.costoVariableNetoClpPorKwp, 0);
  merged.catalogoPaneles = normalizePanels(merged.catalogoPaneles);
  merged.catalogoInversores = normalizeInverters(merged.catalogoInversores);
  if (migratingToV8) {
    merged.catalogoPaneles = merged.catalogoPaneles.map((item) => item.id === 'panel-ulica-620-w'
      ? { ...item, costoNetoClp: 76_500, precioVentaClp: 95_000, margen: 0.19 }
      : item);
    merged.catalogoInversores = merged.catalogoInversores.map((item) => item.id === 'inverter-huawei-hibrido-6kw'
      ? { ...item, costoNetoClp: 663_000, precioVentaClp: 819_000, margen: 0.19, stock: true, estado: 'active' }
      : item);
    if (merged.panelActivoId === 'panel-longi-620-w') merged.panelActivoId = 'panel-ulica-620-w';
    if (merged.inversorActivoId === 'inverter-sigen-on-grid-web') merged.inversorActivoId = 'inverter-huawei-hibrido-6kw';
  }
  const activePanel = merged.catalogoPaneles.find((item) => item.id === merged.panelActivoId && item.estado === 'active')
    ?? merged.catalogoPaneles.find((item) => item.estado === 'active');
  const activeInverter = merged.catalogoInversores.find((item) => item.id === merged.inversorActivoId && item.estado === 'active')
    ?? merged.catalogoInversores.find((item) => item.estado === 'active');
  if (activePanel) {
    merged.panelActivoId = activePanel.id;
    merged.panelMarcaModelo = activePanel.nombre;
    merged.panelPotenciaW = activePanel.potenciaW;
  }
  if (activeInverter) {
    merged.inversorActivoId = activeInverter.id;
    merged.inversorMarcaModelo = activeInverter.nombre;
    merged.inversorPotenciaMinKw = activeInverter.potenciaAcKw;
  }
  merged.schemaVersion = CONFIG_DEFAULT.schemaVersion;
  return merged;
}

export function getPanelActivo(config: ConfigCotizador): PanelCatalogItem {
  return config.catalogoPaneles.find((item) => item.id === config.panelActivoId && item.estado === 'active')
    ?? config.catalogoPaneles.find((item) => item.estado === 'active')
    ?? DEFAULT_PANELS[0];
}

export function getInversorActivo(config: ConfigCotizador): InverterCatalogItem {
  return config.catalogoInversores.find((item) => item.id === config.inversorActivoId && item.estado === 'active')
    ?? config.catalogoInversores.find((item) => item.estado === 'active')
    ?? DEFAULT_INVERTERS[0];
}

/**
 * Selecciona un SKU real para la potencia y las fases del sistema. El equipo
 * predeterminado conserva prioridad cuando cumple; de lo contrario se usa el
 * activo disponible con menor holgura DC. Nunca se inventa una potencia para
 * el nombre/costo de otro inversor.
 */
export function getInversorParaSistema(
  config: ConfigCotizador,
  capacidadKwp: number,
  fases: 1 | 3,
  numeroPaneles?: number,
): InverterCatalogItem {
  const active = config.catalogoInversores.filter((item) => (
    item.estado === 'active'
    && item.stock
    && item.linea.toLocaleLowerCase('es-CL').includes('on-grid')
    && item.fases === fases
  ));
  if (numeroPaneles != null) {
    const rule = config.reglasInversorPorPaneles.find((item) => (
      item.fases === fases && numeroPaneles >= item.minPaneles && numeroPaneles <= item.maxPaneles
    ));
    const ranged = active.find((item) => item.id === rule?.inversorId);
    if (ranged) return ranged;
  }
  const eligible = active.filter((item) => item.potenciaDcKw >= capacidadKwp);
  const preferred = eligible.find((item) => item.id === config.inversorActivoId);
  if (preferred) return preferred;
  const ranked = [...eligible].sort((left, right) => (
    left.potenciaDcKw - right.potenciaDcKw
    || left.prioridad - right.prioridad
    || left.costoNetoClp - right.costoNetoClp
  ));
  return ranked[0]
    ?? active.find((item) => item.id === config.inversorActivoId)
    ?? active.sort((left, right) => right.potenciaDcKw - left.potenciaDcKw)[0]
    ?? getInversorActivo(config);
}

export function normalizeGeneration(value: unknown): GeneracionPorZona {
  if (!isRecord(value)) return GENERACION_POR_ZONA;
  const result = { ...GENERACION_POR_ZONA };
  for (const region of REGIONES) {
    const row = value[region];
    if (Array.isArray(row) && row.length === 12 && row.every((item) => typeof item === 'number' && Number.isFinite(item))) {
      result[region] = [...row] as GeneracionMensual;
    }
  }
  return result;
}

function emitConfigChanged(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(CONFIG_CHANGED_EVENT));
}

export function getConfig(): ConfigCotizador {
  if (typeof window === 'undefined') return CONFIG_DEFAULT;
  try {
    const bundle = localStorage.getItem(BUNDLE_CACHE_KEY);
    if (bundle) return normalizeConfig(JSON.parse(bundle).config);
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
    return raw ? normalizeConfig(JSON.parse(raw)) : CONFIG_DEFAULT;
  } catch {
    return CONFIG_DEFAULT;
  }
}

export function getGeneracionPorZona(): GeneracionPorZona {
  if (typeof window === 'undefined') return GENERACION_POR_ZONA;
  try {
    const bundle = localStorage.getItem(BUNDLE_CACHE_KEY);
    if (bundle) return normalizeGeneration(JSON.parse(bundle).genZona);
    const raw = localStorage.getItem(GEN_ZONA_KEY);
    return raw ? normalizeGeneration(JSON.parse(raw)) : GENERACION_POR_ZONA;
  } catch {
    return GENERACION_POR_ZONA;
  }
}

/** Versión y valores exactos usados por el navegador al generar una cotización. */
export function getActiveConfigBundle(): ConfigBundle {
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(BUNDLE_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as Partial<ConfigBundle>;
        return {
          config: normalizeConfig(parsed.config),
          genZona: normalizeGeneration(parsed.genZona),
          version: Number(parsed.version ?? 0),
          status: parsed.status === 'published' ? 'published' : 'local',
          updatedAt: parsed.updatedAt,
          comment: parsed.comment,
        };
      }
    } catch {
      // Continúa con la configuración local segura.
    }
  }
  return {
    config: getConfig(),
    genZona: getGeneracionPorZona(),
    version: 0,
    status: 'local',
  };
}

export function cachePublishedBundle(bundle: ConfigBundle): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(BUNDLE_CACHE_KEY, JSON.stringify(bundle));
  emitConfigChanged();
}

/** Fallback local para desarrollo o si aún no se configura Supabase en servidor. */
export function saveConfig(patch: Partial<ConfigCotizador>): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeConfig({ ...getConfig(), ...patch })));
  localStorage.removeItem(BUNDLE_CACHE_KEY);
  emitConfigChanged();
}

export function saveGenZona(genZona: GeneracionPorZona): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(GEN_ZONA_KEY, JSON.stringify(normalizeGeneration(genZona)));
  localStorage.removeItem(BUNDLE_CACHE_KEY);
  emitConfigChanged();
}

export function resetConfig(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(LEGACY_STORAGE_KEY);
  localStorage.removeItem(GEN_ZONA_KEY);
  localStorage.removeItem(BUNDLE_CACHE_KEY);
  emitConfigChanged();
}
