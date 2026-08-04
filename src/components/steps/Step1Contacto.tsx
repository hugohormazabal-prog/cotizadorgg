'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { User, Phone, Mail } from 'lucide-react';
import { StepShell } from './StepShell';
import { StepNavButtons } from './StepNavButtons';
import { TextField, SelectField } from '@/components/ui/FormField';
import { useCotizadorStore } from '@/lib/store';
import { ComoNosEncontraste } from '@/lib/types';

const ORIGENES: { value: ComoNosEncontraste; label: string }[] = [
  { value: 'google', label: 'Google' },
  { value: 'redes_sociales', label: 'Redes Sociales' },
  { value: 'recomendacion', label: 'Por recomendación' },
  { value: 'mailing', label: 'Mailing' },
  { value: 'otros', label: 'Otros' },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Acepta números chilenos con o sin código de país, con espacios/guiones opcionales.
const PHONE_RE = /^(\+?56)?\s?9?\s?\d{4}\s?\d{4}$/;

export function Step1Contacto() {
  const contacto = useCotizadorStore((s) => s.data.contacto);
  const updateContacto = useCotizadorStore((s) => s.updateContacto);
  const aceptaTerminos = useCotizadorStore((s) => s.data.resumen.aceptaTerminos);
  const updateResumen = useCotizadorStore((s) => s.updateResumen);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const errors = useMemo(() => {
    const e: Record<string, string | null> = {};
    e.nombreCompleto =
      contacto.nombreCompleto.trim().length === 0
        ? 'El nombre es obligatorio'
        : contacto.nombreCompleto.trim().length < 3
        ? 'Ingresa tu nombre completo'
        : null;
    e.telefono =
      contacto.telefono.trim().length === 0
        ? 'El teléfono es obligatorio'
        : !PHONE_RE.test(contacto.telefono.trim())
        ? 'Ingresa un teléfono chileno válido (ej: +56 9 1234 5678)'
        : null;
    e.email =
      contacto.email.trim().length === 0
        ? 'El correo es obligatorio'
        : !EMAIL_RE.test(contacto.email.trim())
        ? 'Ingresa un correo electrónico válido'
        : null;
    return e;
  }, [contacto]);

  const isValid =
    contacto.nombreCompleto.trim().length >= 3 &&
    PHONE_RE.test(contacto.telefono.trim()) &&
    EMAIL_RE.test(contacto.email.trim()) &&
    contacto.comoNosEncontraste !== '' &&
    aceptaTerminos;

  const markTouched = (field: string) => setTouched((t) => ({ ...t, [field]: true }));

  return (
    <StepShell
      title="¡Comencemos tu cotización solar!"
      subtitle="Cuéntanos quién eres para que podamos preparar tu propuesta personalizada."
      footer={<StepNavButtons nextDisabled={!isValid} showBack={false} />}
    >
      <div className="grid sm:grid-cols-2" style={{ gap: '14px' }}>
        <TextField
          label="Nombre completo"
          placeholder="Ej: Juan Pérez"
          icon={<User className="h-4 w-4" />}
          value={contacto.nombreCompleto}
          onChange={(e) => updateContacto({ nombreCompleto: e.target.value })}
          onBlur={() => markTouched('nombreCompleto')}
          error={touched.nombreCompleto ? errors.nombreCompleto : null}
          autoComplete="name"
        />
        <TextField
          label="Número de contacto"
          type="tel"
          placeholder="+56 9 1234 5678"
          icon={<Phone className="h-4 w-4" />}
          value={contacto.telefono}
          onChange={(e) => updateContacto({ telefono: e.target.value })}
          onBlur={() => markTouched('telefono')}
          error={touched.telefono ? errors.telefono : null}
          autoComplete="tel"
        />
        <TextField
          label="Correo electrónico"
          type="email"
          placeholder="juan@example.com"
          icon={<Mail className="h-4 w-4" />}
          value={contacto.email}
          onChange={(e) => updateContacto({ email: e.target.value })}
          onBlur={() => markTouched('email')}
          error={touched.email ? errors.email : null}
          autoComplete="email"
        />
        <SelectField
          label="¿Cómo nos encontraste?"
          placeholder="Selecciona una opción"
          value={contacto.comoNosEncontraste}
          onChange={(value) => updateContacto({ comoNosEncontraste: value as ComoNosEncontraste })}
          options={ORIGENES}
        />
      </div>

      {/* Términos y condiciones — requisito para avanzar */}
      <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-xl border border-white/40 bg-white/60 p-3 transition-colors hover:border-slate-300">
        <span className="relative mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
          <input
            type="checkbox"
            checked={aceptaTerminos}
            onChange={(e) => updateResumen({ aceptaTerminos: e.target.checked })}
            className="peer sr-only"
          />
          <span className="absolute inset-0 rounded-md border border-slate-300 bg-white transition-colors peer-checked:border-amber-400 peer-checked:bg-amber-400" />
          <motion.svg
            width="12" height="10" viewBox="0 0 12 10" fill="none"
            className="relative z-10"
            initial={false}
            animate={{ scale: aceptaTerminos ? 1 : 0, opacity: aceptaTerminos ? 1 : 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 20 }}
          >
            <path d="M1 5L4.5 8.5L11 1" stroke="#050B14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </motion.svg>
        </span>
        <span className="text-sm leading-relaxed text-slate-700">
          Acepto los <span className="font-semibold text-amber-800 underline underline-offset-2">Términos y Condiciones</span> y autorizo a GG Electrics a contactarme.
        </span>
      </label>
    </StepShell>
  );
}
