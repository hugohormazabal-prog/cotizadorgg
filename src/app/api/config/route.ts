import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  CONFIG_DEFAULT,
  GENERACION_POR_ZONA,
  normalizeConfig,
  normalizeGeneration,
  type ConfigBundle,
} from '@/lib/config';
import { hasErrors, validateConfig } from '@/lib/configValidation';

export const dynamic = 'force-dynamic';

function serverClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

function isAuthorized(request: NextRequest): boolean {
  const expected = process.env.MANTENEDOR_ACCESS_KEY;
  if (!expected) return true;
  const bearer = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const supplied = request.headers.get('x-mantenedor-key') ?? bearer ?? '';
  const left = Buffer.from(expected);
  const right = Buffer.from(supplied);
  return left.length === right.length && timingSafeEqual(left, right);
}

function defaultBundle(): ConfigBundle {
  return {
    config: CONFIG_DEFAULT,
    genZona: GENERACION_POR_ZONA,
    version: 0,
    status: 'local',
  };
}

function rowToBundle(row: Record<string, unknown> | null): ConfigBundle | null {
  if (!row) return null;
  return {
    config: normalizeConfig(row.config),
    genZona: normalizeGeneration(row.generacion),
    version: Number(row.version ?? 0),
    status: row.status === 'draft' ? 'draft' : row.status === 'archived' ? 'archived' : 'published',
    updatedAt: String(row.published_at ?? row.created_at ?? ''),
    comment: typeof row.change_comment === 'string' ? row.change_comment : undefined,
  };
}

export async function GET(request: NextRequest) {
  const client = serverClient();
  const admin = request.nextUrl.searchParams.get('scope') === 'admin';
  if (admin && !isAuthorized(request)) {
    return NextResponse.json({ error: 'Clave de mantenedor incorrecta.' }, { status: 401 });
  }
  if (!client) {
    return NextResponse.json({
      published: defaultBundle(),
      latestDraft: null,
      history: [],
      mode: 'local',
      authRequired: Boolean(process.env.MANTENEDOR_ACCESS_KEY),
      warning: 'Configura SUPABASE_SERVICE_ROLE_KEY para publicar globalmente.',
    });
  }

  const publishedQuery = await client
    .from('cotizador_config_versions')
    .select('*')
    .eq('status', 'published')
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (publishedQuery.error) {
    return NextResponse.json({
      published: defaultBundle(),
      latestDraft: null,
      history: [],
      mode: 'local',
      authRequired: Boolean(process.env.MANTENEDOR_ACCESS_KEY),
      warning: 'Aplica la migración 0003 para habilitar configuración central.',
    });
  }

  let latestDraft: ConfigBundle | null = null;
  let history: ConfigBundle[] = [];
  if (admin) {
    const { data } = await client
      .from('cotizador_config_versions')
      .select('*')
      .order('version', { ascending: false })
      .limit(20);
    const bundles = (data ?? []).map((row) => rowToBundle(row)).filter(Boolean) as ConfigBundle[];
    latestDraft = bundles.find((bundle) => bundle.status === 'draft') ?? null;
    history = bundles;
  }

  return NextResponse.json({
    published: rowToBundle(publishedQuery.data) ?? defaultBundle(),
    latestDraft,
    history,
    mode: 'central',
    authRequired: Boolean(process.env.MANTENEDOR_ACCESS_KEY),
  });
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Clave de mantenedor incorrecta.' }, { status: 401 });
  }
  const client = serverClient();
  if (!client) {
    return NextResponse.json({ error: 'Persistencia central no configurada.' }, { status: 503 });
  }

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 });

  const config = normalizeConfig(body.config);
  const genZona = normalizeGeneration(body.genZona);
  const issues = validateConfig(config, genZona);
  if (hasErrors(issues)) {
    return NextResponse.json({ error: 'La configuración tiene errores.', issues }, { status: 422 });
  }

  const action = body.action === 'publish' ? 'publish' : 'saveDraft';
  const expectedVersion = Number(body.expectedVersion ?? 0);
  const latest = await client
    .from('cotizador_config_versions')
    .select('version')
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latest.error) return NextResponse.json({ error: latest.error.message }, { status: 500 });
  const currentVersion = Number(latest.data?.version ?? 0);
  if (expectedVersion !== currentVersion) {
    return NextResponse.json({
      error: 'La configuración cambió en otra sesión. Recarga antes de guardar.',
      currentVersion,
    }, { status: 409 });
  }

  const comment = typeof body.comment === 'string' ? body.comment.trim().slice(0, 500) : '';
  const written = await client.rpc('write_cotizador_config', {
    p_expected_version: expectedVersion,
    p_status: action === 'publish' ? 'published' : 'draft',
    p_config: config,
    p_generacion: genZona,
    p_change_comment: comment || null,
  });
  if (written.error) {
    const conflict = written.error.message.includes('CONFIG_VERSION_CONFLICT');
    return NextResponse.json(
      { error: conflict ? 'La configuración cambió en otra sesión. Recarga antes de guardar.' : written.error.message },
      { status: conflict ? 409 : 500 },
    );
  }

  const writtenRow = Array.isArray(written.data) ? written.data[0] : written.data;
  return NextResponse.json({ bundle: rowToBundle(writtenRow as Record<string, unknown>), issues });
}
