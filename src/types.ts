export interface Miembro {
  id: number
  nombre: string
  apellido_paterno: string
  apellido_materno: string
  domicilio: string | null
  telefono: string | null
  /** Total que paga el nombre; solo en su primera fila. NULL en las filas adicionales. */
  numero_tomas: number | null
  created_at: string
  updated_at: string
}

export type MiembroInput = Pick<
  Miembro,
  'nombre' | 'apellido_paterno' | 'apellido_materno' | 'domicilio' | 'telefono' | 'numero_tomas'
>

export type CampoOrden = 'nombre' | 'apellido_paterno' | 'apellido_materno'

export const CAMPOS_ORDEN: { value: CampoOrden; label: string }[] = [
  { value: 'apellido_paterno', label: 'Apellido paterno' },
  { value: 'apellido_materno', label: 'Apellido materno' },
  { value: 'nombre', label: 'Nombre' },
]
