import { useAuth } from './hooks/useAuth'
import { supabaseConfigurado } from './lib/supabase'
import { Login } from './components/Login'
import { Panel } from './components/Panel'
import { SetupAviso } from './components/SetupAviso'
import { ToastProvider } from './components/Toast'
import { Spinner } from './components/Icons'

export default function App() {
  const { session, cargando, iniciarSesion, cerrarSesion } = useAuth()

  if (!supabaseConfigurado) return <SetupAviso />

  return (
    <ToastProvider>
      {cargando ? (
        <div className="fondo-campo grid min-h-dvh place-items-center text-lime-300">
          <Spinner className="size-8" />
        </div>
      ) : session ? (
        <Panel session={session} onSalir={cerrarSesion} />
      ) : (
        <Login onEntrar={iniciarSesion} />
      )}
    </ToastProvider>
  )
}
