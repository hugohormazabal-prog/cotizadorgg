'use client';

import { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes, forwardRef, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

interface BaseProps {
  label: string;
  error?: string | null;
  hint?: string;
  icon?: ReactNode;
}

type InputProps = BaseProps & InputHTMLAttributes<HTMLInputElement>;
type TextareaProps = BaseProps & TextareaHTMLAttributes<HTMLTextAreaElement>;

const fieldClasses =
  'w-full rounded-lg border bg-white/70 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-200 focus:bg-white/90';

function fieldStateClasses(hasError: boolean) {
  return hasError
    ? 'border-red-300/70 focus:border-red-400 focus:ring-2 focus:ring-red-400/20'
    : 'border-white/50 focus:border-sky-500/70 focus:ring-2 focus:ring-sky-500/20';
}

function FieldShell({
  label,
  error,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  error?: string | null;
  hint?: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <label htmlFor={htmlFor} className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </label>
      {children}
      <AnimatePresence mode="wait">
        {error ? (
          <motion.p
            key="error"
            initial={{ opacity: 0, y: -3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -3 }}
            className="text-[11px] font-medium text-red-500"
          >
            {error}
          </motion.p>
        ) : hint ? (
          <motion.p key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[11px] text-slate-400">
            {hint}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export const TextField = forwardRef<HTMLInputElement, InputProps>(function TextField(
  { label, error, hint, icon, className, ...props },
  ref
) {
  const id = useId();
  return (
    <FieldShell label={label} error={error} hint={hint} htmlFor={id}>
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-slate-400">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          id={id}
          className={clsx(fieldClasses, fieldStateClasses(Boolean(error)), icon && 'pl-8', className)}
          {...props}
        />
      </div>
    </FieldShell>
  );
});

export function TextareaField({ label, error, hint, className, ...props }: TextareaProps) {
  const id = useId();
  return (
    <FieldShell label={label} error={error} hint={hint} htmlFor={id}>
      <textarea
        id={id}
        rows={2}
        className={clsx(fieldClasses, fieldStateClasses(Boolean(error)), 'resize-none', className)}
        {...props}
      />
    </FieldShell>
  );
}

interface SelectFieldProps extends BaseProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export function SelectField({ label, error, hint, value, onChange, options, placeholder }: SelectFieldProps) {
  const id = useId();
  return (
    <FieldShell label={label} error={error} hint={hint} htmlFor={id}>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={clsx(
            fieldClasses,
            fieldStateClasses(Boolean(error)),
            'appearance-none pr-9',
            !value && 'text-slate-500'
          )}
        >
          <option value="" disabled className="text-slate-400">
            {placeholder ?? 'Selecciona una opción'}
          </option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="text-slate-900">
              {opt.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-slate-400 [&>*]:stroke-slate-400">
          <svg width="11" height="7" viewBox="0 0 12 8" fill="none" aria-hidden>
            <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
    </FieldShell>
  );
}
