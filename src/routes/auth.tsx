import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DESPACHO } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Iniciar sesión — SDO Contadores" },
      {
        name: "description",
        content: "Acceso interno al sistema de control contable mensual del despacho.",
      },
      { property: "og:title", content: "Iniciar sesión — SDO Contadores" },
      {
        property: "og:description",
        content: "Acceso interno al sistema de control contable mensual del despacho.",
      },
    ],
  }),
  component: Login,
});

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      setCargando(false);
      toast.error("Correo o contraseña incorrectos.");
      return;
    }

    const { data: perfil } = await supabase
      .from("profiles")
      .select("activo")
      .eq("id", data.user.id)
      .maybeSingle();

    if (!perfil?.activo) {
      await supabase.auth.signOut();
      setCargando(false);
      toast.error("Tu usuario está desactivado. Contacta al CEO del despacho.");
      return;
    }

    await queryClient.invalidateQueries();
    toast.success("Bienvenido");
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm panel p-7">
        <p className="font-serif text-xl">{DESPACHO}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Control contable y fiscal mensual. Acceso solo para personal del despacho.
        </p>

        <form onSubmit={enviar} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Correo</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={cargando}>
            {cargando ? "Entrando…" : "Iniciar sesión"}
          </Button>
        </form>
      </div>
    </div>
  );
}
