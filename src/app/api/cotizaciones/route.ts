import { after, NextRequest, NextResponse } from 'next/server';
import { enviarCorreoPropuesta, leadDesdeFila, serverClient, sincronizarConOdoo, texto } from '@/lib/cotizacionesServer';

export const dynamic = 'force-dynamic';

// Columnas de public.cotizaciones que el cotizador puede escribir. Cualquier
// otra clave del body se descarta (estado, odoo_* y created_at son internos).
const COLUMNAS = [
  'nombre_completo', 'telefono', 'email', 'como_nos_encontraste',
  'tipo_propiedad', 'ubicacion_paneles', 'tipo_techo',
  'direccion', 'info_adicional', 'lat', 'lng', 'region',
  'unidad_consumo', 'monto_clp', 'consumo_kwh',
  'estimacion_consumo_kwh_mensual', 'estimacion_capacidad_kwp', 'estimacion_paneles',
  'estimacion_ahorro_mensual_clp', 'estimacion_precio_proyecto_clp', 'estimacion_payback_anios',
  'config_version', 'config_snapshot', 'acepta_terminos',
] as const;

export async function POST(request: NextRequest) {
  const supabase = serverClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'not_configured' }, { status: 503 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'JSON inválido' }, { status: 400 });
  }

  const fila: Record<string, unknown> = {};
  for (const col of COLUMNAS) if (col in body) fila[col] = body[col];

  const email = texto(fila.email);
  if (!texto(fila.nombre_completo) || !texto(fila.telefono) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: 'Faltan datos de contacto' }, { status: 400 });
  }

  const { data, error } = await supabase.from('cotizaciones').insert(fila).select('id').single();
  if (error || !data) {
    console.error('[cotizaciones] insert falló:', error?.message);
    return NextResponse.json({ ok: false, error: 'No se pudo registrar la solicitud' }, { status: 500 });
  }

  const id = String(data.id);
  const lead = leadDesdeFila(id, fila);

  // Odoo y correo corren después de responder: el cliente avanza de inmediato
  // y el resultado queda registrado en la fila (reintento: /api/cotizaciones/sincronizar).
  after(async () => {
    await sincronizarConOdoo(supabase, lead);
    try {
      await enviarCorreoPropuesta(lead);
    } catch (err) {
      console.error('[cotizaciones] correo falló:', err instanceof Error ? err.message : err);
    }
  });

  return NextResponse.json({ ok: true, id });
}
