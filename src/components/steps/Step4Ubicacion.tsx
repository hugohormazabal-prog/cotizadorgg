'use client';

import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { useCotizadorStore } from '@/lib/store';
import { StepShell } from './StepShell';
import { StepNavButtons } from './StepNavButtons';
import { NominatimAutocomplete } from './NominatimAutocomplete';
import { REGIONES, type Region } from '@/lib/config';

// Leaflet usa window/document — solo en el cliente
const LocationMap = dynamic(() => import('./LocationMap').then(m => m.LocationMap), {
  ssr: false,
  loading: () => (
    <div className="flex h-36 w-full items-center justify-center rounded-xl border border-white/40 bg-white/30">
      <span className="text-xs text-slate-400">Cargando mapa…</span>
    </div>
  ),
});

// Datos de prueba social por región
const SOCIAL_PROOF: Record<string, number> = {
  'Metropolitana': 142, 'De Valparaíso': 87, 'Del Biobío': 63,
  'De La Araucanía': 41, 'De Los Lagos': 38, "De O'Higgins": 55,
  'Del Maule': 49, 'De Coquimbo': 72, 'De Antofagasta': 58,
  'De Atacama': 34, 'De Tarapacá': 29, 'De Arica': 21,
  'De Los Ríos': 27, 'De Aysén': 12, 'De Magallanes': 9,
};

// Irradiación solar promedio anual (kWh/m²/día) — fuente: Atlas Solar de Chile
const IRRADIACION: Record<string, { valor: number; label: string; color: string }> = {
  'De Arica':        { valor: 7.8, label: 'Excelente', color: '#f59e0b' },
  'De Tarapacá':     { valor: 7.5, label: 'Excelente', color: '#f59e0b' },
  'De Antofagasta':  { valor: 7.2, label: 'Excelente', color: '#f59e0b' },
  'De Atacama':      { valor: 6.8, label: 'Muy alto',  color: '#fb923c' },
  'De Coquimbo':     { valor: 6.2, label: 'Alto',      color: '#fbbf24' },
  'De Valparaíso':   { valor: 5.8, label: 'Alto',      color: '#fbbf24' },
  'Metropolitana':   { valor: 5.6, label: 'Bueno',     color: '#84cc16' },
  "De O'Higgins":    { valor: 5.3, label: 'Bueno',     color: '#84cc16' },
  'Del Maule':       { valor: 5.1, label: 'Bueno',     color: '#84cc16' },
  'Del Ñuble':       { valor: 4.8, label: 'Moderado',  color: '#22d3ee' },
  'Del Biobío':      { valor: 4.6, label: 'Moderado',  color: '#22d3ee' },
  'De La Araucanía': { valor: 4.3, label: 'Moderado',  color: '#22d3ee' },
  'De Los Ríos':     { valor: 4.0, label: 'Moderado',  color: '#22d3ee' },
  'De Los Lagos':    { valor: 3.8, label: 'Bajo',      color: '#94a3b8' },
  'De Aysén':        { valor: 3.5, label: 'Bajo',      color: '#94a3b8' },
  'De Magallanes':   { valor: 3.2, label: 'Bajo',      color: '#94a3b8' },
};

export function Step4Ubicacion() {
  const ubicacion = useCotizadorStore((s) => s.data.ubicacion);
  const updateUbicacion = useCotizadorStore((s) => s.updateUbicacion);

  // Social proof: busca match parcial en la región detectada
  const socialCount = ubicacion.region
    ? Object.entries(SOCIAL_PROOF).find(([k]) => ubicacion.region.includes(k.replace('De ', '').replace('Del ', '')))?.[1] ?? null
    : null;

  // Irradiación solar para la región detectada
  const irradiacion = ubicacion.region
    ? IRRADIACION[ubicacion.region] ?? Object.entries(IRRADIACION).find(([k]) => ubicacion.region.includes(k.replace('De ', '').replace('Del ', '')))?.[1] ?? null
    : null;

  const isValid =
    ubicacion.direccion.trim().length > 4 &&
    ubicacion.lat != null &&
    ubicacion.region !== '';

  return (
    <StepShell
      title="¿Dónde se ubicará tu instalación solar?"
      subtitle="Busca tu dirección — detectamos tu región automáticamente."
      footer={<StepNavButtons nextDisabled={!isValid} />}
    >
      <div className="flex flex-col gap-2">

        {/* Buscador — z-index alto para que dropdown pise el mapa */}
        <div style={{ position: 'relative', zIndex: 10 }}>
          <NominatimAutocomplete />
        </div>

        {/* Mapa — z-index 0 para que quede bajo el dropdown */}
        <div style={{ position: 'relative', zIndex: 0 }}>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Ajusta el pin si es necesario
          </p>
          <LocationMap />

          {/* Irradiación solar overlay badge */}
          <AnimatePresence>
            {irradiacion && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="absolute bottom-2 left-2 right-2 pointer-events-none"
              >
                <div
                  className="rounded-lg px-3 py-2"
                  style={{
                    background: 'rgba(255,255,255,0.82)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255,255,255,0.6)',
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">
                      ☀️ Irradiación solar
                    </span>
                    <span className="text-[9px] font-bold" style={{ color: irradiacion.color }}>
                      {irradiacion.label} · {irradiacion.valor} kWh/m²/día
                    </span>
                  </div>
                  {/* Gradient bar */}
                  <div className="relative h-1.5 w-full rounded-full overflow-hidden" style={{ background: 'linear-gradient(to right, #94a3b8, #22d3ee, #84cc16, #fbbf24, #f59e0b)' }}>
                    <motion.div
                      initial={{ left: 0 }}
                      animate={{ left: `${((irradiacion.valor - 3.2) / (7.8 - 3.2)) * 100}%` }}
                      transition={{ delay: 0.2, duration: 0.5, ease: 'easeOut' }}
                      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-3 w-3 rounded-full border-2 border-white shadow"
                      style={{ background: irradiacion.color }}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Región — solo muestra si NO fue auto-detectada o si el usuario quiere cambiarla */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Región <span className="text-amber-500">*</span>
            </p>
            {ubicacion.region && (
              <span className="text-[10px] text-amber-600 font-medium">✓ Auto-detectada</span>
            )}
          </div>
          <select
            value={ubicacion.region}
            onChange={(e) => updateUbicacion({ region: e.target.value as Region | '' })}
            className="w-full rounded-lg border border-white/40 bg-white/60 px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/15 [&>option]:bg-white"
          >
            <option value="">Selecciona tu región...</option>
            {REGIONES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>

          {/* Social proof badge */}
          <AnimatePresence>
            {socialCount && (
              <motion.div
                key={ubicacion.region}
                initial={{ opacity: 0, y: -6, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -6, height: 0 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-sky-400/30 bg-sky-500/10 px-3 py-2">
                  <span className="text-base">👥</span>
                  <p className="text-xs text-sky-700">
                    <span className="font-bold">{socialCount} personas</span> en tu región cotizaron este mes
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </StepShell>
  );
}
