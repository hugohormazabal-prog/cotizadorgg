import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { leadDesdeFila, serverClient, sincronizarConOdoo } from '@/lib/cotizacionesServer';
import { getOdooConfig } from '@/lib/odoo';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const VENTANA_DIAS = 7;
const LOTE = 25;

function autorizado(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const supplied = Buffer.from(request.headers.get('authorization') ?? '');
  const expected = Buffer.from(`Bearer ${secret}`);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

/**
 * Reintenta crear en Odoo las cotizaciones de los últimos días sin oportunidad.
 * Lo invoca Vercel Cron (vercel.json), que envía `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(request: NextRequest) {
  if (!autorizado(request)) return NextResponse.json({ ok: false }, { status: 401 });

  const supabase = serverClient();
  if (!supabase || !getOdooConfig()) {
    return NextResponse.json({ ok: false, error: 'not_configured' }, { status: 503 });
  }

  const desde = new Date(Date.now() - VENTANA_DIAS * 86_400_000).toISOString();
  const { data, error } = await supabase
    .from('cotizaciones')
    .select('*')
    .is('odoo_lead_id', null)
    .gte('created_at', desde)
    .order('created_at', { ascending: true })
    .limit(LOTE);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  let sincronizadas = 0;
  for (const fila of data ?? []) {
    if (await sincronizarConOdoo(supabase, leadDesdeFila(String(fila.id), fila))) sincronizadas++;
  }
  return NextResponse.json({ ok: true, pendientes: data?.length ?? 0, sincronizadas });
}
