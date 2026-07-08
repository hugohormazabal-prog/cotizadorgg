'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, SunMedium, Clock, TrendingDown } from 'lucide-react';
import clsx from 'clsx';
import { StepShell } from './StepShell';
import { StepNavButtons } from './StepNavButtons';
import { useCotizadorStore } from '@/lib/store';
import { UnidadConsumo } from '@/lib/types';
import { estimarRapido, formatCLP } from '@/lib/estimaciones';
import { fasesPorTipoPropiedad, requiereCotizacionDetallada } from '@/lib/config';
import { useConfig } from '@/lib/useConfig';
import type { Region } from '@/lib/config';

const RANGO_CLP = { min: 10_000, max: 3_000_000, step: 10_000 };
const RANGO_KWH = { min: 50, max: 15_000, step: 50 };

export function Step5Consumo() {
  const consumo = useCotizadorStore((s) => s.data.consumo);
  const region = useCotizadorStore((s) => s.data.ubicacion.region) as Region | '';
  const tipoPropiedad = useCotizadorStore((s) => s.data.propiedad.tipoPropiedad);
  const updateConsumo = useCotizadorStore((s) => s.updateConsumo);
  const { config, version } = useConfig();

  const detallada = requiereCotizacionDetallada(tipoPropiedad);

  const valorActual =
    consumo.unidad === 'clp' ? consumo.montoClp ?? 90_000 : consumo.consumoKwh ?? 350;
  const rango = consumo.unidad === 'clp' ? RANGO_CLP : RANGO_KWH;

  const estimacion = useMemo(() => {
    if (!region) return null;
    return estimarRapido({
      ...consumo,
      region,
      fases: fasesPorTipoPropiedad(tipoPropiedad),
      config,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consumo, region, tipoPropiedad, config, version]);

  const isValid = consumo.unidad === 'clp' ? Boolean(consumo.montoClp) : Boolean(consumo.consumoKwh);

  const setUnidad = (unidad: UnidadConsumo) => {
    updateConsumo({
      unidad,
      montoClp: unidad === 'clp' ? consumo.montoClp ?? 90_000 : consumo.montoClp,
      consumoKwh: unidad === 'kwh' ? consumo.consumoKwh ?? 350 : consumo.consumoKwh,
    });
  };

  const handleSlider = (value: number) => {
    if (consumo.unidad === 'clp') updateConsumo({ montoClp: value });
    else updateConsumo({ consumoKwh: value });
  };

  return (
    <StepShell
      title="Cuéntanos sobre tu consumo eléctrico"
      subtitle="Estimamos el tamaño del sistema y tu ahorro en base a tu zona y consumo actual."
      footer={<StepNavButtons nextDisabled={!isValid} />}
    >
      <div className="flex flex-col gap-2">
        {/* Toggle CLP / kWh */}
        <div className="inline-flex w-fit gap-1 rounded-full border border-white/40 bg-white/30 p-1">
          {(['clp', 'kwh'] as UnidadConsumo[]).map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => setUnidad(u)}
              className={clsx(
                'relative rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors duration-200',
                consumo.unidad === u ? 'text-ink-950' : 'text-slate-500 hover:text-slate-700'
              )}
            >
              {consumo.unidad === u && (
                <motion.span
                  layoutId="unidad-pill"
                  className="absolute inset-0 rounded-full bg-amber-400"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10">{u === 'clp' ? 'Monto en CLP' : 'Consumo en kWh'}</span>
            </button>
          ))}
        </div>

        {/* Slider */}
        <div className="rounded-lg border border-white/40 bg-white/40 p-3">
          <div className="mb-2 flex items-end justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              {consumo.unidad === 'clp' ? 'Gasto mensual en electricidad' : 'Consumo mensual aprox.'}
            </span>
            <motion.span
              key={`${consumo.unidad}-${valorActual}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-base font-bold text-slate-900"
            >
              {consumo.unidad === 'clp'
                ? formatCLP(valorActual)
                : `${valorActual.toLocaleString('es-CL')} kWh`}
            </motion.span>
          </div>

          <input
            type="range"
            min={rango.min}
            max={rango.max}
            step={rango.step}
            value={valorActual}
            onChange={(e) => handleSlider(Number(e.target.value))}
            className="w-full accent-amber-400"
          />
          <div className="mt-2 flex justify-between text-[11px] text-slate-400">
            <span>{consumo.unidad === 'clp' ? formatCLP(rango.min) : `${rango.min} kWh`}</span>
            <span>{consumo.unidad === 'clp' ? formatCLP(rango.max) : `${rango.max} kWh`}</span>
          </div>
        </div>

        {/* Ahorro / beneficio estimado.
            - Residencial: un solo número, "tu ahorro estimado".
            - Empresa/Departamento: "beneficio económico" DESGLOSADO
              (ahorro en cuenta + ingreso por inyección), porque para un
              negocio el beneficio incluye vender energía y puede superar la
              cuenta — así se entiende de dónde sale. */}
        <AnimatePresence>
          {estimacion && (
            <motion.div
              key="ahorro-hero"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="relative overflow-hidden rounded-2xl border border-amber-400/40 bg-gradient-to-br from-amber-400/20 via-amber-300/10 to-transparent p-5 text-center shadow-glow-amber"
            >
              {/* halo decorativo */}
              <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-amber-400/20 blur-3xl" />

              <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-amber-400/25 text-amber-600">
                <TrendingDown className="h-5 w-5" strokeWidth={2.2} />
              </div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-amber-600">
                {detallada ? 'Beneficio económico estimado' : 'Tu ahorro estimado con solar'}
              </p>
              <motion.p
                key={estimacion.ahorroMensual}
                initial={{ scale: 0.92, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                className="mt-1 text-[2rem] leading-none font-extrabold text-amber-700 tabular-nums sm:text-4xl"
              >
                {formatCLP(estimacion.ahorroMensual)}
                <span className="text-base font-semibold text-amber-600">/mes</span>
              </motion.p>

              {detallada ? (
                <>
                  {/* Desglose que SUMA al beneficio total de arriba */}
                  <div className="mx-auto mt-3 grid max-w-sm gap-1.5">
                    <div className="flex items-center justify-between gap-2 rounded-lg bg-white/60 px-3 py-2">
                      <span className="flex items-center gap-1.5 text-[11px] text-slate-600">
                        <TrendingDown className="h-3.5 w-3.5 text-emerald-600" strokeWidth={2.2} />
                        Ahorro en tu cuenta
                      </span>
                      <span className="text-xs font-bold tabular-nums text-slate-800">
                        {formatCLP(estimacion.ahorroAutoconsumoMensual)}/mes
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 rounded-lg bg-white/60 px-3 py-2">
                      <span className="flex items-center gap-1.5 text-[11px] text-slate-600">
                        <Zap className="h-3.5 w-3.5 text-sky-600" strokeWidth={2.2} />
                        Ingreso por inyección a la red
                      </span>
                      <span className="text-xs font-bold tabular-nums text-slate-800">
                        {formatCLP(estimacion.ahorroInyeccionMensual)}/mes
                      </span>
                    </div>
                  </div>
                  <p className="mx-auto mt-2.5 max-w-md text-[11px] leading-snug text-slate-500">
                    En un proyecto de {tipoPropiedad === 'empresa' ? 'empresa' : 'departamento'} el beneficio
                    combina el ahorro en tu cuenta más el ingreso por vender el excedente a la red — por eso
                    puede superar tu gasto actual. Un especialista prepara la cotización a detalle.
                  </p>
                </>
              ) : (
                <p className="mx-auto mt-2.5 max-w-md text-[11px] leading-snug text-slate-500">
                  Estimación según el modelo de cálculo de GG Electrics para tu zona y consumo.
                  Incluye el ahorro en tu cuenta y el ingreso por la energía que inyectas a la red.
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Estimaciones en tiempo real */}
        <AnimatePresence>
          {estimacion ? (
            <motion.div
              key="estimacion"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className={clsx('grid gap-2', detallada ? 'grid-cols-1' : 'sm:grid-cols-3')}
            >
              <EstimacionCard
                icon={<SunMedium className="h-4 w-4" />}
                label="Sistema sugerido"
                value={`${estimacion.capacidadKwp.toFixed(2)} kWp`}
                sub={`${estimacion.numeroPaneles} paneles`}
              />
              {/* Precios/retorno solo para flujo residencial. Empresa/depto
                  reciben cotización a detalle y no ven oferta de precio.
                  El ahorro ya se muestra arriba como número único. */}
              {!detallada && (
                <>
                  <EstimacionCard
                    icon={<Zap className="h-4 w-4" />}
                    label="Inversión referencial"
                    value={formatCLP(estimacion.precioProyecto)}
                  />
                  <EstimacionCard
                    icon={<Clock className="h-4 w-4" />}
                    label="Retorno estimado"
                    value={`${estimacion.paybackAnios.toFixed(1)} años`}
                  />
                </>
              )}
            </motion.div>
          ) : !region ? (
            <motion.div
              key="sin-region"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-lg border border-amber-400/40 bg-amber-400/15 px-3 py-2 text-xs text-amber-700"
            >
              Vuelve al paso anterior y selecciona tu región para ver estimaciones personalizadas.
            </motion.div>
          ) : null}
        </AnimatePresence>

        <p className="text-[11px] text-slate-400">
          * Estimación preliminar basada en el promedio de tu zona. Los valores finales se ajustarán
          en la cotización técnica de nuestro equipo.
        </p>
      </div>
    </StepShell>
  );
}

function EstimacionCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={clsx(
        'rounded-lg border p-2.5',
        accent
          ? 'border-amber-400/40 bg-amber-400/10'
          : 'border-white/40 bg-white/40'
      )}
    >
      <div
        className={clsx(
          'mb-1 flex h-6 w-6 items-center justify-center rounded-md',
          accent ? 'bg-amber-400/20 text-amber-700' : 'bg-sky-500/15 text-sky-600'
        )}
      >
        {icon}
      </div>
      <p className="text-[9px] font-medium uppercase tracking-wider text-slate-500">{label}</p>
      <p className={clsx('mt-0.5 text-sm font-bold', accent ? 'text-amber-700' : 'text-slate-900')}>
        {value}
      </p>
      {sub && <p className="text-[10px] text-slate-400">{sub}</p>}
    </div>
  );
}
