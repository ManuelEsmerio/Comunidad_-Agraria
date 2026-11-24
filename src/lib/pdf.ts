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

export interface OpcionesPdf {
  /** Pinta las filas que comparten un domicilio con número. */
  resaltarDomicilios?: boolean
}

const MESES = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE']

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

/**
 * Padrón en el mismo formato que el original en papel: hoja oficio horizontal,
 * columnas No. | No. TOMAS | NOMBRE | DOMICILIO | TELEFONO | casillas de meses.
 * jsPDF se carga bajo demanda para no aumentar la carga inicial de la página.
 */
export async function exportarPdf(miembros: Miembro[], campo: CampoOrden, anio: number, opciones: OpcionesPdf = {}) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')])

  const lista = ordenarAlfabeticamente(miembros, campo)
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'legal' }) // 355.6 × 215.9 mm
  const ancho = doc.internal.pageSize.getWidth()
  // Anchos de columna (mm) proporcionales al padrón original; la tabla se centra en la hoja.
  const anchos = [16, 17, 76, 70, 30, ...MESES.map(() => 8.8)]
  const margen = (ancho - anchos.reduce((a, b) => a + b, 0)) / 2

  const grupos = opciones.resaltarDomicilios ? gruposDomicilioRepetido(lista) : new Map<number, number>()

  // Título grande solo en la primera hoja, como en el padrón original.
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(40, 40, 40)
  doc.text(`USUARIOS DE AGUA POTABLE PUERTA DE EN MEDIO ${anio}`, ancho / 2, 24, { align: 'center' })

  const negro: [number, number, number] = [0, 0, 0]
  const ALTO_CABECERA = 26

  autoTable(doc, {
    startY: 34,
    margin: { left: margen, right: margen, top: 16, bottom: 14 },
    showHead: 'firstPage', // encabezado de columnas solo en la primera hoja, como el original
    head: [['No.', 'No.\nTOMAS', 'NOMBRE', 'DOMICILIO', 'TELEFONO', ...MESES.map(() => '')]],
    body: lista.map((m, i) => [
      String(i + 1),
      m.numero_tomas == null ? '' : String(m.numero_tomas),
      nombreSegun(m, campo),
      m.domicilio ?? '',
      m.telefono ?? '',
      ...MESES.map(() => ''),
    ]),
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 9,
      textColor: [20, 20, 20],
      lineColor: negro,
      lineWidth: 0.2,
      cellPadding: { top: 1.2, bottom: 1.2, left: 1.2, right: 1.2 },
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
      minCellHeight: ALTO_CABECERA,
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
      doc.setFontSize(6.5)
      doc.setTextColor(40, 40, 40)
      doc.text(MESES[d.column.index - 5], d.cell.x + d.cell.width / 2 + 1.1, d.cell.y + d.cell.height - 2, { angle: 90 })
    },
    didDrawPage: () => {
      const alto = doc.internal.pageSize.getHeight()
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(110, 110, 110)
      doc.text(String(doc.getNumberOfPages()), ancho - margen, 12, { align: 'right' })
      doc.text(
        `${lista.length} registros · ${lista.reduce((s, m) => s + (m.numero_tomas ?? 0), 0)} tomas` +
          (grupos.size ? ` · Filas coloreadas: mismo domicilio (mismo color = mismo domicilio)` : ''),
        margen,
        alto - 7,
      )
    },
  })

  doc.save(`usuarios-agua-${anio}-${campo.replace('_', '-')}.pdf`)
}
