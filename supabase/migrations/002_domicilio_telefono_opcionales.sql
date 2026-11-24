-- Domicilio opcional y nueva columna teléfono (opcional).
-- No borra ni modifica registros existentes. Se puede ejecutar más de una vez.

alter table public.miembros drop constraint if exists miembros_domicilio_check;
alter table public.miembros alter column domicilio drop not null;

alter table public.miembros add column if not exists telefono text;

-- Los domicilios vacíos existentes pasan a NULL ("sin dato").
update public.miembros set domicilio = null where trim(domicilio) = '';
