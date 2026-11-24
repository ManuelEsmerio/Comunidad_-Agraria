import { useEffect, useMemo, useState } from 'react'
import type { CampoOrden, Miembro } from '../types'
import { CAMPOS_ORDEN } from '../types'
import { gruposDomicilioRepetido } from '../lib/text'
import { exportarPdf, generarPdf, LIMITES_TAMANO, TAMANOS_DEFECTO, type TamanosPdf } from '../lib/pdf'
import { Modal } from './Modal'
import { IconoPdf, Spinner } from './Icons'
import { useToast } from './Toast'

interface Props {
  abierto: boolean
  onCerrar: () => void
  miembros: Miembro[]
}

const CLAVE_TAMANOS = 'padron-pdf-tamanos'

const ETIQUETAS_TAMANO: { clave: keyof TamanosPdf; label: string }[] = [
  { clave: 'titulo', label: 'Título' },
  { clave: 'tabla', label: 'Información de la tabla' },
  { clave: 'pagina', label: 'Número de página' },
]

/** Recupera los tamaños usados la última vez, para no tener que ajustarlos en cada exportación. */
function tamanosGuardados(): TamanosPdf {
  try {
    const t = JSON.parse(localStorage.getItem(CLAVE_TAMANOS) ?? '{}') as Partial<TamanosPdf>
    return { ...TAMANOS_DEFECTO, ...t }
  } catch {
    return TAMANOS_DEFECTO
  }
}

interface Vista {
  url: string
  paginas: number
  filasPartidas: number
}

export function ExportDialog({ abierto, onCerrar, miembros }: Props) {
  const [campo, setCampo] = useState<CampoOrden>('apellido_paterno')
  const [generando, setGenerando] = useState(false)
  const [anio, setAnio] = useState(new Date().getFullYear())
  const [resaltar, setResaltar] = useState(false)
  const [tamanos, setTamanos] = useState<TamanosPdf>(tamanosGuardados)
  const [vista, setVista] = useState<Vista | null>(null)
  const [cargandoVista, setCargandoVista] = useState(false)
  const grupos = useMemo(() => gruposDomicilioRepetido(miembros), [miembros])
  const numGrupos = new Set(grupos.values()).size
  const avisar = useToast()
  const anioValido = Number.isInteger(anio) && anio >= 2000 && anio <= 2100

  useEffect(() => {
    localStorage.setItem(CLAVE_TAMANOS, JSON.stringify(tamanos))
  }, [tamanos])

  // Vista previa: se genera el PDF real (con una pequeña espera para no regenerarlo en cada tecla).
  useEffect(() => {
    if (!abierto || miembros.length === 0 || !anioValido) return
    let cancelado = false
    let url: string | null = null
    setCargandoVista(true)
    const t = setTimeout(async () => {
      try {
        const r = await generarPdf(miembros, campo, anio, { resaltarDomicilios: resaltar, tamanos })
        if (cancelado) return
        url = URL.createObjectURL(r.doc.output('blob'))
        setVista({ url, paginas: r.paginas, filasPartidas: r.filasPartidas })
      } catch {
        if (!cancelado) setVista(null)
      } finally {
        if (!cancelado) setCargandoVista(false)
      }
    }, 350)
    return () => {
      cancelado = true
      clearTimeout(t)
      if (url) URL.revokeObjectURL(url)
    }
  }, [abierto, miembros, campo, anio, anioValido, resaltar, tamanos])

  const exportar = async () => {
    setGenerando(true)
    try {
      await exportarPdf(miembros, campo, anio, { resaltarDomicilios: resaltar, tamanos })
      avisar('PDF descargado')
      onCerrar()
    } catch {
      avisar('No se pudo generar el PDF', 'error')
    } finally {
      setGenerando(false)
    }
  }

  const sonDefecto = ETIQUETAS_TAMANO.every(({ clave }) => tamanos[clave] === TAMANOS_DEFECTO[clave])

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      ancho="xl"
      titulo="Exportar padrón a PDF"
      descripcion="Mismo formato que el padrón en papel: hoja oficio horizontal, en orden alfabético."
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        <div>
          <p className="mb-2 text-xs font-semibold tracking-wide text-stone-500 uppercase">Ordenar por</p>
          <fieldset className="grid gap-2">
            <legend className="sr-only">Ordenar por</legend>
            {CAMPOS_ORDEN.map((o) => (
              <label
                key={o.value}
                className="flex cursor-pointer items-center gap-3 rounded-xl border border-stone-200 px-4 py-2.5 transition hover:border-green-700/40 has-checked:border-green-700 has-checked:bg-green-50 has-checked:ring-1 has-checked:ring-green-700"
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

          <div className="mt-4 rounded-xl border border-stone-200 px-4 py-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="font-medium text-stone-800">Tamaño de letra</p>
              <button
                type="button"
                onClick={() => setTamanos(TAMANOS_DEFECTO)}
                disabled={sonDefecto}
                className="cursor-pointer text-xs font-semibold text-green-700 hover:underline disabled:cursor-default disabled:text-stone-300 disabled:no-underline"
              >
                Restablecer
              </button>
            </div>
            <div className="grid gap-3">
              {ETIQUETAS_TAMANO.map(({ clave, label }) => {
                const { min, max } = LIMITES_TAMANO[clave]
                const id = `tam-${clave}`
                return (
                  <div key={clave}>
                    <div className="flex items-center justify-between text-sm">
                      <label htmlFor={id} className="text-stone-700">
                        {label}
                      </label>
                      <span className="text-stone-500 tabular-nums">{tamanos[clave]} pt</span>
                    </div>
                    <input
                      id={id}
                      type="range"
                      min={min}
                      max={max}
                      step={clave === 'tabla' ? 0.5 : 1}
                      value={tamanos[clave]}
                      onChange={(e) => setTamanos((t) => ({ ...t, [clave]: Number(e.target.value) }))}
                      className="w-full accent-green-700"
                    />
                  </div>
                )
              })}
            </div>
          </div>

          <label className="mt-4 flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-stone-200 px-4 py-3 transition hover:border-green-700/40">
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
        </div>

        <div className="flex min-h-[24rem] flex-col">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-xs font-semibold tracking-wide text-stone-500 uppercase">Vista previa</p>
            {cargandoVista && <Spinner />}
          </div>
          <div className="relative flex-1 overflow-hidden rounded-xl bg-stone-100 ring-1 ring-stone-200">
            {vista ? (
              <iframe
                key={vista.url}
                src={`${vista.url}#view=FitH`}
                title="Vista previa del PDF"
                className={`h-full min-h-[24rem] w-full transition-opacity ${cargandoVista ? 'opacity-60' : ''}`}
              />
            ) : (
              <p className="grid h-full min-h-[24rem] place-items-center p-6 text-center text-sm text-stone-500">
                {miembros.length === 0
                  ? 'No hay registros para exportar.'
                  : !anioValido
                    ? 'Escribe un año válido para ver la vista previa.'
                    : 'Generando vista previa…'}
              </p>
            )}
          </div>
          {vista && (
            <p className="mt-2 text-xs text-stone-500">
              {vista.paginas} {vista.paginas === 1 ? 'hoja' : 'hojas'} oficio · todo cabe a lo ancho de la hoja
              {vista.filasPartidas > 0 &&
                ` · ${vista.filasPartidas} ${vista.filasPartidas === 1 ? 'fila usa' : 'filas usan'} dos líneas por nombre o domicilio largo`}
            </p>
          )}
        </div>
      </div>

      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCerrar} className="boton boton-secundario">
          Cancelar
        </button>
        <button
          type="button"
          onClick={exportar}
          disabled={generando || miembros.length === 0 || !anioValido}
          className="boton boton-primario"
        >
          {generando ? <Spinner /> : <IconoPdf />}
          {generando ? 'Generando…' : 'Descargar PDF'}
        </button>
      </div>
    </Modal>
  )
}
