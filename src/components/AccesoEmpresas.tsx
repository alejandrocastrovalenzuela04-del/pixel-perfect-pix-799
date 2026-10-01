import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

export function AccesoEmpresas({
  usuario,
  onClose,
}: {
  usuario: { id: string; nombre: string; rol: string } | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const empresas = useQuery({
    queryKey: ["empresas-lista-accesos"],
    enabled: !!usuario,
    queryFn: async () => {
      const { data, error } = await supabase.from("empresas").select("id, nombre, rfc, activa").order("nombre");
      if (error) throw error;
      return data ?? [];
    },
  });
  const accesos = useQuery({
    queryKey: ["accesos", usuario?.id],
    enabled: !!usuario,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("empresa_usuarios")
        .select("empresa_id")
        .eq("user_id", usuario!.id);
      if (error) throw error;
      return new Set((data ?? []).map((d) => d.empresa_id));
    },
  });

  const cambiar = useMutation({
    mutationFn: async ({ empresaId, dar }: { empresaId: string; dar: boolean }) => {
      const { error } = dar
        ? await supabase.from("empresa_usuarios").insert({ empresa_id: empresaId, user_id: usuario!.id })
        : await supabase.from("empresa_usuarios").delete().eq("empresa_id", empresaId).eq("user_id", usuario!.id);
      if (error) throw new Error(error.message);
      return dar;
    },
    onSuccess: (dar) => {
      toast.success(dar ? "Acceso otorgado" : "Acceso retirado");
      queryClient.invalidateQueries({ queryKey: ["accesos", usuario?.id] });
    },
    onError: () => toast.error("No se pudo actualizar el acceso."),
  });

  const esStaff = usuario?.rol === "CEO" || usuario?.rol === "SUPERVISOR";

  return (
    <Dialog open={!!usuario} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Acceso a empresas — {usuario?.nombre}</DialogTitle>
          <DialogDescription>
            {esStaff
              ? "CEO y Supervisor ven todas las empresas sin importar estas casillas."
              : "Marca las empresas que este usuario puede consultar y trabajar."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {(empresas.data ?? []).map((e) => {
            const marcado = accesos.data?.has(e.id) ?? false;
            return (
              <label key={e.id} className="flex items-center gap-3 rounded-md border border-border p-3 text-sm">
                <Checkbox
                  checked={marcado}
                  disabled={cambiar.isPending || !accesos.isFetched}
                  onCheckedChange={(v) => cambiar.mutate({ empresaId: e.id, dar: v === true })}
                  aria-label={`Acceso a ${e.nombre}`}
                />
                <span className="flex-1">
                  <span className="font-medium">{e.nombre}</span>
                  <span className="ml-2 font-mono text-xs text-muted-foreground">{e.rfc}</span>
                </span>
                {!e.activa && <span className="text-xs text-muted-foreground">Inactiva</span>}
              </label>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
