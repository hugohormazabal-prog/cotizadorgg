import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  CotizadorState,
  Step,
  initialCotizadorState,
} from './types';

interface CotizadorStore {
  step: Step;
  maxStepReached: Step;
  data: CotizadorState;
  status: 'editing' | 'submitting' | 'success' | 'error';
  errorMessage: string | null;

  goToStep: (step: Step) => void;
  next: () => void;
  back: () => void;
  updateContacto: (patch: Partial<CotizadorState['contacto']>) => void;
  updatePropiedad: (patch: Partial<CotizadorState['propiedad']>) => void;
  updateInstalacion: (patch: Partial<CotizadorState['instalacion']>) => void;
  updateUbicacion: (patch: Partial<CotizadorState['ubicacion']>) => void;
  updateConsumo: (patch: Partial<CotizadorState['consumo']>) => void;
  updateResumen: (patch: Partial<CotizadorState['resumen']>) => void;
  setStatus: (status: CotizadorStore['status'], errorMessage?: string | null) => void;
  reset: () => void;
}

const TOTAL_STEPS = 6;

export const useCotizadorStore = create<CotizadorStore>()(
  persist(
    (set, get) => ({
      step: 1,
      maxStepReached: 1,
      data: initialCotizadorState,
      status: 'editing',
      errorMessage: null,

      goToStep: (step) => {
        const { maxStepReached } = get();
        if (step <= maxStepReached) set({ step });
      },

      next: () => {
        const { step } = get();
        const nextStep = Math.min(step + 1, TOTAL_STEPS) as Step;
        set((state) => ({
          step: nextStep,
          maxStepReached: (Math.max(state.maxStepReached, nextStep) as Step),
        }));
      },

      back: () => {
        const { step } = get();
        set({ step: Math.max(step - 1, 1) as Step });
      },

      updateContacto: (patch) =>
        set((state) => ({ data: { ...state.data, contacto: { ...state.data.contacto, ...patch } } })),

      updatePropiedad: (patch) =>
        set((state) => ({ data: { ...state.data, propiedad: { ...state.data.propiedad, ...patch } } })),

      updateInstalacion: (patch) =>
        set((state) => ({ data: { ...state.data, instalacion: { ...state.data.instalacion, ...patch } } })),

      updateUbicacion: (patch) =>
        set((state) => ({ data: { ...state.data, ubicacion: { ...state.data.ubicacion, ...patch } } })),

      updateConsumo: (patch) =>
        set((state) => ({ data: { ...state.data, consumo: { ...state.data.consumo, ...patch } } })),

      updateResumen: (patch) =>
        set((state) => ({ data: { ...state.data, resumen: { ...state.data.resumen, ...patch } } })),

      setStatus: (status, errorMessage = null) => set({ status, errorMessage }),

      reset: () =>
        set({
          step: 1,
          maxStepReached: 1,
          data: initialCotizadorState,
          status: 'editing',
          errorMessage: null,
        }),
    }),
    {
      name: 'gg-electrics-cotizador',
      version: 3, // Incrementar aquí si cambia la forma del estado persistido
      // Persistimos sólo los datos del formulario y el progreso —
      // no el estado transitorio de envío.
      partialize: (state) => ({
        step: state.step,
        maxStepReached: state.maxStepReached,
        data: state.data,
      }),
      // Merge defensivo: garantiza que todos los subobjetos de `data` existan
      // incluso si el estado guardado en localStorage es de una versión anterior.
      merge: (persisted: unknown, current) => {
        const p = persisted as Partial<typeof current>;
        return {
          ...current,
          ...p,
          data: {
            ...current.data,
            ...(p.data ?? {}),
            contacto:  { ...current.data.contacto,  ...(p.data?.contacto  ?? {}) },
            propiedad: { ...current.data.propiedad, ...(p.data?.propiedad ?? {}) },
            instalacion: { ...current.data.instalacion, ...(p.data?.instalacion ?? {}) },
            ubicacion: { ...current.data.ubicacion, ...(p.data?.ubicacion ?? {}) },
            consumo:   { ...current.data.consumo,   ...(p.data?.consumo   ?? {}) },
            resumen:   { ...current.data.resumen,   ...(p.data?.resumen   ?? {}) },
          },
        };
      },
    }
  )
);

export const TOTAL_COTIZADOR_STEPS = TOTAL_STEPS;
