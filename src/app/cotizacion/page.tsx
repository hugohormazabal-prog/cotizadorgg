'use client';

import { useEffect, useMemo, useState } from 'react';
import { QuotePdfDocument } from '@/components/QuotePdfDocument';
import { calcularCotizacion } from '@/lib/estimaciones';
import { fasesPorTipoPropiedad, requiereCotizacionDetallada } from '@/lib/config';
import { useConfig } from '@/lib/useConfig';
import { useCotizadorStore } from '@/lib/store';
import type { Region } from '@/lib/config';

export default function CotizacionPage() {
  const data = useCotizadorStore((state) => state.data);
  const { config, version } = useConfig();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const quote = useMemo(() => {
    if (!mounted || !data.ubicacion.region) return null;
    return calcularCotizacion({
      ...data.consumo,
      region: data.ubicacion.region as Region,
      fases: fasesPorTipoPropiedad(data.propiedad.tipoPropiedad),
      config,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, data.consumo, data.ubicacion.region, data.propiedad.tipoPropiedad, config, version]);

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
    <main className="quote-preview min-h-screen bg-slate-200 px-4 py-7 print:bg-white print:p-0">
      <div className="quote-controls mb-6 flex justify-center gap-3 print:hidden">
        <button type="button" onClick={() => window.print()} className="rounded-lg bg-emerald-800 px-6 py-2.5 text-sm font-semibold text-white shadow hover:bg-emerald-900">Imprimir / Guardar PDF</button>
        <a href="/" className="rounded-lg border border-slate-300 bg-white px-6 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">← Volver al cotizador</a>
      </div>
      <QuotePdfDocument quote={quote} customer={data} />
      <style jsx global>{`
        @media print {
          html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
          body > * { visibility: visible; }
          .quote-preview { padding: 0 !important; }
          .quote-controls { display: none !important; }
          @page { size: 957.96pt 539.04pt; margin: 0; }
        }
      `}</style>
    </main>
  );
}
