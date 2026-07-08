-- ----------------------------------------------------------------------------
-- 0002 — Agrega la columna 'region' faltante en public.cotizaciones
-- ----------------------------------------------------------------------------
-- El payload de submitCotizacion.ts envía `region` (Etapa 4: Ubicación), pero
-- 0001_init.sql no la incluía. Esto provoca el error de PostgREST:
--   "Could not find the 'region' column of 'cotizaciones' in the schema cache".
--
-- Cómo aplicar:
--   1) Supabase CLI:  supabase db push
--   2) O pega este archivo en el SQL Editor del dashboard de Supabase.
-- ----------------------------------------------------------------------------

alter table public.cotizaciones
  add column if not exists region text;

-- Fuerza a PostgREST a refrescar el schema cache (si no lo hace solo tras el DDL).
notify pgrst, 'reload schema';
