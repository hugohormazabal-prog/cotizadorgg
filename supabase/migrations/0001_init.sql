-- ----------------------------------------------------------------------------
-- Esquema inicial — Cotizador Solar GG Electrics
-- ----------------------------------------------------------------------------
-- Cómo aplicar:
--   1) Con Supabase CLI:  supabase db push
--   2) O pega este archivo completo en el SQL Editor del dashboard de Supabase
--
-- TODO(Hugo): cuando definas la lógica final de cada variable (por ejemplo,
-- catálogos de tipos de techo, fórmulas de estimación, reglas de scoring de
-- leads, etc.) ajusta los `check` constraints y/o agrega columnas calculadas.
-- ----------------------------------------------------------------------------

create extension if not exists "pgcrypto";

create table if not exists public.cotizaciones (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  -- Etapa 1: Datos de contacto
  nombre_completo text not null,
  telefono text not null,
  email text not null,
  como_nos_encontraste text not null
    check (como_nos_encontraste in ('google', 'redes_sociales', 'recomendacion', 'mailing', 'otros')),

  -- Etapa 2: Tipo de propiedad
  tipo_propiedad text not null
    check (tipo_propiedad in ('casa', 'casa_construccion', 'departamento', 'empresa')),

  -- Etapa 3: Tipo de instalación / techo
  ubicacion_paneles text not null
    check (ubicacion_paneles in ('techo', 'carport', 'suelo')),
  tipo_techo text
    check (
      tipo_techo is null
      or tipo_techo in ('mediterraneo_zinc', 'teja_asfaltica', 'teja_cemento', 'pizarreno', 'teja_chilena', 'otro')
    ),

  -- Etapa 4: Ubicación de la instalación
  direccion text not null,
  info_adicional text,
  lat double precision,
  lng double precision,

  -- Etapa 5: Consumo eléctrico
  unidad_consumo text not null check (unidad_consumo in ('clp', 'kwh')),
  monto_clp numeric,
  consumo_kwh numeric,

  -- Estimaciones calculadas en el momento del envío (ver src/lib/estimaciones.ts
  -- y src/lib/submitCotizacion.ts — los nombres deben coincidir exactamente
  -- con el payload que arma submitCotizacion.ts)
  estimacion_consumo_kwh_mensual numeric,
  estimacion_capacidad_kwp numeric,
  estimacion_paneles integer,
  estimacion_ahorro_mensual_clp numeric,
  estimacion_precio_proyecto_clp numeric,
  estimacion_payback_anios numeric,

  -- Etapa 6: Resumen
  acepta_terminos boolean not null default false,

  -- Estado de seguimiento del lead (para uso interno / CRM)
  estado text not null default 'nuevo'
    check (estado in ('nuevo', 'contactado', 'en_evaluacion', 'cotizado', 'cerrado', 'descartado'))
);

comment on table public.cotizaciones is
  'Solicitudes de cotización enviadas desde el cotizador web. Cada fila representa un envío completo del flujo de 6 etapas.';

create index if not exists cotizaciones_created_at_idx on public.cotizaciones (created_at desc);
create index if not exists cotizaciones_estado_idx on public.cotizaciones (estado);
create index if not exists cotizaciones_email_idx on public.cotizaciones (email);

-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------
-- Permitimos inserciones anónimas (el formulario público no requiere login),
-- pero NO permitimos lectura/edición/borrado desde el cliente anónimo —
-- eso debe hacerse desde un panel interno autenticado o el dashboard de Supabase.
-- TODO(Hugo): cuando exista un panel de administración, crea políticas
-- adicionales para usuarios autenticados con el rol correspondiente.
-- ----------------------------------------------------------------------------

alter table public.cotizaciones enable row level security;

create policy "Cualquiera puede crear una cotización"
  on public.cotizaciones
  for insert
  to anon, authenticated
  with check (true);

-- Sin política de SELECT/UPDATE/DELETE para 'anon': el acceso de lectura
-- queda reservado a la service_role key (uso interno / backend / dashboard).
