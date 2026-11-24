export function SetupAviso() {
  return (
    <main className="grid min-h-dvh place-items-center bg-stone-50 p-6">
      <div className="tarjeta max-w-lg p-6 text-sm text-stone-700">
        <h1 className="text-lg font-semibold text-stone-900">Falta configurar Supabase</h1>
        <ol className="mt-3 list-decimal space-y-1.5 pl-5">
          <li>Crea un proyecto en <a className="font-medium text-green-700 underline" href="https://supabase.com" target="_blank" rel="noreferrer">supabase.com</a>.</li>
          <li>Ejecuta <code className="rounded bg-stone-100 px-1">supabase/schema.sql</code> en el SQL Editor.</li>
          <li>Copia <code className="rounded bg-stone-100 px-1">.env.example</code> a <code className="rounded bg-stone-100 px-1">.env</code> con tu URL y clave anon.</li>
          <li>Reinicia <code className="rounded bg-stone-100 px-1">npm run dev</code>.</li>
        </ol>
      </div>
    </main>
  )
}
