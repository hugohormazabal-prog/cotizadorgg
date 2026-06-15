'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { useCotizadorStore } from '@/lib/store';
import { formatCLP, calcularCotizacion } from '@/lib/estimaciones';
import { getConfig } from '@/lib/config';
import type { Region } from '@/lib/config';

export function SuccessAnimation() {
  const reset = useCotizadorStore((s) => s.reset);
  const data = useCotizadorStore((s) => s.data);
  const { consumo, ubicacion, contacto } = data;

  const cotizacion = ubicacion.region
    ? calcularCotizacion({ ...consumo, region: ubicacion.region as Region, config: getConfig() })
    : null;

  const nombre = contacto?.nombreCompleto ?? '';
  const ahorroMensual = cotizacion ? formatCLP(cotizacion.ahorro.ahorroMensualProm) : null;
  const capacidad = cotizacion ? `${cotizacion.sistema.capacidadKwp.toFixed(1)} kWp` : null;

  const waText = encodeURIComponent(
    `Hola GG Electrics! Acabo de cotizar un sistema solar${capacidad ? ` de ${capacidad}` : ''}${nombre ? ` para ${nombre}` : ''}.${ahorroMensual ? ` El sistema proyecta un ahorro de ${ahorroMensual}/mes.` : ''} Me gustaría coordinar los próximos pasos.`
  );
  const waUrl = `https://wa.me/56912345678?text=${waText}`;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center gap-6 py-10 text-center"
    >
      <div className="relative flex h-24 w-24 items-center justify-center">
        <motion.span
          className="absolute inset-0 rounded-full bg-amber-400/20"
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: [0.6, 1.6], opacity: [0.6, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
        />
        <motion.div
          initial={{ scale: 0, rotate: -90 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
          className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-500 shadow-glow-amber"
        >
          <motion.svg
            width="36"
            height="28"
            viewBox="0 0 36 28"
            fill="none"
            initial="hidden"
            animate="visible"
          >
            <motion.path
              d="M3 14.5 13 24.5 33 3.5"
              stroke="#050B14"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              variants={{
                hidden: { pathLength: 0, opacity: 0 },
                visible: { pathLength: 1, opacity: 1 },
              }}
              transition={{ duration: 0.6, delay: 0.4, ease: [0.65, 0, 0.35, 1] }}
            />
          </motion.svg>
        </motion.div>
      </div>

      <div>
        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-2xl font-bold text-slate-900 sm:text-3xl"
        >
          ¡Solicitud enviada con éxito!
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-600"
        >
          Gracias por confiar en GG Electrics. Nuestro equipo de especialistas revisará tu
          información y se pondrá en contacto contigo en las próximas{' '}
          <span className="font-semibold text-amber-600">24 horas</span> para preparar tu
          propuesta a medida.
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="flex flex-col items-center gap-3 w-full max-w-xs"
      >
        {/* WhatsApp CTA — acción rápida de cierre */}
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-full items-center justify-center gap-2.5 rounded-xl bg-[#25D366] px-6 py-3 text-sm font-semibold text-white shadow-lg hover:bg-[#1ebe5d] active:scale-95 transition-all duration-150"
        >
          <svg className="h-5 w-5 shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
            <path d="M11.999 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.978-1.304A9.96 9.96 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 11.999 2zm0 18a7.96 7.96 0 01-4.079-1.123l-.29-.173-3.014.789.806-2.943-.19-.302A7.966 7.966 0 014 12c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-7.999 8z" />
          </svg>
          Coordinar por WhatsApp
        </a>

        <a
          href="/cotizacion"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/50 bg-white/60 px-6 py-2.5 text-sm font-semibold text-slate-700 hover:bg-white/80 backdrop-blur-sm transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Ver cotización PDF
        </a>

        <Button type="button" variant="ghost" onClick={reset}>
          Crear una nueva cotización
        </Button>
      </motion.div>
    </motion.div>
  );
}
