import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { FileDown } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { EstadoBadge } from "@/components/EstadoBadge";
import { DESPACHO } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  ESTADOS,
  ESTADO_LABEL,
  IVA_LABEL,
  OPINION_LABEL,
  TIPOS_ACTIVIDAD,
  TIPO_LABEL,
  formatoFechaHora,
  formatoMoneda,
  periodoLabel,
  type ActividadEstado,
  type ActividadTipo,
  type IvaTipo,
  type Opinion,
} from "@/lib/dominio";
import { generarReportePdf } from "@/lib/pdf";

export const Route = createFileRoute("/_authenticated/empresas/$empresaId/periodos/$periodoId")({
  head: () => ({
    meta: [
      { title: "Detalle del periodo — SDO Contadores" },
      {
        name: "description",
        content: "Actividades, impuestos y opinión de cumplimiento del periodo mensual.",
      },
      { property: "og:title", content: "Detalle del periodo — SDO Contadores" },
      {
        property: "og:description",
        content: "Actividades, impuestos y opinión de cumplimiento del periodo mensual.",
      },
    ],
  }),
  component: DetallePeriodo,
});

type Actividad = {
  id: string;
  tipo: ActividadTipo;
  estado: ActividadEstado;
  responsable_id: string | null;
  ultima_actualizacion_por: string | null;
  fecha_actualizacion: string | null;
};

type Registro = {
  id: string;
  mes: number;
  anio: number;
  isr_pagado: number | null;
  iva_tipo: IvaTipo;
  iva_monto: number | null;
  opinion_cumplimiento: Opinion | null;
  empresas: { id: string; nombre: string; rfc: string; regimen_fiscal: string } | null;
  actividades: Actividad[];
};

function DetallePeriodo() {
  const { empresaId, periodoId } = Route.useParams();
  const { sesion, esStaff } = useAuth();
  const queryClient = useQueryClient();

  const registro = useQuery({
    queryKey: ["registro", periodoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("registros_mensuales")
        .select(
          "id, mes, anio, isr_pagado, iva_tipo, iva_monto, opinion_cumplimiento, empresas!inner(id, nombre, rfc, regimen_fiscal), actividades(id, tipo, estado, responsable_id, ultima_actualizacion_por, fecha_actualizacion)",
        )
        .eq("id", periodoId)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as Registro | null;
    },
  });

  const personas = useQuery({
    queryKey: ["personas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, nombre, activo, user_roles(role)")
        .order("nombre");
      if (error) throw error;
      return (data ?? []) as unknown as {
        id: string;
        nombre: string;
        activo: boolean;
        user_roles: { role: string }[];
      }[];
    },
  });

  const nombrePersona = (id: string | null) =>
    id ? (personas.data ?? []).find((p) => p.id === id)?.nombre ?? "Usuario" : null;

  const empleados = (personas.data ?? []).filter(
    (p) => p.activo && p.user_roles.some((r) => r.role === "EMPLEADO"),
  );

  const actualizarActividad = useMutation({
    mutationFn: async ({
      id,
      cambios,
    }: {
      id: string;
      cambios: { estado?: ActividadEstado; responsable_id?: string | null };
    }) => {
      const { error } = await supabase.from("actividades").update(cambios).eq("id", id);
      if (error) throw new Error(error.message);
      return cambios;
    },
    onSuccess: (cambios) => {
      toast.success(cambios.estado ? "Actividad actualizada" : "Responsable asignado");
      queryClient.invalidateQueries();
    },
    onError: () => toast.error("No se pudo actualizar la actividad."),
  });

  const r = registro.data;
  const actividades = TIPOS_ACTIVIDAD.map((tipo) =>
    r?.actividades.find((a) => a.tipo === tipo),
  ).filter((a): a is Actividad => !!a);

  return (
    <div className="space-y-8">
      <Link
        to="/empresas/$empresaId"
        params={{ empresaId }}
        className="text-sm text-muted-foreground hover:underline"
      >
        ← {r?.empresas?.nombre ?? "Empresa"}
      </Link>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">
            {r ? periodoLabel(r.mes, r.anio) : "Periodo"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {r?.empresas?.nombre} · RFC <span className="font-mono">{r?.empresas?.rfc}</span> ·{" "}
            {r?.empresas?.regimen_fiscal}
          </p>
        </div>
        {esStaff && r && (
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => {
              generarReportePdf({
                despacho: DESPACHO,
                empresa: {
                  nombre: r.empresas!.nombre,
                  rfc: r.empresas!.rfc,
                  regimen_fiscal: r.empresas!.regimen_fiscal,
                },
                periodo: { mes: r.mes, anio: r.anio },
                impuestos: {
                  isr_pagado: r.isr_pagado,
                  iva_tipo: r.iva_tipo,
                  iva_monto: r.iva_monto,
                  opinion_cumplimiento: r.opinion_cumplimiento,
                },
                actividades: actividades.map((a) => ({
                  tipo: a.tipo,
                  estado: a.estado,
                  responsable: nombrePersona(a.responsable_id),
                  actualizadoPor: nombrePersona(a.ultima_actualizacion_por),
                  fecha: a.fecha_actualizacion,
                })),
              });
              toast.success("Reporte generado correctamente");
            }}
          >
            <FileDown className="size-4" /> Generar reporte PDF
          </Button>
        )}
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Actividades</h2>
        <div className="panel divide-y divide-border">
          {actividades.map((a) => {
            const puedeEditarEstado =
              esStaff || (a.responsable_id && a.responsable_id === sesion?.userId);
            return (
              <div key={a.id} className="grid items-start gap-3 p-4 md:grid-cols-4">
                <div>
                  <p className="font-medium">{TIPO_LABEL[a.tipo]}</p>
                  <div className="mt-1 md:hidden">
                    <EstadoBadge estado={a.estado} />
                  </div>
                </div>

                <div className="min-w-0 space-y-1">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Estado</p>
                  {puedeEditarEstado ? (
                    <Select
                      value={a.estado}
                      onValueChange={(v) =>
                        actualizarActividad.mutate({
                          id: a.id,
                          cambios: { estado: v as ActividadEstado },
                        })
                      }
                    >
                      <SelectTrigger aria-label={`Estado de ${TIPO_LABEL[a.tipo]}`}>
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
                  ) : (
                    <EstadoBadge estado={a.estado} />
                  )}
                </div>

                <div className="min-w-0 space-y-1">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Responsable
                  </p>
                  {esStaff ? (
                    <Select
                      value={a.responsable_id ?? "sin-asignar"}
                      onValueChange={(v) =>
                        actualizarActividad.mutate({
                          id: a.id,
                          cambios: { responsable_id: v === "sin-asignar" ? null : v },
                        })
                      }
                    >
                      <SelectTrigger aria-label={`Responsable de ${TIPO_LABEL[a.tipo]}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sin-asignar">No asignado</SelectItem>
                        {empleados.map((e) => (
                          <SelectItem key={e.id} value={e.id}>
                            {e.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-sm">{nombrePersona(a.responsable_id) ?? "No asignado"}</p>
                  )}
                </div>

                <div className="min-w-0 space-y-1">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Última actualización
                  </p>
                  <p className="text-sm">
                    {nombrePersona(a.ultima_actualizacion_por) ?? "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatoFechaHora(a.fecha_actualizacion)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {r && <SeccionImpuestos registro={r} editable={esStaff} />}
    </div>
  );
}

function SeccionImpuestos({ registro, editable }: { registro: Registro; editable: boolean }) {
  const queryClient = useQueryClient();
  const [isrPagado, setIsrPagado] = useState(registro.isr_pagado !== null);
  const [isrMonto, setIsrMonto] = useState(registro.isr_pagado?.toString() ?? "");
  const [ivaTipo, setIvaTipo] = useState<IvaTipo>(registro.iva_tipo);
  const [ivaMonto, setIvaMonto] = useState(registro.iva_monto?.toString() ?? "");
  const [opinion, setOpinion] = useState<Opinion | "SIN_OPINION">(
    registro.opinion_cumplimiento ?? "SIN_OPINION",
  );

  useEffect(() => {
    setIsrPagado(registro.isr_pagado !== null);
    setIsrMonto(registro.isr_pagado?.toString() ?? "");
    setIvaTipo(registro.iva_tipo);
    setIvaMonto(registro.iva_monto?.toString() ?? "");
    setOpinion(registro.opinion_cumplimiento ?? "SIN_OPINION");
  }, [registro]);

  const guardar = useMutation({
    mutationFn: async () => {
      const isr = isrPagado ? Number(isrMonto || "0") : null;
      const iva = ivaTipo === "NO_DETERMINADO" ? null : Number(ivaMonto || "0");
      if ((isr !== null && isr < 0) || (iva !== null && iva < 0)) {
        throw new Error("Los montos no pueden ser negativos.");
      }
      const { error } = await supabase
        .from("registros_mensuales")
        .update({
          isr_pagado: isr,
          iva_tipo: ivaTipo,
          iva_monto: iva,
          opinion_cumplimiento: opinion === "SIN_OPINION" ? null : opinion,
        })
        .eq("id", registro.id);
      if (error) throw new Error("No se pudieron guardar los impuestos.");
    },
    onSuccess: () => {
      toast.success("Registro mensual guardado");
      queryClient.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!editable) {
    return (
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Impuestos</h2>
        <div className="panel grid gap-4 p-4 sm:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">ISR pagado</p>
            <p className="mt-1 font-medium">{formatoMoneda(registro.isr_pagado)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">IVA</p>
            <p className="mt-1 font-medium">
              {registro.iva_tipo === "NO_DETERMINADO"
                ? "Sin determinar"
                : `${IVA_LABEL[registro.iva_tipo]} · ${formatoMoneda(registro.iva_monto ?? 0)}`}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Opinión de cumplimiento
            </p>
            <p className="mt-1 font-medium">
              {registro.opinion_cumplimiento
                ? OPINION_LABEL[registro.opinion_cumplimiento]
                : "Pendiente"}
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Impuestos</h2>
      <div className="panel space-y-6 p-5">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Switch id="isr" checked={isrPagado} onCheckedChange={setIsrPagado} />
            <Label htmlFor="isr">ISR pagado</Label>
            {!isrPagado && <span className="text-sm text-muted-foreground">No pagado</span>}
          </div>
          {isrPagado && (
            <div className="max-w-xs space-y-2">
              <Label htmlFor="isr-monto">Monto de ISR</Label>
              <Input
                id="isr-monto"
                type="number"
                min="0"
                step="0.01"
                value={isrMonto}
                onChange={(e) => setIsrMonto(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="space-y-3 border-t border-border pt-5">
          <Label>IVA</Label>
          <RadioGroup
            value={ivaTipo}
            onValueChange={(v) => setIvaTipo(v as IvaTipo)}
            className="gap-2"
          >
            {(["NO_DETERMINADO", "PAGADO", "A_FAVOR"] as IvaTipo[]).map((t) => (
              <div key={t} className="flex items-center gap-2">
                <RadioGroupItem value={t} id={`iva-${t}`} />
                <Label htmlFor={`iva-${t}`} className="font-normal">
                  {IVA_LABEL[t]}
                </Label>
              </div>
            ))}
          </RadioGroup>
          {ivaTipo !== "NO_DETERMINADO" && (
            <div className="max-w-xs space-y-2">
              <Label htmlFor="iva-monto">Monto de {IVA_LABEL[ivaTipo]}</Label>
              <Input
                id="iva-monto"
                type="number"
                min="0"
                step="0.01"
                value={ivaMonto}
                onChange={(e) => setIvaMonto(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="max-w-xs space-y-2 border-t border-border pt-5">
          <Label htmlFor="opinion">Opinión de cumplimiento</Label>
          <Select value={opinion} onValueChange={(v) => setOpinion(v as Opinion | "SIN_OPINION")}>
            <SelectTrigger id="opinion">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SIN_OPINION">Pendiente</SelectItem>
              <SelectItem value="POSITIVA">Positiva</SelectItem>
              <SelectItem value="NEGATIVA">Negativa</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={() => guardar.mutate()} disabled={guardar.isPending}>
          Guardar impuestos
        </Button>
      </div>
    </section>
  );
}
