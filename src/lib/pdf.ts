import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import {
  ESTADO_LABEL,
  IVA_LABEL,
  OPINION_LABEL,
  TIPO_LABEL,
  formatoFechaHora,
  formatoMoneda,
  periodoLabel,
  type ActividadEstado,
  type ActividadTipo,
  type IvaTipo,
  type Opinion,
} from "@/lib/dominio";

export type DatosReporte = {
  despacho: string;
  empresa: { nombre: string; rfc: string; regimen_fiscal: string };
  periodo: { mes: number; anio: number };
  impuestos: {
    isr_pagado: number | null;
    iva_tipo: IvaTipo;
    iva_monto: number | null;
    opinion_cumplimiento: Opinion | null;
  };
  actividades: {
    tipo: ActividadTipo;
    estado: ActividadEstado;
    responsable: string | null;
    actualizadoPor: string | null;
    fecha: string | null;
  }[];
};

export function generarReportePdf(datos: DatosReporte) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const margen = 48;
  let y = margen;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(datos.despacho, margen, y);
  y += 20;
  doc.setFontSize(12);
  doc.text("REPORTE CONTABLE MENSUAL", margen, y);
  doc.setDrawColor(200);
  y += 10;
  doc.line(margen, y, doc.internal.pageSize.getWidth() - margen, y);
  y += 22;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const encabezado: [string, string][] = [
    ["Empresa", datos.empresa.nombre],
    ["RFC", datos.empresa.rfc],
    ["Régimen fiscal", datos.empresa.regimen_fiscal],
    ["Periodo", periodoLabel(datos.periodo.mes, datos.periodo.anio)],
  ];
  for (const [etiqueta, valor] of encabezado) {
    doc.setFont("helvetica", "bold");
    doc.text(`${etiqueta}:`, margen, y);
    doc.setFont("helvetica", "normal");
    doc.text(valor, margen + 90, y);
    y += 16;
  }

  y += 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("ACTIVIDADES", margen, y);
  y += 8;

  autoTable(doc, {
    startY: y,
    margin: { left: margen, right: margen },
    head: [["Actividad", "Estado", "Responsable", "Actualizado por", "Fecha"]],
    body: datos.actividades.map((a) => [
      TIPO_LABEL[a.tipo],
      ESTADO_LABEL[a.estado],
      a.responsable ?? "No asignado",
      a.actualizadoPor ?? "—",
      a.fecha ? formatoFechaHora(a.fecha) : "—",
    ]),
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: [46, 58, 84], textColor: 255 },
  });

  type ConTabla = { lastAutoTable?: { finalY: number } };
  y = ((doc as unknown as ConTabla).lastAutoTable?.finalY ?? y) + 28;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("IMPUESTOS", margen, y);
  y += 18;
  doc.setFontSize(10);

  const filas: [string, string][] = [
    ["ISR pagado", formatoMoneda(datos.impuestos.isr_pagado)],
    [
      "IVA",
      datos.impuestos.iva_tipo === "NO_DETERMINADO"
        ? "Sin determinar"
        : `${IVA_LABEL[datos.impuestos.iva_tipo]} — ${formatoMoneda(datos.impuestos.iva_monto ?? 0)}`,
    ],
    [
      "Opinión de cumplimiento",
      datos.impuestos.opinion_cumplimiento
        ? OPINION_LABEL[datos.impuestos.opinion_cumplimiento].toUpperCase()
        : "Pendiente",
    ],
  ];
  for (const [etiqueta, valor] of filas) {
    doc.setFont("helvetica", "bold");
    doc.text(`${etiqueta}:`, margen, y);
    doc.setFont("helvetica", "normal");
    doc.text(valor, margen + 160, y);
    y += 16;
  }

  y += 14;
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text(`Reporte generado el ${formatoFechaHora(new Date().toISOString())}`, margen, y);

  const nombre = `reporte-${datos.empresa.rfc}-${datos.periodo.anio}-${String(datos.periodo.mes).padStart(2, "0")}.pdf`;
  doc.save(nombre);
}

export type FilaReporte = {
  actividad: string;
  estado: ActividadEstado;
  responsable: string | null;
  fechaRealizacion: string | null;
  periodo: string;
  info: string;
};

export type DatosReporteActividades = {
  despacho: string;
  titulo: string;
  tipoReporte: string;
  periodoConsultado: string;
  filtros: string[];
  empresas: {
    nombre: string;
    rfc: string;
    regimen_fiscal: string;
    filas: FilaReporte[];
  }[];
  nombreArchivo: string;
};

export function generarReporteActividadesPdf(datos: DatosReporteActividades) {
  const doc = new jsPDF({ unit: "pt", format: "letter", orientation: "landscape" });
  const margen = 40;
  const ancho = doc.internal.pageSize.getWidth();
  let y = margen;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(datos.despacho, margen, y);
  y += 18;
  doc.setFontSize(12);
  doc.text(datos.titulo, margen, y);
  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Tipo de reporte: ${datos.tipoReporte}`, margen, y);
  y += 12;
  doc.text(`Periodo consultado: ${datos.periodoConsultado}`, margen, y);
  y += 12;
  doc.text(`Generado el: ${formatoFechaHora(new Date().toISOString())}`, margen, y);
  y += 12;
  if (datos.filtros.length) {
    doc.text(`Filtros: ${datos.filtros.join(" · ")}`, margen, y);
    y += 12;
  }
  doc.setDrawColor(200);
  doc.line(margen, y, ancho - margen, y);
  y += 18;

  if (datos.empresas.length === 0) {
    doc.setFontSize(10);
    doc.text("No hay actividades que cumplan los criterios seleccionados.", margen, y);
  }

  type ConTabla = { lastAutoTable?: { finalY: number } };
  for (const e of datos.empresas) {
    if (y > doc.internal.pageSize.getHeight() - 100) {
      doc.addPage();
      y = margen;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(e.nombre, margen, y);
    y += 13;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`RFC: ${e.rfc}   ·   Régimen fiscal: ${e.regimen_fiscal}`, margen, y);
    y += 6;
    autoTable(doc, {
      startY: y,
      margin: { left: margen, right: margen },
      head: [["Actividad", "Estado", "Responsable", "Fecha de realización", "Periodo correspondiente", "Información principal"]],
      body: e.filas.map((f) => [
        f.actividad,
        ESTADO_LABEL[f.estado],
        f.responsable ?? "No asignado",
        f.fechaRealizacion ?? "—",
        f.periodo,
        f.info,
      ]),
      styles: { fontSize: 8.5, cellPadding: 4 },
      headStyles: { fillColor: [46, 58, 84], textColor: 255 },
    });
    y = ((doc as unknown as ConTabla).lastAutoTable?.finalY ?? y) + 24;
  }

  doc.save(datos.nombreArchivo);
}
