import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

type Tipo = 'exito' | 'error'
interface Aviso { id: number; texto: string; tipo: Tipo }

const Ctx = createContext<(texto: string, tipo?: Tipo) => void>(() => {})

export const useToast = () => useContext(Ctx)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([])

  const avisar = useCallback((texto: string, tipo: Tipo = 'exito') => {
    const id = Date.now() + Math.random()
    setAvisos((a) => [...a, { id, texto, tipo }])
    setTimeout(() => setAvisos((a) => a.filter((x) => x.id !== id)), 3500)
  }, [])

  return (
    <Ctx.Provider value={avisar}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:items-end sm:px-6"
      >
        {avisos.map((a) => (
          <div
            key={a.id}
            role="status"
            className={`anim-toast pointer-events-auto flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium shadow-lg ring-1 ${
              a.tipo === 'exito'
                ? 'bg-green-900 text-white ring-green-950/20'
                : 'bg-red-600 text-white ring-red-700/20'
            }`}
          >
            <span className={`size-2 rounded-full ${a.tipo === 'exito' ? 'bg-lime-300' : 'bg-white'}`} />
            {a.texto}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}
