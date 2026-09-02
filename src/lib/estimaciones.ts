// ============================================================================
// LÓGICA DE ESTIMACIÓN — basada en "Cotizador Residencial.xlsm"
// Hojas de referencia: INPUT, COT_ONGRID, FC Capital Propio, GEN Zona
// ============================================================================

import {
  type ConfigCotizador,
  type Region,
  type GeneracionPorZona,
  CONFIG_DEFAULT,
  GENERACION_POR_ZONA,
  getFactorGeneracion,
  getInversorParaSistema,
  getPanelActivo,
  precioInyeccionKwhClp,
  redondearHaciaArriba,
  calcularCreditoAlza,
  costoPartidaNeto,
} from './config';

/** Número de fases de la instalación. 1 = monofásico (casa/depto), 3 = trifásico (empresa). */
export type Fases = 1 | 3;

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
  marcaInversor: string;
  potenciaInversorKw: number;
  generacionAnualKwh: number;    // kWh generados por año
  generacionMensualPromKwh: number;
  autoconsumoAnualKwh: number;   // kWh de autoconsumo
  inyeccionAnualKwh: number;     // kWh inyectados a la red
  generacionMensualKwh: number[];
  autoconsumoMensualKwh: number[];
  inyeccionMensualKwh: number[];
  mitigacionCo2TonAnual: number;
}

export interface AhorroEstimado {
  ahorroAutoconsumoAnual: number;   // CLP — ahorro por autoconsumo
  ahorroInyeccionAnual: number;     // CLP — ingreso por inyección
  ahorroTotalAnual: number;         // CLP — total año 1
  ahorroMensualProm: number;        // CLP — promedio mensual
}

export interface VariablesVinculantesCalculadas {
  proteccionGeneralA: number;
  numeroMesas: number;
  numeroFases: 1 | 3;
  tipoFijacionTecho: string;
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
  cuotaUf?: number;              // cuota mensual expresada en UF (crédito verde)
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
  desgloseCostos: {
    panelesNeto: number;
    inversorNeto: number;
    materialesGeneralesNeto: number;
    serviciosNeto: number;
    totalNeto: number;
    partidasKwp: Array<{
      id: string;
      nombre: string;
      categoria: 'materiales' | 'servicios';
      tipoCalculo: 'fijo-variable' | 'fijo-regional' | 'variable-regional';
      costoFijoNetoClp: number;
      costoVariableNetoClpPorKwp: number;
      costoNeto: number;
    }>;
  };
  variablesVinculantes: VariablesVinculantesCalculadas;
  proyeccion: {
    periodoAnios: number;
    /** Beneficio neto = ahorro en la cuenta + ingreso por inyección − reposiciones. */
    ahorroAcumuladoClp: number;
    /** Solo lo que deja de pagarse en la cuenta (autoconsumo). Comparable contra costoEnergiaSinProyectoClp. */
    ahorroCuentaClp: number;
    /** Excedentes vendidos a la red. No reduce la cuenta: es ingreso adicional. */
    ingresoInyeccionClp: number;
    /** Reposiciones de inversor descontadas del beneficio. */
    reposicionesClp: number;
    costoEnergiaSinProyectoClp: number;
    /** Cuenta que se sigue pagando: la parte del consumo que el sistema no cubre. */
    costoEnergiaConProyectoClp: number;
    vanClp: number;
    ahorroAnualClp: number[];
    ahorroAcumuladoPorAnioClp: number[];
  };

  // Opciones de financiamiento
  opcionesFinanciamiento: FinanciamientoOpcion[];

  // Garantías (para mostrar)
  garantias: { label: string; valor: string }[];
}

function cantidadEscalada(valorPorKwp: number, capacidadKwp: number, multiplo: number): number {
  return redondearHaciaArriba(valorPorKwp * capacidadKwp, multiplo);
}

export function calcularVariablesVinculantes(
  capacidadKwp: number,
  cfg: ConfigCotizador,
  fases: Fases = cfg.variablesVinculantesKwp.fasesPredeterminadas,
): VariablesVinculantesCalculadas {
  const variables = cfg.variablesVinculantesKwp;
  return {
    proteccionGeneralA: cantidadEscalada(
      variables.proteccionGeneralAPorKwp,
      capacidadKwp,
      variables.redondeoProteccionA,
    ),
    numeroMesas: Math.ceil(variables.mesasPorKwp * capacidadKwp),
    numeroFases: fases,
    tipoFijacionTecho: variables.tipoFijacionTecho,
  };
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
  /** Fases de la instalación (1 monofásico / 3 trifásico). Default 1. */
  fases?: Fases;
  config?: ConfigCotizador;
  generacionPorZona?: GeneracionPorZona;
}): CotizacionCompleta | null {
  const { montoClp, consumoKwh, unidad, region } = params;
  const cfg = params.config ?? CONFIG_DEFAULT;
  const fases: Fases = params.fases ?? cfg.variablesVinculantesKwp.fasesPredeterminadas;
  const genZona = params.generacionPorZona ?? GENERACION_POR_ZONA;
  const precioIny = precioInyeccionKwhClp(cfg);
  const panelActivo = getPanelActivo(cfg);

  // 1. Calcular consumo mensual en kWh (aplica proyección del Excel: INPUT!B18)
  const consumoKwhMensual =
    unidad === 'kwh'
      ? (consumoKwh != null ? consumoKwh * cfg.proyeccionConsumo : null)
      : montoClp != null
      ? (montoClp / cfg.precioKwhClp) * cfg.proyeccionConsumo
      : null;

  if (!consumoKwhMensual || consumoKwhMensual <= 0) return null;

  const gastoCuentaClpMensual =
    unidad === 'clp'
      ? (montoClp ?? 0)
      : consumoKwhMensual * cfg.precioKwhClp;

  const consumoKwhAnual = consumoKwhMensual * 12;

  // 2. Dimensionar sistema
  // El "factor de sobredimensionamiento" se DERIVA de las tarifas y el límite
  // de autoconsumo (ver getFactorGeneracion en config.ts). No es una constante.
  const panelKwp = panelActivo.potenciaW / 1000;
  const genAnual = genZona[region].reduce((a, b) => a + b, 0); // kWh/kWp/año
  const factorGen = getFactorGeneracion(cfg);

  const capacidadKwpTeorica = (consumoKwhAnual * factorGen) / genAnual;
  let numeroPaneles = Math.max(cfg.minPaneles, Math.ceil(capacidadKwpTeorica / panelKwp));

  // MAIN!C31 sube la cantidad al par siguiente cuando hay gasto eléctrico
  // (las mesas se arman de a dos paneles). Sin esto el cotizador entregaba
  // sistemas de 9, 11, 13 o 15 paneles que el libro nunca produce.
  if (cfg.redondearPanelesAPar && numeroPaneles % 2 === 1) {
    numeroPaneles += 1;
  }

  // Tope de paneles en monofásico (Excel COTBACK!D53). En trifásico (empresa)
  // no aplica el límite, por eso el flujo empresa dimensiona sistemas mayores.
  if (fases === 1) {
    numeroPaneles = Math.min(numeroPaneles, cfg.maxPanelesMonofasico);
  }

  const capacidadKwp = numeroPaneles * panelKwp;
  const inversorActivo = getInversorParaSistema(cfg, capacidadKwp, fases, numeroPaneles);

  const generacionMensualKwh = genZona[region].map((month) => month * capacidadKwp);
  const autoconsumoMensualKwh = generacionMensualKwh.map((generation) =>
    Math.min(generation, consumoKwhMensual * cfg.limiteAutoconsumo)
  );
  const inyeccionMensualKwh = generacionMensualKwh.map((generation, month) =>
    generation - autoconsumoMensualKwh[month]
  );
  const generacionAnualKwh = generacionMensualKwh.reduce((sum, month) => sum + month, 0);
  const generacionMensualPromKwh = generacionAnualKwh / 12;

  // FINBACK!D87:D98 limita el autoconsumo mes a mes, no sobre el total anual.
  const autoconsumoAnualKwh = autoconsumoMensualKwh.reduce((sum, month) => sum + month, 0);
  const inyeccionAnualKwh = inyeccionMensualKwh.reduce((sum, month) => sum + month, 0);

  const sistema: SistemaDimensionado = {
    capacidadKwp: Math.round(capacidadKwp * 100) / 100,
    numeroPaneles,
    potenciaPanelW: panelActivo.potenciaW,
    marcaPanel: panelActivo.nombre,
    marcaInversor: inversorActivo.nombre,
    potenciaInversorKw: inversorActivo.potenciaAcKw,
    generacionAnualKwh: Math.round(generacionAnualKwh),
    generacionMensualPromKwh: Math.round(generacionMensualPromKwh),
    autoconsumoAnualKwh: Math.round(autoconsumoAnualKwh),
    inyeccionAnualKwh: Math.round(inyeccionAnualKwh),
    generacionMensualKwh: generacionMensualKwh.map(Math.round),
    autoconsumoMensualKwh: autoconsumoMensualKwh.map(Math.round),
    inyeccionMensualKwh: inyeccionMensualKwh.map(Math.round),
    mitigacionCo2TonAnual: Math.round(generacionAnualKwh * cfg.co2FactorKgPerKwh) / 1000,
  };

  // 3. Calcular ahorros (año 1, en CLP)
  const ahorroAutoconsumoAnual = autoconsumoAnualKwh * cfg.precioKwhClp;
  const ahorroInyeccionAnual = inyeccionAnualKwh * precioIny;
  const ahorroTotalAnual = ahorroAutoconsumoAnual + ahorroInyeccionAnual;
  const ahorroMensualProm = ahorroTotalAnual / 12;

  const ahorro: AhorroEstimado = {
    ahorroAutoconsumoAnual: Math.round(ahorroAutoconsumoAnual),
    ahorroInyeccionAnual: Math.round(ahorroInyeccionAnual),
    ahorroTotalAnual: Math.round(ahorroTotalAnual),
    ahorroMensualProm: Math.round(ahorroMensualProm),
  };

  // 4. Precio del proyecto
  const panelesNeto = numeroPaneles * panelActivo.costoNetoClp;
  const inversorNeto = inversorActivo.costoNetoClp;
  const partidasKwp = cfg.partidasCostoKwp.filter((partida) => partida.activa).map((partida) => ({
    id: partida.id,
    nombre: partida.nombre,
    categoria: partida.categoria,
    tipoCalculo: partida.tipoCalculo,
    costoFijoNetoClp: partida.tipoCalculo === 'fijo-regional'
      ? partida.costosRegionalesNeto?.[region] ?? 0
      : partida.costoFijoNetoClp,
    costoVariableNetoClpPorKwp: partida.tipoCalculo === 'variable-regional'
      ? partida.costosRegionalesNeto?.[region] ?? 0
      : partida.costoVariableNetoClpPorKwp,
    costoNeto: costoPartidaNeto(partida, capacidadKwp, region),
  }));
  const materialesGeneralesNeto = partidasKwp
    .filter((partida) => partida.categoria === 'materiales')
    .reduce((total, partida) => total + partida.costoNeto, 0);
  const serviciosNeto = partidasKwp
    .filter((partida) => partida.categoria === 'servicios')
    .reduce((total, partida) => total + partida.costoNeto, 0);
  const totalNeto = panelesNeto + inversorNeto + materialesGeneralesNeto + serviciosNeto;
  const precioSinRedondeo = cfg.margen < 1
    ? (totalNeto / (1 - cfg.margen)) * cfg.ivaVenta
    : Number.POSITIVE_INFINITY;
  const precioProyectoClp = redondearHaciaArriba(
    precioSinRedondeo,
    cfg.redondeoPrecioClp,
  );
  const precioPorKwp = precioProyectoClp / capacidadKwp;
  const paybackAnios = precioProyectoClp / ahorroTotalAnual;
  const paybackMeses = Math.ceil(paybackAnios * 12);
  const desgloseCostos = {
    panelesNeto,
    inversorNeto,
    materialesGeneralesNeto,
    serviciosNeto,
    totalNeto,
    partidasKwp,
  };
  const variablesVinculantes = calcularVariablesVinculantes(capacidadKwp, cfg, fases);

  // 5. Opciones de financiamiento
  const totalMP = redondearHaciaArriba(precioProyectoClp * cfg.factorMP, cfg.redondeoPrecioClp);
  const cuotaMP = Math.round(totalMP / cfg.cuotasMP);
  const totalSantander = redondearHaciaArriba(precioProyectoClp * cfg.factorSantander, cfg.redondeoPrecioClp);
  const cuotaSantander = Math.round(totalSantander / cfg.cuotasSantander);
  const creditoAlza = calcularCreditoAlza(precioProyectoClp, cfg);
  const cuotaALZA = Math.round(creditoAlza.cuotaMensual);
  const ahorroRealMensualALZA = ahorroMensualProm - cuotaALZA;
  const porcAhorroALZA = Math.round((ahorroRealMensualALZA / gastoCuentaClpMensual) * 100);
  const descPct = Math.round((1 - 1 / cfg.factorMP) * 1000) / 10;

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
      montoTotal: totalSantander,
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
      montoTotal: Math.round(creditoAlza.totalFinanciado),
      cuotaMensual: cuotaALZA,
      cuotas: cfg.cuotasALZA,
      badge: porcAhorroALZA > 0 ? `${porcAhorroALZA}% ahorro real` : undefined,
      cuotaUf: creditoAlza.cuotaUf,
    },
  ];

  // 6. Garantías
  const garantias = [
    { label: 'Paneles', valor: `${panelActivo.garantiaAnios} años` },
    { label: 'Inversor', valor: `${inversorActivo.garantiaAnios} años` },
    { label: 'Instalación', valor: `${cfg.garantiaInstalacion} año` },
    { label: 'Tramitación SEC', valor: '~4 meses' },
  ];

  // Proyección visible para simulación de impacto. Replica los supuestos
  // centrales de las hojas FC: IPC, degradación lineal y reposiciones.
  let ahorroAcumuladoClp = 0;
  let ahorroCuentaClp = 0;
  let ingresoInyeccionClp = 0;
  let reposicionesClp = 0;
  let costoEnergiaSinProyectoClp = 0;
  let costoEnergiaConProyectoClp = 0;
  let vanClp = -precioProyectoClp;
  const ahorroAnualClp: number[] = [];
  const ahorroAcumuladoPorAnioClp: number[] = [];
  let precioConsumoProyectado = cfg.precioKwhClp;
  let precioInyeccionProyectado = precioIny;
  for (let year = 1; year <= cfg.periodoEvaluacionAnios; year += 1) {
    if (year > 1) {
      const mpcActual = cfg.mpcAnualClpKwh[year - 1] ?? cfg.mpcAnualClpKwh.at(-1) ?? 0;
      const mpcAnterior = cfg.mpcAnualClpKwh[year - 2] ?? mpcActual;
      precioConsumoProyectado = precioConsumoProyectado * cfg.ipcAnual + (mpcActual - mpcAnterior);
      precioInyeccionProyectado *= cfg.ipcAnual;
    }
    const degradation = Math.max(0, 1 - cfg.degradacionPaneles * (year - 1));
    const generation = generacionAnualKwh * degradation;
    const selfConsumption = Math.min(generation, autoconsumoAnualKwh);
    const injection = Math.max(0, generation - selfConsumption);
    const ahorroCuentaAnual = selfConsumption * precioConsumoProyectado;
    const ingresoInyeccionAnual = injection * precioInyeccionProyectado;
    const savings = ahorroCuentaAnual + ingresoInyeccionAnual;
    const replacement = year === cfg.anioReposicion1
      ? cfg.inversionRespuesto10
      : year === cfg.anioReposicion2
        ? cfg.inversionRespuesto22
        : 0;
    ahorroAcumuladoClp += savings - replacement;
    ahorroCuentaClp += ahorroCuentaAnual;
    ingresoInyeccionClp += ingresoInyeccionAnual;
    reposicionesClp += replacement;
    ahorroAnualClp.push(Math.round(savings - replacement));
    ahorroAcumuladoPorAnioClp.push(Math.round(ahorroAcumuladoClp));
    const costoSinProyectoAnual = consumoKwhAnual * precioConsumoProyectado;
    costoEnergiaSinProyectoClp += costoSinProyectoAnual;
    // La cuenta no desaparece: se sigue pagando el consumo que el sistema no cubre.
    costoEnergiaConProyectoClp += Math.max(0, costoSinProyectoAnual - ahorroCuentaAnual);
    // Las hojas FC descuentan el primer año con exponente cero (periodo - 1).
    vanClp += (savings - replacement) / Math.pow(1 + cfg.tasaDescuentoAnual, year - 1);
  }

  return {
    consumoKwhMensual: Math.round(consumoKwhMensual),
    consumoKwhAnual: Math.round(consumoKwhAnual),
    gastoCuentaClpMensual: Math.round(gastoCuentaClpMensual),
    sistema,
    ahorro,
    precioProyectoClp,
    paybackAnios: Math.round(paybackAnios * 10_000) / 10_000,
    paybackMeses,
    precioPorKwp,
    desgloseCostos,
    variablesVinculantes,
    proyeccion: {
      periodoAnios: cfg.periodoEvaluacionAnios,
      ahorroAcumuladoClp: Math.round(ahorroAcumuladoClp),
      ahorroCuentaClp: Math.round(ahorroCuentaClp),
      ingresoInyeccionClp: Math.round(ingresoInyeccionClp),
      reposicionesClp: Math.round(reposicionesClp),
      costoEnergiaSinProyectoClp: Math.round(costoEnergiaSinProyectoClp),
      costoEnergiaConProyectoClp: Math.round(costoEnergiaConProyectoClp),
      vanClp: Math.round(vanClp),
      ahorroAnualClp,
      ahorroAcumuladoPorAnioClp,
    },
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
  fases?: Fases;
  config?: ConfigCotizador;
  generacionPorZona?: GeneracionPorZona;
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
