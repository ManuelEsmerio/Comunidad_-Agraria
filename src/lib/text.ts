import type { CampoOrden, Miembro } from '../types'

/** Minúsculas y sin acentos, para búsquedas tolerantes. */
export function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

/** Quita espacios dobles y en los extremos. */
export function limpiar(texto: string): string {
  return texto.replace(/\s+/g, ' ').trim()
}

export function nombreCompleto(m: Pick<Miembro, 'nombre' | 'apellido_paterno' | 'apellido_materno'>) {
  return limpiar(`${m.nombre} ${m.apellido_paterno} ${m.apellido_materno}`)
}

/** Clave para comparar domicilios: sin acentos, mayúsculas ni espacios. */
export const claveDomicilio = (d: string) => normalizar(d).replace(/\s+/g, '')

/** Un domicilio "con número" contiene al menos un dígito (un "#" solo no cuenta). */
export const tieneNumero = (d: string) => /\d/.test(d)

/**
 * Agrupa las filas cuyo domicilio CON número se repite (ignorando acentos, mayúsculas y espacios).
 * Devuelve id de miembro → número de grupo (0, 1, 2…). Las calles sin número no cuentan.
 */
export function gruposDomicilioRepetido(lista: Pick<Miembro, 'id' | 'domicilio'>[]): Map<number, number> {
  const porClave = new Map<string, number[]>()
  for (const m of lista) {
    if (!m.domicilio || !tieneNumero(m.domicilio)) continue
    const k = claveDomicilio(m.domicilio)
    porClave.set(k, [...(porClave.get(k) ?? []), m.id])
  }
  const grupos = new Map<number, number>()
  let g = 0
  for (const ids of porClave.values()) {
    if (ids.length < 2) continue
    ids.forEach((id) => grupos.set(id, g))
    g++
  }
  return grupos
}

const collator = new Intl.Collator('es', { sensitivity: 'base' })

/** Orden de desempate para cada campo principal. */
const DESEMPATE: Record<CampoOrden, CampoOrden[]> = {
  nombre: ['nombre', 'apellido_paterno', 'apellido_materno'],
  apellido_paterno: ['apellido_paterno', 'apellido_materno', 'nombre'],
  apellido_materno: ['apellido_materno', 'apellido_paterno', 'nombre'],
}

export function ordenarAlfabeticamente(lista: Miembro[], campo: CampoOrden): Miembro[] {
  const claves = DESEMPATE[campo]
  return [...lista].sort((a, b) => {
    for (const k of claves) {
      const r = collator.compare(a[k], b[k])
      if (r !== 0) return r
    }
    // Mismo nombre: primero la fila que paga las tomas, luego las adicionales.
    if ((a.numero_tomas == null) !== (b.numero_tomas == null)) return a.numero_tomas == null ? 1 : -1
    return a.id - b.id
  })
}

const fmtFecha = new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' })
export const formatearFecha = (iso: string) => fmtFecha.format(new Date(iso))
