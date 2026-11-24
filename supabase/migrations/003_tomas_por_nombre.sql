-- Formato del padrón: una fila por domicilio. El total de tomas va solo en la
-- primera fila de cada nombre; las demás filas del mismo nombre van vacías (NULL).
-- No borra ni modifica registros existentes. Se puede ejecutar más de una vez.

alter table public.miembros drop constraint if exists miembros_numero_tomas_check;
alter table public.miembros alter column numero_tomas drop not null;
alter table public.miembros add constraint miembros_numero_tomas_check
  check (numero_tomas is null or numero_tomas >= 1);
