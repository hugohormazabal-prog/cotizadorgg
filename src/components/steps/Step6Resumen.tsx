'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Send, AlertTriangle, FileText } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';
import clsx from 'clsx';
import { StepShell } from './StepShell';
import { SuccessAnimation } from './SuccessAnimation';
import { Button } from '@/components/ui/Button';
import { useCotizadorStore } from '@/lib/store';
import { submitCotizacion } from '@/lib/submitCotizacion';
import { calcularCotizacion, formatCLP, formatKwh } from '@/lib/estimaciones';
import { fasesPorTipoPropiedad, requiereCotizacionDetallada } from '@/lib/config';
import { useConfig } from '@/lib/useConfig';
import type { Region } from '@/lib/config';
import type { FinanciamientoOpcion } from '@/lib/estimaciones';

export function Step6Resumen() {
  const { consumo, ubicacion } = useCotizadorStore((s) => s.data);
  const goToStep = useCotizadorStore((s) => s.goToStep);
  const status = useCotizadorStore((s) => s.status);
  const errorMessage = useCotizadorStore((s) => s.errorMessage);
  const setStatus = useCotizadorStore((s) => s.setStatus);
  const leadEnviado = useCotizadorStore((s) => s.leadEnviado);
  const setLeadEnviado = useCotizadorStore((s) => s.setLeadEnviado);
  const data = useCotizadorStore((s) => s.data);
  const { config, genZona, version } = useConfig();
  const detallada = requiereCotizacionDetallada(data.propiedad.tipoPropiedad);
  const [submitting, setSubmitting] = useState(false);
  const [opcionSel, setOpcionSel] = useState<string>('transferencia');

  const cotizacion = useMemo(() => {
    if (!ubicacion.region) return null;
    return calcularCotizacion({
      ...consumo,
      region: ubicacion.region as Region,
      fases: fasesPorTipoPropiedad(data.propiedad.tipoPropiedad),
      config,
      generacionPorZona: genZona,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consumo, ubicacion.region, data.propiedad.tipoPropiedad, config, genZona, version]);

  if (status === 'success') {
    return <StepShell title=""><SuccessAnimation /></StepShell>;
  }

  // El lead ya se generó al avanzar de la etapa 5 a la 6 (Odoo + correo).
  // Para el flujo detallada el botón solo confirma; reintenta el envío si
  // por alguna razón aún no se había registrado.
  const handleConfirmDetallada = async () => {
    if (submitting) return;
    if (leadEnviado) {
      setStatus('success');
      return;
    }
    setSubmitting(true);
    setStatus('submitting');
    const result = await submitCotizacion(data);
    setSubmitting(false);
    if (result.ok) {
      setLeadEnviado(true);
      setStatus('success');
    } else setStatus('error', 'No pudimos registrar tu solicitud. Revisa tu conexión e inténtalo nuevamente.');
  };

  return (
    <StepShell
      title={detallada ? 'Tu estimación de ahorro' : 'Tu cotización preliminar'}
      subtitle={
        detallada
          ? 'Para tu tipo de proyecto preparamos una cotización a detalle. Un especialista te contactará.'
          : 'Un especialista confirmará los valores finales.'
      }
      footer={
        <div className="flex items-center justify-between w-full gap-2">
          <Button type="button" variant="ghost" onClick={() => goToStep(5)}>
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
          {detallada ? (
            <Button
              type="button"
              variant="primary"
              loading={submitting}
              onClick={handleConfirmDetallada}
            >
              Solicitar cotización a detalle
              <Send className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              variant="primary"
              onClick={() => window.open('/cotizacion', '_blank', 'noopener,noreferrer')}
            >
              Ver Propuesta Preliminar
              <FileText className="h-4 w-4" />
            </Button>
          )}
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
            <div className={clsx('grid gap-2', detallada ? 'grid-cols-2' : 'grid-cols-3')}>
              <KPI label="Sistema" value={`${cotizacion.sistema.capacidadKwp.toFixed(1)} kWp`} accent />
              <KPI label={detallada ? 'Beneficio/mes' : 'Ahorro/mes'} value={formatCLP(cotizacion.ahorro.ahorroMensualProm)} highlight />
              {!detallada && (
                <KPI label="Payback" value={`${cotizacion.paybackAnios} años`} />
              )}
            </div>

            {/* ── Generación ───────────────────────────────────────────── */}
            <div className="rounded-lg border border-white/40 bg-white/40 px-3 py-2 flex items-center justify-between text-xs">
              <span className="text-slate-700">
                {cotizacion.sistema.numeroPaneles} paneles · {formatKwh(cotizacion.sistema.generacionAnualKwh)}/año
              </span>
              <span className="text-slate-700">
                Ahorro anual: <span className="font-semibold text-amber-800">{formatCLP(cotizacion.ahorro.ahorroTotalAnual)}</span>
              </span>
            </div>

            <div className="grid gap-2 text-xs text-slate-700 sm:grid-cols-2">
              <div className="rounded-lg border border-white/40 bg-white/35 px-3 py-2">
                <span className="font-semibold">Equipo:</span> {cotizacion.sistema.marcaPanel} · {cotizacion.sistema.marcaInversor} {cotizacion.sistema.potenciaInversorKw} kW
              </div>
              <div className="rounded-lg border border-white/40 bg-white/35 px-3 py-2">
                <span className="font-semibold">Impacto:</span> {cotizacion.sistema.mitigacionCo2TonAnual.toLocaleString('es-CL')} t CO₂/año · {cotizacion.garantias.map((item) => `${item.label} ${item.valor}`).join(' · ')}
              </div>
            </div>

            {/* ── Flujo residencial: oferta comercial completa ─────────── */}
            {!detallada && (
              <>
                {/* Financiamiento — solo Transferencia y Mercado Pago */}
                <div className="grid gap-2 sm:grid-cols-2">
                  {cotizacion.opcionesFinanciamiento
                    .filter((op) => op.id === 'transferencia' || op.id === 'mercadopago')
                    .map((op) => (
                    <OpcionCard
                      key={op.id}
                      opcion={op}
                      selected={opcionSel === op.id}
                      onClick={() => setOpcionSel(op.id)}
                    />
                  ))}
                </div>

                {/* Gráfico de payback */}
                <PaybackChart
                  precioProyecto={cotizacion.precioProyectoClp}
                  ahorroAnual={cotizacion.ahorro.ahorroTotalAnual}
                  paybackAnios={cotizacion.paybackAnios}
                  opcionSel={opcionSel}
                  opcion={cotizacion.opcionesFinanciamiento.find(o => o.id === opcionSel) ?? cotizacion.opcionesFinanciamiento[0]}
                />

                <p className="-mt-1 text-xs leading-relaxed text-slate-600">
                  * Valores IVA incluido. <a href="/cotizacion" target="_blank" rel="noopener noreferrer" className="font-medium text-amber-800 underline underline-offset-2">Ver cotización completa con garantías y condiciones →</a>
                </p>
              </>
            )}

            {/* ── Flujo empresa/departamento: cotización a detalle ─────── */}
            {detallada && (
              <div className="rounded-xl border border-sky-400/30 bg-sky-500/10 p-3">
                <p className="text-sm font-semibold text-sky-800">Cotización a detalle</p>
                <p className="mt-1 text-xs text-sky-700">
                  Los proyectos de {data.propiedad.tipoPropiedad === 'empresa' ? 'empresa' : 'departamento'} se
                  diseñan a medida (dimensionamiento, estructura, empalme y condiciones específicas). El ahorro
                  que ves arriba es una estimación referencial. Al enviar tus datos, un especialista preparará
                  una propuesta técnica y de precio a tu medida.
                </p>
              </div>
            )}
          </>
        )}

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
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-700">{label}</p>
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
          <span className="shrink-0 rounded-full bg-amber-300/35 px-2 py-0.5 text-[10px] font-bold text-amber-900">
            {opcion.badge}
          </span>
        )}
      </div>
      <p className="text-[11px] text-slate-700">{opcion.subtitulo}</p>
      <div className="mt-1.5 flex items-baseline gap-1">
        {opcion.cuotas > 0 ? (
          <><span className="text-base font-bold text-slate-900">{formatCLP(opcion.cuotaMensual)}</span><span className="text-[11px] text-slate-600">/mes</span></>
        ) : (
          <><span className="text-base font-bold text-slate-900">{formatCLP(opcion.montoTotal)}</span><span className="text-[11px] text-slate-600"> contado</span></>
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

  // Los datos están en miles de CLP: sobre $1.000k se muestran como millones
  // ($4,2M) para que la escala del eje sea legible y no se corte.
  const fmtMiles = (v: number) =>
    Math.abs(v) >= 1000
      ? `$${(v / 1000).toLocaleString('es-CL', { maximumFractionDigits: 1 })}M`
      : `$${v.toLocaleString('es-CL')}k`;

  return (
    <motion.div
      key={opcionSel}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-xl border border-white/40 bg-white/40 p-3"
    >
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-700">
          Retorno de inversión — 20 años
        </p>
        <span className="rounded-full bg-amber-300/35 px-2 py-0.5 text-[10px] font-bold text-amber-900">
          Break-even año {breakEvenYear}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={110}>
        <LineChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <XAxis
            dataKey="año"
            tick={{ fontSize: 11, fill: '#475569' }}
            tickLine={false}
            axisLine={false}
            interval={4}
            tickFormatter={(v) => `${v}a`}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#475569' }}
            tickLine={false}
            axisLine={false}
            width={44}
            tickFormatter={fmtMiles}
          />
          <Tooltip
            contentStyle={{
              background: 'rgba(255,255,255,0.85)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.6)',
              borderRadius: 8,
              fontSize: 12,
              padding: '4px 8px',
            }}
            formatter={(val, name) => [fmtMiles(typeof val === 'number' ? val : 0), String(name) === 'ahorro' ? 'Ahorro acum.' : String(name) === 'costo' ? 'Inversión' : 'Neto'] as [string, string]}
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
            <span className="text-[11px] font-medium text-slate-700">{label}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
