import assert from 'node:assert/strict';
import {
  CONFIG_DEFAULT,
  GENERACION_POR_ZONA,
  calcularCreditoAlza,
  normalizeConfig,
} from '../src/lib/config';
import { calcularCotizacion } from '../src/lib/estimaciones';
import { hasErrors, validateConfig, validateRawConfigPayload } from '../src/lib/configValidation';

function quote(config = CONFIG_DEFAULT) {
  const result = calcularCotizacion({
    montoClp: 120_000,
    consumoKwh: null,
    unidad: 'clp',
    region: 'Metropolitana',
    fases: 1,
    config,
    generacionPorZona: GENERACION_POR_ZONA,
  });
  assert.ok(result, 'El caso patrón debe producir una cotización.');
  return result;
}

const golden = quote();
assert.equal(golden.sistema.numeroPaneles, 10);
assert.equal(golden.sistema.capacidadKwp, 6.2);
assert.equal(golden.sistema.marcaInversor, 'Inversor Huawei Híbrido 6kW');
assert.equal(golden.sistema.potenciaInversorKw, 6);
assert.equal(golden.sistema.generacionAnualKwh, 8_878);
assert.equal(golden.sistema.autoconsumoAnualKwh, 2_880);
assert.equal(golden.sistema.inyeccionAnualKwh, 5_998);
assert.equal(golden.ahorro.ahorroTotalAnual, 1_474_520);
assert.equal(golden.precioProyectoClp, 5_179_000);
assert.equal(golden.paybackAnios, 3.5123);

const mercadoPago = golden.opcionesFinanciamiento.find((item) => item.id === 'mercadopago');
const santander = golden.opcionesFinanciamiento.find((item) => item.id === 'santander');
const alza = golden.opcionesFinanciamiento.find((item) => item.id === 'alza');
assert.equal(mercadoPago?.montoTotal, 5_893_000);
assert.equal(mercadoPago?.cuotaMensual, 491_083);
assert.equal(santander?.cuotaMensual, 127_646);
assert.equal(alza?.cuotaMensual, 53_026);
assert.ok(Math.abs((alza?.cuotaUf ?? 0) - 1.2982266627494188) < 1e-12);

const alzaDirect = calcularCreditoAlza(5_179_000, CONFIG_DEFAULT);
assert.ok(Math.abs(alzaDirect.totalFinanciado - 7_944_398.846926977) < 1e-6);
assert.ok(Math.abs(alzaDirect.cuotaMensual - 53_026.06804) < 1e-6);

assert.equal(golden.proyeccion.ahorroAcumuladoClp, 47_524_830);
assert.equal(golden.proyeccion.vanClp, 42_345_830);
assert.equal(golden.proyeccion.ahorroAnualClp.length, 25);

const moreCanalization = quote({
  ...CONFIG_DEFAULT,
  variablesVinculantesKwp: {
    ...CONFIG_DEFAULT.variablesVinculantesKwp,
    canalizacionPanInvExteriorMPorKwp:
      CONFIG_DEFAULT.variablesVinculantesKwp.canalizacionPanInvExteriorMPorKwp * 2,
  },
});
assert.ok(moreCanalization.precioProyectoClp > golden.precioProyectoClp, 'La canalización vinculante debe mover el precio.');
assert.ok(
  moreCanalization.variablesVinculantes.canalizacionPanInvExteriorM
    > golden.variablesVinculantes.canalizacionPanInvExteriorM,
  'La canalización vinculante debe mover la cantidad.',
);

const undersizedDefault = quote({ ...CONFIG_DEFAULT, inversorActivoId: 'inverter-sigen-on-grid-web' });
assert.notEqual(undersizedDefault.sistema.marcaInversor, 'Inversor Sigen On-Grid 3 kW');
const selectedInverter = CONFIG_DEFAULT.catalogoInversores.find((item) => item.nombre === undersizedDefault.sistema.marcaInversor);
assert.equal(undersizedDefault.sistema.potenciaInversorKw, selectedInverter?.potenciaAcKw);

assert.equal(hasErrors(validateConfig(CONFIG_DEFAULT, GENERACION_POR_ZONA)), false);
assert.equal(hasErrors(validateRawConfigPayload(CONFIG_DEFAULT, GENERACION_POR_ZONA)), false);
assert.equal(hasErrors(validateRawConfigPayload({}, {})), true);

const migrated = normalizeConfig({ ...CONFIG_DEFAULT, schemaVersion: 6, margen: 0.19, co2FactorKgPerKwh: 0.4 });
assert.equal(migrated.schemaVersion, 8);
assert.equal(migrated.co2FactorKgPerKwh, 0.5);
assert.equal(migrated.inversionRespuesto10, 819_000);

const repairedV7 = normalizeConfig({
  ...CONFIG_DEFAULT,
  schemaVersion: 7,
  inversorActivoId: 'inverter-sigen-on-grid-web',
  catalogoInversores: CONFIG_DEFAULT.catalogoInversores.map((item) => item.id === 'inverter-huawei-hibrido-6kw'
    ? { ...item, estado: 'inactive' as const }
    : item),
});
assert.equal(repairedV7.schemaVersion, 8);
assert.equal(repairedV7.inversorActivoId, 'inverter-huawei-hibrido-6kw');
assert.equal(repairedV7.inversorMarcaModelo, 'Inversor Huawei Híbrido 6kW');

console.log('Integridad OK: caso golden, financiamiento, proyección, variables vinculantes, inversor y validación.');
