import assert from 'node:assert/strict';
import {
  CONFIG_DEFAULT,
  GENERACION_POR_ZONA,
  calcularCreditoAlza,
  costoGeneralPorKwpNeto,
  costoPartidaNeto,
  getInversorParaSistema,
  normalizeConfig,
  precioInyeccionKwhClp,
  type PartidaCostoKwp,
} from '../src/lib/config';
import { calcularCotizacion } from '../src/lib/estimaciones';
import { hasErrors, validateConfig, validateRawConfigPayload } from '../src/lib/configValidation';

function quote(config = CONFIG_DEFAULT, region: keyof typeof GENERACION_POR_ZONA = 'Metropolitana') {
  const result = calcularCotizacion({ montoClp: 120_000, consumoKwh: null, unidad: 'clp', region, fases: 1, config, generacionPorZona: GENERACION_POR_ZONA });
  assert.ok(result, 'El caso patrón debe producir una cotización.');
  return result;
}

const golden = quote();
assert.equal(golden.sistema.numeroPaneles, 10);
assert.equal(golden.sistema.capacidadKwp, 6.2);
assert.equal(golden.sistema.marcaInversor, 'Inversor Huawei Híbrido 5kW');
assert.equal(golden.sistema.potenciaInversorKw, 5);
assert.equal(golden.sistema.generacionAnualKwh, 8_878);
assert.equal(golden.sistema.autoconsumoAnualKwh, 2_880);
assert.equal(golden.sistema.inyeccionAnualKwh, 5_998);
assert.equal(precioInyeccionKwhClp(CONFIG_DEFAULT), 125.786927);

const material: PartidaCostoKwp = {
  id: 'prueba', nombre: 'Prueba', categoria: 'materiales', tipoCalculo: 'fijo-variable',
  costoFijoNetoClp: 100_000, costoVariableNetoClpPorKwp: 20_000,
  costosRegionalesNeto: null, activa: true, referenciaExcel: '',
};
assert.equal(costoPartidaNeto(material, 5, 'Metropolitana'), 200_000);
assert.equal(costoPartidaNeto(material, 10, 'Metropolitana'), 300_000);

const gestion = CONFIG_DEFAULT.partidasCostoKwp.find((item) => item.id === 'gestion-proyecto');
const instalacion = CONFIG_DEFAULT.partidasCostoKwp.find((item) => item.id === 'instalacion');
const ingenieria = CONFIG_DEFAULT.partidasCostoKwp.find((item) => item.id === 'ingenieria-tramite');
assert.ok(gestion && instalacion && ingenieria);
assert.equal(costoPartidaNeto(gestion, 2, 'Metropolitana'), costoPartidaNeto(gestion, 12, 'Metropolitana'), 'Gestión debe ser fija por región.');
assert.equal(costoPartidaNeto(ingenieria, 2, 'Metropolitana'), costoPartidaNeto(ingenieria, 12, 'Metropolitana'), 'Ingeniería debe ser fija por región.');
assert.equal(costoPartidaNeto(instalacion, 2, 'Metropolitana') * 6, costoPartidaNeto(instalacion, 12, 'Metropolitana'), 'Instalación debe variar linealmente por kWp.');
assert.notEqual(costoPartidaNeto(gestion, 6.2, 'Metropolitana'), costoPartidaNeto(gestion, 6.2, 'Del Maule'), 'Gestión debe variar por región.');

const expectedRanges = [[1, 3], [7, 3], [8, 5], [10, 5], [11, 6], [12, 6], [13, 8], [20, 8]] as const;
for (const [paneles, kw] of expectedRanges) {
  const inverter = getInversorParaSistema(CONFIG_DEFAULT, paneles * 0.62, 1, paneles);
  assert.equal(inverter.potenciaAcKw, kw, `${paneles} paneles deben activar inversor de ${kw} kW.`);
}
assert.equal(getInversorParaSistema(CONFIG_DEFAULT, 4.34, 1, 7).potenciaAcKw, getInversorParaSistema(CONFIG_DEFAULT, 3.5, 1, 7).potenciaAcKw, 'El tramo depende de cantidad de paneles, no de kWp.');

// ALZA: la garantía se calcula SOLO sobre el capital. La segunda garantía (sobre
// los gastos financieros) se eliminó por indicación del cliente: no aplica.
// Caso patrón del libro: CREDITOALZA con COT_ONGRID!A77 = 5.179.000.
const alzaDirect = calcularCreditoAlza(5_179_000, CONFIG_DEFAULT);
assert.ok(Math.abs(alzaDirect.garantia - 794_439.8846926976) < 1e-6, 'Garantía debe reproducir CREDITOALZA!C14.');
assert.ok(Math.abs(alzaDirect.totalFinanciado - 7_944_398.846926977) < 1e-6, 'Total debe reproducir CREDITOALZA!C22.');
assert.ok(Math.abs(alzaDirect.cuotaMensual - 53_026.06804) < 1e-6, 'Cuota debe reproducir CREDITOALZA!C28.');
// CREDITOALZA!E14: la garantía es, por construcción, el % configurado del total.
assert.ok(Math.abs(alzaDirect.garantia / alzaDirect.totalFinanciado - CONFIG_DEFAULT.alzaGarantiaPctTotal) < 1e-9,
  'La garantía debe ser exactamente el porcentaje configurado del total del proyecto.');
const alzaOtro = calcularCreditoAlza(9_000_000, { ...CONFIG_DEFAULT, alzaGarantiaPctTotal: 0.15 });
assert.ok(Math.abs(alzaOtro.garantia / alzaOtro.totalFinanciado - 0.15) < 1e-9, 'La identidad debe valer para cualquier % y monto.');
// Migración: el antiguo 11,9% sobre capital era 10% × IVA.
const alzaMigrado = normalizeConfig({ ...CONFIG_DEFAULT, schemaVersion: 9, alzaGarantiaCapital: 0.119 });
assert.ok(Math.abs(alzaMigrado.alzaGarantiaPctTotal - 0.1) < 1e-9, 'El 11,9% antiguo debe migrar a 10% del total.');

assert.equal(hasErrors(validateConfig(CONFIG_DEFAULT, GENERACION_POR_ZONA)), false);
assert.equal(hasErrors(validateRawConfigPayload(CONFIG_DEFAULT, GENERACION_POR_ZONA)), false);
assert.equal(hasErrors(validateRawConfigPayload({}, {})), true);

const overlap = { ...CONFIG_DEFAULT, reglasInversorPorPaneles: CONFIG_DEFAULT.reglasInversorPorPaneles.map((rule) => rule.id === 'mono-13-20' ? { ...rule, minPaneles: 12 } : rule) };
assert.equal(hasErrors(validateConfig(overlap, GENERACION_POR_ZONA)), true, 'Los rangos solapados deben rechazarse.');

const migrated = normalizeConfig({ ...CONFIG_DEFAULT, schemaVersion: 8, precioNudoInyeccionClp: 105.7033, ivaInyeccion: 1.19 });
assert.equal(migrated.schemaVersion, 10);
assert.ok(Math.abs(migrated.precioNudoInyeccionClp - 125.786927) < 1e-9);
assert.equal(migrated.ivaInyeccion, 1);
assert.equal(migrated.partidasCostoKwp.find((item) => item.id === 'puesta-marcha')?.categoria, 'materiales');
assert.equal(migrated.reglasInversorPorPaneles.length, 4);

// Una configuración solo-fija (variable 0) es legítima: el cliente pidió poder
// cargar fijo y variable por partida. No debe leerse como estructura vacía.
const soloFijo = {
  ...CONFIG_DEFAULT,
  partidasCostoKwp: CONFIG_DEFAULT.partidasCostoKwp.map((item) => item.tipoCalculo === 'fijo-variable'
    ? { ...item, costoFijoNetoClp: Math.round(item.costoVariableNetoClpPorKwp * 6.2), costoVariableNetoClpPorKwp: 0 }
    : item),
};
assert.ok(costoGeneralPorKwpNeto(soloFijo) > 0, 'El costo total debe contar fijos y regionales, no solo la parte variable.');
assert.equal(hasErrors(validateConfig(soloFijo, GENERACION_POR_ZONA)), false, 'Una configuración solo-fija debe ser válida.');
const cotSoloFijo = calcularCotizacion({ montoClp: 120_000, consumoKwh: null, unidad: 'clp', region: 'Metropolitana', fases: 1, config: soloFijo, generacionPorZona: GENERACION_POR_ZONA });
assert.ok(cotSoloFijo && Number.isFinite(cotSoloFijo.precioProyectoClp) && cotSoloFijo.precioProyectoClp > 0, 'Una configuración solo-fija debe producir precio finito.');

// Los costos regionales deben mover el precio final del proyecto.
const rm = quote(CONFIG_DEFAULT, 'Metropolitana');
const maule = quote(CONFIG_DEFAULT, 'Del Maule');
assert.ok(maule.precioProyectoClp > rm.precioProyectoClp, 'Del Maule es más caro que Metropolitana en gestión e instalación.');

// La proyección debe cuadrar: la cuenta no desaparece, y la inyección es ingreso
// aparte, no rebaja de cuenta. Sin esto el "ahorro" parecía eliminar el 97% de
// la boleta cuando el autoconsumo solo cubre la mitad del consumo.
const pr = quote(CONFIG_DEFAULT, 'Metropolitana').proyeccion;
assert.ok(Math.abs((pr.costoEnergiaConProyectoClp + pr.ahorroCuentaClp) - pr.costoEnergiaSinProyectoClp) <= pr.periodoAnios,
  'Cuenta pagada + ahorro en cuenta debe reconstruir la energía sin proyecto.');
assert.ok(Math.abs((pr.ahorroCuentaClp + pr.ingresoInyeccionClp - pr.reposicionesClp) - pr.ahorroAcumuladoClp) <= pr.periodoAnios,
  'Ahorro + inyección − reposiciones debe reconstruir el beneficio neto.');
assert.ok(pr.ahorroCuentaClp < pr.costoEnergiaSinProyectoClp,
  'El ahorro en la cuenta nunca puede superar el costo de la energía.');
assert.equal(pr.reposicionesClp, CONFIG_DEFAULT.inversionRespuesto10 + CONFIG_DEFAULT.inversionRespuesto22);

// MAIN!C31: la cantidad de paneles sube al par siguiente.
for (const region of ['De Tarapacá', 'Del Maule', 'De la Araucanía', 'De los Lagos'] as const) {
  const c = calcularCotizacion({ montoClp: 120_000, consumoKwh: null, unidad: 'clp', region, fases: 1, config: CONFIG_DEFAULT, generacionPorZona: GENERACION_POR_ZONA });
  assert.ok(c && c.sistema.numeroPaneles % 2 === 0, `${region} debe entregar un número par de paneles.`);
}
const impar = calcularCotizacion({ montoClp: 120_000, consumoKwh: null, unidad: 'clp', region: 'De Tarapacá', fases: 1, config: { ...CONFIG_DEFAULT, redondearPanelesAPar: false }, generacionPorZona: GENERACION_POR_ZONA });
assert.equal(impar?.sistema.numeroPaneles, 9, 'Con el flag apagado debe volver el 9 anterior.');
// El tope monofásico manda por sobre el redondeo a par.
const tope = calcularCotizacion({ montoClp: 900_000, consumoKwh: null, unidad: 'clp', region: 'De los Lagos', fases: 1, config: CONFIG_DEFAULT, generacionPorZona: GENERACION_POR_ZONA });
assert.equal(tope?.sistema.numeroPaneles, CONFIG_DEFAULT.maxPanelesMonofasico, 'El tope de 20 debe seguir mandando.');

console.log('Integridad OK: costos fijos/variables, regiones, rangos de inversor, inyección con IVA, financiamiento y migración.');
