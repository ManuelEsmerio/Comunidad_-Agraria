-- Ejecuta este script en Supabase → SQL Editor.

create table if not exists public.miembros (
  id               bigint generated always as identity primary key,
  nombre           text not null check (char_length(trim(nombre)) > 0),
  apellido_paterno text not null check (char_length(trim(apellido_paterno)) > 0),
  apellido_materno text not null default '',
  domicilio        text,
  telefono         text,
  numero_tomas     integer check (numero_tomas is null or numero_tomas >= 1), -- NULL = toma pagada por la primera fila del mismo nombre
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  created_by       uuid default auth.uid() references auth.users(id) on delete set null
);

create index if not exists miembros_created_at_idx on public.miembros (created_at);

-- Mantener updated_at al día
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists miembros_updated_at on public.miembros;
create trigger miembros_updated_at before update on public.miembros
for each row execute function public.set_updated_at();

-- Permisos de tabla (los proyectos nuevos de Supabase no los dan automáticamente).
-- Solo usuarios con sesión; los visitantes anónimos no tienen acceso.
revoke all on public.miembros from anon;
grant select, insert, update, delete on public.miembros to authenticated;
grant usage, select on sequence public.miembros_id_seq to authenticated;

-- Seguridad: solo usuarios con sesión iniciada pueden leer y modificar.
alter table public.miembros enable row level security;

drop policy if exists "leer miembros" on public.miembros;
drop policy if exists "crear miembros" on public.miembros;
drop policy if exists "editar miembros" on public.miembros;
drop policy if exists "eliminar miembros" on public.miembros;

create policy "leer miembros"     on public.miembros for select to authenticated using (true);
create policy "crear miembros"    on public.miembros for insert to authenticated with check (true);
create policy "editar miembros"   on public.miembros for update to authenticated using (true) with check (true);
create policy "eliminar miembros" on public.miembros for delete to authenticated using (true);

-- Actualizaciones en tiempo real entre dispositivos
do $$
begin
  alter publication supabase_realtime add table public.miembros;
exception when duplicate_object then null;
end $$;
