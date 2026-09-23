'use client';

import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, ArrowLeft, FileText, Send } from 'lucide-react';
import clsx from 'clsx';
import { StepShell } from './StepShell';
import { SuccessAnimation } from './SuccessAnimation';
import { Button } from '@/components/ui/Button';
import { useCotizadorStore } from '@/lib/store';
import { submitCotizacion } from '@/lib/submitCotizacion';
import { calcularCotizacion, formatCLP, formatKwh, type FinanciamientoOpcion } from '@/lib/estimaciones';
import { fasesPorTipoPropiedad, requiereCotizacionDetallada } from '@/lib/config';
import { useConfig } from '@/lib/useConfig';
import type { Region } from '@/lib/config';

export function Step6Resumen() {
  const data = useCotizadorStore((s) => s.data);
  const goToStep = useCotizadorStore((s) => s.goToStep);
  const status = useCotizadorStore((s) => s.status);
  const errorMessage = useCotizadorStore((s) => s.errorMessage);
  const setStatus = useCotizadorStore((s) => s.setStatus);
  const leadEnviado = useCotizadorStore((s) => s.leadEnviado);
  const setLeadEnviado = useCotizadorStore((s) => s.setLeadEnviado);
  const { config, genZona, version } = useConfig();
  const detallada = requiereCotizacionDetallada(data.propiedad.tipoPropiedad);
  const [submitting, setSubmitting] = useState(false);

  const cotizacion = useMemo(() => {
    if (!data.ubicacion.region) return null;
    return calcularCotizacion({
      ...data.consumo,
      region: data.ubicacion.region as Region,
      fases: fasesPorTipoPropiedad(data.propiedad.tipoPropiedad),
      modo: detallada ? 'detallada' : 'residencial',
      config,
      generacionPorZona: genZona,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.consumo, data.ubicacion.region, data.propiedad.tipoPropiedad, config, genZona, version]);

  if (status === 'success') return <StepShell title=""><SuccessAnimation /></StepShell>;

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
    } else {
      setStatus('error', 'No pudimos registrar tu solicitud. Revisa tu conexión e inténtalo nuevamente.');
    }
  };

  return (
    <StepShell
      title={detallada ? 'Tu estimación de ahorro' : 'Tu cotización preliminar'}
      subtitle={detallada ? 'Un ingeniero atenderá tu requerimiento personalmente.' : 'Un especialista confirmará los valores finales.'}
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <Button type="button" variant="ghost" onClick={() => goToStep(5)}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />Volver
          </Button>
          {detallada ? (
            <Button type="button" variant="primary" loading={submitting} onClick={handleConfirmDetallada}>
              Solicitar Cotización Personalizada<Send className="h-4 w-4" aria-hidden="true" />
            </Button>
          ) : (
            <Button type="button" variant="primary" onClick={() => window.open('/cotizacion', '_blank', 'noopener,noreferrer')}>
              Ver Propuesta Preliminar<FileText className="h-4 w-4" aria-hidden="true" />
            </Button>
          )}
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        {!cotizacion && (
          <div className="rounded-xl border border-amber-400/40 bg-amber-400/15 p-3 text-sm text-amber-700">
            Vuelve al paso de ubicación y selecciona tu región para ver la cotización.
          </div>
        )}
        {cotizacion && (
          <>
            <div className={clsx('grid gap-2', detallada ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-3')}>
              <KPI label="Sistema" value={`${cotizacion.sistema.capacidadKwp.toLocaleString('es-CL', { maximumFractionDigits: detallada ? 2 : 1 })} kWp`} accent />
              <KPI label={detallada ? 'Ahorro mensual' : 'Ahorro/mes'} value={formatCLP(cotizacion.ahorro.ahorroMensualProm)} highlight />
              {!detallada && <KPI label="Payback" value={`${cotizacion.paybackAnios.toLocaleString('es-CL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} años`} />}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-lg border border-slate-200 bg-white/90 px-3 py-2 text-xs text-slate-700">
              <span>
                {detallada
                  ? `${formatKwh(cotizacion.sistema.generacionAnualKwh)}/año`
                  : `${cotizacion.sistema.numeroPaneles} paneles de ${cotizacion.sistema.potenciaPanelW}W - ${formatKwh(cotizacion.sistema.generacionAnualKwh)}/año`}
              </span>
              <span>Ahorro anual: <strong className="text-amber-800">{formatCLP(cotizacion.ahorro.ahorroTotalAnual)}</strong></span>
            </div>

            {detallada ? (
              <>
                <div className="rounded-lg border border-slate-200 bg-white/90 px-3 py-2 text-xs text-slate-700">
                  Mitigación de {cotizacion.sistema.mitigacionCo2TonAnual.toLocaleString('es-CL', { maximumFractionDigits: 2 })} TON/CO2 al año
                </div>
                <div className="rounded-xl border border-sky-200 bg-sky-50 p-3">
                  <p className="text-sm font-semibold text-sky-900">Cotización Personalizada</p>
                  <p className="mt-1 text-xs leading-relaxed text-sky-800">
                    Los proyectos para empresas se diseñan a medida y el ahorro señalado es una estimación referencial. Para este tipo de proyectos existen alternativas de financiamiento <strong>SIN INVERSIÓN INICIAL</strong>. Solicita tu cotización y un ingeniero atenderá tu requerimiento personalmente.
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="grid gap-2 text-xs text-slate-700 sm:grid-cols-2">
                  <div className="rounded-lg border border-slate-200 bg-white/90 px-3 py-2">
                    <span className="font-semibold">Equipo:</span> {cotizacion.sistema.marcaPanel} · {cotizacion.sistema.marcaInversor} {cotizacion.sistema.potenciaInversorKw} kW
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white/90 px-3 py-2">
                    <span className="font-semibold">Impacto:</span> {cotizacion.sistema.mitigacionCo2TonAnual.toLocaleString('es-CL')} t CO₂/año · {cotizacion.garantias.map((item) => `${item.label} ${item.valor}`).join(' · ')}
                  </div>
                </div>
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-900">
                  Valor Proyecto: {formatCLP(cotizacion.precioProyectoClp)}
                </div>
                <div className="grid gap-2 sm:grid-cols-2" aria-label="Alternativas de pago">
                  {(['transferencia', 'mercadopago', 'santander', 'alza'] as const).map((id) => {
                    const opcion = cotizacion.opcionesFinanciamiento.find((item) => item.id === id);
                    return opcion ? <OpcionCard key={id} opcion={opcion} /> : null;
                  })}
                </div>
                <p className="text-xs leading-relaxed text-slate-300">
                  * Valores IVA incluido. <a href="/cotizacion" target="_blank" rel="noopener noreferrer" className="font-medium text-amber-800 underline underline-offset-2">Ver cotización completa con garantías y condiciones →</a>
                </p>
              </>
            )}
          </>
        )}
        <AnimatePresence>
          {status === 'error' && errorMessage && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><span>{errorMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </StepShell>
  );
}

function KPI({ label, value, accent, highlight }: { label: string; value: string; accent?: boolean; highlight?: boolean }) {
  return (
    <div className={clsx('rounded-lg border p-2 text-center', accent ? 'border-amber-200 bg-amber-50' : highlight ? 'border-sky-200 bg-sky-50' : 'border-slate-200 bg-white/90')}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-700">{label}</p>
      <p className={clsx('mt-0.5 text-sm font-bold', accent ? 'text-amber-800' : highlight ? 'text-sky-800' : 'text-slate-900')}>{value}</p>
    </div>
  );
}

function OpcionCard({ opcion }: { opcion: FinanciamientoOpcion }) {
  const labels: Record<string, string> = {
    transferencia: 'Transferencia Electrónica/Webpay',
    mercadopago: 'Mercado Pago',
    santander: 'Tarjeta Crédito Santander',
    alza: 'Crédito a Largo Plazo',
  };
  const detail = opcion.id === 'alza' ? `${opcion.cuotas} cuotas` : opcion.cuotas > 0 ? `${opcion.cuotas} cuotas sin interés` : 'Pago único';
  const value = opcion.id === 'alza'
    ? `${(opcion.cuotaUf ?? 0).toLocaleString('es-CL', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} UF/mes`
    : opcion.cuotas > 0 ? `${formatCLP(opcion.cuotaMensual)}/mes` : formatCLP(opcion.montoTotal);
  return (
    <div className="min-w-0 rounded-xl border border-sky-200 bg-sky-50 p-3">
      <p className="text-xs font-bold text-sky-900">{labels[opcion.id] ?? opcion.nombre}</p>
      <p className="mt-0.5 text-[11px] text-sky-800">{detail}</p>
      <p className="mt-2 text-base font-bold text-slate-900">{value}</p>
    </div>
  );
}
