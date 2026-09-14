import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { requiereCotizacionDetallada } from './config';
import { crearOportunidadOdoo, getOdooConfig, type LeadCotizador } from './odoo';

// ----------------------------------------------------------------------------
// Lógica de servidor compartida por /api/cotizaciones y su sincronización.
// Importar únicamente desde rutas API (usa la service_role key).
// ----------------------------------------------------------------------------

export function serverClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

export const texto = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const numero = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : v == null || v === '' ? null : Number.isFinite(Number(v)) ? Number(v) : null);

/** Construye el lead a partir de una fila (o payload) de public.cotizaciones. */
export function leadDesdeFila(id: string, fila: Record<string, any>): LeadCotizador {
  const consumoTexto =
    fila.unidad_consumo === 'kwh'
      ? `${numero(fila.consumo_kwh) ?? '?'} kWh/mes`
      : `$${(numero(fila.monto_clp) ?? 0).toLocaleString('es-CL')} CLP/mes`;
  return {
    cotizacionId: id,
    nombre: texto(fila.nombre_completo),
    email: texto(fila.email),
    telefono: texto(fila.telefono),
    direccion: texto(fila.direccion),
    region: texto(fila.region) || null,
    tipoPropiedad: texto(fila.tipo_propiedad),
    ubicacionPaneles: texto(fila.ubicacion_paneles),
    tipoTecho: texto(fila.tipo_techo) || null,
    comoNosEncontraste: texto(fila.como_nos_encontraste),
    consumoTexto,
    capacidadKwp: numero(fila.estimacion_capacidad_kwp),
    numeroPaneles: numero(fila.estimacion_paneles),
    ahorroMensualClp: numero(fila.estimacion_ahorro_mensual_clp),
    precioProyectoClp: numero(fila.estimacion_precio_proyecto_clp),
    paybackAnios: numero(fila.estimacion_payback_anios),
    requiereDetalle: requiereCotizacionDetallada(fila.tipo_propiedad),
  };
}

/**
 * Crea la oportunidad en Odoo y registra el resultado en la fila.
 * Devuelve el ID de la oportunidad, o null si Odoo no está configurado o falló.
 */
export async function sincronizarConOdoo(supabase: SupabaseClient, lead: LeadCotizador): Promise<number | null> {
  const cfg = getOdooConfig();
  if (!cfg) return null;
  try {
    const leadId = await crearOportunidadOdoo(cfg, lead);
    const { error } = await supabase
      .from('cotizaciones')
      .update({ odoo_lead_id: leadId, odoo_synced_at: new Date().toISOString(), odoo_sync_error: null })
      .eq('id', lead.cotizacionId);
    if (error) console.error('[odoo] oportunidad creada pero no registrada:', leadId, error.message);
    return leadId;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[odoo] sincronización falló:', lead.cotizacionId, msg);
    await supabase.from('cotizaciones').update({ odoo_sync_error: msg.slice(0, 1000) }).eq('id', lead.cotizacionId);
    return null;
  }
}

export async function enviarCorreoPropuesta(lead: LeadCotizador) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !lead.email) return;
  const nombre = lead.nombre.replace(/[<>&"]/g, '');
  const resumen =
    !lead.requiereDetalle && lead.capacidadKwp != null
      ? `<ul>
          <li>Sistema sugerido: <strong>${lead.capacidadKwp} kWp</strong> (${lead.numeroPaneles} paneles)</li>
          <li>Ahorro estimado: <strong>$${Math.round(lead.ahorroMensualClp ?? 0).toLocaleString('es-CL')} CLP/mes</strong></li>
        </ul>`
      : '<p>Un especialista preparará tu cotización a detalle.</p>';
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? 'GG Electrics <no-reply@ggelectrics.cl>',
      to: [lead.email],
      subject: 'Tu propuesta solar preliminar — GG Electrics',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1B2B4B">
          <h2>Hola ${nombre},</h2>
          <p>Gracias por cotizar con <strong>GG Electrics</strong>. Este es el resumen de tu solicitud:</p>
          ${resumen}
          <p>Un especialista te contactará para confirmar los valores finales.</p>
          <p style="color:#888;font-size:12px">GG Electrics — Soluciones Eléctricas · ggelectrics.cl</p>
        </div>`,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 200)}`);
}
