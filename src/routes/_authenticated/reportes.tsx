import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { FileDown, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { usePersonas, useTiposActividad } from "@/components/actividades/ActividadesEmpresa";
import { DESPACHO } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  COLUMNAS_ACTIVIDAD,
  TIPO_NOMBRE_FALLBACK,
  formatoFecha,
  infoPrincipal,
  periodoActividad,
  rangoMesMazatlan,
  type ActividadFila,
} from "@/lib/actividades";
import { preguntarAsistente } from "@/lib/asistente.functions";
import { ESTADOS, ESTADO_LABEL, MESES, periodoLabel } from "@/lib/dominio";
import { generarReporteActividadesPdf } from "@/lib/pdf";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/reportes")({
  head: () => ({
    meta: [
      { title: "Reportes — SDO Contadores" },
      { name: "description", content: "Reportes PDF de actividades y asistente de consultas para el CEO." },
      { property: "og:title", content: "Reportes — SDO Contadores" },
      { property: "og:description", content: "Reportes PDF de actividades y asistente de consultas para el CEO." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Reportes,
});

const TODOS = "todos";
type TipoReporte = "REALIZADAS" | "PERIODO";
const hoy = new Date();
const ANIOS = Array.from({ length: 16 }, (_, i) => hoy.getFullYear() + 1 - i);

function Reportes() {
  const { esCeo, cargando } = useAuth();
  if (cargando) return null;
  if (!esCeo) {
    return (
      <div className="panel p-6">
        <h1 className="text-lg font-semibold">Sección no disponible</h1>
        <p className="mt-2 text-sm text-muted-foreground">Solo el CEO puede generar reportes.</p>
      </div>
    );
  }
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">Reportes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Genera reportes PDF de cualquier mes y consulta los datos con el asistente.
        </p>
      </header>
      <GeneradorReporte />
      <Asistente />
    </div>
  );
}

function useEmpresas() {
  return useQuery({
    queryKey: ["empresas-reportes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("empresas").select("id, nombre, rfc, regimen_fiscal").order("nombre");
      if (error) throw error;
      return data ?? [];
    },
  });
}

function SelectSimple({ label, value, onChange, opciones, todos = true }: {
  label: string; value: string; onChange: (v: string) => void;
  opciones: { value: string; label: string }[]; todos?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger aria-label={label}><SelectValue /></SelectTrigger>
        <SelectContent>
          {todos && <SelectItem value={TODOS}>Todos</SelectItem>}
          {opciones.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
        </SelectContent>
      </Select>
    </div>
  );
}

function GeneradorReporte() {
  const empresas = useEmpresas();
  const tipos = useTiposActividad();
  const personas = usePersonas();
  const [tipoReporte, setTipoReporte] = useState<TipoReporte>("REALIZADAS");
  const [mes, setMes] = useState(String(hoy.getMonth() + 1));
  const [anio, setAnio] = useState(String(hoy.getFullYear()));
  const [empresa, setEmpresa] = useState(TODOS);
  const [tipo, setTipo] = useState(TODOS);
  const [resp, setResp] = useState(TODOS);
  const [estado, setEstado] = useState(TODOS);

  const generar = useMutation({
    mutationFn: async () => {
      const m = Number(mes);
      const a = Number(anio);
      let q = supabase.from("actividades").select(COLUMNAS_ACTIVIDAD);
      if (tipoReporte === "REALIZADAS") {
        const { inicio, fin } = rangoMesMazatlan(m, a);
        q = q.gte("fecha_realizacion", inicio).lt("fecha_realizacion", fin);
      } else {
        q = q.eq("periodo_mes", m).eq("periodo_anio", a);
      }
      if (empresa !== TODOS) q = q.eq("empresa_id", empresa);
      if (tipo !== TODOS) q = q.eq("tipo_clave", tipo);
      if (resp !== TODOS) q = resp === "sin" ? q.is("responsable_id", null) : q.eq("responsable_id", resp);
      if (estado !== TODOS) q = q.eq("estado", estado as never);
      const { data, error } = await q.order("periodo_anio").order("periodo_mes").order("fecha_realizacion");
      if (error) throw new Error("No se pudieron leer las actividades.");
      const filas = (data ?? []) as unknown as ActividadFila[];

      const nombreTipo = (c: string) => tipos.data?.find((t) => t.clave === c)?.nombre ?? TIPO_NOMBRE_FALLBACK[c] ?? c;
      const nombrePersona = (id: string | null) => (id ? personas.data?.find((p) => p.id === id)?.nombre ?? "Usuario" : null);
      const porEmpresa = (empresas.data ?? [])
        .map((e) => ({
          nombre: e.nombre,
          rfc: e.rfc,
          regimen_fiscal: e.regimen_fiscal,
          filas: filas.filter((f) => f.empresa_id === e.id).map((f) => ({
            actividad: nombreTipo(f.tipo_clave),
            estado: f.estado,
            responsable: nombrePersona(f.responsable_id),
            fechaRealizacion: f.fecha_realizacion ? formatoFecha(f.fecha_realizacion) : null,
            periodo: periodoActividad(f),
            info: infoPrincipal(f),
          })),
        }))
        .filter((e) => e.filas.length > 0);

      const etiquetaMes = periodoLabel(m, a);
      const filtros: string[] = [];
      if (empresa !== TODOS) filtros.push(`Empresa: ${empresas.data?.find((e) => e.id === empresa)?.nombre}`);
      if (tipo !== TODOS) filtros.push(`Actividad: ${nombreTipo(tipo)}`);
      if (resp !== TODOS) filtros.push(`Responsable: ${resp === "sin" ? "No asignado" : nombrePersona(resp)}`);
      if (estado !== TODOS) filtros.push(`Estado: ${ESTADO_LABEL[estado as keyof typeof ESTADO_LABEL]}`);

      generarReporteActividadesPdf({
        despacho: DESPACHO,
        titulo: tipoReporte === "REALIZADAS"
          ? `Reporte de actividades realizadas por el despacho — ${etiquetaMes}`
          : `Reporte de actividades correspondientes al periodo — ${etiquetaMes}`,
        tipoReporte: tipoReporte === "REALIZADAS"
          ? "Actividades realizadas por el despacho (según fecha de realización)"
          : "Actividades correspondientes al ejercicio/periodo (según periodo correspondiente)",
        periodoConsultado: etiquetaMes,
        filtros,
        empresas: porEmpresa,
        nombreArchivo: `reporte-${tipoReporte === "REALIZADAS" ? "realizadas" : "periodo"}-${a}-${String(m).padStart(2, "0")}.pdf`,
      });
      return filas.length;
    },
    onSuccess: (n) => toast.success(`Reporte generado (${n} actividades)`),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section className="panel space-y-5 p-5">
      <h2 className="text-lg font-semibold">Reporte PDF</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2 sm:col-span-3">
          <Label>Tipo de reporte</Label>
          <Select value={tipoReporte} onValueChange={(v) => setTipoReporte(v as TipoReporte)}>
            <SelectTrigger aria-label="Tipo de reporte"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="REALIZADAS">1. Actividades realizadas por el despacho (fecha de realización)</SelectItem>
              <SelectItem value="PERIODO">2. Actividades correspondientes a un ejercicio/periodo</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <SelectSimple label="Mes" value={mes} onChange={setMes} todos={false}
          opciones={MESES.map((m, i) => ({ value: String(i + 1), label: m }))} />
        <SelectSimple label="Año" value={anio} onChange={setAnio} todos={false}
          opciones={ANIOS.map((a) => ({ value: String(a), label: String(a) }))} />
        <SelectSimple label="Empresa" value={empresa} onChange={setEmpresa}
          opciones={(empresas.data ?? []).map((e) => ({ value: e.id, label: e.nombre }))} />
        <SelectSimple label="Tipo de actividad" value={tipo} onChange={setTipo}
          opciones={(tipos.data ?? []).map((t) => ({ value: t.clave, label: t.nombre }))} />
        <SelectSimple label="Responsable" value={resp} onChange={setResp}
          opciones={[{ value: "sin", label: "No asignado" }, ...(personas.data ?? []).map((p) => ({ value: p.id, label: p.nombre }))]} />
        <SelectSimple label="Estado" value={estado} onChange={setEstado}
          opciones={ESTADOS.map((e) => ({ value: e, label: ESTADO_LABEL[e] }))} />
      </div>
      <Button className="gap-2" disabled={generar.isPending} onClick={() => generar.mutate()}>
        <FileDown className="size-4" /> Generar PDF
      </Button>
    </section>
  );
}

function Asistente() {
  const empresas = useEmpresas();
  const preguntar = useServerFn(preguntarAsistente);
  const [mes, setMes] = useState(String(hoy.getMonth() + 1));
  const [anio, setAnio] = useState(String(hoy.getFullYear()));
  const [empresa, setEmpresa] = useState(TODOS);
  const [pregunta, setPregunta] = useState("");
  const [respuesta, setRespuesta] = useState<string | null>(null);

  const consultar = useMutation({
    mutationFn: async () => {
      const r = await preguntar({
        data: { mes: Number(mes), anio: Number(anio), empresaId: empresa === TODOS ? null : empresa, pregunta },
      });
      if (r.error) throw new Error(r.error);
      return r.respuesta ?? "";
    },
    onMutate: () => setRespuesta(null),
    onSuccess: (t) => setRespuesta(t),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section className="panel space-y-5 p-5">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Sparkles className="size-4" /> Pregunta sobre un periodo
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Respuestas con IA basadas solo en los datos fiscales y actividades guardados del mes elegido.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <SelectSimple label="Mes" value={mes} onChange={setMes} todos={false}
          opciones={MESES.map((m, i) => ({ value: String(i + 1), label: m }))} />
        <SelectSimple label="Año" value={anio} onChange={setAnio} todos={false}
          opciones={ANIOS.map((a) => ({ value: String(a), label: String(a) }))} />
        <SelectSimple label="Empresa" value={empresa} onChange={setEmpresa}
          opciones={(empresas.data ?? []).map((e) => ({ value: e.id, label: e.nombre }))} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="pregunta">Tu pregunta</Label>
        <Textarea id="pregunta" maxLength={1000} value={pregunta} onChange={(e) => setPregunta(e.target.value)}
          placeholder="Ej. ¿Cuánto ISR se pagó este mes y qué actividades siguen pendientes?" />
      </div>
      <Button className="gap-2" disabled={consultar.isPending || pregunta.trim().length < 3} onClick={() => consultar.mutate()}>
        <Sparkles className="size-4" /> {consultar.isPending ? "Consultando..." : "Preguntar"}
      </Button>
      {respuesta && (
        <div className="whitespace-pre-wrap rounded-md border border-border bg-muted/40 p-4 text-sm" aria-live="polite">
          {respuesta}
        </div>
      )}
    </section>
  );
}
