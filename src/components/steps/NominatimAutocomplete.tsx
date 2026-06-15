'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { MapPin, Loader2, X } from 'lucide-react';
import { useCotizadorStore } from '@/lib/store';
import type { Region } from '@/lib/config';

// ─── Tipos internos ───────────────────────────────────────────────────────────

interface NominatimAddress {
  state?: string;
  region?: string;
  county?: string;
}

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: NominatimAddress;
}

// ─── Mapeo Nominatim → Región store ─────────────────────────────────────────
// Nominatim devuelve "address.state" con nombres como:
//   "Región Metropolitana de Santiago" → "Metropolitana"
//   "Región de Valparaíso" → "De Valparaíso"
// etc.

const NOMINATIM_STATE_MAP: Record<string, Region> = {
  'región metropolitana de santiago': 'Metropolitana',
  'region metropolitana de santiago': 'Metropolitana',
  'metropolitana': 'Metropolitana',
  'región de valparaíso': 'De Valparaíso',
  'region de valparaiso': 'De Valparaíso',
  'región de antofagasta': 'De Antofagasta',
  'region de antofagasta': 'De Antofagasta',
  'región de arica y parinacota': 'De Arica',
  'region de arica y parinacota': 'De Arica',
  'región de tarapacá': 'De Tarapacá',
  'region de tarapaca': 'De Tarapacá',
  'región de coquimbo': 'De Coquimbo',
  'region de coquimbo': 'De Coquimbo',
  "región del libertador general bernardo o'higgins": "De O'Higgins",
  "region del libertador general bernardo o'higgins": "De O'Higgins",
  "región de o'higgins": "De O'Higgins",
  'región del maule': 'Del Maule',
  'region del maule': 'Del Maule',
  'región del ñuble': 'Del Ñuble',
  'region del nuble': 'Del Ñuble',
  'región del biobío': 'Del Biobío',
  'region del biobio': 'Del Biobío',
  'región de la araucanía': 'De la Araucanía',
  'region de la araucania': 'De la Araucanía',
  'región de los ríos': 'De los Ríos',
  'region de los rios': 'De los Ríos',
  'región de los lagos': 'De los Lagos',
  'region de los lagos': 'De los Lagos',
  'región aysén del general carlos ibáñez del campo': 'De Aysén',
  'region aysen del general carlos ibanez del campo': 'De Aysén',
  'región de aysén': 'De Aysén',
};

function detectarRegion(address?: NominatimAddress): Region | null {
  if (!address) return null;
  const raw = (address.state ?? address.region ?? '').toLowerCase().trim();
  if (!raw) return null;
  return NOMINATIM_STATE_MAP[raw] ?? null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function formatAddress(displayName: string): string {
  const parts = displayName
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
    .filter((p) => p !== 'Chile' && p !== 'República de Chile');
  return parts.slice(0, 4).join(', ');
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function NominatimAutocomplete() {
  const ubicacion = useCotizadorStore((s) => s.data.ubicacion);
  const updateUbicacion = useCotizadorStore((s) => s.updateUbicacion);

  const [query, setQuery] = useState(ubicacion.direccion);
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebounce(query, 380);

  useEffect(() => {
    const trimmed = debouncedQuery.trim();
    if (trimmed.length < 4) { setResults([]); setOpen(false); return; }
    if (trimmed === ubicacion.direccion && ubicacion.lat != null) return;

    let cancelled = false;
    setLoading(true);

    const params = new URLSearchParams({
      q: trimmed,
      format: 'json',
      addressdetails: '1',   // ← necesario para detectar región
      limit: '6',
      countrycodes: 'cl',
      'accept-language': 'es',
    });

    fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
      headers: { 'Accept-Language': 'es' },
    })
      .then((r) => r.json())
      .then((data: NominatimResult[]) => {
        if (cancelled) return;
        setResults(data);
        setOpen(data.length > 0);
        setActiveIdx(-1);
        setLoading(false);
      })
      .catch(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [debouncedQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectResult = useCallback(
    (r: NominatimResult) => {
      const label = formatAddress(r.display_name);
      const region = detectarRegion(r.address);

      setQuery(label);
      updateUbicacion({
        direccion: label,
        lat: parseFloat(r.lat),
        lng: parseFloat(r.lon),
        // Si detectamos la región la seteamos automáticamente
        ...(region ? { region } : {}),
      });
      setOpen(false);
      setResults([]);
    },
    [updateUbicacion],
  );

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (ubicacion.direccion === '') setQuery('');
  }, [ubicacion.direccion]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, -1)); }
    else if (e.key === 'Enter' && activeIdx >= 0) { e.preventDefault(); selectResult(results[activeIdx]); }
    else if (e.key === 'Escape') setOpen(false);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setOpen(false);
    updateUbicacion({ direccion: '', lat: null, lng: null });
  };

  return (
    <div ref={containerRef} className="relative" style={{ zIndex: 20 }}>
      <label className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        Dirección
      </label>

      <div className="relative">
        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400">
          <MapPin className="h-3.5 w-3.5" />
        </span>
        <input
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-controls="nominatim-listbox"
          aria-expanded={open}
          aria-haspopup="listbox"
          autoComplete="off"
          spellCheck={false}
          className="w-full rounded-lg border border-white/50 bg-white/70 py-2 pl-8 pr-8 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/15"
          placeholder="Ej: Av. Andrés Bello 2325, Providencia"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setOpen(true)}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : query.length > 0 ? (
            <button type="button" aria-label="Borrar dirección" onClick={handleClear} className="transition hover:text-slate-700">
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </span>
      </div>

      {query.length > 0 && query.length < 4 && (
        <p className="mt-1.5 text-xs text-slate-400">Escribe al menos 4 caracteres para buscar</p>
      )}

      {/* Dropdown — z-index alto para aparecer sobre el mapa Leaflet */}
      {open && results.length > 0 && (
        <ul
          id="nominatim-listbox"
          role="listbox"
          className="absolute mt-1 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white py-1 shadow-xl"
          style={{ zIndex: 9999 }}
        >
          {results.map((r, i) => (
            <li key={r.place_id} role="option" aria-selected={i === activeIdx}>
              <button
                type="button"
                className={`flex w-full items-start gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                  i === activeIdx ? 'bg-sky-50 text-sky-700' : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                }`}
                onMouseDown={(e) => { e.preventDefault(); selectResult(r); }}
              >
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-500" />
                <div className="min-w-0">
                  <span className="line-clamp-1 leading-snug">{formatAddress(r.display_name)}</span>
                  {/* Muestra la región detectada como hint */}
                  {(() => { const reg = detectarRegion(r.address); return reg ? (
                    <span className="text-[11px] text-amber-400/80">📍 {reg}</span>
                  ) : null; })()}
                </div>
              </button>
            </li>
          ))}

          <li className="border-t border-slate-100 px-4 py-1.5">
            <span className="text-[11px] text-slate-400">© OpenStreetMap contributors</span>
          </li>
        </ul>
      )}
    </div>
  );
}
