# Registro de miembros — Comunidad agraria

## Intención
Que varias personas del comité registren, consulten, editen y eliminen miembros desde computadora (principalmente) o celular, sobre datos compartidos, y puedan imprimir un listado alfabético en PDF.

## Objetivos
- Formulario: nombre, apellido paterno, apellido materno, domicilio, número de tomas (entero ≥ 1, puede repetirse).
- Tabla ordenada por fecha de registro, con buscador, editar y eliminar (con confirmación).
- Exportar PDF vertical en orden alfabético; el usuario elige ordenar por nombre, apellido paterno o apellido materno.
- Acceso protegido con inicio de sesión; cuentas creadas por el administrador (sin registro público).
- Diseño Tailwind responsivo, animaciones suaves, buen rendimiento.

## No objetivos
- Registro público de usuarios, roles/permisos distintos, pagos, historial de cambios.

## Enfoques considerados
- **A. React + Tailwind + Supabase (elegido)**: BD Postgres + auth gestionados, plan gratis, sin servidor propio.
- B. Next.js + BD propia: más control, más mantenimiento y costo.
- C. React + Firebase: BD no relacional, ordenar/buscar por apellidos más torpe.

## Decisiones técnicas (llamadas del builder)
- Vite + React + TypeScript + Tailwind v4.
- Supabase: tabla `miembros` con RLS (solo usuarios autenticados).
- PDF con jsPDF + autotable, cargado bajo demanda (import dinámico) para no pesar en la carga inicial.
- Búsqueda en cliente, sin acentos y sin distinguir mayúsculas.
- Ordenación alfabética con `localeCompare('es')`, desempatando por los demás campos.
- Animaciones con CSS (sin librería) y respeto a `prefers-reduced-motion`.
- En celular la tabla se convierte en tarjetas.
