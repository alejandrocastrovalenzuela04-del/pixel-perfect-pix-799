import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ActividadesEmpresa } from "@/components/actividades/ActividadesEmpresa";
import { EstadoBadge } from "@/components/EstadoBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
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
  MESES,
  TIPO_LABEL,
  nombreMes,
  type ActividadEstado,
  type ActividadTipo,
} from "@/lib/dominio";

export const Route = createFileRoute("/_authenticated/empresas/$empresaId/")({
  head: () => ({
    meta: [
      { title: "Periodos de la empresa — SDO Contadores" },
      { name: "description", content: "Periodos mensuales registrados para la empresa." },
      { property: "og:title", content: "Periodos de la empresa — SDO Contadores" },
      { property: "og:description", content: "Periodos mensuales registrados para la empresa." },
    ],
  }),
  component: DetalleEmpresa,
});

type Registro = {
  id: string;
  mes: number;
  anio: number;
  actividades: { tipo: ActividadTipo; estado: ActividadEstado }[];
};

function DetalleEmpresa() {
  const { empresaId } = Route.useParams();
  const { esStaff } = useAuth();
  const queryClient = useQueryClient();
  const ahora = new Date();
  const [nuevo, setNuevo] = useState<{ mes: number; anio: number } | null>(null);

  const empresa = useQuery({
    queryKey: ["empresa", empresaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("empresas")
        .select("id, nombre, rfc, regimen_fiscal, activa")
        .eq("id", empresaId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const periodos = useQuery({
    queryKey: ["periodos", empresaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("registros_mensuales")
        .select("id, mes, anio, actividades(tipo, estado)")
        .eq("empresa_id", empresaId)
        .order("anio", { ascending: false })
        .order("mes", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Registro[];
    },
  });

  const crearPeriodo = useMutation({
    mutationFn: async ({ mes, anio }: { mes: number; anio: number }) => {
      const { error } = await supabase
        .from("registros_mensuales")
        .insert({ empresa_id: empresaId, mes, anio });
      if (error) {
        if (error.code === "23505" || error.message.includes("duplicate")) {
          throw new Error("Esta empresa ya tiene un registro para ese mes y año.");
        }
        throw new Error("No se pudo crear el registro mensual.");
      }
    },
    onSuccess: () => {
      toast.success("Registro mensual guardado");
      setNuevo(null);
      queryClient.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const porAnio = new Map<number, Registro[]>();
  for (const r of periodos.data ?? []) {
    porAnio.set(r.anio, [...(porAnio.get(r.anio) ?? []), r]);
  }

  return (
    <div className="space-y-6">
      <Link to="/empresas" className="text-sm text-muted-foreground hover:underline">
        ← Empresas
      </Link>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{empresa.data?.nombre ?? "Empresa"}</h1>
          <p className="mt-1 text-sm">Régimen fiscal: {empresa.data?.regimen_fiscal}</p>
          <p className="text-sm text-muted-foreground">
            RFC: <span className="font-mono">{empresa.data?.rfc}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={empresa.data?.activa ? "secondary" : "outline"}>
            {empresa.data?.activa ? "Activa" : "Inactiva"}
          </Badge>
        </div>
      </header>

      {empresa.isFetched && !empresa.data && (
        <p className="panel p-4 text-sm text-muted-foreground">
          No tienes acceso a esta empresa o no existe.
        </p>
      )}

      {empresa.data && (
        <ActividadesEmpresa empresaId={empresaId} empresaNombre={empresa.data.nombre} />
      )}

      <section className="space-y-6 border-t border-border pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Periodos mensuales</h2>
          {esStaff && empresa.data && (
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setNuevo({ mes: ahora.getMonth() + 1, anio: ahora.getFullYear() })}
            >
              <Plus className="size-4" /> Nuevo periodo
            </Button>
          )}
        </div>
        {[...porAnio.entries()].map(([anio, registros]) => (
          <div key={anio} className="space-y-3">
            <p className="text-sm font-semibold text-muted-foreground">{anio}</p>
            <div className="grid gap-3 md:grid-cols-2">
              {registros.map((r) => (
                <Link
                  key={r.id}
                  to="/empresas/$empresaId/periodos/$periodoId"
                  params={{ empresaId, periodoId: r.id }}
                  className="panel block p-4 transition-colors hover:border-accent"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{nombreMes(r.mes)}</p>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </div>
                  <div className="mt-3 space-y-1.5">
                    {r.actividades
                      .slice()
                      .sort((a, b) => TIPO_LABEL[a.tipo].localeCompare(TIPO_LABEL[b.tipo]))
                      .map((a) => (
                        <div
                          key={a.tipo}
                          className="flex items-center justify-between gap-2 text-sm"
                        >
                          <span className="text-muted-foreground">{TIPO_LABEL[a.tipo]}</span>
                          <EstadoBadge estado={a.estado} />
                        </div>
                      ))}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
        {periodos.isFetched && (periodos.data ?? []).length === 0 && (
          <p className="panel p-4 text-sm text-muted-foreground">
            Esta empresa todavía no tiene periodos registrados.
          </p>
        )}
      </section>

      <Dialog open={!!nuevo} onOpenChange={(abierto) => !abierto && setNuevo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo periodo mensual</DialogTitle>
          </DialogHeader>
          {nuevo && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Mes *</Label>
                <Select
                  value={String(nuevo.mes)}
                  onValueChange={(v) => setNuevo({ ...nuevo, mes: Number(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MESES.map((m, i) => (
                      <SelectItem key={m} value={String(i + 1)}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Año *</Label>
                <Select
                  value={String(nuevo.anio)}
                  onValueChange={(v) => setNuevo({ ...nuevo, anio: Number(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 7 }, (_, i) => ahora.getFullYear() - 3 + i).map((a) => (
                      <SelectItem key={a} value={String(a)}>
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setNuevo(null)}>
              Cancelar
            </Button>
            <Button
              disabled={crearPeriodo.isPending}
              onClick={() => nuevo && crearPeriodo.mutate(nuevo)}
            >
              Crear periodo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
