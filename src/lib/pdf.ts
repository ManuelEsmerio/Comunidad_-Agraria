import type { jsPDF } from 'jspdf'
import type { CampoOrden, Miembro } from '../types'
import { gruposDomicilioRepetido, ordenarAlfabeticamente } from './text'

/** Colores suaves alternados para distinguir cada grupo de domicilio repetido. */
const COLORES_GRUPO: [number, number, number][] = [
  [254, 240, 138], // amarillo
  [191, 219, 254], // azul
  [254, 205, 211], // rosa
  [187, 247, 208], // verde
  [233, 213, 255], // morado
  [254, 215, 170], // naranja
]

/** Tamaños de letra (pt) editables desde la modal de exportar. */
export interface TamanosPdf {
  titulo: number
  tabla: number
  pagina: number
}

export const TAMANOS_DEFECTO: TamanosPdf = { titulo: 18, tabla: 9, pagina: 8 }

/** Límites de cada tamaño: fuera de ellos la tabla ya no cabe bien en la hoja oficio. */
export const LIMITES_TAMANO: Record<keyof TamanosPdf, { min: number; max: number }> = {
  titulo: { min: 14, max: 32 },
  tabla: { min: 7, max: 14 },
  pagina: { min: 8, max: 20 },
}

export interface OpcionesPdf {
  /** Pinta las filas que comparten un domicilio con número. */
  resaltarDomicilios?: boolean
  tamanos?: Partial<TamanosPdf>
}

const MESES = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE']
const PT_A_MM = 25.4 / 72
const PADDING = 1.2
const MARGEN_MIN = 8 // mm a cada lado de la hoja
/** Anchos (mm) del padrón original: No. | TOMAS | NOMBRE | DOMICILIO | TELEFONO | 12 meses. */
const ANCHOS_BASE = [16, 17, 76, 70, 30, ...MESES.map(() => 8.8)]
const TAM_MES = 6.5

/** Nombre completo en el orden del criterio elegido, para que la lista se lea ordenada. */
function nombreSegun(m: Miembro, campo: CampoOrden) {
  const partes =
    campo === 'nombre'
      ? [m.nombre, m.apellido_paterno, m.apellido_materno]
      : campo === 'apellido_paterno'
        ? [m.apellido_paterno, m.apellido_materno, m.nombre]
        : [m.apellido_materno, m.apellido_paterno, m.nombre]
  return partes.filter(Boolean).join(' ')
}

function limitar(v: number | undefined, k: keyof TamanosPdf) {
  const { min, max } = LIMITES_TAMANO[k]
  return Math.min(max, Math.max(min, Number.isFinite(v) ? (v as number) : TAMANOS_DEFECTO[k]))
}

/** Ancho (mm) del texto más largo de cada línea, con la fuente y tamaño dados. */
function anchoTexto(doc: jsPDF, textos: string[], tam: number, negrita: boolean) {
  doc.setFont('helvetica', negrita ? 'bold' : 'normal')
  doc.setFontSize(tam)
  let max = 0
  for (const t of textos) for (const linea of t.split('\n')) max = Math.max(max, doc.getTextWidth(linea))
  return max
}

/**
 * Calcula los anchos de columna para que la tabla nunca se salga de la hoja.
 * Las columnas de texto crecen hasta lo que pida el texto más largo; si no hay espacio,
 * se reparte lo disponible y el texto se parte en dos líneas (nunca se corta).
 */
function calcularAnchos(doc: jsPDF, cabecera: string[], filas: string[][], tam: number, disponible: number) {
  const necesario = ANCHOS_BASE.map((base, i) => {
    if (i >= 5) return base // casillas de meses
    const cuerpo = anchoTexto(doc, filas.map((f) => f[i]), tam, false)
    const cab = anchoTexto(doc, [cabecera[i]], tam, true)
    return Math.max(base, Math.max(cuerpo, cab) + PADDING * 2 + 0.6)
  })

  // Columnas fijas (No., TOMAS, TELEFONO, meses) siempre a su tamaño necesario.
  const flexibles = [2, 3] // NOMBRE, DOMICILIO
  const fijo = necesario.reduce((s, w, i) => (flexibles.includes(i) ? s : s + w), 0)
  const presupuesto = disponible - fijo
  const pedido = flexibles.reduce((s, i) => s + necesario[i], 0)
  if (pedido <= presupuesto) return necesario

  // Falta espacio: cada columna flexible conserva su ancho base y el sobrante se reparte
  // en proporción a lo que le falta a cada una.
  const anchos = [...necesario]
  const base = flexibles.reduce((s, i) => s + ANCHOS_BASE[i], 0)
  const extra = Math.max(0, presupuesto - base)
  const falta = flexibles.reduce((s, i) => s + (necesario[i] - ANCHOS_BASE[i]), 0)
  for (const i of flexibles) {
    const propio = necesario[i] - ANCHOS_BASE[i]
    anchos[i] = Math.min(necesario[i], ANCHOS_BASE[i] + (falta ? (extra * propio) / falta : 0))
  }
  // Si aun así no cabe (letra muy grande), se reduce todo en proporción.
  const total = anchos.reduce((a, b) => a + b, 0)
  return total > disponible ? anchos.map((w) => (w * disponible) / total) : anchos
}

export interface ResultadoPdf {
  doc: jsPDF
  paginas: number
  /** Filas cuyo nombre o domicilio no cupo en una línea y se partió en dos. */
  filasPartidas: number
  nombreArchivo: string
}

/**
 * Padrón en el mismo formato que el original en papel: hoja oficio horizontal,
 * columnas No. | No. TOMAS | NOMBRE | DOMICILIO | TELEFONO | casillas de meses.
 * jsPDF se carga bajo demanda para no aumentar la carga inicial de la página.
 */
export async function generarPdf(
  miembros: Miembro[],
  campo: CampoOrden,
  anio: number,
  opciones: OpcionesPdf = {},
): Promise<ResultadoPdf> {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')])

  const tam: TamanosPdf = {
    titulo: limitar(opciones.tamanos?.titulo, 'titulo'),
    tabla: limitar(opciones.tamanos?.tabla, 'tabla'),
    pagina: limitar(opciones.tamanos?.pagina, 'pagina'),
  }

  const lista = ordenarAlfabeticamente(miembros, campo)
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'legal' }) // 355.6 × 215.9 mm
  const ancho = doc.internal.pageSize.getWidth()
  const disponible = ancho - MARGEN_MIN * 2

  const cabecera = ['No.', 'No.\nTOMAS', 'NOMBRE', 'DOMICILIO', 'TELEFONO', ...MESES.map(() => '')]
  const filas = lista.map((m, i) => [
    String(i + 1),
    m.numero_tomas == null ? '' : String(m.numero_tomas),
    nombreSegun(m, campo),
    m.domicilio ?? '',
    m.telefono ?? '',
    ...MESES.map(() => ''),
  ])

  const anchos = calcularAnchos(doc, cabecera, filas, tam.tabla, disponible)
  const margen = (ancho - anchos.reduce((a, b) => a + b, 0)) / 2

  const grupos = opciones.resaltarDomicilios ? gruposDomicilioRepetido(lista) : new Map<number, number>()

  // Título grande solo en la primera hoja, como en el padrón original. Si no cabe a lo ancho, se reduce.
  const titulo = `USUARIOS DE AGUA POTABLE PUERTA DE EN MEDIO ${anio}`
  let tamTitulo = tam.titulo
  const anchoTitulo = anchoTexto(doc, [titulo], tamTitulo, true)
  if (anchoTitulo > disponible) tamTitulo = (tamTitulo * disponible) / anchoTitulo
  const altoTitulo = tamTitulo * PT_A_MM
  const yTitulo = 17.6 + altoTitulo // 18 pt → y ≈ 24 mm, igual que antes
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(tamTitulo)
  doc.setTextColor(40, 40, 40)
  doc.text(titulo, ancho / 2, yTitulo, { align: 'center' })

  const negro: [number, number, number] = [0, 0, 0]
  // La cabecera debe ser lo bastante alta para "SEPTIEMBRE" en vertical.
  const altoCabecera = Math.max(26, anchoTexto(doc, MESES, TAM_MES, true) + 4)
  // El número de página va arriba a la derecha; el margen superior crece si la letra es grande.
  const yPagina = 6 + tam.pagina * PT_A_MM
  const margenSup = Math.max(16, yPagina + 4)

  const anchoNombre = anchos[2] - PADDING * 2
  const anchoDomicilio = anchos[3] - PADDING * 2
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(tam.tabla)
  const filasPartidas = filas.filter(
    (f) => doc.getTextWidth(f[2]) > anchoNombre || doc.getTextWidth(f[3]) > anchoDomicilio,
  ).length

  autoTable(doc, {
    startY: yTitulo + 10,
    margin: { left: margen, right: margen, top: margenSup, bottom: 14 },
    showHead: 'firstPage', // encabezado de columnas solo en la primera hoja, como el original
    head: [cabecera],
    body: filas,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: tam.tabla,
      textColor: [20, 20, 20],
      lineColor: negro,
      lineWidth: 0.2,
      cellPadding: { top: PADDING, bottom: PADDING, left: PADDING, right: PADDING },
      valign: 'middle',
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [40, 40, 40],
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
      lineWidth: 0.4,
      minCellHeight: altoCabecera,
    },
    columnStyles: Object.fromEntries(
      anchos.map((w, i) => [i, { cellWidth: w, halign: i === 0 || i === 1 || i === 4 ? 'center' : 'left' }] as const),
    ),
    didParseCell: (d) => {
      if (d.section !== 'body') return
      const g = grupos.get(lista[d.row.index].id)
      if (g !== undefined) d.cell.styles.fillColor = COLORES_GRUPO[g % COLORES_GRUPO.length]
    },
    // Meses con texto vertical, como en el original.
    didDrawCell: (d) => {
      if (d.section !== 'head' || d.column.index < 5) return
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(TAM_MES)
      doc.setTextColor(40, 40, 40)
      doc.text(MESES[d.column.index - 5], d.cell.x + d.cell.width / 2 + 1.1, d.cell.y + d.cell.height - 2, { angle: 90 })
    },
    didDrawPage: () => {
      const alto = doc.internal.pageSize.getHeight()
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(tam.pagina)
      doc.setTextColor(110, 110, 110)
      doc.text(String(doc.getNumberOfPages()), ancho - margen, yPagina, { align: 'right' })
      doc.setFontSize(8)
      doc.text(
        `${lista.length} registros · ${lista.reduce((s, m) => s + (m.numero_tomas ?? 0), 0)} tomas` +
          (grupos.size ? ` · Filas coloreadas: mismo domicilio (mismo color = mismo domicilio)` : ''),
        margen,
        alto - 7,
      )
    },
  })

  return {
    doc,
    paginas: doc.getNumberOfPages(),
    filasPartidas,
    nombreArchivo: `usuarios-agua-${anio}-${campo.replace('_', '-')}.pdf`,
  }
}

export async function exportarPdf(miembros: Miembro[], campo: CampoOrden, anio: number, opciones: OpcionesPdf = {}) {
  const { doc, nombreArchivo } = await generarPdf(miembros, campo, anio, opciones)
  doc.save(nombreArchivo)
}
