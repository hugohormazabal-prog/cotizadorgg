'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SunMedium, Clock } from 'lucide-react';
import clsx from 'clsx';
import { StepShell } from './StepShell';
import { StepNavButtons } from './StepNavButtons';
import { useCotizadorStore } from '@/lib/store';
import { UnidadConsumo } from '@/lib/types';
import { estimarRapido, formatCLP } from '@/lib/estimaciones';
import { submitCotizacion } from '@/lib/submitCotizacion';
import { fasesPorTipoPropiedad, requiereCotizacionDetallada } from '@/lib/config';
import { useConfig } from '@/lib/useConfig';
import type { Region } from '@/lib/config';

const RANGO_CLP = { min: 10_000, max: 3_000_000, step: 10_000 };
const RANGO_KWH = { min: 50, max: 15_000, step: 50 };
// Casa / casa en construcción usan rangos acotados al segmento residencial.
const RANGO_CLP_CASA = { min: 0, max: 500_000, step: 10_000 };
const RANGO_KWH_CASA = { min: 0, max: 2_000, step: 50 };

export function Step5Consumo() {
  const consumo = useCotizadorStore((s) => s.data.consumo);
  const region = useCotizadorStore((s) => s.data.ubicacion.region) as Region | '';
  const tipoPropiedad = useCotizadorStore((s) => s.data.propiedad.tipoPropiedad);
  const updateConsumo = useCotizadorStore((s) => s.updateConsumo);
  const data = useCotizadorStore((s) => s.data);
  const next = useCotizadorStore((s) => s.next);
  const leadEnviado = useCotizadorStore((s) => s.leadEnviado);
  const setLeadEnviado = useCotizadorStore((s) => s.setLeadEnviado);
  const { config, genZona, version } = useConfig();

  const detallada = requiereCotizacionDetallada(tipoPropiedad);
  const esCasa = tipoPropiedad === 'casa' || tipoPropiedad === 'casa_construccion';

  const rango =
    consumo.unidad === 'clp'
      ? esCasa ? RANGO_CLP_CASA : RANGO_CLP
      : esCasa ? RANGO_KWH_CASA : RANGO_KWH;

  const valorBruto =
    consumo.unidad === 'clp' ? consumo.montoClp ?? 90_000 : consumo.consumoKwh ?? 350;
  // Clamp al rango vigente (p. ej. si el valor persistido excede el nuevo máximo de Casa)
  const valorActual = Math.min(Math.max(valorBruto, rango.min), rango.max);

  const estimacion = useMemo(() => {
    if (!region) return null;
    return estimarRapido({
      ...consumo,
      region,
      fases: fasesPorTipoPropiedad(tipoPropiedad),
      config,
      generacionPorZona: genZona,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consumo, region, tipoPropiedad, config, genZona, version]);

  const isValid = valorActual > 0;

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

  // La captura del lead es best-effort: una caída de red o Supabase nunca
  // debe bloquear al cliente ni exponerle un error técnico. Si falla, el
  // resumen conserva leadEnviado=false y puede reintentar el envío.
  const handleNext = () => {
    const consumoNormalizado =
      consumo.unidad === 'clp'
        ? { ...consumo, montoClp: consumo.montoClp ?? valorActual }
        : { ...consumo, consumoKwh: consumo.consumoKwh ?? valorActual };

    // El slider muestra un valor inicial útil aunque el usuario no lo mueva.
    // Persistimos ese mismo valor antes de calcular/enviar la propuesta.
    if (consumo.unidad === 'clp' && consumo.montoClp == null) {
      updateConsumo({ montoClp: valorActual });
    } else if (consumo.unidad === 'kwh' && consumo.consumoKwh == null) {
      updateConsumo({ consumoKwh: valorActual });
    }

    if (!leadEnviado) {
      void submitCotizacion({ ...data, consumo: consumoNormalizado })
        .then((result) => {
          if (result.ok) setLeadEnviado(true);
        })
        .catch(() => {
          // El avance a la propuesta es independiente de servicios externos.
        });
    }
    next();
  };

  return (
    <StepShell
      title="Cuéntanos sobre tu consumo eléctrico"
      subtitle="Estimamos el tamaño del sistema y tu ahorro en base a tu zona y consumo actual."
      footer={<StepNavButtons nextDisabled={!isValid} onNext={handleNext} />}
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
                consumo.unidad === u ? 'text-ink-950' : 'text-slate-700 hover:text-slate-900'
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
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-700">
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
          <div className="mt-2 flex justify-between text-xs font-medium text-slate-600">
            <span>{consumo.unidad === 'clp' ? formatCLP(rango.min) : `${rango.min} kWh`}</span>
            <span>{consumo.unidad === 'clp' ? formatCLP(rango.max) : `${rango.max} kWh`}</span>
          </div>
        </div>

        {/* Estimaciones en tiempo real */}
        <AnimatePresence>
          {estimacion ? (
            <motion.div
              key="estimacion"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className={clsx('grid gap-2', detallada ? 'grid-cols-1' : 'sm:grid-cols-2')}
            >
              <EstimacionCard
                icon={<SunMedium className="h-4 w-4" />}
                label="Sistema sugerido"
                value={`${estimacion.capacidadKwp.toFixed(2)} kWp`}
                sub={`${estimacion.numeroPaneles} paneles`}
              />
              {/* Retorno solo para flujo residencial. Empresa/depto
                  reciben cotización a detalle y no ven oferta de precio.
                  El ahorro ya se muestra arriba como número único. */}
              {!detallada && (
                <EstimacionCard
                  icon={<Clock className="h-4 w-4" />}
                  label="Retorno estimado"
                  value={`${estimacion.paybackAnios.toFixed(1)} años`}
                />
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

        <p className="text-xs leading-relaxed text-slate-600">
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
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-700">{label}</p>
      <p className={clsx('mt-0.5 text-sm font-bold', accent ? 'text-amber-700' : 'text-slate-900')}>
        {value}
      </p>
      {sub && <p className="text-xs text-slate-600">{sub}</p>}
    </div>
  );
}
