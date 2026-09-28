import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { EstadoBadge } from "@/components/EstadoBadge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import {
  ESTADOS,
  ESTADO_LABEL,
  TIPOS_ACTIVIDAD,
  TIPO_LABEL,
  formatoFechaHora,
  periodoLabel,
  type ActividadEstado,
  type ActividadTipo,
} from "@/lib/dominio";

export const Route = createFileRoute("/_authenticated/actividades")({
  head: () => ({
    meta: [
      { title: "Todas las actividades — SDO Contadores" },
      { name: "description", content: "Todas las actividades de todas las empresas y periodos." },
      { property: "og:title", content: "Todas las actividades — SDO Contadores" },
      { property: "og:description", content: "Todas las actividades de todas las empresas y periodos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TodasActividades,
});

type Fila = {
  id: string;
  tipo: ActividadTipo;
  estado: ActividadEstado;
  responsable_id: string | null;
  ultima_actualizacion_por: string | null;
  fecha_actualizacion: string | null;
  registros_mensuales: {
    id: string;
    mes: number;
    anio: number;
    empresa_id: string;
    empresas: { nombre: string } | null;
  } | null;
};

const TODOS = "todos";

function Filtro({
  label,
  value,
  onChange,
  opciones,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  opciones: { value: string; label: string }[];
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger aria-label={`Filtrar por ${label}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={TODOS}>Todos</SelectItem>
          {opciones.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function TodasActividades() {
  const [empresa, setEmpresa] = useState(TODOS);
  const [periodo, setPeriodo] = useState(TODOS);
  const [tipo, setTipo] = useState(TODOS);
  const [estado, setEstado] = useState(TODOS);
  const [responsable, setResponsable] = useState(TODOS);

  const actividades = useQuery({
    queryKey: ["todas-actividades"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("actividades")
        .select(
          "id, tipo, estado, responsable_id, ultima_actualizacion_por, fecha_actualizacion, registros_mensuales!inner(id, mes, anio, empresa_id, empresas!inner(nombre))",
        );
      if (error) throw error;
      return (data ?? []) as unknown as Fila[];
    },
  });

  const personas = useQuery({
    queryKey: ["personas-nombres"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, nombre").order("nombre");
      if (error) throw error;
      return data ?? [];
    },
  });

  const nombre = (id: string | null) =>
    id ? (personas.data ?? []).find((p) => p.id === id)?.nombre ?? "Usuario" : null;

  const filas = useMemo(() => {
    const orden = (a: Fila) =>
      (a.registros_mensuales?.anio ?? 0) * 100 + (a.registros_mensuales?.mes ?? 0);
    return [...(actividades.data ?? [])].sort(
      (a, b) =>
        orden(b) - orden(a) ||
        (a.registros_mensuales?.empresas?.nombre ?? "").localeCompare(
          b.registros_mensuales?.empresas?.nombre ?? "",
        ) ||
        TIPOS_ACTIVIDAD.indexOf(a.tipo) - TIPOS_ACTIVIDAD.indexOf(b.tipo),
    );
  }, [actividades.data]);

  const empresas = [
    ...new Map(
      filas.map((f) => [f.registros_mensuales!.empresa_id, f.registros_mensuales!.empresas?.nombre ?? ""]),
    ),
  ].map(([value, label]) => ({ value, label }));
  const periodos = [
    ...new Map(
      filas.map((f) => {
        const r = f.registros_mensuales!;
        return [`${r.anio}-${r.mes}`, periodoLabel(r.mes, r.anio)];
      }),
    ),
  ].map(([value, label]) => ({ value, label }));

  const visibles = filas.filter((f) => {
    const r = f.registros_mensuales!;
    return (
      (empresa === TODOS || r.empresa_id === empresa) &&
      (periodo === TODOS || `${r.anio}-${r.mes}` === periodo) &&
      (tipo === TODOS || f.tipo === tipo) &&
      (estado === TODOS || f.estado === estado) &&
      (responsable === TODOS ||
        (responsable === "sin-asignar" ? !f.responsable_id : f.responsable_id === responsable))
    );
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Todas las actividades</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Todas las actividades de todas las empresas y periodos. Para ver solo las tuyas, usa
          "Mis actividades".
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Filtro label="Empresa" value={empresa} onChange={setEmpresa} opciones={empresas} />
        <Filtro label="Periodo" value={periodo} onChange={setPeriodo} opciones={periodos} />
        <Filtro
          label="Actividad"
          value={tipo}
          onChange={setTipo}
          opciones={TIPOS_ACTIVIDAD.map((t) => ({ value: t, label: TIPO_LABEL[t] }))}
        />
        <Filtro
          label="Estado"
          value={estado}
          onChange={setEstado}
          opciones={ESTADOS.map((e) => ({ value: e, label: ESTADO_LABEL[e] }))}
        />
        <Filtro
          label="Responsable"
          value={responsable}
          onChange={setResponsable}
          opciones={[
            { value: "sin-asignar", label: "No asignado" },
            ...(personas.data ?? []).map((p) => ({ value: p.id, label: p.nombre })),
          ]}
        />
      </div>

      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[56rem] text-sm">
          <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="p-3">Empresa</th>
              <th className="p-3">Periodo</th>
              <th className="p-3">Actividad</th>
              <th className="p-3">Estado</th>
              <th className="p-3">Responsable</th>
              <th className="p-3">Última actualización</th>
              <th className="p-3">Fecha de actualización</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {visibles.map((f) => {
              const r = f.registros_mensuales!;
              return (
                <tr key={f.id}>
                  <td className="p-3">
                    <Link
                      to="/empresas/$empresaId"
                      params={{ empresaId: r.empresa_id }}
                      className="font-medium hover:underline"
                    >
                      {r.empresas?.nombre}
                    </Link>
                  </td>
                  <td className="p-3">
                    <Link
                      to="/empresas/$empresaId/periodos/$periodoId"
                      params={{ empresaId: r.empresa_id, periodoId: r.id }}
                      className="hover:underline"
                    >
                      {periodoLabel(r.mes, r.anio)}
                    </Link>
                  </td>
                  <td className="p-3">{TIPO_LABEL[f.tipo]}</td>
                  <td className="p-3">
                    <EstadoBadge estado={f.estado} />
                  </td>
                  <td className="p-3">{nombre(f.responsable_id) ?? "No asignado"}</td>
                  <td className="p-3">{nombre(f.ultima_actualizacion_por) ?? "—"}</td>
                  <td className="p-3">{formatoFechaHora(f.fecha_actualizacion)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {actividades.isFetched && visibles.length === 0 && (
          <p className="p-4 text-sm text-muted-foreground">No hay actividades con estos filtros.</p>
        )}
      </div>
    </div>
  );
}
