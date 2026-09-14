// ----------------------------------------------------------------------------
// Integración Odoo CRM (solo servidor — importar únicamente desde rutas API)
// ----------------------------------------------------------------------------
// Crea la oportunidad del cotizador dentro del pipeline de CRM:
//   contacto (res.partner) → equipo de ventas (crm.team) → etapa (crm.stage)
//   → etiquetas (crm.tag) → oportunidad (crm.lead, type = 'opportunity').
//
// Usa el endpoint JSON-RPC estándar de Odoo (/jsonrpc), disponible en
// Odoo.sh y Odoo Online. Autentica con una API key del usuario integrador
// (Preferencias → Seguridad de la cuenta → Nueva API key), nunca con la
// contraseña de inicio de sesión.
// ----------------------------------------------------------------------------

export interface OdooConfig {
  url: string;
  db: string;
  user: string;
  apiKey: string;
  /** Nombre del equipo de ventas cuyo pipeline recibe las oportunidades. */
  teamName: string | null;
  /** Nombre de la etapa inicial; si no existe se usa la primera del pipeline. */
  stageName: string | null;
  /** Etiqueta común para identificar oportunidades del cotizador. */
  tagName: string;
}

export function getOdooConfig(): OdooConfig | null {
  const url = process.env.ODOO_URL?.replace(/\/+$/, '');
  const db = process.env.ODOO_DB;
  const user = process.env.ODOO_USER;
  const apiKey = process.env.ODOO_API_KEY;
  if (!url || !db || !user || !apiKey) return null;
  return {
    url,
    db,
    user,
    apiKey,
    teamName: process.env.ODOO_CRM_TEAM?.trim() || null,
    stageName: process.env.ODOO_CRM_STAGE?.trim() || null,
    tagName: process.env.ODOO_CRM_TAG?.trim() || 'Cotizador web',
  };
}

type Domain = unknown[];

class OdooClient {
  private uid: number | null = null;
  private requestId = 0;

  constructor(private readonly cfg: OdooConfig) {}

  private async rpc<T>(service: 'common' | 'object', method: string, args: unknown[]): Promise<T> {
    const res = await fetch(`${this.cfg.url}/jsonrpc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'call',
        id: ++this.requestId,
        params: { service, method, args },
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`Odoo HTTP ${res.status}`);
    const json = (await res.json()) as { result?: T; error?: { message?: string; data?: { message?: string } } };
    if (json.error) {
      throw new Error(`Odoo: ${json.error.data?.message ?? json.error.message ?? 'error desconocido'}`);
    }
    return json.result as T;
  }

  private async login(): Promise<number> {
    if (this.uid) return this.uid;
    const uid = await this.rpc<number | false>('common', 'authenticate', [
      this.cfg.db,
      this.cfg.user,
      this.cfg.apiKey,
      {},
    ]);
    if (!uid) throw new Error('Odoo: autenticación rechazada (revisa ODOO_DB, ODOO_USER y ODOO_API_KEY)');
    this.uid = uid;
    return uid;
  }

  async call<T>(model: string, method: string, args: unknown[], kwargs: Record<string, unknown> = {}): Promise<T> {
    const uid = await this.login();
    return this.rpc<T>('object', 'execute_kw', [this.cfg.db, uid, this.cfg.apiKey, model, method, args, kwargs]);
  }

  async searchOne(model: string, domain: Domain, order?: string): Promise<number | null> {
    const ids = await this.call<number[]>(model, 'search', [domain], { limit: 1, ...(order ? { order } : {}) });
    return ids[0] ?? null;
  }

  async findOrCreate(model: string, domain: Domain, values: Record<string, unknown>): Promise<number> {
    return (await this.searchOne(model, domain)) ?? this.call<number>(model, 'create', [values]);
  }

  async hasField(model: string, field: string): Promise<boolean> {
    const fields = await this.call<Record<string, unknown>>(model, 'fields_get', [[field]], { attributes: ['type'] });
    return field in fields;
  }
}

export interface LeadCotizador {
  cotizacionId: string;
  nombre: string;
  email: string;
  telefono: string;
  direccion: string;
  region: string | null;
  tipoPropiedad: string;
  ubicacionPaneles: string;
  tipoTecho: string | null;
  comoNosEncontraste: string;
  consumoTexto: string;
  capacidadKwp: number | null;
  numeroPaneles: number | null;
  ahorroMensualClp: number | null;
  precioProyectoClp: number | null;
  paybackAnios: number | null;
  /** Empresa/departamento: cotización a detalle, sin precio publicado. */
  requiereDetalle: boolean;
}

const TIPO_PROPIEDAD_LABEL: Record<string, string> = {
  casa: 'Casa',
  casa_construccion: 'Casa en construcción',
  departamento: 'Departamento',
  empresa: 'Empresa',
};

// Etiquetas de segmento que el equipo comercial ya usa en el pipeline.
const SEGMENTO_TAG: Record<string, string> = {
  casa: 'Residencial',
  casa_construccion: 'Residencial',
  departamento: 'Residencial',
  empresa: 'Comercial',
};

const clp = (n: number) => `$${Math.round(n).toLocaleString('es-CL')}`;

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function descripcionHtml(lead: LeadCotizador): string {
  const filas: [string, string | null][] = [
    ['Tipo de propiedad', TIPO_PROPIEDAD_LABEL[lead.tipoPropiedad] ?? lead.tipoPropiedad],
    ['Instalación', [lead.ubicacionPaneles, lead.tipoTecho].filter(Boolean).join(' · ')],
    ['Dirección', lead.direccion],
    ['Región', lead.region],
    ['Consumo declarado', lead.consumoTexto],
    ['Sistema sugerido', lead.capacidadKwp != null ? `${lead.capacidadKwp} kWp (${lead.numeroPaneles ?? '?'} paneles)` : null],
    ['Ahorro mensual estimado', lead.ahorroMensualClp != null ? clp(lead.ahorroMensualClp) : null],
    ['Precio proyecto (IVA incl.)', !lead.requiereDetalle && lead.precioProyectoClp != null ? clp(lead.precioProyectoClp) : null],
    ['Payback', !lead.requiereDetalle && lead.paybackAnios != null ? `${lead.paybackAnios.toFixed(1)} años` : null],
    ['Cómo nos encontró', lead.comoNosEncontraste],
    ['ID cotización', lead.cotizacionId],
  ];
  const items = filas
    .filter(([, v]) => v)
    .map(([k, v]) => `<li><strong>${escapeHtml(k)}:</strong> ${escapeHtml(String(v))}</li>`)
    .join('');
  const aviso = lead.requiereDetalle ? '<p><strong>Requiere cotización a detalle.</strong></p>' : '';
  return `<p>Solicitud recibida desde el cotizador web.</p>${aviso}<ul>${items}</ul>`;
}

/**
 * Crea la oportunidad en el pipeline de Odoo y devuelve su ID.
 * Lanza error si Odoo rechaza la operación; el llamador decide cómo registrarlo.
 */
export async function crearOportunidadOdoo(cfg: OdooConfig, lead: LeadCotizador): Promise<number> {
  const odoo = new OdooClient(cfg);
  const email = lead.email.trim().toLowerCase();

  const partnerId = await odoo.findOrCreate(
    'res.partner',
    [['email', '=ilike', email]],
    { name: lead.nombre, email, phone: lead.telefono, street: lead.direccion },
  );

  const teamId = cfg.teamName ? await odoo.searchOne('crm.team', [['name', '=ilike', cfg.teamName]]) : null;
  if (cfg.teamName && !teamId) throw new Error(`Odoo: no existe el equipo de ventas "${cfg.teamName}"`);

  // Etapas visibles en el pipeline del equipo (o compartidas). Odoo 19 las
  // liga con team_ids (many2many); versiones anteriores con team_id.
  let stageScope: Domain = [];
  if (teamId) {
    const teamField = (await odoo.hasField('crm.stage', 'team_ids')) ? 'team_ids' : 'team_id';
    stageScope = ['|', [teamField, '=', false], [teamField, 'in', [teamId]]];
  }
  const stageId =
    (cfg.stageName ? await odoo.searchOne('crm.stage', [...stageScope, ['name', '=ilike', cfg.stageName]]) : null) ??
    (await odoo.searchOne('crm.stage', stageScope, 'sequence asc, id asc'));

  const tagNames = [cfg.tagName, SEGMENTO_TAG[lead.tipoPropiedad]].filter(Boolean) as string[];
  const tagIds: number[] = [];
  for (const name of tagNames) {
    tagIds.push(await odoo.findOrCreate('crm.tag', [['name', '=ilike', name]], { name }));
  }

  const mediumId = await odoo.searchOne('utm.medium', [['name', '=ilike', 'Website']]);

  const values: Record<string, unknown> = {
    type: 'opportunity',
    // Mismo formato que las oportunidades web existentes: nombre/región/consumo.
    name: [lead.nombre, lead.region, lead.consumoTexto].filter(Boolean).join('/'),
    partner_id: partnerId,
    contact_name: lead.nombre,
    email_from: email,
    phone: lead.telefono,
    street: lead.direccion,
    description: descripcionHtml(lead),
    tag_ids: [[6, 0, tagIds]],
  };
  if (teamId) values.team_id = teamId;
  if (stageId) values.stage_id = stageId;
  if (mediumId) values.medium_id = mediumId;
  if (!lead.requiereDetalle && lead.precioProyectoClp) values.expected_revenue = Math.round(lead.precioProyectoClp);

  return odoo.call<number>('crm.lead', 'create', [values]);
}
