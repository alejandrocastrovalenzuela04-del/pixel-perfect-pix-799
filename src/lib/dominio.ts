export type Rol = "CEO" | "SUPERVISOR" | "EMPLEADO";
export type ActividadTipo =
  | "CONTABILIDAD_MENSUAL"
  | "CONCILIACION_BANCARIA"
  | "PAGOS_PROVISIONALES"
  | "DIOT";
export type ActividadEstado = "PENDIENTE" | "EN_PROCESO" | "REALIZADO";
export type IvaTipo = "NO_DETERMINADO" | "PAGADO" | "A_FAVOR";
export type Opinion = "POSITIVA" | "NEGATIVA";

export const ROLES: Rol[] = ["CEO", "SUPERVISOR", "EMPLEADO"];

export const ROL_LABEL: Record<Rol, string> = {
  CEO: "CEO",
  SUPERVISOR: "Supervisor",
  EMPLEADO: "Empleado",
};

export const TIPOS_ACTIVIDAD: ActividadTipo[] = [
  "CONTABILIDAD_MENSUAL",
  "CONCILIACION_BANCARIA",
  "PAGOS_PROVISIONALES",
  "DIOT",
];

export const TIPO_LABEL: Record<ActividadTipo, string> = {
  CONTABILIDAD_MENSUAL: "Contabilidad mensual",
  CONCILIACION_BANCARIA: "Conciliación bancaria",
  PAGOS_PROVISIONALES: "Pagos provisionales",
  DIOT: "DIOT",
};

export const ESTADOS: ActividadEstado[] = ["PENDIENTE", "EN_PROCESO", "REALIZADO"];

export const ESTADO_LABEL: Record<ActividadEstado, string> = {
  PENDIENTE: "Pendiente",
  EN_PROCESO: "En proceso",
  REALIZADO: "Realizado",
};

export const IVA_LABEL: Record<IvaTipo, string> = {
  NO_DETERMINADO: "Sin determinar",
  PAGADO: "IVA pagado",
  A_FAVOR: "IVA a favor",
};

export const OPINION_LABEL: Record<Opinion, string> = {
  POSITIVA: "Positiva",
  NEGATIVA: "Negativa",
};

export const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

export function nombreMes(mes: number) {
  return MESES[mes - 1] ?? String(mes);
}

export function periodoLabel(mes: number, anio: number) {
  return `${nombreMes(mes)} ${anio}`;
}

export function formatoMoneda(valor: number | null | undefined) {
  if (valor === null || valor === undefined) return "No pagado";
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(valor);
}

export function formatoFechaHora(valor: string | null | undefined) {
  if (!valor) return "—";
  const d = new Date(valor);
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export const REGIMENES_FISCALES = [
  "Régimen General de Ley Personas Morales",
  "Régimen Simplificado de Confianza (RESICO)",
  "Personas Físicas con Actividades Empresariales y Profesionales",
  "Régimen de Incorporación Fiscal",
  "Arrendamiento",
  "Sueldos y Salarios",
  "Personas Morales con Fines no Lucrativos",
];
