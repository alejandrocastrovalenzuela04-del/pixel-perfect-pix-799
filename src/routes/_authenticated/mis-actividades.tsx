import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";

import { EstadoBadge } from "@/components/EstadoBadge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  ESTADOS,
  ESTADO_LABEL,
  TIPO_LABEL,
  formatoFechaHora,
  periodoLabel,
  type ActividadEstado,
  type ActividadTipo,
} from "@/lib/dominio";

export const Route = createFileRoute("/_authenticated/mis-actividades")({
  head: () => ({
    meta: [
      { title: "Mis actividades — SDO Contadores" },
      { name: "description", content: "Actividades contables asignadas al usuario." },
      { property: "og:title", content: "Mis actividades — SDO Contadores" },
      { property: "og:description", content: "Actividades contables asignadas al usuario." },
    ],
  }),
  component: MisActividades,
});

type Fila = {
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

function MisActividades() {
  const { sesion } = useAuth();
  const queryClient = useQueryClient();

  const actividades = useQuery({
    queryKey: ["mis-actividades", sesion?.userId],
    enabled: !!sesion?.userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("actividades")
        .select(
          "id, tipo, estado, fecha_actualizacion, registros_mensuales!inner(id, mes, anio, empresa_id, empresas!inner(nombre))",
        )
        .eq("responsable_id", sesion!.userId);
      if (error) throw error;
      return (data ?? []) as unknown as Fila[];
    },
  });

  const cambiarEstado = useMutation({
    mutationFn: async ({ id, estado }: { id: string; estado: ActividadEstado }) => {
      const { error } = await supabase.from("actividades").update({ estado }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Actividad actualizada");
      queryClient.invalidateQueries();
    },
    onError: () => toast.error("No se pudo actualizar la actividad."),
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Mis actividades</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Solo puedes cambiar el estado de las actividades asignadas a tu nombre.
        </p>
      </header>

      <div className="panel divide-y divide-border">
        {(actividades.data ?? []).map((a) => (
          <div key={a.id} className="flex flex-wrap items-center justify-between gap-4 p-4">
            <div className="min-w-48">
              <Link
                to="/empresas/$empresaId/periodos/$periodoId"
                params={{
                  empresaId: a.registros_mensuales!.empresa_id,
                  periodoId: a.registros_mensuales!.id,
                }}
                className="font-medium hover:underline"
              >
                {a.registros_mensuales?.empresas?.nombre}
              </Link>
              <p className="text-sm text-muted-foreground">
                {TIPO_LABEL[a.tipo]} ·{" "}
                {a.registros_mensuales
                  ? periodoLabel(a.registros_mensuales.mes, a.registros_mensuales.anio)
                  : ""}
              </p>
              <p className="text-xs text-muted-foreground">
                Actualizado: {formatoFechaHora(a.fecha_actualizacion)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <EstadoBadge estado={a.estado} />
              <Select
                value={a.estado}
                onValueChange={(v) =>
                  cambiarEstado.mutate({ id: a.id, estado: v as ActividadEstado })
                }
              >
                <SelectTrigger className="w-40" aria-label="Cambiar estado">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ESTADOS.map((e) => (
                    <SelectItem key={e} value={e}>
                      {ESTADO_LABEL[e]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ))}
        {actividades.isFetched && (actividades.data ?? []).length === 0 && (
          <p className="p-4 text-sm text-muted-foreground">
            Todavía no tienes actividades asignadas.
          </p>
        )}
      </div>
    </div>
  );
}
