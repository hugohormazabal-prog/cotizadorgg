'use client';

import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import { ShieldCheck, Zap, Sun, Award } from 'lucide-react';
import { ImmersiveBackground } from '@/components/ui/ImmersiveBackground';
import { ExitIntentModal } from '@/components/ui/ExitIntentModal';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useCotizadorStore } from '@/lib/store';
import { Step1Contacto } from '@/components/steps/Step1Contacto';
import { Step2Propiedad } from '@/components/steps/Step2Propiedad';
import { Step3Instalacion } from '@/components/steps/Step3Instalacion';
import { Step4Ubicacion } from '@/components/steps/Step4Ubicacion';
import { Step5Consumo } from '@/components/steps/Step5Consumo';
import { Step6Resumen } from '@/components/steps/Step6Resumen';
import { useMemo } from 'react';
import { estimarRapido, formatCLP } from '@/lib/estimaciones';
import { fasesPorTipoPropiedad } from '@/lib/config';
import { useConfig } from '@/lib/useConfig';
import type { Region } from '@/lib/config';

const STEP_COMPONENTS = {
  1: Step1Contacto,
  2: Step2Propiedad,
  3: Step3Instalacion,
  4: Step4Ubicacion,
  5: Step5Consumo,
  6: Step6Resumen,
} as const;

export function Cotizador() {
  const step = useCotizadorStore((s) => s.step);
  const StepComponent = STEP_COMPONENTS[step];
  const consumo = useCotizadorStore((s) => s.data.consumo);
  const region = useCotizadorStore((s) => s.data.ubicacion.region) as Region | '';
  const tipoPropiedad = useCotizadorStore((s) => s.data.propiedad.tipoPropiedad);
  const { config, version } = useConfig();

  const liveAhorro = useMemo(() => {
    if (!region) return null;
    try {
      return estimarRapido({
        ...consumo,
        region,
        fases: fasesPorTipoPropiedad(tipoPropiedad),
        config,
      });
    } catch { return null; }
    // `version` fuerza recálculo cuando cambia la config del mantenedor
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consumo, region, tipoPropiedad, config, version]);

  return (
    <main className="relative w-full min-h-screen flex items-center justify-center px-4 py-8">
      <ImmersiveBackground />
      <ExitIntentModal />

      <div className="w-full max-w-2xl flex flex-col gap-3">
        {/* Header — sticky para mantener visible la marca y el ahorro estimado */}
        <header
          className="sticky top-0 z-30 -mx-1 flex items-center justify-between rounded-2xl px-3 py-2"
          style={{
            background: 'rgba(10,22,40,0.45)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
          }}
        >
          <div className="flex items-center gap-2.5">
            <Image
              src="/images/logo-gg.png"
              alt="GG Electrics"
              width={36}
              height={36}
              className="rounded-xl"
            />
            <div className="leading-tight" style={{ textShadow: '0 1px 6px rgba(0,0,0,0.55)' }}>
              <p className="text-sm font-bold tracking-wide text-white">GG Electrics</p>
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-amber-300"
                style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
                Cotizador Solar
              </span>
            </div>
          </div>
          {/* Live savings ticker — aparece cuando hay región y consumo */}
          <AnimatePresence mode="wait">
            {liveAhorro ? (
              <motion.div
                key="live"
                initial={{ opacity: 0, y: -6, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-end"
              >
                <span className="text-[9px] uppercase tracking-widest text-white/50">Ahorro est.</span>
                <span className="text-base font-extrabold text-amber-300 tabular-nums leading-tight">
                  {formatCLP(liveAhorro.ahorroMensual)}<span className="text-[10px] font-normal text-white/50">/mes</span>
                </span>
              </motion.div>
            ) : (
              <motion.a
                key="link"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                href="https://www.ggelectrics.cl/"
                target="_blank"
                rel="noreferrer"
                className="hidden text-xs font-medium text-white/60 transition-colors hover:text-amber-300 sm:inline-flex"
              >
                ggelectrics.cl ↗
              </motion.a>
            )}
          </AnimatePresence>
        </header>

        {/* Card — altura automática según contenido, sin scroll interno */}
        <div className="glass-panel w-full rounded-2xl shadow-glow" style={{ padding: '24px 28px' }}>
          <ProgressBar />

          {/* Área de step. Usamos un motion.div con `key={step}` (sin
              AnimatePresence mode="wait") para que el paso nuevo monte y se
              anime SIEMPRE al cambiar de paso. El patrón anterior con
              mode="wait" podía quedarse esperando la animación de salida y
              dejar el contenido en blanco. */}
          <div className="relative overflow-hidden mt-5">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              <StepComponent />
            </motion.div>
          </div>
        </div>

        {/* Trust strip */}
        <div className="flex items-center justify-center gap-x-4 gap-y-1.5 flex-wrap px-2" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>
          {([
            { Icon: ShieldCheck, text: 'Instaladores SEC Certificados' },
            { Icon: Zap,         text: 'Net Billing CDEC' },
            { Icon: Sun,         text: 'Garantía 25 años paneles' },
            { Icon: Award,       text: '+500 instalaciones' },
          ] as const).map(({ Icon, text }) => (
            <div key={text} className="flex items-center gap-1.5">
              <Icon className="h-3 w-3 text-amber-300 shrink-0" strokeWidth={2} />
              <span className="text-[10px] font-medium text-white/75 tracking-wide">{text}</span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-white/35">
          Tu progreso se guarda automáticamente — puedes continuar más tarde.
        </p>
      </div>
    </main>
  );
}
