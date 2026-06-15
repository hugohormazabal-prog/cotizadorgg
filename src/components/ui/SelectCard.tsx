'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

interface SelectCardProps {
  selected: boolean;
  onSelect: () => void;
  icon: ReactNode;
  title: string;
  description?: string;
}

export function SelectCard({ selected, onSelect, icon, title, description }: SelectCardProps) {
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      whileHover={{ y: -2, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 360, damping: 24 }}
      className={clsx(
        'group relative flex flex-col items-start gap-1.5 overflow-hidden rounded-xl border p-2.5 text-left transition-colors duration-300',
        selected
          ? 'border-amber-400/70 bg-amber-400/10 shadow-glow-amber'
          : 'border-white/40 bg-white/40 hover:border-sky-400/50 hover:bg-white/60'
      )}
    >
      {selected && (
        <motion.span
          layoutId="select-card-glow"
          className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-amber-400/20 blur-3xl"
          transition={{ type: 'spring', stiffness: 200, damping: 24 }}
        />
      )}

      <div
        className={clsx(
          'flex h-7 w-7 items-center justify-center rounded-lg border transition-colors duration-300',
          selected
            ? 'border-amber-300 bg-amber-100 text-amber-600'
            : 'border-white/40 bg-white/50 text-sky-500 group-hover:text-sky-600'
        )}
      >
        {icon}
      </div>

      <div className="pr-5">
        <p className={clsx('text-xs font-semibold leading-tight transition-colors', selected ? 'text-amber-700' : 'text-slate-800')}>
          {title}
        </p>
        {description && (
          <p className="text-[10px] leading-snug text-slate-500 mt-0.5">{description}</p>
        )}
      </div>

      <motion.div
        initial={false}
        animate={{ scale: selected ? 1 : 0, opacity: selected ? 1 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 20 }}
        className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-ink-950"
      >
        <svg width="10" height="8" viewBox="0 0 12 10" fill="none" aria-hidden>
          <path d="M1 5L4.5 8.5L11 1" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </motion.div>
    </motion.button>
  );
}
