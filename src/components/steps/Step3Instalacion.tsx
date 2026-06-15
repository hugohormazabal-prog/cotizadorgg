'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { StepShell } from './StepShell';
import { StepNavButtons } from './StepNavButtons';
import { SelectCard } from '@/components/ui/SelectCard';
import { useCotizadorStore } from '@/lib/store';
import { TipoTecho, UbicacionPaneles } from '@/lib/types';
import { RoofIcon, CarportIcon, GroundIcon } from '@/components/icons/PropertyIcons';

const UBICACIONES: { value: UbicacionPaneles; title: string; description: string; icon: JSX.Element }[] = [
  { value: 'techo', title: 'Techo', description: 'Sobre la cubierta de la edificación.', icon: <RoofIcon /> },
  { value: 'carport', title: 'Carport', description: 'Estructura sobre estacionamiento.', icon: <CarportIcon /> },
  { value: 'suelo', title: 'Suelo', description: 'Estructura montada a nivel de terreno.', icon: <GroundIcon /> },
];

const TECHOS: { value: TipoTecho; label: string }[] = [
  { value: 'mediterraneo_zinc', label: 'Mediterráneo / Zinc' },
  { value: 'teja_asfaltica', label: 'Teja Asfáltica' },
  { value: 'teja_cemento', label: 'Teja Cemento' },
  { value: 'pizarreno', label: 'Pizarreño' },
  { value: 'teja_chilena', label: 'Teja Chilena' },
  { value: 'otro', label: 'Otro' },
];

export function Step3Instalacion() {
  const instalacion = useCotizadorStore((s) => s.data.instalacion);
  const updateInstalacion = useCotizadorStore((s) => s.updateInstalacion);

  const requiereTecho = instalacion.ubicacionPaneles === 'techo';
  const isValid = requiereTecho
    ? Boolean(instalacion.ubicacionPaneles && instalacion.tipoTecho)
    : Boolean(instalacion.ubicacionPaneles);

  const handleSelectUbicacion = (value: UbicacionPaneles) => {
    updateInstalacion({
      ubicacionPaneles: value,
      // Si cambia a una opción que no es techo, limpiamos el tipo de techo.
      tipoTecho: value === 'techo' ? instalacion.tipoTecho : '',
    });
  };

  return (
    <StepShell
      title="¿Dónde se ubicarán los paneles?"
      subtitle="Esto nos ayuda a definir el tipo de estructura y montaje adecuado."
      footer={<StepNavButtons nextDisabled={!isValid} />}
    >
      <div className="flex flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-3">
          {UBICACIONES.map((opt) => (
            <SelectCard
              key={opt.value}
              selected={instalacion.ubicacionPaneles === opt.value}
              onSelect={() => handleSelectUbicacion(opt.value)}
              icon={opt.icon}
              title={opt.title}
              description={opt.description}
            />
          ))}
        </div>

        <AnimatePresence initial={false}>
          {requiereTecho && (
            <motion.div
              key="tipo-techo"
              initial={{ opacity: 0, height: 0, y: -8 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -8 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="rounded-xl border border-white/40 bg-white/40 p-3.5">
                <p className="mb-2.5 text-xs font-semibold text-slate-700">
                  ¿Qué tipo de techo tiene la propiedad?
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {TECHOS.map((techo) => {
                    const selected = instalacion.tipoTecho === techo.value;
                    return (
                      <motion.button
                        key={techo.value}
                        type="button"
                        onClick={() => updateInstalacion({ tipoTecho: techo.value })}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        className={`rounded-lg border px-3 py-2 text-left text-xs font-medium transition-colors duration-200 ${
                          selected
                            ? 'border-amber-400/70 bg-amber-50 text-amber-700'
                            : 'border-white/40 bg-white/50 text-slate-600 hover:border-sky-400/60 hover:text-sky-600'
                        }`}
                      >
                        {techo.label}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </StepShell>
  );
}
