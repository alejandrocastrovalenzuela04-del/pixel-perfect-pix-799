import { createFileRoute, Outlet, redirect, useNavigate } from "@tanstack/react-router";

import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: Protegido,
});

function Protegido() {
  const { sesion, cargando } = useAuth();
  const navigate = useNavigate();

  if (cargando) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Cargando…
      </div>
    );
  }

  if (sesion && (!sesion.activo || !sesion.rol)) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="panel max-w-sm p-6 text-center">
          <h1 className="text-lg font-semibold">Acceso no disponible</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Tu usuario está desactivado o no tiene un rol asignado. Contacta al CEO del despacho.
          </p>
          <Button
            className="mt-4"
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/auth", replace: true });
            }}
          >
            Cerrar sesión
          </Button>
        </div>
      </div>
    );
  }

  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}
