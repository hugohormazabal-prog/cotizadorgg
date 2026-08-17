// Configuración auditable del cotizador residencial.
// Defaults y referencias revisados contra "Cotizador Residencial.xlsm".

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

export const REGIONES: Region[] = [
  'De Arica', 'De Tarapacá', 'De Antofagasta', 'De Coquimbo',
  'De Valparaíso', 'Metropolitana', "De O'Higgins", 'Del Maule',
  'Del Ñuble', 'Del Biobío', 'De la Araucanía', 'De los Ríos',
  'De los Lagos', 'De Aysén',
];

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
  minPaneles: number;

  // PAN / INV
  panelPotenciaW: number;
  panelMarcaModelo: string;
  inversorMarcaModelo: string;
  inversorPotenciaMinKw: number;

  // CUBICADOR / COTBACK. Precio = costos / (1 - margen) * IVA.
  costoMaterialesPorKwpNeto: number;
  costoServiciosPorKwpNeto: number;
  margen: number;
  ivaVenta: number;
  redondeoPrecioClp: number;

  // Hojas FC
  ipcAnual: number;
  degradacionPaneles: number;
  periodoEvaluacionAnios: number;
  tasaDescuentoAnual: number;
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
  alzaGarantiaCapital: number;
  alzaGarantiaGastos: number;
  alzaGastosUf: number;
  alzaGastoFijoClp: number;
  valorUfClp: number;

  // Garantías / impacto
  garantiaPaneles: number;
  garantiaInversor: number;
  garantiaInstalacion: number;
  co2FactorKgPerKwh: number;
}

export const CONFIG_DEFAULT: ConfigCotizador = {
  schemaVersion: 2,
  precioKwhClp: 250,
  precioNudoInyeccionClp: 105.7033,
  ivaInyeccion: 1.19,
  limiteAutoconsumo: 0.5,
  proyeccionConsumo: 1,
  maxPanelesMonofasico: 20,
  minPaneles: 1,

  panelPotenciaW: 620,
  panelMarcaModelo: 'Panel Longi 620 W',
  inversorMarcaModelo: 'Inversor Sigen On-Grid',
  inversorPotenciaMinKw: 3,

  // Reproduce el caso patrón: 3,72 kWp -> $3.919.000 IVA incluido.
  costoMaterialesPorKwpNeto: 396_411,
  costoServiciosPorKwpNeto: 301_993.9652118911,
  margen: 0.2111,
  ivaVenta: 1.19,
  redondeoPrecioClp: 1_000,

  ipcAnual: 1.03,
  degradacionPaneles: 0.005,
  periodoEvaluacionAnios: 25,
  tasaDescuentoAnual: 0,
  anioReposicion1: 10,
  inversionRespuesto10: 518_000,
  anioReposicion2: 22,
  inversionRespuesto22: 518_000,

  factorMP: 1.1832,
  cuotasMP: 12,
  factorSantander: 1.1832,
  cuotasSantander: 48,

  alzaTasaAnual: 0.0657,
  alzaMesesGracia: 3,
  cuotasALZA: 300,
  alzaFinancialFee: 0.238,
  alzaGarantiaCapital: 0.119,
  alzaGarantiaGastos: 0.1,
  alzaGastosUf: 7.47,
  alzaGastoFijoClp: 350_000,
  valorUfClp: 40_173.46,

  garantiaPaneles: 12,
  garantiaInversor: 10,
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

export function costoBasePorKwpNeto(cfg: ConfigCotizador): number {
  return cfg.costoMaterialesPorKwpNeto + cfg.costoServiciosPorKwpNeto;
}

export function precioVentaPorKwpIva(cfg: ConfigCotizador): number {
  if (cfg.margen >= 1) return Number.POSITIVE_INFINITY;
  return (costoBasePorKwpNeto(cfg) / (1 - cfg.margen)) * cfg.ivaVenta;
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

/** Réplica de CREDITOALZA!C13:C29 para que plazo/tasa/UF se mantengan coherentes. */
export function calcularCreditoAlza(precioProyectoIva: number, cfg: ConfigCotizador): CalculoAlza {
  const valorPlantaNeto = precioProyectoIva / cfg.ivaVenta;
  const gastosFinancieros = (cfg.alzaGastosUf * cfg.valorUfClp + cfg.alzaGastoFijoClp) * cfg.ivaVenta;
  const fee = cfg.alzaFinancialFee;
  const garantiaNumerador =
    cfg.alzaGarantiaCapital * valorPlantaNeto
    + cfg.alzaGarantiaGastos * gastosFinancieros
    + cfg.alzaGarantiaCapital * fee * valorPlantaNeto
    + cfg.alzaGarantiaGastos * gastosFinancieros * fee;
  const garantiaDenominador = 1 - cfg.alzaGarantiaCapital - cfg.alzaGarantiaCapital * fee;
  const garantia = garantiaDenominador > 0 ? garantiaNumerador / garantiaDenominador : Number.POSITIVE_INFINITY;
  const ivaProyecto = (valorPlantaNeto + garantia) * (cfg.ivaVenta - 1);
  const baseFinanciada = valorPlantaNeto + garantia + gastosFinancieros + ivaProyecto;
  const totalFinanciado = baseFinanciada * (1 + fee);
  const tasaMensual = Math.pow(1 + cfg.alzaTasaAnual, 1 / 12) - 1;
  const capitalConGracia = totalFinanciado * Math.pow(1 + tasaMensual, cfg.alzaMesesGracia);
  const cuotaMensual = tasaMensual === 0
    ? capitalConGracia / cfg.cuotasALZA
    : (tasaMensual * capitalConGracia) / (1 - Math.pow(1 + tasaMensual, -cfg.cuotasALZA));
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

export function normalizeConfig(value: unknown): ConfigCotizador {
  const raw = isRecord(value) ? value : {};
  const normalized: Record<string, unknown> = { ...CONFIG_DEFAULT };
  for (const [key, defaultValue] of Object.entries(CONFIG_DEFAULT)) {
    if (!(key in raw)) continue;
    const incoming = raw[key];
    normalized[key] = typeof defaultValue === 'number'
      ? (typeof incoming === 'number' ? incoming : Number.NaN)
      : (typeof incoming === 'string' ? incoming : '');
  }
  const merged = normalized as unknown as ConfigCotizador;
  if (
    typeof raw.costoPorKwpClpIva === 'number'
    && raw.costoMaterialesPorKwpNeto == null
    && raw.costoServiciosPorKwpNeto == null
  ) {
    const base = raw.costoPorKwpClpIva / merged.ivaVenta * (1 - merged.margen);
    const materialShare = CONFIG_DEFAULT.costoMaterialesPorKwpNeto / costoBasePorKwpNeto(CONFIG_DEFAULT);
    merged.costoMaterialesPorKwpNeto = base * materialShare;
    merged.costoServiciosPorKwpNeto = base * (1 - materialShare);
  }
  merged.schemaVersion = CONFIG_DEFAULT.schemaVersion;
  return merged;
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

export const EXCEL_SHEET_COVERAGE = [
  ['MAIN', 'Entradas del caso', 'directa'], ['COT_ONGRID', 'Propuesta on-grid', 'derivada'],
  ['PPT', 'Documento comercial protegido', 'protegida'], ['INPUT', 'Entradas y listas', 'directa'],
  ['IMAGEN', 'Activos visuales', 'protegida'], ['COTBACK', 'Reglas de cubicación', 'agregada'],
  ['COT_GRANEL', 'Venta granel', 'fuera_flujo'], ['FC Capital Propio', 'Flujo contado', 'directa'],
  ['FC MP', 'Flujo Mercado Pago', 'directa'], ['FC SANTANDER', 'Flujo Santander', 'directa'],
  ['FC ALZA', 'Flujo ALZA', 'directa'], ['CREDITOALZA', 'Modelo ALZA', 'directa'],
  ['COT_OFFGRID', 'Cotización off-grid', 'fuera_flujo'], ['CUBICADOR', 'Costos agregados', 'agregada'],
  ['FINBACK', 'Generación y ahorro', 'directa'], ['CANBACK', 'Reglas canalización', 'agregada'],
  ['Precios Competencia', 'Benchmark', 'referencia'], ['BOMBACALOR', 'Opcional bomba calor', 'referencia'],
  ['CARGADOREV', 'Opcional cargador EV', 'referencia'], ['AIREAC', 'Opcional climatización', 'referencia'],
  ['GEN Zona', 'Generación regional', 'directa'], ['INV', 'Catálogo inversores', 'agregada'],
  ['BAT', 'Catálogo baterías', 'referencia'], ['COMPBAT', 'Accesorios baterías', 'referencia'],
  ['REG', 'Reguladores', 'fuera_flujo'], ['PAN', 'Catálogo paneles', 'directa'],
  ['EST', 'Estructuras', 'agregada'], ['TAB', 'Tableros', 'agregada'],
  ['CABLE', 'Cables', 'agregada'], ['CAN', 'Canalización', 'agregada'],
  ['SERV', 'Servicios', 'agregada'], ['SERVBACK', 'Reglas servicios', 'agregada'],
  ['COM', 'Monitoreo', 'agregada'], ['COTBACKGRANEL', 'Cubicación granel', 'fuera_flujo'],
  ['BATGRANEL', 'Baterías granel', 'fuera_flujo'], ['COMPBATGRANEL', 'Accesorios granel', 'fuera_flujo'],
  ['CANBACKGRANEL', 'Canalización granel', 'fuera_flujo'], ['CABLEGRANEL', 'Cables granel', 'fuera_flujo'],
] as const;
