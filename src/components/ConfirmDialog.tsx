import { useState } from 'react'
import type { Miembro } from '../types'
import { nombreCompleto } from '../lib/text'
import { Modal } from './Modal'
import { IconoAlerta, Spinner } from './Icons'

interface Props {
  miembro: Miembro | null
  onCerrar: () => void
  onConfirmar: (m: Miembro) => Promise<void>
}

export function ConfirmDialog({ miembro, onCerrar, onConfirmar }: Props) {
  const [borrando, setBorrando] = useState(false)

  const confirmar = async () => {
    if (!miembro) return
    setBorrando(true)
    try {
      await onConfirmar(miembro)
    } finally {
      setBorrando(false)
    }
  }

  return (
    <Modal abierto={miembro !== null} onCerrar={onCerrar} titulo="¿Eliminar registro?" ancho="sm">
      <div className="flex gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-red-50 text-red-600">
          <IconoAlerta />
        </span>
        <p className="text-sm text-stone-600">
          Se eliminará a <strong className="text-stone-900">{miembro && nombreCompleto(miembro)}</strong> del
          padrón. Esta acción no se puede deshacer.
        </p>
      </div>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCerrar} className="boton boton-secundario" autoFocus>
          Cancelar
        </button>
        <button type="button" onClick={confirmar} disabled={borrando} className="boton boton-peligro">
          {borrando && <Spinner />}
          Sí, eliminar
        </button>
      </div>
    </Modal>
  )
}
