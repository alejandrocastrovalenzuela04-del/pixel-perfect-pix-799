import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Building2, LayoutDashboard, ListChecks, LogOut, Menu, Users } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ROL_LABEL } from "@/lib/dominio";
import { cn } from "@/lib/utils";

const DESPACHO = "SDO Contadores";

export { DESPACHO };

export function AppLayout({ children }: { children: ReactNode }) {
  const { sesion, rol, esCeo, esEmpleado } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [abierto, setAbierto] = useState(false);
  const ruta = useRouterState({ select: (s) => s.location.pathname });

  const enlaces = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, visible: true },
    { to: "/empresas", label: "Empresas", icon: Building2, visible: true },
    { to: "/mis-actividades", label: "Mis actividades", icon: ListChecks, visible: esEmpleado },
    { to: "/usuarios", label: "Usuarios", icon: Users, visible: esCeo },
  ].filter((e) => e.visible);

  async function cerrarSesion() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const nav = (
    <nav className="flex flex-1 flex-col gap-1">
      {enlaces.map((enlace) => {
        const activo = ruta === enlace.to || ruta.startsWith(`${enlace.to}/`);
        return (
          <Link
            key={enlace.to}
            to={enlace.to}
            onClick={() => setAbierto(false)}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              activo && "bg-sidebar-accent text-sidebar-accent-foreground",
            )}
          >
            <enlace.icon className="size-4" aria-hidden />
            {enlace.label}
          </Link>
        );
      })}
    </nav>
  );

  const barra = (
    <div className="flex h-full flex-col gap-6 bg-sidebar p-5">
      <div>
        <p className="font-serif text-lg leading-tight text-sidebar-accent-foreground">{DESPACHO}</p>
        <p className="text-xs text-sidebar-foreground/60">Control contable mensual</p>
      </div>
      {nav}
      <div className="border-t border-sidebar-border pt-4">
        <p className="truncate text-sm font-medium text-sidebar-accent-foreground">
          {sesion?.nombre}
        </p>
        <p className="text-xs text-sidebar-foreground/60">{rol ? ROL_LABEL[rol] : "Sin rol"}</p>
        <Button
          variant="ghost"
          onClick={cerrarSesion}
          className="mt-3 w-full justify-start gap-2 px-2 text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <LogOut className="size-4" aria-hidden />
          Cerrar sesión
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="hidden lg:block">{barra}</aside>

      <div className="flex items-center justify-between gap-3 border-b border-border bg-sidebar px-4 py-3 lg:hidden">
        <p className="font-serif text-base text-sidebar-accent-foreground">{DESPACHO}</p>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Abrir menú"
          onClick={() => setAbierto((v) => !v)}
          className="text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <Menu className="size-5" />
        </Button>
      </div>
      {abierto && <div className="lg:hidden">{barra}</div>}

      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:py-10">{children}</main>
    </div>
  );
}
