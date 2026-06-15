'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import clsx from 'clsx';

// Omitimos los handlers de drag/animation nativos del <button>, que chocan
// con los tipos de eventos de Framer Motion al envolver el elemento con `motion.button`.
type NativeButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart' | 'onAnimationEnd' | 'onAnimationIteration'
>;

interface ButtonProps extends NativeButtonProps {
  variant?: 'primary' | 'ghost';
  loading?: boolean;
}

/**
 * Botón con micro-interacciones: escala al pasar el cursor / al presionar,
 * y un estado de carga animado (spinner + texto atenuado).
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', loading = false, disabled, className, children, ...props }, ref) => {
    const base =
      'relative inline-flex items-center justify-center gap-1.5 rounded-xl px-5 py-2 text-sm font-semibold tracking-wide transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70 disabled:cursor-not-allowed disabled:opacity-50';

    const variants: Record<string, string> = {
      primary:
        'bg-gradient-to-r from-amber-500 to-amber-400 text-ink-950 shadow-glow-amber hover:from-amber-400 hover:to-amber-300',
      ghost:
        'border border-white/40 bg-white/50 text-slate-700 hover:text-slate-900 hover:bg-white/70 backdrop-blur-sm',
    };

    return (
      <motion.button
        ref={ref}
        whileHover={!disabled && !loading ? { scale: 1.035 } : undefined}
        whileTap={!disabled && !loading ? { scale: 0.97 } : undefined}
        transition={{ type: 'spring', stiffness: 400, damping: 22 }}
        disabled={disabled || loading}
        className={clsx(base, variants[variant], className)}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        <span className={clsx(loading && 'opacity-80')}>{children}</span>
      </motion.button>
    );
  }
);

Button.displayName = 'Button';
