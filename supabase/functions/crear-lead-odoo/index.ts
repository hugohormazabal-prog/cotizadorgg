// ============================================================================
// Edge Function: crear-lead-odoo
// Se invoca al avanzar de la etapa 5 a la 6 del cotizador.
//   1. Crea un Lead en Odoo (crm.lead) vía XML-RPC.
//   2. Envía el correo formal con la propuesta preliminar al cliente.
//
// PENDIENTE (Hugo) — configurar secrets y desplegar:
//   supabase secrets set ODOO_URL=https://TU-EMPRESA.odoo.com \
//     ODOO_DB=tu-db ODOO_USER=usuario@empresa.cl ODOO_API_KEY=xxxx \
//     RESEND_API_KEY=re_xxxx EMAIL_FROM="GG Electrics <contacto@ggelectrics.cl>"
//   supabase functions deploy crear-lead-odoo
// ============================================================================

// @ts-nocheck — se ejecuta en Deno (Supabase Edge Runtime), no en Node.

const ODOO_URL = Deno.env.get('ODOO_URL') ?? '';
const ODOO_DB = Deno.env.get('ODOO_DB') ?? '';
const ODOO_USER = Deno.env.get('ODOO_USER') ?? '';
const ODOO_API_KEY = Deno.env.get('ODOO_API_KEY') ?? '';
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const EMAIL_FROM = Deno.env.get('EMAIL_FROM') ?? 'GG Electrics <no-reply@ggelectrics.cl>';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── XML-RPC mínimo para Odoo ────────────────────────────────────────────────

function xmlEscape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function toXmlValue(v: unknown): string {
  if (typeof v === 'string') return `<string>${xmlEscape(v)}</string>`;
  if (typeof v === 'number') return Number.isInteger(v) ? `<int>${v}</int>` : `<double>${v}</double>`;
  if (typeof v === 'boolean') return `<boolean>${v ? 1 : 0}</boolean>`;
  if (Array.isArray(v)) return `<array><data>${v.map((x) => `<value>${toXmlValue(x)}</value>`).join('')}</data></array>`;
  if (v && typeof v === 'object') {
    const members = Object.entries(v as Record<string, unknown>)
      .map(([k, val]) => `<member><name>${xmlEscape(k)}</name><value>${toXmlValue(val)}</value></member>`)
      .join('');
    return `<struct>${members}</struct>`;
  }
  return '<nil/>';
}

async function xmlRpcCall(endpoint: string, method: string, params: unknown[]): Promise<string> {
  const body = `<?xml version="1.0"?><methodCall><methodName>${method}</methodName><params>${params
    .map((p) => `<param><value>${toXmlValue(p)}</value></param>`)
    .join('')}</params></methodCall>`;
  const res = await fetch(`${ODOO_URL}/xmlrpc/2/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/xml' },
    body,
  });
  const text = await res.text();
  if (text.includes('<fault>')) throw new Error(`Odoo XML-RPC fault: ${text.slice(0, 500)}`);
  return text;
}

function parseIntResponse(xml: string): number {
  const m = xml.match(/<(?:int|i4)>(\d+)<\/(?:int|i4)>/);
  if (!m) throw new Error('Respuesta XML-RPC inesperada');
  return Number(m[1]);
}

async function crearLeadEnOdoo(payload: Record<string, unknown>): Promise<number> {
  const uid = parseIntResponse(
    await xmlRpcCall('common', 'authenticate', [ODOO_DB, ODOO_USER, ODOO_API_KEY, {}])
  );
  const leadXml = await xmlRpcCall('object', 'execute_kw', [
    ODOO_DB, uid, ODOO_API_KEY,
    'crm.lead', 'create',
    [payload],
  ]);
  return parseIntResponse(leadXml);
}

// ─── Email formal con la propuesta ───────────────────────────────────────────

async function enviarCorreoPropuesta(to: string, nombre: string, resumenHtml: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: [to],
      subject: 'Tu propuesta solar preliminar — GG Electrics',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1B2B4B">
          <h2>Hola ${xmlEscape(nombre)},</h2>
          <p>Gracias por cotizar con <strong>GG Electrics</strong>. Esta es tu propuesta preliminar:</p>
          ${resumenHtml}
          <p>Un especialista te contactará para confirmar los valores finales.</p>
          <p style="color:#888;font-size:12px">GG Electrics — Soluciones Eléctricas · ggelectrics.cl</p>
        </div>`,
    }),
  });
  if (!res.ok) throw new Error(`Resend: ${res.status} ${await res.text()}`);
}

// ─── Handler ─────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { contacto, propiedad, ubicacion, consumo, estimacion } = await req.json();

    if (!ODOO_URL || !ODOO_DB || !ODOO_USER || !ODOO_API_KEY) {
      // Secrets aún no configurados — no fallar el flujo del cotizador.
      return new Response(
        JSON.stringify({ ok: false, pending: true, error: 'Odoo no configurado (secrets pendientes)' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const leadId = await crearLeadEnOdoo({
      name: `Cotización solar — ${contacto.nombreCompleto}`,
      contact_name: contacto.nombreCompleto,
      email_from: contacto.email,
      phone: contacto.telefono,
      street: ubicacion.direccion,
      description: [
        `Tipo propiedad: ${propiedad.tipoPropiedad}`,
        `Región: ${ubicacion.region}`,
        `Consumo: ${consumo.unidad === 'clp' ? `$${consumo.montoClp} CLP/mes` : `${consumo.consumoKwh} kWh/mes`}`,
        estimacion ? `Sistema: ${estimacion.capacidadKwp} kWp (${estimacion.numeroPaneles} paneles)` : '',
        estimacion ? `Ahorro estimado: $${estimacion.ahorroMensual} CLP/mes` : '',
        `Origen: ${contacto.comoNosEncontraste}`,
      ].filter(Boolean).join('\n'),
    });

    if (RESEND_API_KEY && contacto.email) {
      const resumenHtml = estimacion
        ? `<ul>
            <li>Sistema sugerido: <strong>${estimacion.capacidadKwp} kWp</strong> (${estimacion.numeroPaneles} paneles)</li>
            <li>Ahorro estimado: <strong>$${Number(estimacion.ahorroMensual).toLocaleString('es-CL')} CLP/mes</strong></li>
          </ul>`
        : '<p>Un especialista preparará tu cotización a detalle.</p>';
      await enviarCorreoPropuesta(contacto.email, contacto.nombreCompleto, resumenHtml);
    }

    return new Response(JSON.stringify({ ok: true, leadId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
