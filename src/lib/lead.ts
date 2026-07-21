import { getSupabaseClient, isSupabaseConfigured } from './supabase';
import { CotizadorState } from './types';

/**
 * Genera el Lead en Odoo y dispara el envío del correo formal con la
 * propuesta. Se invoca al avanzar de la etapa 5 a la 6.
 *
 * La lógica real vive en la Edge Function `crear-lead-odoo`
 * (supabase/functions/crear-lead-odoo/index.ts), que:
 *   1. Crea el lead en Odoo vía XML-RPC (crm.lead).
 *   2. Envía el correo formal con la propuesta al cliente.
 *
 * PENDIENTE (Hugo): configurar en Supabase los secrets de la función:
 *   ODOO_URL, ODOO_DB, ODOO_USER, ODOO_API_KEY, RESEND_API_KEY, EMAIL_FROM
 * y desplegarla con `supabase functions deploy crear-lead-odoo`.
 *
 * Es best-effort: si la función no está desplegada o falla, NO bloquea el
 * flujo del cotizador (el lead ya quedó guardado en la tabla `cotizaciones`).
 */
export async function generarLeadOdoo(
  data: CotizadorState,
  estimacion: Record<string, unknown> | null
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured) return { ok: true }; // modo demo

  const supabase = getSupabaseClient();
  if (!supabase) return { ok: false, error: 'Cliente Supabase no disponible' };

  try {
    const { error } = await supabase.functions.invoke('crear-lead-odoo', {
      body: {
        contacto: data.contacto,
        propiedad: data.propiedad,
        instalacion: data.instalacion,
        ubicacion: data.ubicacion,
        consumo: data.consumo,
        estimacion,
      },
    });
    if (error) {
      console.warn('[crear-lead-odoo] fallo (no bloqueante):', error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[crear-lead-odoo] fallo (no bloqueante):', msg);
    return { ok: false, error: msg };
  }
}
