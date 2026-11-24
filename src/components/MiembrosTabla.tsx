import { memo, useDeferredValue, useMemo, useState } from 'react'
import type { Miembro } from '../types'
import { formatearFecha, normalizar } from '../lib/text'
import { IconoBuscar, IconoEditar, IconoEliminar, IconoPdf, IconoUsuarios } from './Icons'

interface Props {
  miembros: Miembro[]
  cargando: boolean
  resaltadoId: number | null
  onEditar: (m: Miembro) => void
  onEliminar: (m: Miembro) => void
  onExportar: () => void
}

export function MiembrosTabla({ miembros, cargando, resaltadoId, onEditar, onEliminar, onExportar }: Props) {
  const [busqueda, setBusqueda] = useState('')
  const consulta = useDeferredValue(normalizar(busqueda))

  // Índice de búsqueda precalculado: se recalcula solo cuando cambian los datos.
  const indexados = useMemo(
    () =>
      miembros.map((m, i) => ({
        m,
        numero: i + 1,
        texto: normalizar(`${m.nombre} ${m.apellido_paterno} ${m.apellido_materno} ${m.domicilio ?? ''}`) + ' ' + (m.telefono ?? '').replace(/\D/g, ''),
      })),
    [miembros],
  )

  const filas = useMemo(() => {
    if (!consulta) return indexados
    const palabras = consulta.split(' ')
    return indexados.filter((f) => palabras.every((p) => f.texto.includes(p)))
  }, [indexados, consulta])

  return (
    <section className="tarjeta anim-fade-up overflow-hidden" style={{ animationDelay: '80ms' }}>
      <div className="flex flex-col gap-3 border-b border-stone-200/80 p-4 sm:flex-row sm:items-center sm:p-5">
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-stone-900">Miembros registrados</h2>
          <p className="text-sm text-stone-500">En orden de registro</p>
        </div>
        <div className="flex gap-2">
          <label className="relative flex-1 sm:w-64 sm:flex-none">
            <span className="sr-only">Buscar</span>
            <IconoBuscar className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-stone-400" width={18} height={18} />
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar nombre, domicilio, tel…"
              className="campo pl-9"
            />
          </label>
          <button
            type="button"
            onClick={onExportar}
            disabled={miembros.length === 0}
            className="boton boton-secundario shrink-0"
            title="Exportar a PDF"
          >
            <IconoPdf />
            <span className="hidden sm:inline">Exportar PDF</span>
          </button>
        </div>
      </div>

      {cargando ? (
        <Esqueleto />
      ) : filas.length === 0 ? (
        <Vacio buscando={Boolean(consulta)} />
      ) : (
        <>
          {/* Escritorio */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-50 text-xs whitespace-nowrap font-semibold tracking-wide text-stone-500 uppercase">
                <tr>
                  <th scope="col" className="w-12 py-3 pr-2 pl-5 text-right">#</th>
                  <th scope="col" className="px-2.5 py-3">Nombre(s)</th>
                  <th scope="col" className="px-2.5 py-3">Ap. paterno</th>
                  <th scope="col" className="px-2.5 py-3">Ap. materno</th>
                  <th scope="col" className="px-2.5 py-3">Domicilio</th>
                  <th scope="col" className="px-2.5 py-3">Teléfono</th>
                  <th scope="col" className="px-2.5 py-3 text-center">Tomas</th>
                  <th scope="col" className="hidden px-2.5 py-3 2xl:table-cell">Registro</th>
                  <th scope="col" className="py-3 pr-5 pl-3 text-right"><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filas.map(({ m, numero }) => (
                  <Fila key={m.id} m={m} numero={numero} resaltado={m.id === resaltadoId} onEditar={onEditar} onEliminar={onEliminar} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Celular / tablet */}
          <ul className="divide-y divide-stone-100 md:hidden">
            {filas.map(({ m, numero }) => (
              <li key={m.id} className={`anim-fila flex gap-3 p-4 ${m.id === resaltadoId ? 'resaltado' : ''}`}>
                <span className="w-6 pt-0.5 text-right text-xs text-stone-400 tabular-nums">{numero}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-stone-900">
                    {m.nombre} {m.apellido_paterno} {m.apellido_materno}
                  </p>
                  <p className="mt-0.5 truncate text-sm text-stone-500">{m.domicilio || <span className="text-stone-300">Sin domicilio</span>}</p>
                  {m.telefono && <a href={`tel:${m.telefono.replace(/[^\d+]/g, '')}`} className="mt-0.5 block text-sm text-green-700 tabular-nums">{m.telefono}</a>}
                  {m.numero_tomas != null ? (
                    <span className="insignia mt-2">{m.numero_tomas} {m.numero_tomas === 1 ? 'toma' : 'tomas'}</span>
                  ) : (
                    <span className="mt-2 inline-block text-xs text-stone-400">Toma adicional · la paga la fila principal</span>
                  )}
                </div>
                <Acciones m={m} onEditar={onEditar} onEliminar={onEliminar} />
              </li>
            ))}
          </ul>
        </>
      )}

      {!cargando && miembros.length > 0 && (
        <p className="border-t border-stone-100 px-5 py-3 text-xs text-stone-500">
          {consulta ? `${filas.length} de ${miembros.length} registros` : `${miembros.length} registros`}
        </p>
      )}
    </section>
  )
}

interface FilaProps {
  m: Miembro
  numero: number
  resaltado: boolean
  onEditar: (m: Miembro) => void
  onEliminar: (m: Miembro) => void
}

// memo: al escribir en el buscador o guardar un registro no se vuelven a pintar todas las filas.
const Fila = memo(function Fila({ m, numero, resaltado, onEditar, onEliminar }: FilaProps) {
  return (
    <tr className={`anim-fila group transition-colors hover:bg-green-50/50 ${resaltado ? 'resaltado' : ''}`}>
      <td className="py-3 pr-2 pl-5 text-right text-stone-400 tabular-nums">{numero}</td>
      <td className="px-2.5 py-3 font-medium text-stone-900">{m.nombre}</td>
      <td className="px-2.5 py-3 text-stone-700">{m.apellido_paterno}</td>
      <td className="px-2.5 py-3 text-stone-700">{m.apellido_materno || <span className="text-stone-300">—</span>}</td>
      <td className="max-w-56 truncate px-3 py-3 text-stone-600" title={m.domicilio ?? ''}>{m.domicilio || <span className="text-stone-300">—</span>}</td>
      <td className="px-2.5 py-3 whitespace-nowrap text-stone-600 tabular-nums">{m.telefono || <span className="text-stone-300">—</span>}</td>
      <td className="px-2.5 py-3 text-center">
        {m.numero_tomas != null ? <span className="insignia">{m.numero_tomas}</span> : <span className="text-stone-300" title="Toma adicional: la paga la primera fila de este nombre">—</span>}
      </td>
      <td className="hidden px-2.5 py-3 whitespace-nowrap text-stone-500 2xl:table-cell">{formatearFecha(m.created_at)}</td>
      <td className="py-2 pr-5 pl-3">
        <Acciones m={m} onEditar={onEditar} onEliminar={onEliminar} />
      </td>
    </tr>
  )
})

function Acciones({ m, onEditar, onEliminar }: Omit<FilaProps, 'numero' | 'resaltado'>) {
  return (
    <div className="flex justify-end gap-1 md:opacity-70 md:transition-opacity md:group-hover:opacity-100">
      <button type="button" onClick={() => onEditar(m)} className="boton-icono hover:bg-green-100 hover:text-green-800" aria-label={`Editar a ${m.nombre}`} title="Editar">
        <IconoEditar width={18} height={18} />
      </button>
      <button type="button" onClick={() => onEliminar(m)} className="boton-icono hover:bg-red-50 hover:text-red-600" aria-label={`Eliminar a ${m.nombre}`} title="Eliminar">
        <IconoEliminar width={18} height={18} />
      </button>
    </div>
  )
}

function Esqueleto() {
  return (
    <div className="space-y-3 p-5" aria-label="Cargando registros">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="flex items-center gap-4">
          <div className="h-4 w-6 animate-pulse rounded bg-stone-100" />
          <div className="h-4 flex-1 animate-pulse rounded bg-stone-100" style={{ animationDelay: `${i * 100}ms` }} />
          <div className="h-4 w-16 animate-pulse rounded bg-stone-100" />
        </div>
      ))}
    </div>
  )
}

function Vacio({ buscando }: { buscando: boolean }) {
  return (
    <div className="anim-fade flex flex-col items-center px-6 py-16 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-green-50 text-green-700">
        {buscando ? <IconoBuscar width={26} height={26} /> : <IconoUsuarios width={26} height={26} />}
      </span>
      <p className="mt-4 font-semibold text-stone-800">{buscando ? 'Sin resultados' : 'Aún no hay registros'}</p>
      <p className="mt-1 max-w-xs text-sm text-stone-500">
        {buscando ? 'Prueba con otro nombre, apellido, domicilio o teléfono.' : 'Agrega el primer miembro con el formulario.'}
      </p>
    </div>
  )
}
