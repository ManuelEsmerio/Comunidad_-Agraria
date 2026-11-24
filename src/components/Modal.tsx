import { useEffect, useRef, type ReactNode } from 'react'
import { IconoCerrar } from './Icons'

interface Props {
  abierto: boolean
  onCerrar: () => void
  titulo: string
  descripcion?: string
  children: ReactNode
  ancho?: 'sm' | 'md' | 'lg' | 'xl'
}

const ANCHOS = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-xl', xl: 'max-w-6xl' }

/**
 * Diálogo accesible basado en <dialog>: atrapa el foco.
 * Solo se cierra con la "X" (o los botones del propio diálogo); un clic afuera o Escape lo sacuden.
 */
export function Modal({ abierto, onCerrar, titulo, descripcion, children, ancho = 'md' }: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (abierto && !d.open) d.showModal()
    if (!abierto && d.open) d.close()
  }, [abierto])

  /**
   * Sacude la modal sin cerrarla. Se usa la Web Animations API (no una clase CSS) para no
   * reiniciar la animación de apertura del <dialog>, que hacía parecer que se cerraba y abría.
   */
  const sacudir = () => {
    const d = ref.current
    if (!d || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    d.getAnimations().forEach((a) => a.id === 'sacudir' && a.cancel())
    d.animate(
      [
        { transform: 'translateX(0)' },
        { transform: 'translateX(-10px) rotate(-0.5deg)', offset: 0.15 },
        { transform: 'translateX(9px) rotate(0.5deg)', offset: 0.3 },
        { transform: 'translateX(-7px)', offset: 0.45 },
        { transform: 'translateX(5px)', offset: 0.6 },
        { transform: 'translateX(-3px)', offset: 0.75 },
        { transform: 'translateX(0)' },
      ],
      { id: 'sacudir', duration: 450, easing: 'cubic-bezier(0.36, 0.07, 0.19, 0.97)' },
    )
  }

  return (
    <dialog
      ref={ref}
      onClose={onCerrar}
      onCancel={(e) => {
        e.preventDefault()
        sacudir()
      }}
      onClick={(e) => e.target === ref.current && sacudir()}
      className={`modal m-auto w-[calc(100%-2rem)] ${ANCHOS[ancho]} rounded-2xl bg-white p-0 text-stone-800 shadow-2xl ring-1 ring-stone-900/5`}
    >
      {abierto && (
        <div className="p-5 sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-stone-900">{titulo}</h2>
              {descripcion && <p className="mt-1 text-sm text-stone-500">{descripcion}</p>}
            </div>
            <button
              type="button"
              onClick={onCerrar}
              aria-label="Cerrar"
              className="-m-1 rounded-lg p-1.5 text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
            >
              <IconoCerrar />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  )
}
