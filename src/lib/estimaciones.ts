// ============================================================================
// LÓGICA DE ESTIMACIÓN — basada en "Cotizador Residencial.xlsm"
// Hojas de referencia: INPUT, COT_ONGRID, FC Capital Propio, GEN Zona
// ============================================================================

import {
  type ConfigCotizador,
  type Region,
  CONFIG_DEFAULT,
  getGeneracionPorZona,
} from './config';

// ---------------------------------------------------------------------------
// Formateo
// ---------------------------------------------------------------------------
export function formatCLP(value: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

export function formatKwh(value: number, decimals = 0): string {
  return `${value.toLocaleString('es-CL', { maximumFractionDigits: decimals })} kWh`;
}

// ---------------------------------------------------------------------------
// Tipos de resultado
// ---------------------------------------------------------------------------
export interface SistemaDimensionado {
  capacidadKwp: number;          // kWp total instalado
  numeroPaneles: number;         // Cantidad de paneles
  potenciaPanelW: number;        // W por panel
  marcaPanel: string;
  generacionAnualKwh: number;    // kWh generados por año
  generacionMensualPromKwh: number;
  autoconsumoAnualKwh: number;   // kWh de autoconsumo
  inyeccionAnualKwh: number;     // kWh inyectados a la red
}

export interface AhorroEstimado {
  ahorroAutoconsumoAnual: number;   // CLP — ahorro por autoconsumo
  ahorroInyeccionAnual: number;     // CLP — ingreso por inyección
  ahorroTotalAnual: number;         // CLP — total año 1
  ahorroMensualProm: number;        // CLP — promedio mensual
}

export interface FinanciamientoOpcion {
  id: string;
  nombre: string;
  subtitulo: string;
  descripcion: string;           // descripción corta (ej: "12 cuotas sin interés")
  montoTotal: number;            // CLP total pagado
  cuotaMensual: number;          // CLP/mes (0 si pago único)
  cuotas: number;                // 0 para pago único
  badge?: string;                // texto opcional de badge (ej: "15,5% dcto.")
  nota?: string;                 // nota al pie
}

export interface CotizacionCompleta {
  // Input derivado
  consumoKwhMensual: number;
  consumoKwhAnual: number;
  gastoCuentaClpMensual: number;

  // Sistema
  sistema: SistemaDimensionado;

  // Beneficios económicos
  ahorro: AhorroEstimado;

  // Indicadores financieros
  precioProyectoClp: number;     // Precio total IVA incluido
  paybackAnios: number;
  paybackMeses: number;
  precioPorKwp: number;          // $/kWp

  // Opciones de financiamiento
  opcionesFinanciamiento: FinanciamientoOpcion[];

  // Garantías (para mostrar)
  garantias: { label: string; valor: string }[];
}

// ---------------------------------------------------------------------------
// Función principal de cálculo
// ---------------------------------------------------------------------------
export function calcularCotizacion(params: {
  /** Gasto en CLP/mes (null si se usa kWh) */
  montoClp: number | null;
  /** Consumo en kWh/mes (null si se usa CLP) */
  consumoKwh: number | null;
  unidad: 'clp' | 'kwh';
  region: Region;
  config?: ConfigCotizador;
}): CotizacionCompleta | null {
  const { montoClp, consumoKwh, unidad, region } = params;
  const cfg = params.config ?? CONFIG_DEFAULT;

  // 1. Calcular consumo mensual en kWh
  const consumoKwhMensual =
    unidad === 'kwh'
      ? consumoKwh
      : montoClp != null
      ? montoClp / cfg.precioKwhClp
      : null;

  if (!consumoKwhMensual || consumoKwhMensual <= 0) return null;

  const gastoCuentaClpMensual =
    unidad === 'clp'
      ? (montoClp ?? 0)
      : consumoKwhMensual * cfg.precioKwhClp;

  const consumoKwhAnual = consumoKwhMensual * 12;

  // 2. Dimensionar sistema
  // Fórmula derivada del Excel: capacity_kwp = consumo_anual * factorGeneracion / genAnualPorKwp
  const panelKwp = cfg.panelPotenciaW / 1000;
  const genAnual = getGeneracionPorZona()[region].reduce((a, b) => a + b, 0); // kWh/kWp/año

  const capacidadKwpTeorica = (consumoKwhAnual * cfg.factorGeneracion) / genAnual;
  const numeroPaneles = Math.max(1, Math.ceil(capacidadKwpTeorica / panelKwp));
  const capacidadKwp = numeroPaneles * panelKwp;

  const generacionAnualKwh = capacidadKwp * genAnual;
  const generacionMensualPromKwh = generacionAnualKwh / 12;

  // Autoconsumo = limiteAutoconsumo * consumo anual (tope)
  const autoconsumoAnualKwh = Math.min(
    generacionAnualKwh,
    consumoKwhAnual * cfg.limiteAutoconsumo
  );
  const inyeccionAnualKwh = generacionAnualKwh - autoconsumoAnualKwh;

  const sistema: SistemaDimensionado = {
    capacidadKwp: Math.round(capacidadKwp * 100) / 100,
    numeroPaneles,
    potenciaPanelW: cfg.panelPotenciaW,
    marcaPanel: cfg.panelMarcaModelo,
    generacionAnualKwh: Math.round(generacionAnualKwh),
    generacionMensualPromKwh: Math.round(generacionMensualPromKwh),
    autoconsumoAnualKwh: Math.round(autoconsumoAnualKwh),
    inyeccionAnualKwh: Math.round(inyeccionAnualKwh),
  };

  // 3. Calcular ahorros (año 1, en CLP)
  const ahorroAutoconsumoAnual = autoconsumoAnualKwh * cfg.precioKwhClp;
  const ahorroInyeccionAnual = inyeccionAnualKwh * cfg.precioInyeccionKwhClp;
  const ahorroTotalAnual = ahorroAutoconsumoAnual + ahorroInyeccionAnual;
  const ahorroMensualProm = ahorroTotalAnual / 12;

  const ahorro: AhorroEstimado = {
    ahorroAutoconsumoAnual: Math.round(ahorroAutoconsumoAnual),
    ahorroInyeccionAnual: Math.round(ahorroInyeccionAnual),
    ahorroTotalAnual: Math.round(ahorroTotalAnual),
    ahorroMensualProm: Math.round(ahorroMensualProm),
  };

  // 4. Precio del proyecto
  const precioProyectoClp = Math.round(capacidadKwp * cfg.costoPorKwpClpIva);
  const paybackAnios = precioProyectoClp / ahorroTotalAnual;
  const paybackMeses = Math.ceil(paybackAnios * 12);

  // 5. Opciones de financiamiento
  const totalMP = Math.round(precioProyectoClp * cfg.factorMP);
  const cuotaMP = Math.round(totalMP / cfg.cuotasMP);
  const cuotaSantander = Math.round(totalMP / cfg.cuotasSantander);
  const cuotaALZA = Math.round(ahorroMensualProm / cfg.ratioAhorroCuotaALZA);
  const ahorroRealMensualALZA = ahorroMensualProm - cuotaALZA;
  const porcAhorroALZA = Math.round((ahorroRealMensualALZA / gastoCuentaClpMensual) * 100);
  const descPct = Math.round(cfg.descuentoTransferencia * 100 * 10) / 10;

  const opcionesFinanciamiento: FinanciamientoOpcion[] = [
    {
      id: 'transferencia',
      nombre: 'Transferencia',
      subtitulo: 'Solo transferencia electrónica',
      descripcion: 'Pago único al contado',
      montoTotal: precioProyectoClp,
      cuotaMensual: 0,
      cuotas: 0,
      badge: `${descPct}% dcto.`,
    },
    {
      id: 'mercadopago',
      nombre: 'Mercado Pago',
      subtitulo: `${cfg.cuotasMP} cuotas sin interés`,
      descripcion: 'Todas las Tarjetas',
      montoTotal: totalMP,
      cuotaMensual: cuotaMP,
      cuotas: cfg.cuotasMP,
    },
    {
      id: 'santander',
      nombre: 'Santander',
      subtitulo: `${cfg.cuotasSantander} cuotas sin interés`,
      descripcion: 'Tarjeta de Crédito Santander',
      montoTotal: totalMP,
      cuotaMensual: cuotaSantander,
      cuotas: cfg.cuotasSantander,
      nota: `(*) CAE 1,54% a ${cfg.cuotasSantander} cuotas`,
    },
    {
      id: 'alza',
      nombre: 'Crédito Largo Plazo',
      subtitulo: `${cfg.cuotasALZA} cuotas fijas`,
      descripcion: porcAhorroALZA > 0
        ? `${porcAhorroALZA}% ahorro mensual desde el día 0`
        : 'Financia con tus propios ahorros',
      montoTotal: cuotaALZA * cfg.cuotasALZA,
      cuotaMensual: cuotaALZA,
      cuotas: cfg.cuotasALZA,
      badge: porcAhorroALZA > 0 ? `${porcAhorroALZA}% ahorro real` : undefined,
    },
  ];

  // 6. Garantías
  const garantias = [
    { label: 'Paneles', valor: `${cfg.garantiaPaneles} años` },
    { label: 'Inversor', valor: `${cfg.garantiaInversor} años` },
    { label: 'Instalación', valor: `${cfg.garantiaInstalacion} año` },
    { label: 'Tramitación SEC', valor: '~4 meses' },
  ];

  return {
    consumoKwhMensual: Math.round(consumoKwhMensual),
    consumoKwhAnual: Math.round(consumoKwhAnual),
    gastoCuentaClpMensual: Math.round(gastoCuentaClpMensual),
    sistema,
    ahorro,
    precioProyectoClp,
    paybackAnios: Math.round(paybackAnios * 10) / 10,
    paybackMeses,
    precioPorKwp: cfg.costoPorKwpClpIva,
    opcionesFinanciamiento,
    garantias,
  };
}

// ---------------------------------------------------------------------------
// Función liviana para preview en tiempo real (Step5)
// ---------------------------------------------------------------------------
export interface EstimacionRapida {
  consumoKwhMensual: number;
  capacidadKwp: number;
  numeroPaneles: number;
  /** Beneficio económico total (autoconsumo + net billing) */
  ahorroMensual: number;
  /** Solo reducción de factura por autoconsumo (lo que se descuenta del bill) */
  ahorroAutoconsumoMensual: number;
  /** Ingreso net billing por inyección a la red */
  ahorroInyeccionMensual: number;
  precioProyecto: number;
  paybackAnios: number;
}

export function estimarRapido(params: {
  montoClp: number | null;
  consumoKwh: number | null;
  unidad: 'clp' | 'kwh';
  region: Region;
  config?: ConfigCotizador;
}): EstimacionRapida | null {
  const cot = calcularCotizacion(params);
  if (!cot) return null;
  return {
    consumoKwhMensual: cot.consumoKwhMensual,
    capacidadKwp: cot.sistema.capacidadKwp,
    numeroPaneles: cot.sistema.numeroPaneles,
    ahorroMensual: cot.ahorro.ahorroMensualProm,
    ahorroAutoconsumoMensual: Math.round(cot.ahorro.ahorroAutoconsumoAnual / 12),
    ahorroInyeccionMensual: Math.round(cot.ahorro.ahorroInyeccionAnual / 12),
    precioProyecto: cot.precioProyectoClp,
    paybackAnios: cot.paybackAnios,
  };
}
