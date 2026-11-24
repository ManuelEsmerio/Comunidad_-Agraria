import { useCallback, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { Miembro, MiembroInput } from '../types'
import { useMiembros } from '../hooks/useMiembros'
import { claveDomicilio, nombreCompleto, normalizar, tieneNumero } from '../lib/text'
import { MiembroForm } from './MiembroForm'
import { MiembrosTabla } from './MiembrosTabla'
import { Modal } from './Modal'
import { ConfirmDialog } from './ConfirmDialog'
import { ExportDialog } from './ExportDialog'
import { useToast } from './Toast'
import { IconoBrote, IconoGota, IconoMas, IconoSalir, IconoUsuarios } from './Icons'

export function Panel({ session, onSalir }: { session: Session; onSalir: () => void }) {
  const { miembros, cargando, error, recargar, crear, actualizar, eliminar } = useMiembros(true)
  const avisar = useToast()
  const [editando, setEditando] = useState<Miembro | null>(null)
  const [borrando, setBorrando] = useState<Miembro | null>(null)
  const [exportando, setExportando] = useState(false)
  const [resaltadoId, setResaltadoId] = useState<number | null>(null)

  useEffect(() => {
    if (resaltadoId === null) return
    const t = setTimeout(() => setResaltadoId(null), 2200)
    return () => clearTimeout(t)
  }, [resaltadoId])

  const totalTomas = miembros.reduce((s, m) => s + (m.numero_tomas ?? 0), 0)

  const guardarNuevo = async (datos: MiembroInput) => {
    try {
      const m = await crear(datos)
      setResaltadoId(m.id)
      avisar(`${nombreCompleto(m)} registrado`)
    } catch (e) {
      avisar((e as Error).message, 'error')
      throw e
    }
  }

  const guardarEdicion = async (datos: MiembroInput) => {
    if (!editando) return
    try {
      await actualizar(editando.id, datos)
      setResaltadoId(editando.id)
      setEditando(null)
      avisar('Cambios guardados')
    } catch (e) {
      avisar((e as Error).message, 'error')
    }
  }

  const confirmarBorrado = async (m: Miembro) => {
    try {
      await eliminar(m.id)
      setBorrando(null)
      avisar('Registro eliminado')
    } catch (e) {
      avisar((e as Error).message, 'error')
    }
  }

  /** ¿Hay otra fila (distinta de `excluir`) con el mismo nombre completo? */
  const nombreExiste = (d: Pick<MiembroInput, 'nombre' | 'apellido_paterno' | 'apellido_materno'>, excluir?: number) => {
    const clave = normalizar(nombreCompleto(d))
    return miembros.some((m) => m.id !== excluir && normalizar(nombreCompleto(m)) === clave)
  }

  /** Solo se avisa en domicilios con número; las calles de rancho sin numerar se repiten legítimamente. */
  const domicilioOcupadoPor = (domicilio: string, excluir?: number) => {
    if (!tieneNumero(domicilio)) return []
    const clave = claveDomicilio(domicilio)
    return miembros
      .filter((m) => m.id !== excluir && m.domicilio && claveDomicilio(m.domicilio) === clave)
      .map((m) => nombreCompleto(m))
  }

  // Referencias estables para que las filas memorizadas no se vuelvan a pintar.
  const abrirEdicion = useCallback((m: Miembro) => setEditando(m), [])
  const abrirBorrado = useCallback((m: Miembro) => setBorrando(m), [])

  return (
    <div className="min-h-dvh pb-16">
      <header className="fondo-campo pb-24 text-white">
        <div className="mx-auto flex max-w-[96rem] items-center gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <span className="grid size-10 place-items-center rounded-xl bg-white/10 text-lime-300 ring-1 ring-white/15">
            <IconoBrote width={22} height={22} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base leading-tight font-bold tracking-tight sm:text-lg">Comunidad Agraria</p>
            <p className="text-xs text-green-100/75">Padrón de miembros</p>
          </div>
          <span className="hidden max-w-56 truncate text-sm text-green-100/80 sm:block">{session.user.email}</span>
          <button type="button" onClick={onSalir} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-green-50 transition hover:bg-white/10" title="Cerrar sesión">
            <IconoSalir width={18} height={18} />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>

        <div className="mx-auto flex max-w-[96rem] flex-col gap-4 px-4 pt-4 sm:px-6 md:flex-row md:items-end md:justify-between lg:px-8">
          <div className="anim-fade-up hidden md:block">
            <h1 className="text-3xl font-bold tracking-tight">Padrón de miembros</h1>
            <p className="mt-1 text-green-100/75">Registra, edita y exporta los datos de la comunidad.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 md:w-md">
            <Dato icono={<IconoUsuarios width={18} height={18} />} etiqueta="Miembros" valor={miembros.length} />
            <Dato icono={<IconoGota width={18} height={18} />} etiqueta="Tomas" valor={totalTomas} />
          </div>
        </div>
      </header>

      <main className="mx-auto -mt-16 grid max-w-[96rem] gap-6 px-4 sm:px-6 lg:grid-cols-[20rem_1fr] lg:items-start lg:px-8">
        <section className="tarjeta anim-fade-up p-5 sm:p-6 lg:sticky lg:top-6">
          <div className="mb-5 flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-lg bg-green-100 text-green-800">
              <IconoMas width={18} height={18} />
            </span>
            <div>
              <h2 className="text-base font-semibold text-stone-900">Nuevo registro</h2>
              <p className="text-sm text-stone-500">Se guarda para todo el comité</p>
            </div>
          </div>
          <MiembroForm textoBoton="Guardar" onGuardar={guardarNuevo} nombreExiste={(d) => nombreExiste(d)} domicilioOcupadoPor={(d) => domicilioOcupadoPor(d)} reiniciar />
        </section>

        <div className="min-w-0">
          {error && (
            <div role="alert" className="anim-fade mb-4 flex items-center justify-between gap-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
              {error}
              <button type="button" onClick={recargar} className="font-semibold underline underline-offset-2">Reintentar</button>
            </div>
          )}
          <MiembrosTabla
            miembros={miembros}
            cargando={cargando}
            resaltadoId={resaltadoId}
            onEditar={abrirEdicion}
            onEliminar={abrirBorrado}
            onExportar={() => setExportando(true)}
          />
        </div>
      </main>

      <Modal abierto={editando !== null} onCerrar={() => setEditando(null)} titulo="Editar registro" ancho="lg">
        {editando && (
          <MiembroForm
            key={editando.id}
            inicial={editando}
            nombreExiste={(d) => nombreExiste(d, editando.id)}
            domicilioOcupadoPor={(d) => domicilioOcupadoPor(d, editando.id)}
            textoBoton="Guardar cambios"
            onGuardar={guardarEdicion}
            onCancelar={() => setEditando(null)}
          />
        )}
      </Modal>
      <ConfirmDialog miembro={borrando} onCerrar={() => setBorrando(null)} onConfirmar={confirmarBorrado} />
      <ExportDialog abierto={exportando} onCerrar={() => setExportando(false)} miembros={miembros} />
    </div>
  )
}

function Dato({ icono, etiqueta, valor }: { icono: React.ReactNode; etiqueta: string; valor: number }) {
  return (
    <div className="rounded-xl bg-white/10 px-4 py-3 ring-1 ring-white/15 backdrop-blur-sm">
      <p className="flex items-center gap-1.5 text-xs font-medium text-green-100/80">{icono}{etiqueta}</p>
      <p key={valor} className="anim-numero mt-1 text-2xl font-bold tabular-nums">{valor.toLocaleString('es-MX')}</p>
    </div>
  )
}
