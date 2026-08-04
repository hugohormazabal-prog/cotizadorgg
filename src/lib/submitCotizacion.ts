import { getSupabaseClient, isSupabaseConfigured } from './supabase';
import { CotizadorState } from './types';
import { calcularCotizacion } from './estimaciones';
import { getConfig, fasesPorTipoPropiedad } from './config';
import { generarLeadOdoo } from './lead';
import type { Region } from './config';

export interface SubmitResult {
  ok: boolean;
  mode: 'supabase' | 'demo';
  error?: string;
}

/**
 * Envía la solicitud de cotización a Supabase (tabla `cotizaciones`,
 * ver supabase/migrations/0001_init.sql) y genera el Lead en Odoo +
 * correo formal con la propuesta (Edge Function `crear-lead-odoo`).
 *
 * Se invoca al avanzar de la etapa 5 a la 6.
 *
 * Si Supabase aún no está configurado (faltan variables de entorno),
 * simula un envío exitoso en "modo demo" para que el flujo completo
 * pueda probarse de inmediato.
 */
export async function submitCotizacion(data: CotizadorState): Promise<SubmitResult> {
  const region = data.ubicacion.region as Region | '';
  const estimacion = region
    ? calcularCotizacion({
        ...data.consumo,
        region,
        fases: fasesPorTipoPropiedad(data.propiedad.tipoPropiedad),
        config: getConfig(),
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
    acepta_terminos: data.resumen.aceptaTerminos,
  };

  if (!isSupabaseConfigured) {
    // Modo demo: Supabase aún no configurado.
    await new Promise((resolve) => setTimeout(resolve, 900));
    return { ok: true, mode: 'demo' };
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return { ok: false, mode: 'demo', error: 'No se pudo inicializar el cliente de Supabase.' };
  }

  // El cliente de Supabase se tipa contra el esquema generado por el usuario
  // (ver `npm run` de generación de tipos en supabase/README si se agrega más
  // adelante). Hasta entonces, el cliente es genérico y aceptamos el payload
  // tal como está construido arriba, validado contra `CotizadorState`.
  let error: { message?: string } | null = null;
  try {
    const result = await (supabase.from('cotizaciones') as any).insert(payload);
    error = result.error;
  } catch {
    return {
      ok: false,
      mode: 'supabase',
      error: 'No pudimos registrar la solicitud en este momento. Reintentaremos más adelante.',
    };
  }

  if (error) {
    return {
      ok: false,
      mode: 'supabase',
      error: 'No pudimos registrar la solicitud en este momento. Reinténtalo más tarde.',
    };
  }

  // Lead en Odoo + correo formal con la propuesta (best-effort, no bloquea).
  void generarLeadOdoo(data, {
    capacidadKwp: estimacion?.sistema.capacidadKwp ?? null,
    numeroPaneles: estimacion?.sistema.numeroPaneles ?? null,
    ahorroMensual: estimacion?.ahorro.ahorroMensualProm ?? null,
    precioProyecto: estimacion?.precioProyectoClp ?? null,
  });

  return { ok: true, mode: 'supabase' };
}
