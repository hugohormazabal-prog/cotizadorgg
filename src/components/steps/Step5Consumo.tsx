'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, TrendingDown, SunMedium, Clock } from 'lucide-react';
import clsx from 'clsx';
import { StepShell } from './StepShell';
import { StepNavButtons } from './StepNavButtons';
import { useCotizadorStore } from '@/lib/store';
import { UnidadConsumo } from '@/lib/types';
import { estimarRapido, formatCLP } from '@/lib/estimaciones';
import { getConfig } from '@/lib/config';
import type { Region } from '@/lib/config';

const RANGO_CLP = { min: 10_000, max: 3_000_000, step: 10_000 };
const RANGO_KWH = { min: 50, max: 15_000, step: 50 };

export function Step5Consumo() {
  const consumo = useCotizadorStore((s) => s.data.consumo);
  const region = useCotizadorStore((s) => s.data.ubicacion.region) as Region | '';
  const updateConsumo = useCotizadorStore((s) => s.updateConsumo);

  const valorActual =
    consumo.unidad === 'clp' ? consumo.montoClp ?? 90_000 : consumo.consumoKwh ?? 350;
  const rango = consumo.unidad === 'clp' ? RANGO_CLP : RANGO_KWH;

  const estimacion = useMemo(() => {
    if (!region) return null;
    return estimarRapido({
      ...consumo,
      region,
      config: getConfig(),
    });
  }, [consumo, region]);

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

        {/* Simulador de cuenta de luz */}
        <AnimatePresence>
          {estimacion && consumo.unidad === 'clp' && consumo.montoClp && (
            <motion.div
              key="bill-sim"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-xl border border-white/40 bg-white/40 p-3"
            >
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Tu cuenta de luz con solar ☀️
              </p>
              {/* Fila principal: Hoy → Con solar + % ahorro en cuenta */}
              <div className="flex items-center justify-between gap-3">
                {/* Cuenta actual — tachada */}
                <div className="flex flex-col items-center">
                  <span className="text-[9px] text-slate-400 uppercase tracking-wide mb-0.5">Hoy</span>
                  <div className="relative">
                    <span className="text-lg font-bold text-slate-400 tabular-nums">
                      {formatCLP(consumo.montoClp)}
                    </span>
                    <motion.div
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ delay: 0.2, duration: 0.4, ease: 'easeOut' }}
                      className="absolute top-1/2 left-0 right-0 h-[2px] bg-red-400/70 origin-left"
                    />
                  </div>
                  <span className="text-[9px] text-slate-400">/mes</span>
                </div>

                {/* Flecha animada */}
                <motion.div
                  animate={{ x: [0, 4, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
                  className="text-amber-400 text-lg"
                >
                  →
                </motion.div>

                {/* Cuenta con solar — muestra solo el residual después de autoconsumo */}
                <div className="flex flex-col items-center">
                  <span className="text-[9px] text-slate-400 uppercase tracking-wide mb-0.5">Con solar</span>
                  <motion.span
                    key={estimacion.ahorroAutoconsumoMensual}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-lg font-extrabold text-emerald-600 tabular-nums"
                  >
                    {formatCLP(Math.max(0, (consumo.montoClp ?? 0) - estimacion.ahorroAutoconsumoMensual))}
                  </motion.span>
                  <span className="text-[9px] text-slate-400">/mes</span>
                </div>

                {/* Badge — ahorro en cuenta (autoconsumo) */}
                <div className="flex flex-col items-center rounded-lg border border-amber-400/40 bg-amber-400/15 px-2.5 py-1.5">
                  <span className="text-[9px] text-amber-600 uppercase tracking-wide font-semibold">Ahorras</span>
                  <motion.span
                    key={estimacion.ahorroAutoconsumoMensual}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-sm font-extrabold text-amber-600 tabular-nums"
                  >
                    {formatCLP(estimacion.ahorroAutoconsumoMensual)}
                  </motion.span>
                  <span className="text-[9px] text-amber-500 font-medium">
                    {Math.min(100, Math.round((estimacion.ahorroAutoconsumoMensual / (consumo.montoClp || 1)) * 100))}% menos
                  </span>
                </div>
              </div>

              {/* Net billing — ingreso adicional separado */}
              {estimacion.ahorroInyeccionMensual > 0 && (
                <div className="mt-2 flex items-center gap-2 rounded-lg border border-sky-400/30 bg-sky-500/10 px-2.5 py-1.5">
                  <span className="text-sm">⚡</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-[9px] font-semibold text-sky-700 uppercase tracking-wide">Ingreso net billing</span>
                    <p className="text-[10px] text-sky-600">Recibes <span className="font-bold">{formatCLP(estimacion.ahorroInyeccionMensual)}/mes</span> por energía inyectada a la red</p>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Estimaciones en tiempo real */}
        <AnimatePresence mode="wait">
          {estimacion ? (
            <motion.div
              key="estimacion"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4"
            >
              <EstimacionCard
                icon={<SunMedium className="h-4 w-4" />}
                label="Sistema sugerido"
                value={`${estimacion.capacidadKwp.toFixed(2)} kWp`}
                sub={`${estimacion.numeroPaneles} paneles`}
              />
              <EstimacionCard
                icon={<TrendingDown className="h-4 w-4" />}
                label="Ahorro mensual est."
                value={formatCLP(estimacion.ahorroMensual)}
                accent
              />
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
