'use client';

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import clsx from 'clsx';
import { useCotizadorStore, TOTAL_COTIZADOR_STEPS } from '@/lib/store';
import { Step } from '@/lib/types';

const LABELS = ['Contacto', 'Propiedad', 'Instalación', 'Ubicación', 'Consumo', 'Resumen'];

export function ProgressBar() {
  const step = useCotizadorStore((s) => s.step);
  const maxStepReached = useCotizadorStore((s) => s.maxStepReached);
  const goToStep = useCotizadorStore((s) => s.goToStep);

  const progressPct = ((step - 1) / (TOTAL_COTIZADOR_STEPS - 1)) * 100;

  return (
    <div className="w-full">
      {/* Barra de progreso */}
      <div className="relative mb-1.5 h-[3px] w-full overflow-hidden rounded-full bg-black/10">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-sky-500 via-sky-400 to-amber-400"
          initial={false}
          animate={{ width: `${progressPct}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        />
      </div>

      {/* Pasos numerados */}
      <ol className="flex w-full items-start justify-between">
        {LABELS.map((label, idx) => {
          const stepNumber = (idx + 1) as Step;
          const isCompleted = stepNumber < step;
          const isCurrent = stepNumber === step;
          const isUnlocked = stepNumber <= maxStepReached;

          return (
            <li key={label} className="flex flex-1 flex-col items-center text-center">
              <motion.button
                type="button"
                disabled={!isUnlocked}
                onClick={() => goToStep(stepNumber)}
                whileHover={isUnlocked ? { scale: 1.1 } : undefined}
                whileTap={isUnlocked ? { scale: 0.93 } : undefined}
                className={clsx(
                  'relative flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-semibold transition-colors duration-300',
                  isCompleted && 'border-amber-400/70 bg-amber-500/90 text-ink-950 shadow-glow-amber',
                  isCurrent && 'border-sky-400/80 bg-sky-500/15 text-sky-600 ring-2 ring-sky-400/20',
                  !isCompleted && !isCurrent && 'border-white/40 bg-white/40 text-slate-500',
                  isUnlocked && !isCompleted && !isCurrent && 'cursor-pointer hover:border-white/60 hover:bg-white/60',
                  !isUnlocked && 'cursor-not-allowed'
                )}
              >
                {isCompleted ? (
                  <motion.span
                    initial={{ scale: 0, rotate: -45 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 18 }}
                  >
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </motion.span>
                ) : (
                  stepNumber
                )}
                {isCurrent && (
                  <motion.span
                    className="absolute inset-0 rounded-full border border-sky-400/60"
                    animate={{ scale: [1, 1.5], opacity: [0.6, 0] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
                  />
                )}
              </motion.button>

              <span
                className={clsx(
                  'mt-1 hidden text-[9px] font-medium uppercase tracking-wider sm:block',
                  isCurrent ? 'text-amber-600' : isCompleted ? 'text-slate-500' : 'text-slate-400'
                )}
              >
                {label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
