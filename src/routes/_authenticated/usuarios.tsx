import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AccesoEmpresas } from "@/components/AccesoEmpresas";
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
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ROLES, ROL_LABEL, formatoFechaHora, type Rol } from "@/lib/dominio";
import { actualizarUsuario, crearUsuario } from "@/lib/usuarios.functions";

export const Route = createFileRoute("/_authenticated/usuarios")({
  head: () => ({
    meta: [
      { title: "Usuarios — SDO Contadores" },
      { name: "description", content: "Administración de usuarios y roles del despacho." },
      { property: "og:title", content: "Usuarios — SDO Contadores" },
      { property: "og:description", content: "Administración de usuarios y roles del despacho." },
    ],
  }),
  component: Usuarios,
});

type Usuario = {
  id: string;
  nombre: string;
  email: string;
  activo: boolean;
  created_at: string;
  user_roles: { role: Rol }[];
};

type FormNuevo = { nombre: string; email: string; password: string; rol: Rol };
type FormEdicion = { id: string; nombre: string; activo: boolean; rol: Rol };

function Usuarios() {
  const { esCeo } = useAuth();
  const queryClient = useQueryClient();
  const crear = useServerFn(crearUsuario);
  const actualizar = useServerFn(actualizarUsuario);
  const [nuevo, setNuevo] = useState<FormNuevo | null>(null);
  const [edicion, setEdicion] = useState<FormEdicion | null>(null);
  const [acceso, setAcceso] = useState<{ id: string; nombre: string; rol: string } | null>(null);

  const usuarios = useQuery({
    queryKey: ["usuarios"],
    enabled: esCeo,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, nombre, email, activo, created_at, user_roles(role)")
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as unknown as Usuario[];
    },
  });

  const mutacionCrear = useMutation({
    mutationFn: (valores: FormNuevo) => crear({ data: valores }),
    onSuccess: () => {
      toast.success("Usuario creado correctamente");
      setNuevo(null);
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
    },
    onError: (e: Error) => toast.error(e.message || "No se pudo crear el usuario."),
  });

  const mutacionActualizar = useMutation({
    mutationFn: (valores: FormEdicion) => actualizar({ data: valores }),
    onSuccess: () => {
      toast.success("Usuario actualizado correctamente");
      setEdicion(null);
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
    },
    onError: (e: Error) => toast.error(e.message || "No se pudo actualizar el usuario."),
  });

  if (!esCeo) {
    return (
      <div className="panel p-6">
        <h1 className="text-lg font-semibold">Sección no disponible</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Solo el CEO puede administrar usuarios.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Usuarios</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Personal del despacho, roles y estado de acceso.
          </p>
        </div>
        <Button
          className="gap-2"
          onClick={() => setNuevo({ nombre: "", email: "", password: "", rol: "EMPLEADO" })}
        >
          <Plus className="size-4" /> Nuevo usuario
        </Button>
      </header>

      <div className="panel overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Correo</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Creado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(usuarios.data ?? []).map((u) => {
              const rol = u.user_roles[0]?.role ?? "EMPLEADO";
              return (
                <tr key={u.id}>
                  <td className="px-4 py-3 font-medium">{u.nombre}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-3">{ROL_LABEL[rol]}</td>
                  <td className="px-4 py-3">
                    <Badge variant={u.activo ? "secondary" : "outline"}>
                      {u.activo ? "Activo" : "Inactivo"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatoFechaHora(u.created_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setAcceso({ id: u.id, nombre: u.nombre, rol })}
                      >
                        Empresas
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setEdicion({ id: u.id, nombre: u.nombre, activo: u.activo, rol })
                        }
                      >
                        Editar
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={!!nuevo} onOpenChange={(abierto) => !abierto && setNuevo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo usuario</DialogTitle>
          </DialogHeader>
          {nuevo && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="n-nombre">Nombre *</Label>
                <Input
                  id="n-nombre"
                  value={nuevo.nombre}
                  onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="n-email">Correo *</Label>
                <Input
                  id="n-email"
                  type="email"
                  value={nuevo.email}
                  onChange={(e) => setNuevo({ ...nuevo, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="n-pass">Contraseña temporal *</Label>
                <Input
                  id="n-pass"
                  type="text"
                  value={nuevo.password}
                  onChange={(e) => setNuevo({ ...nuevo, password: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">Mínimo 8 caracteres.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="n-rol">Rol *</Label>
                <Select
                  value={nuevo.rol}
                  onValueChange={(v) => setNuevo({ ...nuevo, rol: v as Rol })}
                >
                  <SelectTrigger id="n-rol">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {ROL_LABEL[r]}
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
              disabled={mutacionCrear.isPending}
              onClick={() => nuevo && mutacionCrear.mutate(nuevo)}
            >
              Crear usuario
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!edicion} onOpenChange={(abierto) => !abierto && setEdicion(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar usuario</DialogTitle>
          </DialogHeader>
          {edicion && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="e-nombre">Nombre *</Label>
                <Input
                  id="e-nombre"
                  value={edicion.nombre}
                  onChange={(e) => setEdicion({ ...edicion, nombre: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="e-rol">Rol *</Label>
                <Select
                  value={edicion.rol}
                  onValueChange={(v) => setEdicion({ ...edicion, rol: v as Rol })}
                >
                  <SelectTrigger id="e-rol">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {ROL_LABEL[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  id="e-activo"
                  checked={edicion.activo}
                  onCheckedChange={(v) => setEdicion({ ...edicion, activo: v })}
                />
                <Label htmlFor="e-activo">Usuario activo</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEdicion(null)}>
              Cancelar
            </Button>
            <Button
              disabled={mutacionActualizar.isPending}
              onClick={() => edicion && mutacionActualizar.mutate(edicion)}
            >
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AccesoEmpresas usuario={acceso} onClose={() => setAcceso(null)} />
    </div>
  );
}
