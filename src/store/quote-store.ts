"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { defaultBusinessSettings, type BusinessSettings } from "@/lib/config";
import {
  defaultQuickStartInput,
  defaultTechnicalConfig,
  type CustomerDraft,
  type QuickStartInput,
  type TechnicalConfig,
} from "@/lib/quote-engine";

type QuoteStage = "lead" | "technical";

type QuoteStore = {
  stage: QuoteStage;
  hydrated: boolean;
  settings: BusinessSettings;
  quickStart: QuickStartInput;
  technical: TechnicalConfig;
  customer: CustomerDraft;
  setHydrated: (hydrated: boolean) => void;
  setStage: (stage: QuoteStage) => void;
  replaceSettings: (settings: BusinessSettings) => void;
  updateSettings: (
    patch: Partial<BusinessSettings> | ((settings: BusinessSettings) => BusinessSettings),
  ) => void;
  updateQuickStart: (patch: Partial<QuickStartInput>) => void;
  updateTechnical: (patch: Partial<TechnicalConfig>) => void;
  updateCustomer: (patch: Partial<CustomerDraft>) => void;
  reset: () => void;
  resetSettings: () => void;
};

const defaultCustomer: CustomerDraft = {
  customerName: "",
  companyName: "",
  address: "",
  phone: "",
  email: "",
};

export const useQuoteStore = create<QuoteStore>()(
  persist(
    (set) => ({
      stage: "lead",
      hydrated: false,
      settings: defaultBusinessSettings,
      quickStart: defaultQuickStartInput,
      technical: defaultTechnicalConfig,
      customer: defaultCustomer,
      setHydrated: (hydrated) => set({ hydrated }),
      setStage: (stage) => set({ stage }),
      replaceSettings: (settings) => set({ settings }),
      updateSettings: (patch) =>
        set((state) => ({
          settings:
            typeof patch === "function"
              ? patch(state.settings)
              : { ...state.settings, ...patch },
        })),
      updateQuickStart: (patch) =>
        set((state) => ({
          quickStart: { ...state.quickStart, ...patch },
        })),
      updateTechnical: (patch) =>
        set((state) => ({
          technical: { ...state.technical, ...patch },
        })),
      updateCustomer: (patch) =>
        set((state) => ({
          customer: { ...state.customer, ...patch },
        })),
      reset: () =>
        set((state) => ({
          stage: "lead",
          hydrated: true,
          quickStart: defaultQuickStartInput,
          technical: {
            ...defaultTechnicalConfig,
            dcRunMeters: state.settings.defaultDcRunMeters,
            inverterToBoardMeters: state.settings.defaultInverterToBoardMeters,
            boardToMeterMeters: state.settings.defaultBoardToMeterMeters,
            dcUndergroundMeters: 0,
            inverterToBoardUndergroundMeters: 0,
            boardToMeterUndergroundMeters: 0,
            boardToMeterAerialMeters: 0,
            indoorPvcMeters: 0,
            includeMeter: false,
            includeMonitoring: false,
            acCouplingEnabled: false,
            includeConmutator: false,
            generatorName: "",
          },
          customer: defaultCustomer,
        })),
      resetSettings: () =>
        set({
          settings: defaultBusinessSettings,
        }),
    }),
    {
      name: "solar-quote-store",
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    },
  ),
);
