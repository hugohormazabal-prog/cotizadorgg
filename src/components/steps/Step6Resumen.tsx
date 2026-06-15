'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Send, AlertTriangle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';
import clsx from 'clsx';
import { StepShell } from './StepShell';
import { SuccessAnimation } from './SuccessAnimation';
import { Button } from '@/components/ui/Button';
import { useCotizadorStore } from '@/lib/store';
import { submitCotizacion } from '@/lib/submitCotizacion';
import { calcularCotizacion, formatCLP, formatKwh } from '@/lib/estimaciones';
import { getConfig } from '@/lib/config';
import type { Region } from '@/lib/config';
import type { FinanciamientoOpcion } from '@/lib/estimaciones';

export function Step6Resumen() {
  const { consumo, ubicacion, resumen } = useCotizadorStore((s) => s.data);
  const updateResumen = useCotizadorStore((s) => s.updateResumen);
  const goToStep = useCotizadorStore((s) => s.goToStep);
  const status = useCotizadorStore((s) => s.status);
  const errorMessage = useCotizadorStore((s) => s.errorMessage);
  const setStatus = useCotizadorStore((s) => s.setStatus);
  const data = useCotizadorStore((s) => s.data);
  const [submitting, setSubmitting] = useState(false);
  const [opcionSel, setOpcionSel] = useState<string>('transferencia');

  const cotizacion = useMemo(() => {
    if (!ubicacion.region) return null;
    return calcularCotizacion({ ...consumo, region: ubicacion.region as Region, config: getConfig() });
  }, [consumo, ubicacion.region]);

  if (status === 'success') {
    return <StepShell title=""><SuccessAnimation /></StepShell>;
  }

  const handleSubmit = async () => {
    if (!resumen.aceptaTerminos || submitting) return;
    setSubmitting(true);
    setStatus('submitting');
    const result = await submitCotizacion(data);
    setSubmitting(false);
    if (result.ok) setStatus('success');
    else setStatus('error', result.error ?? 'Error al enviar. Inténtalo nuevamente.');
  };

  return (
    <StepShell
      title="Tu cotización preliminar"
      subtitle="Un especialista confirmará los valores finales."
      footer={
        <div className="flex items-center justify-between w-full gap-2">
          <Button type="button" variant="ghost" onClick={() => goToStep(5)}>
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
          <div className="flex items-center gap-2">
            {cotizacion && (
              <a
                href="/cotizacion"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:flex items-center gap-1.5 rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-600 hover:bg-amber-50 transition-colors"
              >
                Ver PDF completo ↗
              </a>
            )}
            <Button
              type="button"
              variant="primary"
              disabled={!resumen.aceptaTerminos}
              loading={submitting}
              onClick={handleSubmit}
            >
              Enviar solicitud
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-3">

        {/* Sin cotización si falta región */}
        {!cotizacion && (
          <div className="rounded-xl border border-amber-400/40 bg-amber-400/15 p-3 text-sm text-amber-700">
            Vuelve al paso de ubicación y selecciona tu región para ver la cotización.
          </div>
        )}

        {cotizacion && (
          <>
            {/* ── KPIs principales ─────────────────────────────────────── */}
            <div className="grid grid-cols-4 gap-2">
              <KPI label="Sistema" value={`${cotizacion.sistema.capacidadKwp.toFixed(1)} kWp`} accent />
              <KPI label="Ahorro/mes" value={formatCLP(cotizacion.ahorro.ahorroMensualProm)} highlight />
              <KPI label="Precio total" value={formatCLP(cotizacion.precioProyectoClp)} />
              <KPI label="Payback" value={`${cotizacion.paybackAnios} años`} />
            </div>

            {/* ── Generación ───────────────────────────────────────────── */}
            <div className="rounded-lg border border-white/40 bg-white/40 px-3 py-2 flex items-center justify-between text-xs">
              <span className="text-slate-500">
                {cotizacion.sistema.numeroPaneles} paneles · {formatKwh(cotizacion.sistema.generacionAnualKwh)}/año
              </span>
              <span className="text-slate-500">
                Ahorro anual: <span className="font-semibold text-amber-600">{formatCLP(cotizacion.ahorro.ahorroTotalAnual)}</span>
              </span>
            </div>

            {/* ── Financiamiento ───────────────────────────────────────── */}
            <div className="grid gap-2 sm:grid-cols-2">
              {cotizacion.opcionesFinanciamiento.map((op) => (
                <OpcionCard
                  key={op.id}
                  opcion={op}
                  selected={opcionSel === op.id}
                  onClick={() => setOpcionSel(op.id)}
                />
              ))}
            </div>

            {/* ── Gráfico de payback ───────────────────────────────────── */}
            <PaybackChart
              precioProyecto={cotizacion.precioProyectoClp}
              ahorroAnual={cotizacion.ahorro.ahorroTotalAnual}
              paybackAnios={cotizacion.paybackAnios}
              opcionSel={opcionSel}
              opcion={cotizacion.opcionesFinanciamiento.find(o => o.id === opcionSel) ?? cotizacion.opcionesFinanciamiento[0]}
            />

            <p className="text-[10px] text-slate-400 -mt-1">
              * Valores IVA incluido. <a href="/cotizacion" target="_blank" rel="noopener noreferrer" className="text-amber-600 underline underline-offset-2">Ver cotización completa con garantías y condiciones →</a>
            </p>
          </>
        )}

        {/* ── Términos ─────────────────────────────────────────────────── */}
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/40 bg-white/60 p-3 transition-colors hover:border-slate-300">
          <span className="relative mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
            <input
              type="checkbox"
              checked={resumen.aceptaTerminos}
              onChange={(e) => updateResumen({ aceptaTerminos: e.target.checked })}
              className="peer sr-only"
            />
            <span className="absolute inset-0 rounded-md border border-slate-300 bg-white transition-colors peer-checked:border-amber-400 peer-checked:bg-amber-400" />
            <motion.svg
              width="12" height="10" viewBox="0 0 12 10" fill="none"
              className="relative z-10"
              initial={false}
              animate={{ scale: resumen.aceptaTerminos ? 1 : 0, opacity: resumen.aceptaTerminos ? 1 : 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 20 }}
            >
              <path d="M1 5L4.5 8.5L11 1" stroke="#050B14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </motion.svg>
          </span>
          <span className="text-xs leading-relaxed text-slate-700">
            Acepto los <span className="font-medium text-amber-600 underline underline-offset-2">Términos y Condiciones</span> y autorizo a GG Electrics a contactarme.
          </span>
        </label>

        <AnimatePresence>
          {status === 'error' && errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </StepShell>
  );
}

// ─── Sub-componentes ─────────────────────────────────────────────────────────

function KPI({ label, value, accent, highlight }: { label: string; value: string; accent?: boolean; highlight?: boolean }) {
  return (
    <div className={clsx(
      'rounded-lg border p-2 text-center',
      accent ? 'border-amber-400/40 bg-amber-400/10' :
      highlight ? 'border-sky-300/40 bg-sky-500/10' :
      'border-white/40 bg-white/40'
    )}>
      <p className="text-[9px] font-medium uppercase tracking-wider text-slate-500">{label}</p>
      <p className={clsx('mt-0.5 text-sm font-bold', accent ? 'text-amber-700' : highlight ? 'text-sky-700' : 'text-slate-900')}>
        {value}
      </p>
    </div>
  );
}

function OpcionCard({ opcion, selected, onClick }: { opcion: FinanciamientoOpcion; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'w-full rounded-xl border p-2.5 text-left transition-all duration-200',
        selected
          ? 'border-amber-400/60 bg-amber-400/10 ring-1 ring-amber-400/30'
          : 'border-white/40 bg-white/50 hover:border-white/60'
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold text-slate-900">{opcion.nombre}</p>
        {opcion.badge && (
          <span className="shrink-0 rounded-full bg-amber-400/20 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700">
            {opcion.badge}
          </span>
        )}
      </div>
      <p className="text-[10px] text-slate-500">{opcion.subtitulo}</p>
      <div className="mt-1.5 flex items-baseline gap-1">
        {opcion.cuotas > 0 ? (
          <><span className="text-base font-bold text-slate-900">{formatCLP(opcion.cuotaMensual)}</span><span className="text-[10px] text-slate-400">/mes</span></>
        ) : (
          <><span className="text-base font-bold text-slate-900">{formatCLP(opcion.montoTotal)}</span><span className="text-[10px] text-slate-400"> contado</span></>
        )}
      </div>
    </button>
  );
}

// ─── PaybackChart ────────────────────────────────────────────────────────────

function PaybackChart({
  precioProyecto,
  ahorroAnual,
  paybackAnios,
  opcionSel,
  opcion,
}: {
  precioProyecto: number;
  ahorroAnual: number;
  paybackAnios: number;
  opcionSel: string;
  opcion: FinanciamientoOpcion;
}) {
  const years = 20;

  // Genera puntos: acumulado de ahorro vs costo total en el tiempo
  const data = useMemo(() => {
    const cuotasTotal = opcion.cuotas > 0 ? opcion.cuotaMensual * opcion.cuotas : opcion.montoTotal;
    const pts = [];
    for (let y = 0; y <= years; y++) {
      const ahorroAcum = ahorroAnual * y;
      const costoAcum = opcion.cuotas > 0
        ? Math.min(cuotasTotal, opcion.cuotaMensual * 12 * y)
        : precioProyecto;
      pts.push({
        año: y,
        ahorro: Math.round(ahorroAcum / 1000),
        costo: Math.round(costoAcum / 1000),
        neto: Math.round((ahorroAcum - costoAcum) / 1000),
      });
    }
    return pts;
  }, [precioProyecto, ahorroAnual, opcion]);

  const breakEvenYear = Math.ceil(paybackAnios);

  return (
    <motion.div
      key={opcionSel}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-xl border border-white/40 bg-white/40 p-3"
    >
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          Retorno de inversión — 20 años
        </p>
        <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[9px] font-bold text-amber-700">
          Break-even año {breakEvenYear}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={110}>
        <LineChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <XAxis
            dataKey="año"
            tick={{ fontSize: 9, fill: '#94a3b8' }}
            tickLine={false}
            axisLine={false}
            interval={4}
            tickFormatter={(v) => `${v}a`}
          />
          <YAxis
            tick={{ fontSize: 9, fill: '#94a3b8' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `$${v}k`}
          />
          <Tooltip
            contentStyle={{
              background: 'rgba(255,255,255,0.85)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.6)',
              borderRadius: 8,
              fontSize: 10,
              padding: '4px 8px',
            }}
            formatter={(val: number, name: string) => [`$${val}k`, name === 'ahorro' ? 'Ahorro acum.' : name === 'costo' ? 'Inversión' : 'Neto']}
            labelFormatter={(l) => `Año ${l}`}
          />
          <ReferenceLine x={breakEvenYear} stroke="#f59e0b" strokeDasharray="3 3" strokeWidth={1.5} />
          <Line type="monotone" dataKey="costo" stroke="#94a3b8" strokeWidth={1.5} dot={false} />
          <Line type="monotone" dataKey="ahorro" stroke="#10b981" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="neto" stroke="#f59e0b" strokeWidth={2} dot={false} strokeDasharray="4 2" />
        </LineChart>
      </ResponsiveContainer>
      <div className="mt-1 flex items-center gap-4 justify-center">
        {[['#10b981', 'Ahorro acum.'], ['#94a3b8', 'Inversión'], ['#f59e0b', 'Neto']].map(([color, label]) => (
          <div key={label} className="flex items-center gap-1">
            <span className="h-1.5 w-4 rounded-full" style={{ background: color }} />
            <span className="text-[9px] text-slate-400">{label}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
