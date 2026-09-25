import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { EstadoBadge } from "@/components/EstadoBadge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  TIPO_LABEL,
  formatoFechaHora,
  periodoLabel,
  type ActividadEstado,
  type ActividadTipo,
} from "@/lib/dominio";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — SDO Contadores" },
      { name: "description", content: "Resumen del avance contable mensual del despacho." },
      { property: "og:title", content: "Dashboard — SDO Contadores" },
      { property: "og:description", content: "Resumen del avance contable mensual del despacho." },
    ],
  }),
  component: Dashboard,
});

type FilaActividad = {
  id: string;
  tipo: ActividadTipo;
  estado: ActividadEstado;
  fecha_actualizacion: string | null;
  registros_mensuales: {
    id: string;
    mes: number;
    anio: number;
    empresa_id: string;
    empresas: { nombre: string } | null;
  } | null;
};

function Tarjeta({ titulo, valor }: { titulo: string; valor: number | string }) {
  return (
    <div className="panel p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{titulo}</p>
      <p className="mt-2 text-2xl font-semibold">{valor}</p>
    </div>
  );
}

function Dashboard() {
  const { sesion, esStaff, esEmpleado } = useAuth();

  const resumen = useQuery({
    queryKey: ["resumen-dashboard"],
    enabled: esStaff,
    queryFn: async () => {
      const ahora = new Date();
      const mes = ahora.getMonth() + 1;
      const anio = ahora.getFullYear();

      const [empresas, periodosActuales, actividades] = await Promise.all([
        supabase.from("empresas").select("id", { count: "exact", head: true }).eq("activa", true),
        supabase
          .from("registros_mensuales")
          .select("empresa_id")
          .eq("mes", mes)
          .eq("anio", anio),
        supabase.from("actividades").select("estado"),
      ]);

      const conteos = { PENDIENTE: 0, EN_PROCESO: 0, REALIZADO: 0 } as Record<
        ActividadEstado,
        number
      >;
      for (const fila of actividades.data ?? []) {
        conteos[fila.estado as ActividadEstado] += 1;
      }

      return {
        empresasActivas: empresas.count ?? 0,
        conPeriodoActual: new Set((periodosActuales.data ?? []).map((r) => r.empresa_id)).size,
        periodoActual: periodoLabel(mes, anio),
        conteos,
      };
    },
  });

  const misActividades = useQuery({
    queryKey: ["mis-actividades-resumen", sesion?.userId],
    enabled: esEmpleado && !!sesion?.userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("actividades")
        .select(
          "id, tipo, estado, fecha_actualizacion, registros_mensuales!inner(id, mes, anio, empresa_id, empresas!inner(nombre))",
        )
        .eq("responsable_id", sesion!.userId)
        .order("fecha_actualizacion", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as FilaActividad[];
    },
  });

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">Hola, {sesion?.nombre?.split(" ")[0]}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {esStaff
            ? "Avance general del despacho."
            : "Estas son las actividades que tienes asignadas."}
        </p>
      </header>

      {esStaff && (
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Tarjeta titulo="Empresas activas" valor={resumen.data?.empresasActivas ?? "—"} />
          <Tarjeta
            titulo={`Con periodo ${resumen.data?.periodoActual ?? "actual"}`}
            valor={resumen.data?.conPeriodoActual ?? "—"}
          />
          <Tarjeta titulo="Pendientes" valor={resumen.data?.conteos.PENDIENTE ?? "—"} />
          <Tarjeta titulo="En proceso" valor={resumen.data?.conteos.EN_PROCESO ?? "—"} />
          <Tarjeta titulo="Realizadas" valor={resumen.data?.conteos.REALIZADO ?? "—"} />
        </section>
      )}

      {esEmpleado && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Mis actividades</h2>
            <Link to="/mis-actividades" className="text-sm font-medium text-accent hover:underline">
              Ver todas
            </Link>
          </div>
          <div className="panel divide-y divide-border">
            {(misActividades.data ?? []).slice(0, 8).map((a) => (
              <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-medium">{a.registros_mensuales?.empresas?.nombre}</p>
                  <p className="text-sm text-muted-foreground">
                    {TIPO_LABEL[a.tipo]} ·{" "}
                    {a.registros_mensuales
                      ? periodoLabel(a.registros_mensuales.mes, a.registros_mensuales.anio)
                      : ""}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-muted-foreground">
                    {formatoFechaHora(a.fecha_actualizacion)}
                  </span>
                  <EstadoBadge estado={a.estado} />
                </div>
              </div>
            ))}
            {misActividades.isFetched && (misActividades.data ?? []).length === 0 && (
              <p className="p-4 text-sm text-muted-foreground">
                Todavía no tienes actividades asignadas.
              </p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
