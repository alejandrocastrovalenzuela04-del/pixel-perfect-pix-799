import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Rol } from "@/lib/dominio";

export type SesionActual = {
  userId: string;
  email: string;
  nombre: string;
  activo: boolean;
  rol: Rol | null;
};

export const sesionQueryKey = ["sesion-actual"];

async function cargarSesion(): Promise<SesionActual | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  const [{ data: perfil }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("id, nombre, email, activo").eq("id", data.user.id).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", data.user.id),
  ]);

  return {
    userId: data.user.id,
    email: perfil?.email ?? data.user.email ?? "",
    nombre: perfil?.nombre ?? data.user.email ?? "Usuario",
    activo: perfil?.activo ?? false,
    rol: (roles?.[0]?.role as Rol | undefined) ?? null,
  };
}

export function useAuth() {
  const query = useQuery({
    queryKey: sesionQueryKey,
    queryFn: cargarSesion,
    staleTime: 60_000,
  });

  const sesion = query.data ?? null;
  const rol = sesion?.rol ?? null;

  return {
    sesion,
    rol,
    cargando: query.isLoading,
    esCeo: rol === "CEO",
    esStaff: rol === "CEO" || rol === "SUPERVISOR",
    esEmpleado: rol === "EMPLEADO",
  };
}
