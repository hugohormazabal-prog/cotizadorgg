import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface S { count: number; inc: () => void }

export const useStore = create<S>()(
  persist(
    (set, get) => ({
      count: 0,
      inc: () => set((s) => ({ count: s.count + 1 })),
    }),
    { name: 'probe' }
  )
);

const v = useStore((s) => s.count);
