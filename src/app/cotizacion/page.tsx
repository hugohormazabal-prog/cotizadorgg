'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { QuotePdfDocument } from '@/components/QuotePdfDocument';
import { calcularCotizacion } from '@/lib/estimaciones';
import { fasesPorTipoPropiedad, requiereCotizacionDetallada } from '@/lib/config';
import { useConfig } from '@/lib/useConfig';
import { useCotizadorStore } from '@/lib/store';
import type { Region } from '@/lib/config';

export default function CotizacionPage() {
  const data = useCotizadorStore((state) => state.data);
  const { config, genZona, version } = useConfig();
  const [mounted, setMounted] = useState(false);
  const previewViewportRef = useRef<HTMLDivElement>(null);
  const previewContentRef = useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = useState(1);
  const [previewHeight, setPreviewHeight] = useState<number | null>(null);

  useEffect(() => setMounted(true), []);

  const quote = useMemo(() => {
    if (!mounted || !data.ubicacion.region) return null;
    return calcularCotizacion({
      ...data.consumo,
      region: data.ubicacion.region as Region,
      fases: fasesPorTipoPropiedad(data.propiedad.tipoPropiedad),
      config,
      generacionPorZona: genZona,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, data.consumo, data.ubicacion.region, data.propiedad.tipoPropiedad, config, genZona, version]);

  useEffect(() => {
    if (!quote) return;

    const viewport = previewViewportRef.current;
    const content = previewContentRef.current;
    if (!viewport || !content) return;

    const measure = () => {
      const naturalWidth = content.scrollWidth;
      const naturalHeight = content.scrollHeight;
      const availableWidth = viewport.clientWidth;
      if (!naturalWidth || !naturalHeight || !availableWidth) return;

      const nextScale = Math.min(1, availableWidth / naturalWidth);
      setPreviewScale(nextScale);
      setPreviewHeight(Math.ceil(naturalHeight * nextScale));
    };

    const frame = requestAnimationFrame(measure);
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    observer.observe(content);
    window.addEventListener('resize', measure);

    const images = Array.from(content.querySelectorAll('img'));
    images.forEach((image) => image.addEventListener('load', measure));

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', measure);
      images.forEach((image) => image.removeEventListener('load', measure));
    };
  }, [quote]);

  if (!mounted) return null;

  if (requiereCotizacionDetallada(data.propiedad.tipoPropiedad)) {
    return (
      <main className="min-h-screen bg-slate-100 p-6 grid place-items-center">
        <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
          <h1 className="text-lg font-bold text-emerald-900">Cotización a detalle</h1>
          <p className="mt-3 text-sm text-slate-600">Los proyectos de empresa y departamento se cotizan a medida. Un especialista de GG Electrics preparará tu propuesta técnica y comercial.</p>
          <a href="/" className="mt-5 inline-block rounded-lg border border-slate-300 px-5 py-2 text-sm font-medium text-slate-600">← Volver al cotizador</a>
        </div>
      </main>
    );
  }

  if (!quote) {
    return (
      <main className="min-h-screen bg-slate-100 p-6 grid place-items-center">
        <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
          <h1 className="text-lg font-bold text-emerald-900">Aún no hay una propuesta para mostrar</h1>
          <p className="mt-3 text-sm text-slate-600">Completa el cotizador para calcular tu sistema y generar el documento con tus datos.</p>
          <a href="/" className="mt-5 inline-block rounded-lg bg-emerald-800 px-5 py-2 text-sm font-semibold text-white">Ir al cotizador</a>
        </div>
      </main>
    );
  }

  return (
    <main className="quote-preview min-h-screen bg-slate-200 px-3 py-4 sm:px-4 sm:py-7 print:bg-white print:p-0">
      <div className="quote-controls mx-auto mb-4 flex max-w-lg flex-col gap-2 sm:mb-6 sm:flex-row sm:justify-center sm:gap-3 print:hidden">
        <button type="button" onClick={() => window.print()} className="w-full rounded-lg bg-emerald-800 px-6 py-2.5 text-sm font-semibold text-white shadow hover:bg-emerald-900 sm:w-auto">Imprimir / Guardar PDF</button>
        <a href="/" className="w-full rounded-lg border border-slate-300 bg-white px-6 py-2.5 text-center text-sm font-medium text-slate-700 hover:bg-slate-50 sm:w-auto">← Volver al cotizador</a>
      </div>

      <div ref={previewViewportRef} className="quote-preview-viewport mx-auto w-full overflow-hidden">
        <div
          className="quote-preview-spacer relative w-full"
          style={{ height: previewHeight == null ? undefined : `${previewHeight}px` }}
        >
          <div
            ref={previewContentRef}
            className="quote-preview-scaled absolute left-1/2 top-0 w-max"
            style={{
              transform: `translateX(-50%) scale(${previewScale})`,
              transformOrigin: 'top center',
              visibility: previewHeight == null ? 'hidden' : 'visible',
            }}
          >
            <QuotePdfDocument quote={quote} customer={data} />
          </div>
        </div>
      </div>
      <style jsx global>{`
        @media print {
          html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
          body > * { visibility: visible; }
          .quote-preview { padding: 0 !important; }
          .quote-controls { display: none !important; }
          .quote-preview-viewport { width: auto !important; overflow: visible !important; }
          .quote-preview-spacer { height: auto !important; }
          .quote-preview-scaled {
            position: static !important;
            width: auto !important;
            transform: none !important;
            visibility: visible !important;
          }
          @page { size: 957.96pt 539.04pt; margin: 0; }
        }
      `}</style>
    </main>
  );
}
