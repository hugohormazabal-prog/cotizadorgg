'use client';

import { StepShell } from './StepShell';
import { StepNavButtons } from './StepNavButtons';
import { SelectCard } from '@/components/ui/SelectCard';
import { useCotizadorStore } from '@/lib/store';
import { TipoPropiedad } from '@/lib/types';
import {
  HouseIcon,
  HouseConstructionIcon,
  ApartmentIcon,
  CompanyIcon,
} from '@/components/icons/PropertyIcons';

const OPCIONES: { value: TipoPropiedad; title: string; description: string; icon: JSX.Element }[] = [
  { value: 'casa', title: 'Casa', description: 'Vivienda unifamiliar ya construida.', icon: <HouseIcon /> },
  {
    value: 'casa_construccion',
    title: 'Casa en construcción',
    description: 'Proyecto en obra o por iniciar.',
    icon: <HouseConstructionIcon />,
  },
  { value: 'departamento', title: 'Departamento', description: 'Unidad dentro de un edificio.', icon: <ApartmentIcon /> },
  { value: 'empresa', title: 'Empresa', description: 'Local comercial, oficina o industria.', icon: <CompanyIcon /> },
];

export function Step2Propiedad() {
  const tipoPropiedad = useCotizadorStore((s) => s.data.propiedad.tipoPropiedad);
  const updatePropiedad = useCotizadorStore((s) => s.updatePropiedad);
  const next = useCotizadorStore((s) => s.next);

  const handleSelect = (value: TipoPropiedad) => {
    updatePropiedad({ tipoPropiedad: value });
    // Avance automático con una pequeña pausa para que se aprecie la animación de selección.
    setTimeout(() => next(), 380);
  };

  return (
    <StepShell
      title="¿Para qué tipo de propiedad necesitas la instalación?"
      subtitle="Selecciona la opción que mejor describe tu proyecto."
      footer={<StepNavButtons nextDisabled={!tipoPropiedad} />}
    >
      <div className="grid grid-cols-2 gap-3">
        {OPCIONES.map((opt) => (
          <SelectCard
            key={opt.value}
            selected={tipoPropiedad === opt.value}
            onSelect={() => handleSelect(opt.value)}
            icon={opt.icon}
            title={opt.title}
            description={opt.description}
          />
        ))}
      </div>
    </StepShell>
  );
}
