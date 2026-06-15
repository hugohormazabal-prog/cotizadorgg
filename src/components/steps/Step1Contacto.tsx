'use client';

import { useMemo, useState } from 'react';
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
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const errors = useMemo(() => {
    const e: Record<string, string | null> = {};
    e.nombreCompleto =
      contacto.nombreCompleto.trim().length > 0 && contacto.nombreCompleto.trim().length < 3
        ? 'Ingresa tu nombre completo'
        : null;
    e.telefono =
      contacto.telefono.length > 0 && !PHONE_RE.test(contacto.telefono.trim())
        ? 'Ingresa un teléfono chileno válido (ej: +56 9 1234 5678)'
        : null;
    e.email =
      contacto.email.length > 0 && !EMAIL_RE.test(contacto.email.trim())
        ? 'Ingresa un correo electrónico válido'
        : null;
    return e;
  }, [contacto]);

  const isValid =
    contacto.nombreCompleto.trim().length >= 3 &&
    PHONE_RE.test(contacto.telefono.trim()) &&
    EMAIL_RE.test(contacto.email.trim()) &&
    contacto.comoNosEncontraste !== '';

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
    </StepShell>
  );
}
