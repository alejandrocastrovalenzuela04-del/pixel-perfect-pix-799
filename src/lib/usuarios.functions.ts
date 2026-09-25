import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const rolSchema = z.enum(["CEO", "SUPERVISOR", "EMPLEADO"]);

type ContextoAuth = {
  supabase: {
    rpc: (
      fn: "has_role",
      args: { _user_id: string; _role: "CEO" },
    ) => Promise<{ data: boolean | null }>;
  };
  userId: string;
};

async function exigirCeo(context: ContextoAuth) {
  const { data } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "CEO",
  });
  if (data !== true) throw new Error("Solo el CEO puede administrar usuarios.");
}

export const crearUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        nombre: z.string().trim().min(2, "El nombre es obligatorio"),
        email: z.string().trim().email("Correo no válido"),
        password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
        rol: rolSchema,
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await exigirCeo(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: creado, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { nombre: data.nombre },
    });
    if (error || !creado.user) {
      throw new Error(error?.message ?? "No se pudo crear el usuario.");
    }

    const { error: errorPerfil } = await supabaseAdmin.from("profiles").insert({
      id: creado.user.id,
      nombre: data.nombre,
      email: data.email,
      activo: true,
    });
    if (errorPerfil) {
      await supabaseAdmin.auth.admin.deleteUser(creado.user.id);
      throw new Error("No se pudo crear el perfil del usuario.");
    }

    const { error: errorRol } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: creado.user.id, role: data.rol });
    if (errorRol) throw new Error("No se pudo asignar el rol.");

    return { ok: true, id: creado.user.id };
  });

export const actualizarUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        nombre: z.string().trim().min(2, "El nombre es obligatorio"),
        activo: z.boolean(),
        rol: rolSchema,
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await exigirCeo(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Regla: el sistema nunca puede quedarse sin un CEO activo.
    const { data: ceos } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, profiles!inner(activo)")
      .eq("role", "CEO");
    const ceosActivos = (ceos ?? []).filter(
      (fila: { user_id: string; profiles: { activo: boolean } | null }) => fila.profiles?.activo,
    );
    const eraUnicoCeoActivo =
      ceosActivos.length === 1 && ceosActivos[0]?.user_id === data.id;
    if (eraUnicoCeoActivo && (data.rol !== "CEO" || !data.activo)) {
      throw new Error("Debe existir siempre al menos un CEO activo.");
    }

    const { error: errorPerfil } = await supabaseAdmin
      .from("profiles")
      .update({ nombre: data.nombre, activo: data.activo })
      .eq("id", data.id);
    if (errorPerfil) throw new Error("No se pudo actualizar el usuario.");

    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.id);
    const { error: errorRol } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.id, role: data.rol });
    if (errorRol) throw new Error("No se pudo actualizar el rol.");

    return { ok: true };
  });
