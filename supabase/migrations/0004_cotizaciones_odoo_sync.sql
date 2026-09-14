-- ----------------------------------------------------------------------------
-- 0004 — Trazabilidad de la sincronización con Odoo CRM
-- ----------------------------------------------------------------------------
-- La ruta /api/cotizaciones inserta la solicitud con la service_role key y
-- luego crea la oportunidad en Odoo. Estas columnas registran el resultado
-- para detectar y reintentar sincronizaciones fallidas.
-- ----------------------------------------------------------------------------

alter table public.cotizaciones
  add column if not exists odoo_lead_id integer,
  add column if not exists odoo_synced_at timestamptz,
  add column if not exists odoo_sync_error text;

create index if not exists cotizaciones_odoo_pendientes_idx
  on public.cotizaciones (created_at desc)
  where odoo_lead_id is null;

notify pgrst, 'reload schema';
