import {
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

  finiteRange(issues, 'precioKwhClp', config.precioKwhClp, 1, 10_000, 'Precio de consumo');
  finiteRange(issues, 'precioNudoInyeccionClp', config.precioNudoInyeccionClp, 0.01, 10_000, 'Precio de nudo');
  finiteRange(issues, 'ivaInyeccion', config.ivaInyeccion, 1, 2, 'Factor IVA de inyección');
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
  finiteRange(issues, 'alzaGarantiaCapital', config.alzaGarantiaCapital, 0, 0.8, 'Garantía ALZA sobre capital');
  finiteRange(issues, 'alzaGarantiaGastos', config.alzaGarantiaGastos, 0, 0.8, 'Garantía ALZA sobre gastos');
  finiteRange(issues, 'alzaGastosUf', config.alzaGastosUf, 0, 1_000, 'Gastos variables ALZA');
  finiteRange(issues, 'alzaGastoFijoClp', config.alzaGastoFijoClp, 0, 100_000_000, 'Gasto fijo ALZA');
  finiteRange(issues, 'valorUfClp', config.valorUfClp, 1, 1_000_000, 'Valor UF');
  finiteRange(issues, 'garantiaPaneles', config.garantiaPaneles, 0, 50, 'Garantía de paneles');
  finiteRange(issues, 'garantiaInversor', config.garantiaInversor, 0, 50, 'Garantía de inversor');
  finiteRange(issues, 'garantiaInstalacion', config.garantiaInstalacion, 0, 20, 'Garantía de instalación');
  finiteRange(issues, 'co2FactorKgPerKwh', config.co2FactorKgPerKwh, 0, 5, 'Factor de mitigación CO₂');

  const integerFields: Array<[keyof ConfigCotizador, number, string]> = [
    ['costoMaterialesGeneralesPorKwpNeto', config.costoMaterialesGeneralesPorKwpNeto, 'Costo de materiales generales'],
    ['costoServiciosPorKwpNeto', config.costoServiciosPorKwpNeto, 'Costo de servicios'],
    ['minPaneles', config.minPaneles, 'Mínimo de paneles'],
    ['maxPanelesMonofasico', config.maxPanelesMonofasico, 'Máximo monofásico'],
    ['cuotasMP', config.cuotasMP, 'Cuotas Mercado Pago'],
    ['cuotasSantander', config.cuotasSantander, 'Cuotas Santander'],
    ['alzaMesesGracia', config.alzaMesesGracia, 'Meses de gracia ALZA'],
    ['cuotasALZA', config.cuotasALZA, 'Plazo ALZA'],
    ['periodoEvaluacionAnios', config.periodoEvaluacionAnios, 'Período de evaluación'],
    ['anioReposicion1', config.anioReposicion1, 'Año de primera reposición'],
    ['anioReposicion2', config.anioReposicion2, 'Año de segunda reposición'],
    ['garantiaPaneles', config.garantiaPaneles, 'Garantía de paneles'],
    ['garantiaInversor', config.garantiaInversor, 'Garantía de inversor'],
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
