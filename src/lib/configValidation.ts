import {
  CONFIG_DEFAULT,
  calcularCreditoAlza,
  costoGeneralPorKwpNeto,
  precioInyeccionKwhClp,
  REGIONES,
  type ConfigCotizador,
  type GeneracionPorZona,
} from './config';

export type ValidationSeverity = 'error' | 'warning';

export interface ConfigIssue {
  field: string;
  message: string;
  severity: ValidationSeverity;
}

/** Rechaza escrituras incompletas antes de que la migración aplique defaults. */
export function validateRawConfigPayload(configValue: unknown, generationValue: unknown): ConfigIssue[] {
  const issues: ConfigIssue[] = [];
  const config = typeof configValue === 'object' && configValue !== null && !Array.isArray(configValue)
    ? configValue as Record<string, unknown>
    : null;
  if (!config) return [{ field: 'config', message: 'La configuración enviada no es válida.', severity: 'error' }];

  for (const [key, defaultValue] of Object.entries(CONFIG_DEFAULT)) {
    if (!(key in config)) {
      issues.push({ field: key, message: `Falta el campo configurable ${key}.`, severity: 'error' });
    } else if (typeof defaultValue === 'number' && (typeof config[key] !== 'number' || !Number.isFinite(config[key]))) {
      issues.push({ field: key, message: `${key} debe ser un número válido.`, severity: 'error' });
    }
  }
  for (const key of ['catalogoPaneles', 'catalogoInversores', 'partidasCostoKwp', 'reglasInversorPorPaneles', 'mpcAnualClpKwh']) {
    if (!Array.isArray(config[key]) || config[key].length === 0) {
      issues.push({ field: key, message: `${key} debe contener datos.`, severity: 'error' });
    }
  }
  if (typeof config.variablesVinculantesKwp !== 'object' || config.variablesVinculantesKwp === null || Array.isArray(config.variablesVinculantesKwp)) {
    issues.push({ field: 'variablesVinculantesKwp', message: 'Faltan las variables vinculantes por kWp.', severity: 'error' });
  }

  const generation = typeof generationValue === 'object' && generationValue !== null && !Array.isArray(generationValue)
    ? generationValue as Record<string, unknown>
    : null;
  if (!generation) {
    issues.push({ field: 'genZona', message: 'La matriz regional enviada no es válida.', severity: 'error' });
  } else {
    for (const region of REGIONES) {
      const row = generation[region];
      if (!Array.isArray(row) || row.length !== 12 || row.some((value) => typeof value !== 'number' || !Number.isFinite(value))) {
        issues.push({ field: `genZona.${region}`, message: `${region} debe contener 12 números válidos.`, severity: 'error' });
      }
    }
  }
  return issues;
}

function finiteRange(
  issues: ConfigIssue[],
  field: keyof ConfigCotizador,
  value: number,
  min: number,
  max: number,
  label: string,
): void {
  if (!Number.isFinite(value)) {
    issues.push({ field, message: `${label} debe ser un número válido.`, severity: 'error' });
  } else if (value < min || value > max) {
    issues.push({ field, message: `${label} debe estar entre ${min} y ${max}.`, severity: 'error' });
  }
}

export function validateConfig(config: ConfigCotizador, genZona: GeneracionPorZona): ConfigIssue[] {
  const issues: ConfigIssue[] = [];

  const nestedRange = (field: string, value: number, min: number, max: number, label: string): void => {
    if (!Number.isFinite(value)) {
      issues.push({ field, message: `${label} debe ser un número válido.`, severity: 'error' });
    } else if (value < min || value > max) {
      issues.push({ field, message: `${label} debe estar entre ${min} y ${max}.`, severity: 'error' });
    }
  };

  const validateCatalog = (kind: 'panel' | 'inversor'): void => {
    const catalog = kind === 'panel' ? config.catalogoPaneles : config.catalogoInversores;
    const activeId = kind === 'panel' ? config.panelActivoId : config.inversorActivoId;
    const field = kind === 'panel' ? 'catalogoPaneles' : 'catalogoInversores';
    const label = kind === 'panel' ? 'panel' : 'inversor';
    if (catalog.length === 0) {
      issues.push({ field, message: `Agrega al menos un ${label}.`, severity: 'error' });
      return;
    }
    const ids = new Set<string>();
    const names = new Set<string>();
    for (const item of catalog) {
      const normalizedName = item.nombre.trim().toLocaleLowerCase('es-CL');
      if (!item.id || ids.has(item.id)) issues.push({ field, message: `Hay ${label}es con identificadores duplicados.`, severity: 'error' });
      if (!normalizedName || names.has(normalizedName)) issues.push({ field, message: `Hay ${label}es con nombres vacíos o duplicados.`, severity: 'error' });
      ids.add(item.id);
      names.add(normalizedName);
      const power = kind === 'panel' ? config.catalogoPaneles.find((entry) => entry.id === item.id)?.potenciaW : config.catalogoInversores.find((entry) => entry.id === item.id)?.potenciaAcKw;
      if (!Number.isFinite(power) || (power ?? 0) <= 0) issues.push({ field, message: `${item.nombre || `Un ${label}`} debe tener una potencia válida.`, severity: 'error' });
      if (item.estado === 'active' && (!Number.isFinite(item.costoNetoClp) || item.costoNetoClp <= 0)) issues.push({ field, message: `${item.nombre} debe tener un costo neto mayor que cero.`, severity: 'error' });
      if (!Number.isFinite(item.precioVentaClp) || item.precioVentaClp < 0 || !Number.isFinite(item.garantiaAnios) || item.garantiaAnios < 0) issues.push({ field, message: `Revisa precio y garantía de ${item.nombre}.`, severity: 'error' });
      if (!Number.isFinite(item.margen) || item.margen < 0 || item.margen >= 1) issues.push({ field, message: `Revisa el margen de ${item.nombre}.`, severity: 'error' });
    }
    if (!catalog.some((item) => item.id === activeId && item.estado === 'active')) {
      issues.push({ field, message: `Selecciona un ${label} activo como predeterminado.`, severity: 'error' });
    }
  };

  validateCatalog('panel');
  validateCatalog('inversor');

  const partidasIds = new Set<string>();
  const partidasNombres = new Set<string>();
  for (const partida of config.partidasCostoKwp) {
    const field = `partidasCostoKwp.${partida.id || 'sin-id'}`;
    const normalizedName = partida.nombre.trim().toLocaleLowerCase('es-CL');
    if (!partida.id || partidasIds.has(partida.id)) {
      issues.push({ field, message: 'Las partidas por kWp deben tener identificadores únicos.', severity: 'error' });
    }
    if (!normalizedName || partidasNombres.has(normalizedName)) {
      issues.push({ field, message: 'Las partidas por kWp deben tener nombres únicos.', severity: 'error' });
    }
    partidasIds.add(partida.id);
    partidasNombres.add(normalizedName);
    nestedRange(field, partida.costoFijoNetoClp, 0, 100_000_000, `${partida.nombre || 'Partida'} fija`);
    nestedRange(field, partida.costoVariableNetoClpPorKwp, 0, 100_000_000, `${partida.nombre || 'Partida'} variable`);
    if (partida.tipoCalculo !== 'fijo-variable') {
      for (const region of REGIONES) nestedRange(field, partida.costosRegionalesNeto?.[region] ?? Number.NaN, 0, 100_000_000, `${partida.nombre || 'Partida'} en ${region}`);
    }
    if (partida.activa && partida.tipoCalculo === 'fijo-variable' && partida.costoFijoNetoClp === 0 && partida.costoVariableNetoClpPorKwp === 0) {
      issues.push({ field, message: `${partida.nombre} está activa con costo cero.`, severity: 'warning' });
    }
  }
  for (const categoria of ['materiales', 'servicios'] as const) {
    if (!config.partidasCostoKwp.some((partida) => partida.activa && partida.categoria === categoria)) {
      issues.push({
        field: 'partidasCostoKwp',
        message: `Debe existir al menos una partida activa de ${categoria}.`,
        severity: 'error',
      });
    }
  }

  const vinculantes = config.variablesVinculantesKwp;
  const coeficientes: Array<[keyof typeof vinculantes, number, string]> = [
    ['proteccionGeneralAPorKwp', vinculantes.proteccionGeneralAPorKwp, 'Protección general por kWp'],
    ['mesasPorKwp', vinculantes.mesasPorKwp, 'Mesas por kWp'],
  ];
  for (const [key, value, label] of coeficientes) {
    nestedRange(`variablesVinculantesKwp.${key}`, value, 0, 10_000, label);
  }
  nestedRange('variablesVinculantesKwp.redondeoProteccionA', vinculantes.redondeoProteccionA, 1, 1_000, 'Redondeo de protección');
  if (!vinculantes.tipoFijacionTecho.trim()) {
    issues.push({ field: 'variablesVinculantesKwp.tipoFijacionTecho', message: 'El tipo de fijación no puede quedar vacío.', severity: 'error' });
  }

  finiteRange(issues, 'precioKwhClp', config.precioKwhClp, 1, 10_000, 'Precio de consumo');
  finiteRange(issues, 'precioNudoInyeccionClp', config.precioNudoInyeccionClp, 0.01, 10_000, 'Precio de nudo');
  finiteRange(issues, 'ivaInyeccion', config.ivaInyeccion, 1, 1, 'Factor interno de inyección');
  finiteRange(issues, 'limiteAutoconsumo', config.limiteAutoconsumo, 0, 1, 'Límite de autoconsumo');
  finiteRange(issues, 'proyeccionConsumo', config.proyeccionConsumo, 0.01, 10, 'Proyección de consumo');
  finiteRange(issues, 'panelPotenciaW', config.panelPotenciaW, 100, 1_500, 'Potencia del panel');
  finiteRange(issues, 'inversorPotenciaMinKw', config.inversorPotenciaMinKw, 0.5, 500, 'Potencia mínima del inversor');
  finiteRange(issues, 'minPaneles', config.minPaneles, 1, 100, 'Mínimo de paneles');
  finiteRange(issues, 'maxPanelesMonofasico', config.maxPanelesMonofasico, 1, 200, 'Máximo monofásico');
  finiteRange(issues, 'margen', config.margen, 0, 0.8, 'Margen');
  finiteRange(issues, 'ivaVenta', config.ivaVenta, 1, 2, 'IVA de venta');
  finiteRange(issues, 'costoMaterialesGeneralesPorKwpNeto', config.costoMaterialesGeneralesPorKwpNeto, 0, 100_000_000, 'Costo de materiales generales');
  finiteRange(issues, 'costoServiciosPorKwpNeto', config.costoServiciosPorKwpNeto, 0, 100_000_000, 'Costo de servicios');
  finiteRange(issues, 'redondeoPrecioClp', config.redondeoPrecioClp, 1, 1_000_000, 'Redondeo de precio');
  finiteRange(issues, 'ipcAnual', config.ipcAnual, 0.8, 2, 'Factor IPC');
  finiteRange(issues, 'degradacionPaneles', config.degradacionPaneles, 0, 0.1, 'Degradación');
  finiteRange(issues, 'periodoEvaluacionAnios', config.periodoEvaluacionAnios, 1, 50, 'Período de evaluación');
  finiteRange(issues, 'tasaDescuentoAnual', config.tasaDescuentoAnual, 0, 1, 'Tasa de descuento');
  if (config.mpcAnualClpKwh.length < config.periodoEvaluacionAnios) {
    issues.push({
      field: 'mpcAnualClpKwh',
      message: `La serie MPC debe cubrir los ${config.periodoEvaluacionAnios} años del horizonte.`,
      severity: 'error',
    });
  }
  config.mpcAnualClpKwh.forEach((value, index) => {
    if (!Number.isFinite(value) || value < -10_000 || value > 10_000) {
      issues.push({ field: `mpcAnualClpKwh.${index}`, message: `MPC del año ${index + 1} no es válido.`, severity: 'error' });
    }
  });
  finiteRange(issues, 'anioReposicion1', config.anioReposicion1, 1, 50, 'Año de primera reposición');
  finiteRange(issues, 'inversionRespuesto10', config.inversionRespuesto10, 0, 100_000_000, 'Costo de primera reposición');
  finiteRange(issues, 'anioReposicion2', config.anioReposicion2, 1, 50, 'Año de segunda reposición');
  finiteRange(issues, 'inversionRespuesto22', config.inversionRespuesto22, 0, 100_000_000, 'Costo de segunda reposición');
  finiteRange(issues, 'factorMP', config.factorMP, 1, 5, 'Factor Mercado Pago');
  finiteRange(issues, 'factorSantander', config.factorSantander, 1, 5, 'Factor Santander');
  finiteRange(issues, 'cuotasMP', config.cuotasMP, 1, 120, 'Cuotas Mercado Pago');
  finiteRange(issues, 'cuotasSantander', config.cuotasSantander, 1, 120, 'Cuotas Santander');
  finiteRange(issues, 'alzaTasaAnual', config.alzaTasaAnual, 0, 1, 'Tasa anual ALZA');
  finiteRange(issues, 'alzaMesesGracia', config.alzaMesesGracia, 0, 60, 'Meses de gracia ALZA');
  finiteRange(issues, 'cuotasALZA', config.cuotasALZA, 1, 600, 'Plazo ALZA');
  finiteRange(issues, 'alzaFinancialFee', config.alzaFinancialFee, 0, 1, 'Fee ALZA');
  finiteRange(issues, 'alzaGarantiaPctTotal', config.alzaGarantiaPctTotal, 0, 0.5, 'Garantía ALZA (% del total)');
  finiteRange(issues, 'alzaCantidadGastos', config.alzaCantidadGastos, 0, 10_000, 'Cantidad de gastos ALZA');
  finiteRange(issues, 'alzaCostoUnitarioClp', config.alzaCostoUnitarioClp, 0, 100_000_000, 'Costo unitario ALZA');
  finiteRange(issues, 'alzaPieClp', config.alzaPieClp, 0, 100_000_000, 'Pie ALZA');
  finiteRange(issues, 'valorUfClp', config.valorUfClp, 1, 1_000_000, 'Valor UF');
  finiteRange(issues, 'garantiaInstalacion', config.garantiaInstalacion, 0, 20, 'Garantía de instalación');
  finiteRange(issues, 'co2FactorKgPerKwh', config.co2FactorKgPerKwh, 0, 5, 'Factor de mitigación CO₂');

  const integerFields: Array<[keyof ConfigCotizador, number, string]> = [
    ['minPaneles', config.minPaneles, 'Mínimo de paneles'],
    ['maxPanelesMonofasico', config.maxPanelesMonofasico, 'Máximo monofásico'],
    ['cuotasMP', config.cuotasMP, 'Cuotas Mercado Pago'],
    ['cuotasSantander', config.cuotasSantander, 'Cuotas Santander'],
    ['alzaMesesGracia', config.alzaMesesGracia, 'Meses de gracia ALZA'],
    ['cuotasALZA', config.cuotasALZA, 'Plazo ALZA'],
    ['alzaCantidadGastos', config.alzaCantidadGastos, 'Cantidad de gastos ALZA'],
    ['periodoEvaluacionAnios', config.periodoEvaluacionAnios, 'Período de evaluación'],
    ['anioReposicion1', config.anioReposicion1, 'Año de primera reposición'],
    ['anioReposicion2', config.anioReposicion2, 'Año de segunda reposición'],
    ['garantiaInstalacion', config.garantiaInstalacion, 'Garantía de instalación'],
  ];
  for (const [field, value, label] of integerFields) {
    if (Number.isFinite(value) && !Number.isInteger(value)) {
      issues.push({ field, message: `${label} debe ser un número entero.`, severity: 'error' });
    }
  }

  if (!config.panelMarcaModelo.trim()) {
    issues.push({ field: 'panelMarcaModelo', message: 'El modelo del panel no puede quedar vacío.', severity: 'error' });
  }
  if (!config.inversorMarcaModelo.trim()) {
    issues.push({ field: 'inversorMarcaModelo', message: 'El modelo del inversor no puede quedar vacío.', severity: 'error' });
  }
  if (config.panelMarcaModelo.length > 120 || config.inversorMarcaModelo.length > 120) {
    issues.push({ field: 'panelMarcaModelo', message: 'Los nombres de equipos no pueden superar 120 caracteres.', severity: 'error' });
  }
  if (config.minPaneles > config.maxPanelesMonofasico) {
    issues.push({ field: 'minPaneles', message: 'El mínimo no puede superar el máximo monofásico.', severity: 'error' });
  }
  const monoRules = [...config.reglasInversorPorPaneles].filter((rule) => rule.fases === 1).sort((a, b) => a.minPaneles - b.minPaneles);
  let expectedPanel = config.minPaneles;
  for (const rule of monoRules) {
    const field = `reglasInversorPorPaneles.${rule.id}`;
    if (!Number.isInteger(rule.minPaneles) || !Number.isInteger(rule.maxPaneles) || rule.minPaneles > rule.maxPaneles) {
      issues.push({ field, message: 'Cada rango de inversor debe usar límites enteros y ordenados.', severity: 'error' });
    }
    if (rule.minPaneles !== expectedPanel) {
      issues.push({ field, message: rule.minPaneles < expectedPanel ? 'Los rangos de inversor no pueden solaparse.' : `Falta cubrir el panel ${expectedPanel}.`, severity: 'error' });
    }
    const inverter = config.catalogoInversores.find((item) => item.id === rule.inversorId);
    const tramo = `Paneles ${rule.minPaneles} a ${rule.maxPaneles}`;
    if (!inverter) {
      issues.push({ field, message: `${tramo}: el inversor asignado ya no existe en el catálogo. Elige uno en Equipos y precio.`, severity: 'error' });
    } else if (inverter.estado !== 'active') {
      issues.push({ field, message: `${tramo}: "${inverter.nombre}" está archivado. Reactívalo o asigna otro inversor.`, severity: 'error' });
    } else if (!inverter.stock) {
      issues.push({ field, message: `${tramo}: "${inverter.nombre}" está marcado sin stock. Repón el stock o asigna otro inversor.`, severity: 'error' });
    } else if (inverter.fases !== rule.fases) {
      issues.push({ field, message: `${tramo}: "${inverter.nombre}" es de ${inverter.fases} fase(s) y el rango es de ${rule.fases}.`, severity: 'error' });
    }
    expectedPanel = Math.max(expectedPanel, rule.maxPaneles + 1);
  }
  if (expectedPanel <= config.maxPanelesMonofasico) {
    issues.push({ field: 'reglasInversorPorPaneles', message: `Los rangos deben cubrir hasta ${config.maxPanelesMonofasico} paneles.`, severity: 'error' });
  }
  if (config.alzaMesesGracia >= config.cuotasALZA) {
    issues.push({ field: 'alzaMesesGracia', message: 'Los meses de gracia deben ser menores que el plazo ALZA.', severity: 'error' });
  }
  if (config.anioReposicion1 >= config.anioReposicion2) {
    issues.push({ field: 'anioReposicion1', message: 'La primera reposición debe ocurrir antes que la segunda.', severity: 'error' });
  }
  if (config.anioReposicion2 > config.periodoEvaluacionAnios) {
    issues.push({ field: 'anioReposicion2', message: 'Las reposiciones deben quedar dentro del horizonte de evaluación.', severity: 'error' });
  }
  if (precioInyeccionKwhClp(config) >= config.precioKwhClp) {
    issues.push({
      field: 'precioNudoInyeccionClp',
      message: 'La inyección es igual o mayor a la tarifa de consumo; confirma que sea intencional.',
      severity: 'warning',
    });
  }
  if (costoGeneralPorKwpNeto(config) <= 0 || config.margen >= 1) {
    issues.push({ field: 'margen', message: 'La estructura de costo no produce un precio finito.', severity: 'error' });
  }

  const alza = calcularCreditoAlza(3_919_000, config);
  if (![alza.totalFinanciado, alza.cuotaMensual, alza.cuotaUf].every(Number.isFinite)) {
    issues.push({ field: 'alzaFinancialFee', message: 'Las variables ALZA no producen una cuota válida.', severity: 'error' });
  }

  for (const region of REGIONES) {
    const row = genZona[region];
    if (!row || row.length !== 12) {
      issues.push({ field: `genZona.${region}`, message: `${region} debe tener 12 meses.`, severity: 'error' });
      continue;
    }
    row.forEach((value, month) => {
      if (!Number.isFinite(value) || value <= 0 || value > 400) {
        issues.push({
          field: `genZona.${region}.${month}`,
          message: `Generación inválida en ${region}, mes ${month + 1}.`,
          severity: 'error',
        });
      }
    });
  }

  return issues;
}

export function hasErrors(issues: ConfigIssue[]): boolean {
  return issues.some((issue) => issue.severity === 'error');
}
