import { getSupabaseClient, isSupabaseConfigured } from './supabase';
import { CotizadorState } from './types';
import { calcularCotizacion } from './estimaciones';
import { getActiveConfigBundle, fasesPorTipoPropiedad } from './config';
import type { Region } from './config';

export interface SubmitResult {
  ok: boolean;
  mode: 'supabase' | 'demo';
  error?: string;
}

/**
 * Envía la solicitud de cotización a `/api/cotizaciones`, que la guarda en
 * Supabase (tabla `cotizaciones`), crea la oportunidad en el pipeline de
 * Odoo CRM y envía el correo con la propuesta (ver src/lib/odoo.ts).
 *
 * Se invoca al avanzar de la etapa 5 a la 6.
 *
 * Si Supabase aún no está configurado (faltan variables de entorno),
 * simula un envío exitoso en "modo demo" para que el flujo completo
 * pueda probarse de inmediato.
 */
export async function submitCotizacion(data: CotizadorState): Promise<SubmitResult> {
  const activeBundle = getActiveConfigBundle();
  const region = data.ubicacion.region as Region | '';
  const estimacion = region
    ? calcularCotizacion({
        ...data.consumo,
        region,
        fases: fasesPorTipoPropiedad(data.propiedad.tipoPropiedad),
        config: activeBundle.config,
        generacionPorZona: activeBundle.genZona,
      })
    : null;

  const payload = {
    nombre_completo: data.contacto.nombreCompleto.trim(),
    telefono: data.contacto.telefono.trim(),
    email: data.contacto.email.trim(),
    como_nos_encontraste: data.contacto.comoNosEncontraste,
    tipo_propiedad: data.propiedad.tipoPropiedad,
    ubicacion_paneles: data.instalacion.ubicacionPaneles,
    tipo_techo: data.instalacion.tipoTecho || null,
    direccion: data.ubicacion.direccion.trim(),
    info_adicional: data.ubicacion.infoAdicional.trim() || null,
    lat: data.ubicacion.lat,
    lng: data.ubicacion.lng,
    region: data.ubicacion.region || null,
    unidad_consumo: data.consumo.unidad,
    monto_clp: data.consumo.montoClp,
    consumo_kwh: data.consumo.consumoKwh,
    estimacion_consumo_kwh_mensual: estimacion?.consumoKwhMensual ?? null,
    estimacion_capacidad_kwp: estimacion?.sistema.capacidadKwp ?? null,
    estimacion_paneles: estimacion?.sistema.numeroPaneles ?? null,
    estimacion_ahorro_mensual_clp: estimacion?.ahorro.ahorroMensualProm ?? null,
    estimacion_precio_proyecto_clp: estimacion?.precioProyectoClp ?? null,
    estimacion_payback_anios: estimacion?.paybackAnios ?? null,
    config_version: activeBundle.version || null,
    config_snapshot: {
      schemaVersion: activeBundle.config.schemaVersion,
      version: activeBundle.version,
      status: activeBundle.status,
      config: activeBundle.config,
      generacionRegion: region ? activeBundle.genZona[region] : null,
    },
    acepta_terminos: data.resumen.aceptaTerminos,
  };

  if (!isSupabaseConfigured) {
    // Modo demo: Supabase aún no configurado.
    await new Promise((resolve) => setTimeout(resolve, 900));
    return { ok: true, mode: 'demo' };
  }

  const fallo: SubmitResult = {
    ok: false,
    mode: 'supabase',
    error: 'No pudimos registrar la solicitud en este momento. Reinténtalo más tarde.',
  };

  // La ruta del servidor guarda la fila y crea la oportunidad en Odoo CRM.
  let res: Response;
  try {
    res = await fetch('/api/cotizaciones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    return fallo;
  }
  if (res.ok) return { ok: true, mode: 'supabase' };
  if (res.status !== 503) return fallo;

  // Servidor sin service_role key: se conserva el registro anónimo directo
  // (sin sincronización con Odoo) para no perder la solicitud.
  const supabase = getSupabaseClient();
  if (!supabase) return fallo;
  try {
    const { error } = await (supabase.from('cotizaciones') as any).insert(payload);
    return error ? fallo : { ok: true, mode: 'supabase' };
  } catch {
    return fallo;
  }
}
