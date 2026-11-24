import { useMemo, useState } from 'react'
import type { CampoOrden, Miembro } from '../types'
import { CAMPOS_ORDEN } from '../types'
import { gruposDomicilioRepetido, ordenarAlfabeticamente } from '../lib/text'
import { Modal } from './Modal'
import { IconoPdf, Spinner } from './Icons'
import { useToast } from './Toast'

interface Props {
  abierto: boolean
  onCerrar: () => void
  miembros: Miembro[]
}

export function ExportDialog({ abierto, onCerrar, miembros }: Props) {
  const [campo, setCampo] = useState<CampoOrden>('apellido_paterno')
  const [generando, setGenerando] = useState(false)
  const [anio, setAnio] = useState(new Date().getFullYear())
  const [resaltar, setResaltar] = useState(false)
  const grupos = useMemo(() => gruposDomicilioRepetido(miembros), [miembros])
  const numGrupos = new Set(grupos.values()).size
  const avisar = useToast()

  const muestra = ordenarAlfabeticamente(miembros, campo).slice(0, 3)

  const exportar = async () => {
    setGenerando(true)
    try {
      const { exportarPdf } = await import('../lib/pdf')
      await exportarPdf(miembros, campo, anio, { resaltarDomicilios: resaltar })
      avisar('PDF descargado')
      onCerrar()
    } catch {
      avisar('No se pudo generar el PDF', 'error')
    } finally {
      setGenerando(false)
    }
  }

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo="Exportar padrón a PDF"
      descripcion="Mismo formato que el padrón en papel: hoja oficio horizontal, en orden alfabético."
    >
      <fieldset className="grid gap-2">
        <legend className="sr-only">Ordenar por</legend>
        {CAMPOS_ORDEN.map((o) => (
          <label
            key={o.value}
            className="flex cursor-pointer items-center gap-3 rounded-xl border border-stone-200 px-4 py-3 transition hover:border-green-700/40 has-checked:border-green-700 has-checked:bg-green-50 has-checked:ring-1 has-checked:ring-green-700"
          >
            <input
              type="radio"
              name="orden"
              value={o.value}
              checked={campo === o.value}
              onChange={() => setCampo(o.value)}
              className="size-4 accent-green-700"
            />
            <span className="font-medium text-stone-800">{o.label}</span>
          </label>
        ))}
      </fieldset>

      <label className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-stone-200 px-4 py-3">
        <span className="font-medium text-stone-800">Año del padrón</span>
        <input
          type="number"
          inputMode="numeric"
          value={anio}
          onChange={(e) => setAnio(Number(e.target.value))}
          className="campo w-28 text-center"
          min={2000}
          max={2100}
        />
      </label>

      <label className="mt-3 flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-stone-200 px-4 py-3 transition hover:border-green-700/40">
        <span>
          <span className="block font-medium text-stone-800">Colorear domicilios repetidos</span>
          <span className="block text-xs text-stone-500">
            {numGrupos
              ? `${numGrupos} domicilios con número se repiten (${grupos.size} filas). Cada domicilio con su color.`
              : 'No hay domicilios con número repetidos.'}{' '}
            No cuenta calles sin número.
          </span>
        </span>
        <input
          type="checkbox"
          role="switch"
          checked={resaltar}
          onChange={(e) => setResaltar(e.target.checked)}
          disabled={numGrupos === 0}
          className="peer sr-only"
        />
        <span
          aria-hidden
          className="relative h-6 w-11 shrink-0 rounded-full bg-stone-300 transition-colors peer-checked:bg-green-700 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-green-600 peer-disabled:opacity-50 after:absolute after:top-0.5 after:left-0.5 after:size-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-5"
        />
      </label>

      {muestra.length > 0 && (
        <div className="mt-4 rounded-xl bg-stone-50 px-4 py-3 text-sm">
          <p className="mb-1.5 text-xs font-semibold tracking-wide text-stone-500 uppercase">Vista previa</p>
          <ol className="space-y-0.5 text-stone-700">
            {muestra.map((m, i) => (
              <li key={m.id} className="truncate">
                <span className="mr-2 text-stone-400 tabular-nums">{i + 1}.</span>
                {campo === 'nombre'
                  ? `${m.nombre} ${m.apellido_paterno} ${m.apellido_materno}`
                  : campo === 'apellido_paterno'
                    ? `${m.apellido_paterno} ${m.apellido_materno}, ${m.nombre}`
                    : `${m.apellido_materno} ${m.apellido_paterno}, ${m.nombre}`}
              </li>
            ))}
            {miembros.length > 3 && <li className="text-stone-400">… y {miembros.length - 3} más</li>}
          </ol>
        </div>
      )}

      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCerrar} className="boton boton-secundario">
          Cancelar
        </button>
        <button
          type="button"
          onClick={exportar}
          disabled={generando || miembros.length === 0 || !Number.isInteger(anio) || anio < 2000}
          className="boton boton-primario"
        >
          {generando ? <Spinner /> : <IconoPdf />}
          {generando ? 'Generando…' : 'Descargar PDF'}
        </button>
      </div>
    </Modal>
  )
}
