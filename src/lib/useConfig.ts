'use client';

// ============================================================================
// Hook reactivo de configuración.
// Lee la config y la tabla de generación del mantenedor (localStorage) y se
// re-renderiza automáticamente cuando cambian, ya sea:
//   - en esta misma pestaña (evento CONFIG_CHANGED_EVENT que dispara saveConfig)
//   - en otra pestaña (evento nativo 'storage')
// Esto evita que el cotizador quede "pegado" con valores viejos hasta refrescar.
// ============================================================================

import { useEffect, useState } from 'react';
import {
  getConfig,
  getGeneracionPorZona,
  cachePublishedBundle,
  CONFIG_CHANGED_EVENT,
  type ConfigCotizador,
  type Region,
  type GeneracionMensual,
  type ConfigBundle,
} from './config';

export interface ConfigSnapshot {
  config: ConfigCotizador;
  genZona: Record<Region, GeneracionMensual>;
  /** Cambia en cada actualización; útil como dependencia de useMemo. */
  version: number;
  source: 'local' | 'central';
}

export function useConfig(): ConfigSnapshot {
  const [snap, setSnap] = useState<ConfigSnapshot>(() => ({
    config: getConfig(),
    genZona: getGeneracionPorZona(),
    version: 0,
    source: 'local',
  }));

  useEffect(() => {
    const refresh = () =>
      setSnap((prev) => ({
        config: getConfig(),
        genZona: getGeneracionPorZona(),
        version: prev.version + 1,
        source: prev.source,
      }));

    // Re-sincroniza al montar (el primer render en SSR usa defaults).
    refresh();

    // La configuración publicada es global. Si el backend aún no está
    // configurado, se conserva el fallback local para desarrollo.
    fetch('/api/config', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('No fue posible cargar la configuración publicada.');
        return response.json() as Promise<{ published: ConfigBundle; mode: 'local' | 'central' }>;
      })
      .then(({ published, mode }) => {
        if (mode !== 'central') return;
        cachePublishedBundle(published);
        setSnap({
          config: published.config,
          genZona: published.genZona,
          version: published.version,
          source: 'central',
        });
      })
      .catch(() => {
        // El cotizador sigue operativo con la última versión cacheada/default.
      });

    window.addEventListener(CONFIG_CHANGED_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(CONFIG_CHANGED_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  return snap;
}
