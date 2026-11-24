import { useId, useRef, useState, type FormEvent } from 'react'
import type { MiembroInput } from '../types'
import { limpiar } from '../lib/text'
import { Spinner } from './Icons'

interface Props {
  inicial?: MiembroInput
  textoBoton: string
  onGuardar: (datos: MiembroInput) => Promise<void>
  onCancelar?: () => void
  /** ¿Existe otra fila con este mismo nombre completo? */
  nombreExiste: (d: Pick<MiembroInput, 'nombre' | 'apellido_paterno' | 'apellido_materno'>) => boolean
  /** Nombres de otras filas con el mismo domicilio numerado (vacío si no hay). */
  domicilioOcupadoPor: (domicilio: string) => string[]
  /** Vacía el formulario tras guardar (alta de registros). */
  reiniciar?: boolean
}

const VACIO = { nombre: '', apellido_paterno: '', apellido_materno: '', domicilio: '', telefono: '', numero_tomas: '1' }
type Campos = typeof VACIO
type Errores = Partial<Record<keyof Campos, string>>

function validar(c: Campos, nombreExiste: Props['nombreExiste']): Errores {
  const e: Errores = {}
  if (!limpiar(c.nombre)) e.nombre = 'Escribe el nombre'
  if (!limpiar(c.apellido_paterno)) e.apellido_paterno = 'Escribe el apellido paterno'
  const tel = limpiar(c.telefono)
  if (tel && !/^[\d\s()+-]{7,20}$/.test(tel)) e.telefono = 'Solo números, espacios, ( ) + -'
  if (c.numero_tomas.trim() === '') {
    const datos = { nombre: limpiar(c.nombre), apellido_paterno: limpiar(c.apellido_paterno), apellido_materno: limpiar(c.apellido_materno) }
    if (!e.nombre && !e.apellido_paterno && !nombreExiste(datos))
      e.numero_tomas = 'Vacío solo si el nombre ya tiene otra fila que paga las tomas'
  } else {
    const n = Number(c.numero_tomas)
    if (!Number.isInteger(n) || n < 1) e.numero_tomas = 'Debe ser un número entero mayor a 0'
  }
  return e
}

export function MiembroForm({ inicial, textoBoton, onGuardar, onCancelar, reiniciar, nombreExiste, domicilioOcupadoPor }: Props) {
  const id = useId()
  const primerCampo = useRef<HTMLInputElement>(null)
  const [campos, setCampos] = useState<Campos>(
    inicial
      ? {
          ...inicial,
          domicilio: inicial.domicilio ?? '',
          telefono: inicial.telefono ?? '',
          numero_tomas: inicial.numero_tomas == null ? '' : String(inicial.numero_tomas),
        }
      : VACIO,
  )
  const [errores, setErrores] = useState<Errores>({})
  const [guardando, setGuardando] = useState(false)
  // Domicilio repetido ya confirmado por el usuario (aviso, no bloqueo: familias comparten lote).
  const [aviso, setAviso] = useState<{ domicilio: string; nombres: string[] } | null>(null)

  const set = (k: keyof Campos) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setCampos((c) => ({ ...c, [k]: e.target.value }))
    if (errores[k]) setErrores((er) => ({ ...er, [k]: undefined }))
    if (k === 'domicilio') setAviso(null)
  }

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    const er = validar(campos, nombreExiste)
    setErrores(er)
    if (Object.keys(er).length) return

    const dom = limpiar(campos.domicilio)
    if (dom && aviso?.domicilio !== dom) {
      const nombres = domicilioOcupadoPor(dom)
      if (nombres.length) {
        setAviso({ domicilio: dom, nombres })
        return
      }
    }

    setGuardando(true)
    try {
      await onGuardar({
        nombre: limpiar(campos.nombre),
        apellido_paterno: limpiar(campos.apellido_paterno),
        apellido_materno: limpiar(campos.apellido_materno),
        domicilio: limpiar(campos.domicilio) || null,
        telefono: limpiar(campos.telefono) || null,
        numero_tomas: campos.numero_tomas.trim() === '' ? null : Number(campos.numero_tomas),
      })
      if (reiniciar) {
        setCampos(VACIO)
        setAviso(null)
        primerCampo.current?.focus()
      }
    } finally {
      setGuardando(false)
    }
  }

  const campo = (
    k: keyof Campos,
    etiqueta: string,
    extra: React.ComponentProps<'input'> = {},
    clase = '',
  ) => (
    <div className={clase}>
      <label htmlFor={`${id}-${k}`} className="mb-1.5 block text-sm font-medium text-stone-700">
        {etiqueta}
      </label>
      <input
        id={`${id}-${k}`}
        value={campos[k]}
        onChange={set(k)}
        aria-invalid={Boolean(errores[k])}
        aria-describedby={errores[k] ? `${id}-${k}-error` : undefined}
        className="campo"
        {...extra}
      />
      {errores[k] && (
        <p id={`${id}-${k}-error`} className="anim-fade mt-1 text-xs font-medium text-red-600">
          {errores[k]}
        </p>
      )}
    </div>
  )

  return (
    <form onSubmit={enviar} noValidate className="grid grid-cols-2 gap-x-3 gap-y-4">
      {campo('nombre', 'Nombre(s)', { ref: primerCampo, autoComplete: 'off', autoCapitalize: 'words', placeholder: 'Ej. María Guadalupe' }, 'col-span-2')}
      {campo('apellido_paterno', 'Apellido paterno', { autoComplete: 'off', autoCapitalize: 'words', placeholder: 'Ej. Hernández' }, 'col-span-2 sm:col-span-1')}
      {campo('apellido_materno', 'Apellido materno', { autoComplete: 'off', autoCapitalize: 'words', placeholder: 'Opcional' }, 'col-span-2 sm:col-span-1')}
      {campo('domicilio', 'Domicilio', { autoComplete: 'off', placeholder: 'Opcional · calle, número, barrio' }, 'col-span-2')}
      {campo('telefono', 'Teléfono', { type: 'tel', inputMode: 'tel', autoComplete: 'off', placeholder: 'Opcional' }, 'col-span-2 sm:col-span-1')}
      {campo('numero_tomas', 'Número de tomas', { type: 'number', inputMode: 'numeric', min: 1, step: 1, placeholder: 'Vacío = 2.ª toma' }, 'col-span-2 sm:col-span-1')}

      {aviso && (
        <div role="alert" className="anim-fade col-span-2 rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-900 ring-1 ring-amber-200">
          <p className="font-semibold">Este domicilio ya está registrado</p>
          <p className="mt-0.5">
            A nombre de {aviso.nombres.slice(0, 3).join(', ')}
            {aviso.nombres.length > 3 && ` y ${aviso.nombres.length - 3} más`}. Si es el mismo lote familiar, guarda de todos modos.
          </p>
        </div>
      )}

      <div className="col-span-2 mt-1 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancelar && (
          <button type="button" onClick={onCancelar} className="boton boton-secundario">
            Cancelar
          </button>
        )}
        <button type="submit" disabled={guardando} className="boton boton-primario sm:min-w-36">
          {guardando && <Spinner />}
          {guardando ? 'Guardando…' : aviso ? 'Guardar de todos modos' : textoBoton}
        </button>
      </div>
    </form>
  )
}
