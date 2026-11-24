# Padrón · Comunidad Agraria

Registro de miembros (nombre, apellidos, domicilio y número de tomas) compartido entre varias personas, con edición, eliminación, búsqueda y exportación a PDF en orden alfabético.

**Tecnología:** React + TypeScript + Tailwind CSS v4 (Vite) · Supabase (base de datos y acceso) · jsPDF.

## Puesta en marcha

1. Crea un proyecto gratis en [supabase.com](https://supabase.com).
2. En **SQL Editor**, pega y ejecuta `supabase/schema.sql`.
3. En **Authentication → Users → Add user**, crea las cuentas del comité (correo + contraseña).
   En **Authentication → Sign In / Providers**, desactiva *Allow new users to sign up* para que nadie más pueda registrarse.
4. Copia `.env.example` a `.env` y pon la URL y la clave *anon* (Project Settings → API).
5. Instala y arranca:

```bash
npm install
npm run dev
```

## Publicar

Sube el proyecto a Vercel o Netlify, agrega las mismas dos variables `VITE_SUPABASE_*` y despliega (`npm run build`, carpeta `dist`).

## Estructura

```
src/
  components/   Panel, formulario, tabla, diálogos (editar, eliminar, exportar), login, avisos
  hooks/        useAuth (sesión) · useMiembros (CRUD + tiempo real)
  lib/          supabase · text (búsqueda/orden en español) · pdf (carga bajo demanda)
supabase/schema.sql   Tabla, seguridad (RLS) y tiempo real
```
