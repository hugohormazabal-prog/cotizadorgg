-- Configuración central y versionada del cotizador.
-- El navegador público nunca escribe esta tabla directamente; la API del
-- servidor usa service_role. La futura clave/autenticación se aplica en API.

create table if not exists public.cotizador_config_versions (
  id uuid primary key default gen_random_uuid(),
  version bigint not null unique,
  status text not null check (status in ('draft', 'published', 'archived')),
  config jsonb not null,
  generacion jsonb not null,
  change_comment text,
  created_at timestamptz not null default now(),
  published_at timestamptz
);

create index if not exists cotizador_config_status_version_idx
  on public.cotizador_config_versions (status, version desc);

alter table public.cotizador_config_versions enable row level security;

-- Sin políticas para anon/authenticated: toda escritura y lectura del
-- mantenedor pasa por el servidor. service_role omite RLS.

comment on table public.cotizador_config_versions is
  'Historial inmutable de borradores y publicaciones del motor del cotizador.';

alter table public.cotizaciones
  add column if not exists config_version bigint,
  add column if not exists config_snapshot jsonb;

-- Escritura atómica: evita dejar producción sin versión publicada y resuelve
-- ediciones simultáneas mediante la versión esperada.
create or replace function public.write_cotizador_config(
  p_expected_version bigint,
  p_status text,
  p_config jsonb,
  p_generacion jsonb,
  p_change_comment text default null
)
returns public.cotizador_config_versions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_version bigint;
  v_result public.cotizador_config_versions;
begin
  if p_status not in ('draft', 'published') then
    raise exception 'INVALID_CONFIG_STATUS' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtext('cotizador_config_versions_write'));
  select coalesce(max(version), 0) into v_current_version
  from public.cotizador_config_versions;

  if p_expected_version <> v_current_version then
    raise exception 'CONFIG_VERSION_CONFLICT:%', v_current_version using errcode = '40001';
  end if;

  if p_status = 'published' then
    update public.cotizador_config_versions
    set status = 'archived'
    where status = 'published';
  end if;

  insert into public.cotizador_config_versions (
    version, status, config, generacion, change_comment, published_at
  ) values (
    v_current_version + 1,
    p_status,
    p_config,
    p_generacion,
    nullif(trim(p_change_comment), ''),
    case when p_status = 'published' then now() else null end
  )
  returning * into v_result;

  return v_result;
end;
$$;

revoke all on function public.write_cotizador_config(bigint, text, jsonb, jsonb, text) from public, anon, authenticated;
grant execute on function public.write_cotizador_config(bigint, text, jsonb, jsonb, text) to service_role;
