import { useState, type FormEvent } from 'react'
import { IconoBrote, Spinner } from './Icons'

export function Login({ onEntrar }: { onEntrar: (email: string, password: string) => Promise<void> }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setEnviando(true)
    try {
      await onEntrar(email.trim(), password)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className="fondo-campo grid min-h-dvh place-items-center p-4">
      <div className="anim-fade-up w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center text-white">
          <span className="grid size-14 place-items-center rounded-2xl bg-white/10 text-lime-300 ring-1 ring-white/20 backdrop-blur">
            <IconoBrote width={30} height={30} />
          </span>
          <h1 className="mt-4 text-2xl font-bold tracking-tight">Comunidad Agraria</h1>
          <p className="mt-1 text-sm text-green-100/80">Padrón de miembros</p>
        </div>

        <form onSubmit={enviar} className="tarjeta space-y-4 p-6">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-stone-700">Correo</label>
            <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="campo" />
          </div>
          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-stone-700">Contraseña</label>
            <input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="campo" />
          </div>
          {error && <p role="alert" className="anim-fade rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>}
          <button type="submit" disabled={enviando} className="boton boton-primario w-full">
            {enviando && <Spinner />}
            {enviando ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
        <p className="mt-4 text-center text-xs text-green-100/70">Las cuentas las crea el administrador.</p>
      </div>
    </main>
  )
}
