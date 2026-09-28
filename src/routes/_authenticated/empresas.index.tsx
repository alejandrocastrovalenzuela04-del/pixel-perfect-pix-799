import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
import { REGIMENES_FISCALES, periodoLabel } from "@/lib/dominio";

export const Route = createFileRoute("/_authenticated/empresas/")({
  head: () => ({
    meta: [
      { title: "Empresas — SDO Contadores" },
      { name: "description", content: "Listado de empresas atendidas por el despacho." },
      { property: "og:title", content: "Empresas — SDO Contadores" },
      { property: "og:description", content: "Listado de empresas atendidas por el despacho." },
    ],
  }),
  component: Empresas,
});

type Empresa = {
  id: string;
  nombre: string;
  rfc: string;
  regimen_fiscal: string;
  activa: boolean;
  registros_mensuales: { mes: number; anio: number }[];
};

type FormEmpresa = { id?: string; nombre: string; rfc: string; regimen_fiscal: string };

const formVacio: FormEmpresa = { nombre: "", rfc: "", regimen_fiscal: "" };

function Empresas() {
  const { esCeo: esStaff } = useAuth();
  const queryClient = useQueryClient();
  const [busqueda, setBusqueda] = useState("");
  const [form, setForm] = useState<FormEmpresa | null>(null);

  const empresas = useQuery({
    queryKey: ["empresas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("empresas")
        .select("id, nombre, rfc, regimen_fiscal, activa, registros_mensuales(mes, anio)")
        .order("nombre");
      if (error) throw error;
      return (data ?? []) as unknown as Empresa[];
    },
  });

  const guardar = useMutation({
    mutationFn: async (valores: FormEmpresa) => {
      const payload = {
        nombre: valores.nombre.trim(),
        rfc: valores.rfc.trim().toUpperCase(),
        regimen_fiscal: valores.regimen_fiscal,
      };
      if (!payload.nombre || !payload.rfc || !payload.regimen_fiscal) {
        throw new Error("Nombre, RFC y régimen fiscal son obligatorios.");
      }
      if (payload.rfc.length < 12) throw new Error("El RFC debe tener al menos 12 caracteres.");

      const { error } = valores.id
        ? await supabase.from("empresas").update(payload).eq("id", valores.id)
        : await supabase.from("empresas").insert(payload);
      if (error) throw error;
      return !!valores.id;
    },
    onSuccess: (eraEdicion) => {
      toast.success(eraEdicion ? "Empresa actualizada correctamente" : "Empresa creada correctamente");
      setForm(null);
      queryClient.invalidateQueries({ queryKey: ["empresas"] });
    },
    onError: (e: Error) => toast.error(e.message || "No se pudo guardar la empresa."),
  });

  const cambiarEstatus = useMutation({
    mutationFn: async ({ id, activa }: { id: string; activa: boolean }) => {
      const { error } = await supabase.from("empresas").update({ activa }).eq("id", id);
      if (error) throw error;
      return activa;
    },
    onSuccess: (activa) => {
      toast.success(activa ? "Empresa reactivada" : "Empresa desactivada");
      queryClient.invalidateQueries({ queryKey: ["empresas"] });
    },
    onError: () => toast.error("No se pudo cambiar el estado de la empresa."),
  });

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const lista = empresas.data ?? [];
    if (!q) return lista;
    return lista.filter(
      (e) => e.nombre.toLowerCase().includes(q) || e.rfc.toLowerCase().includes(q),
    );
  }, [busqueda, empresas.data]);

  function ultimoPeriodo(e: Empresa) {
    const periodos = [...(e.registros_mensuales ?? [])].sort(
      (a, b) => b.anio - a.anio || b.mes - a.mes,
    );
    return periodos[0] ? periodoLabel(periodos[0].mes, periodos[0].anio) : "Sin periodos";
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Empresas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Empresas atendidas por el despacho y su último periodo registrado.
          </p>
        </div>
        {esStaff && (
          <Button onClick={() => setForm(formVacio)} className="gap-2">
            <Plus className="size-4" /> Nueva empresa
          </Button>
        )}
      </header>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Buscar por nombre o RFC"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      <div className="panel overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">RFC</th>
              <th className="px-4 py-3">Régimen fiscal</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Último periodo</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtradas.map((e) => (
              <tr key={e.id}>
                <td className="px-4 py-3 font-medium">
                  <Link
                    to="/empresas/$empresaId"
                    params={{ empresaId: e.id }}
                    className="hover:underline"
                  >
                    {e.nombre}
                  </Link>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{e.rfc}</td>
                <td className="px-4 py-3 text-muted-foreground">{e.regimen_fiscal}</td>
                <td className="px-4 py-3">
                  <Badge variant={e.activa ? "secondary" : "outline"}>
                    {e.activa ? "Activa" : "Inactiva"}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{ultimoPeriodo(e)}</td>
                <td className="px-4 py-3">
                  {esStaff && (
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setForm({
                            id: e.id,
                            nombre: e.nombre,
                            rfc: e.rfc,
                            regimen_fiscal: e.regimen_fiscal,
                          })
                        }
                      >
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => cambiarEstatus.mutate({ id: e.id, activa: !e.activa })}
                      >
                        {e.activa ? "Desactivar" : "Reactivar"}
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {empresas.isFetched && filtradas.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                  No hay empresas que coincidan con la búsqueda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={!!form} onOpenChange={(abierto) => !abierto && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form?.id ? "Editar empresa" : "Nueva empresa"}</DialogTitle>
          </DialogHeader>
          {form && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre *</Label>
                <Input
                  id="nombre"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rfc">RFC *</Label>
                <Input
                  id="rfc"
                  value={form.rfc}
                  onChange={(e) => setForm({ ...form, rfc: e.target.value.toUpperCase() })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="regimen">Régimen fiscal *</Label>
                <Select
                  value={form.regimen_fiscal}
                  onValueChange={(v) => setForm({ ...form, regimen_fiscal: v })}
                >
                  <SelectTrigger id="regimen">
                    <SelectValue placeholder="Selecciona un régimen" />
                  </SelectTrigger>
                  <SelectContent>
                    {REGIMENES_FISCALES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => form && guardar.mutate(form)}
              disabled={guardar.isPending}
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
