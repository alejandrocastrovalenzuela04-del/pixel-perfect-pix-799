import { formatoMoneda, periodoLabel, type ActividadEstado, type Opinion } from "@/lib/dominio";

export type CampoEspecifico =
  | "iva" // IVA pagado o IVA a favor (excluyentes)
  | "isr"
  | "opinion"
  | "conciliacion"
  | "descripcion";

/** Campos específicos por tipo de actividad. Agregar un tipo nuevo = agregar una línea. */
export const CAMPOS_POR_TIPO: Record<string, CampoEspecifico[]> = {
  IVA: ["iva"],
  ISR: ["isr"],
  PAGOS_PROVISIONALES: ["isr", "iva"],
  OPINION_CUMPLIMIENTO: ["opinion"],
  CONCILIACION_BANCARIA: ["conciliacion"],
  OTRA: ["descripcion"],
};

export const TIPO_NOMBRE_FALLBACK: Record<string, string> = {
  CONTABILIDAD_MENSUAL: "Contabilidad mensual",
  CONCILIACION_BANCARIA: "Conciliación bancaria",
  PAGOS_PROVISIONALES: "Pagos provisionales",
  DIOT: "DIOT",
  IVA: "IVA",
  ISR: "ISR",
  DECLARACION_ANUAL: "Declaración anual",
  OPINION_CUMPLIMIENTO: "Opinión de cumplimiento",
  REVISION_CFDI: "Revisión de CFDI",
  NOMINA: "Nómina",
  POLIZAS_CONTABLES: "Pólizas contables",
  ESTADOS_FINANCIEROS: "Estados financieros",
  OTRA: "Otra",
};

export type DatosExtra = {
  banco?: string;
  cuenta?: string;
  saldo_conciliado?: number | null;
  descripcion?: string;
};

export type ActividadFila = {
  id: string;
  empresa_id: string;
  tipo_clave: string;
  estado: ActividadEstado;
  periodo_mes: number;
  periodo_anio: number;
  responsable_id: string | null;
  ultima_actualizacion_por: string | null;
  creado_por: string | null;
  created_at: string;
  fecha_inicio: string | null;
  fecha_realizacion: string | null;
  updated_at: string;
  comentarios: string | null;
  isr_pagado: number | null;
  iva_pagado: number | null;
  iva_a_favor: number | null;
  opinion_resultado: Opinion | null;
  opinion_fecha: string | null;
  datos: DatosExtra | null;
  registro_mensual_id: string | null;
};

export const COLUMNAS_ACTIVIDAD =
  "id, empresa_id, tipo_clave, estado, periodo_mes, periodo_anio, responsable_id, ultima_actualizacion_por, creado_por, created_at, fecha_inicio, fecha_realizacion, updated_at, comentarios, isr_pagado, iva_pagado, iva_a_favor, opinion_resultado, opinion_fecha, datos, registro_mensual_id";

export function infoPrincipal(a: ActividadFila): string {
  const partes: string[] = [];
  if (a.isr_pagado !== null) partes.push(`ISR ${formatoMoneda(a.isr_pagado)}`);
  if (a.iva_pagado !== null) partes.push(`IVA pagado ${formatoMoneda(a.iva_pagado)}`);
  if (a.iva_a_favor !== null) partes.push(`IVA a favor ${formatoMoneda(a.iva_a_favor)}`);
  if (a.opinion_resultado) partes.push(`Opinión ${a.opinion_resultado === "POSITIVA" ? "positiva" : "negativa"}`);
  const d = a.datos ?? {};
  if (d.saldo_conciliado !== undefined && d.saldo_conciliado !== null)
    partes.push(`Saldo ${formatoMoneda(d.saldo_conciliado)}`);
  if (d.descripcion) partes.push(d.descripcion);
  return partes.length ? partes.join(" · ") : "—";
}

export function periodoActividad(a: { periodo_mes: number; periodo_anio: number }) {
  return periodoLabel(a.periodo_mes, a.periodo_anio);
}

export function formatoFecha(valor: string | null | undefined) {
  if (!valor) return "—";
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Mazatlan",
  }).format(new Date(valor));
}

/** Rango [inicio, fin) en UTC del mes en hora de Mazatlán (UTC-7, sin horario de verano). */
export function rangoMesMazatlan(mes: number, anio: number) {
  const inicio = new Date(Date.UTC(anio, mes - 1, 1, 7));
  const fin = new Date(Date.UTC(mes === 12 ? anio + 1 : anio, mes === 12 ? 0 : mes, 1, 7));
  return { inicio: inicio.toISOString(), fin: fin.toISOString() };
}

/** "YYYY-MM-DD" del día en hora de Mazatlán. */
export function diaMazatlan(valor: string) {
  const d = new Date(new Date(valor).getTime() - 7 * 3600 * 1000);
  return d.toISOString().slice(0, 10);
}

export const ACCION_LABEL: Record<string, string> = {
  CREACION: "Creó la actividad",
  CAMBIO_ESTADO: "Cambio de estado",
  EDICION: "Modificó información",
  REVERSION: "Revirtió cambio",
  ASIGNACION: "Asignó responsable",
};
