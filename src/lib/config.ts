// ============================================================================
// CONFIGURACIÓN CENTRAL — extraída del Excel "Cotizador Residencial.xlsm"
// Todas las variables editables están aquí y se exponen en /mantenedor.
// ============================================================================

// ---------------------------------------------------------------------------
// Tabla de generación mensual por región (kWh por kWp instalado por mes)
// Fuente: hoja "GEN Zona" del Excel
// ---------------------------------------------------------------------------
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

/** kWh generados por kWp instalado, por mes, por región */
export type GeneracionMensual = [number, number, number, number, number, number, number, number, number, number, number, number];

export const GENERACION_POR_ZONA: Record<Region, GeneracionMensual> = {
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

/** Total anual kWh/kWp por región */
export function generacionAnualPorKwp(region: Region): number {
  return GENERACION_POR_ZONA[region].reduce((a, b) => a + b, 0);
}

// ---------------------------------------------------------------------------
// Variables financieras y de cálculo
// ---------------------------------------------------------------------------
export interface ConfigCotizador {
  // Precios de energía
  precioKwhClp: number;           // $/kWh tarifa consumo. Ej: 250
  precioInyeccionKwhClp: number;  // $/kWh tarifa inyección neta (net-billing). Ej: 125.79

  // Panel estándar
  panelPotenciaW: number;         // Potencia unitaria del panel en W. Ej: 620
  panelMarcaModelo: string;       // Nombre para mostrar. Ej: "Longi 620 W"

  // Dimensionamiento
  limiteAutoconsumo: number;      // % del consumo anual cubierto por autoconsumo. Ej: 0.50
  factorGeneracion: number;       // Sobredimensionamiento (gen/consumo ratio). Ej: 1.585

  // Precio por kWp (IVA incluido)
  costoPorKwpClpIva: number;      // $/kWp precio venta IVA inc. Ej: 1_053_495

  // Margen
  margen: number;                 // Margen directo bruto. Ej: 0.2111

  // Ajustes anuales para flujo de caja
  ipcAnual: number;               // Ajuste IPC/CPI anual. Ej: 1.03
  degradacionPaneles: number;     // Degradación anual paneles. Ej: 0.005

  // Financiamiento — Mercado Pago 12 cuotas sin interés
  factorMP: number;               // Recargo total MP (precio * factorMP = total cobrado). Ej: 1.1832
  cuotasMP: number;               // Número de cuotas. Ej: 12

  // Financiamiento — Santander cuotas sin interés
  factorSantander: number;        // Mismo recargo que MP (misma plataforma). Ej: 1.1832
  cuotasSantander: number;        // Número de cuotas. Ej: 48

  // Financiamiento — Crédito largo plazo (ALZA)
  ratioAhorroCuotaALZA: number;   // ahorro_mensual / cuota_mensual. Ej: 1.1506
  cuotasALZA: number;             // Número de cuotas totales. Ej: 300

  // Garantías
  garantiaPaneles: number;        // Años garantía paneles. Ej: 12
  garantiaInversor: number;       // Años garantía inversor. Ej: 10
  garantiaInstalacion: number;    // Años garantía instalación. Ej: 1

  // Descuento transferencia vs otros métodos
  descuentoTransferencia: number; // % que se muestra. Ej: 0.155

  // Inversión de repuesto (mantenimiento proyectado)
  inversionRespuesto10: number;   // Repuesto año 10 CLP. Ej: 518_000
  inversionRespuesto22: number;   // Repuesto año 22 CLP. Ej: 518_000
}

// ---------------------------------------------------------------------------
// Valores por defecto (exactamente los del Excel con la muestra)
// ---------------------------------------------------------------------------
export const CONFIG_DEFAULT: ConfigCotizador = {
  precioKwhClp: 250,
  precioInyeccionKwhClp: 125.79,

  panelPotenciaW: 620,
  panelMarcaModelo: 'Longi 620 W',

  limiteAutoconsumo: 0.50,
  factorGeneracion: 1.585,

  costoPorKwpClpIva: 1_053_495,
  margen: 0.2111,

  ipcAnual: 1.03,
  degradacionPaneles: 0.005,

  factorMP: 1.1832,
  cuotasMP: 12,

  factorSantander: 1.1832,
  cuotasSantander: 48,

  ratioAhorroCuotaALZA: 1.1506,
  cuotasALZA: 300,

  garantiaPaneles: 12,
  garantiaInversor: 10,
  garantiaInstalacion: 1,

  descuentoTransferencia: 0.155,

  inversionRespuesto10: 518_000,
  inversionRespuesto22: 518_000,
};

// ---------------------------------------------------------------------------
// Config activa: lee sobreescrituras del mantenedor (localStorage en browser)
// ---------------------------------------------------------------------------
const STORAGE_KEY = 'gg-config-mantenedor';

export function getConfig(): ConfigCotizador {
  if (typeof window === 'undefined') return CONFIG_DEFAULT;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return CONFIG_DEFAULT;
    return { ...CONFIG_DEFAULT, ...JSON.parse(raw) };
  } catch {
    return CONFIG_DEFAULT;
  }
}

/** Retorna la tabla de generación por zona, considerando overrides del mantenedor */
export function getGeneracionPorZona(): Record<Region, GeneracionMensual> {
  if (typeof window === 'undefined') return GENERACION_POR_ZONA;
  try {
    const raw = localStorage.getItem('gg-gen-zona');
    if (!raw) return GENERACION_POR_ZONA;
    return { ...GENERACION_POR_ZONA, ...JSON.parse(raw) };
  } catch {
    return GENERACION_POR_ZONA;
  }
}

export function saveConfig(patch: Partial<ConfigCotizador>): void {
  if (typeof window === 'undefined') return;
  const current = getConfig();
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...patch }));
}

export function resetConfig(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

export const REGIONES: Region[] = [
  'De Arica',
  'De Tarapacá',
  'De Antofagasta',
  'De Coquimbo',
  'De Valparaíso',
  'Metropolitana',
  "De O'Higgins",
  'Del Maule',
  'Del Ñuble',
  'Del Biobío',
  'De la Araucanía',
  'De los Ríos',
  'De los Lagos',
  'De Aysén',
];
