'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface StepShellProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function StepShell({ title, subtitle, children, footer }: StepShellProps) {
  return (
    <div className="flex w-full flex-col" style={{ gap: '20px' }}>
      {(title || subtitle) && (
        <div>
          {title && (
            <motion.h1
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="text-lg font-bold leading-snug text-slate-900"
            >
              {title}
            </motion.h1>
          )}
          {subtitle && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.08, duration: 0.3 }}
              className="mt-1.5 text-xs leading-relaxed text-slate-500"
            >
              {subtitle}
            </motion.p>
          )}
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>

      {footer && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.14, duration: 0.25 }}
          className="flex items-center justify-between"
        >
          {footer}
        </motion.div>
      )}
    </div>
  );
}
