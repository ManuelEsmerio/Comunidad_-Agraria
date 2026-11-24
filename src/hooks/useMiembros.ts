import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Miembro, MiembroInput } from '../types'

const TABLA = 'miembros'

const porRegistro = (a: Miembro, b: Miembro) =>
  a.created_at.localeCompare(b.created_at) || a.id - b.id

/** Inserta o reemplaza un miembro manteniendo el orden de registro. */
function upsertLocal(lista: Miembro[], m: Miembro) {
  const sin = lista.filter((x) => x.id !== m.id)
  return [...sin, m].sort(porRegistro)
}

export function useMiembros(activo: boolean) {
  const [miembros, setMiembros] = useState<Miembro[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    const { data, error } = await supabase
      .from(TABLA)
      .select('*')
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
    if (error) setError('No se pudieron cargar los registros')
    else {
      setMiembros(data as Miembro[])
      setError(null)
    }
    setCargando(false)
  }, [])

  useEffect(() => {
    if (!activo) return
    cargar()

    // Cambios hechos desde otros dispositivos aparecen al instante.
    const canal = supabase
      .channel('miembros-cambios')
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLA }, (p) => {
        if (p.eventType === 'DELETE') {
          const id = (p.old as Partial<Miembro>).id
          setMiembros((l) => l.filter((m) => m.id !== id))
        } else {
          setMiembros((l) => upsertLocal(l, p.new as Miembro))
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [activo, cargar])

  const crear = async (input: MiembroInput) => {
    const { data, error } = await supabase.from(TABLA).insert(input).select().single()
    if (error) throw new Error('No se pudo guardar el registro')
    setMiembros((l) => upsertLocal(l, data as Miembro))
    return data as Miembro
  }

  const actualizar = async (id: number, input: MiembroInput) => {
    const { data, error } = await supabase.from(TABLA).update(input).eq('id', id).select().single()
    if (error) throw new Error('No se pudo actualizar el registro')
    setMiembros((l) => upsertLocal(l, data as Miembro))
  }

  const eliminar = async (id: number) => {
    const { error } = await supabase.from(TABLA).delete().eq('id', id)
    if (error) throw new Error('No se pudo eliminar el registro')
    setMiembros((l) => l.filter((m) => m.id !== id))
  }

  return { miembros, cargando, error, recargar: cargar, crear, actualizar, eliminar }
}
