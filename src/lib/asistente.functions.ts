import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const entrada = z.object({
  mes: z.number().int().min(1).max(12),
  anio: z.number().int().min(2000).max(2100),
  empresaId: z.string().uuid().nullable(),
  pregunta: z.string().trim().min(3).max(1000),
});

const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];

export const preguntarAsistente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => entrada.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: esCeo } = await supabase.rpc("has_role", { _user_id: userId, _role: "CEO" });
    if (!esCeo) return { error: "Solo el CEO puede usar el asistente.", respuesta: null };

    // rango del mes en hora de Mazatlán (UTC-7)
    const inicio = new Date(Date.UTC(data.anio, data.mes - 1, 1, 7)).toISOString();
    const fin = new Date(Date.UTC(data.mes === 12 ? data.anio + 1 : data.anio, data.mes % 12, 1, 7)).toISOString();

    let empresasQ = supabase.from("empresas").select("id, nombre, rfc, regimen_fiscal, activa");
    if (data.empresaId) empresasQ = empresasQ.eq("id", data.empresaId);
    const cols =
      "id, empresa_id, tipo_clave, estado, periodo_mes, periodo_anio, responsable_id, fecha_inicio, fecha_realizacion, updated_at, comentarios, isr_pagado, iva_pagado, iva_a_favor, opinion_resultado, opinion_fecha, datos";
    let porPeriodo = supabase.from("actividades").select(cols).eq("periodo_mes", data.mes).eq("periodo_anio", data.anio);
    let porRealizacion = supabase.from("actividades").select(cols).gte("fecha_realizacion", inicio).lt("fecha_realizacion", fin);
    let registros = supabase.from("registros_mensuales")
      .select("empresa_id, mes, anio, isr_pagado, iva_tipo, iva_monto, opinion_cumplimiento")
      .eq("mes", data.mes).eq("anio", data.anio);
    if (data.empresaId) {
      porPeriodo = porPeriodo.eq("empresa_id", data.empresaId);
      porRealizacion = porRealizacion.eq("empresa_id", data.empresaId);
      registros = registros.eq("empresa_id", data.empresaId);
    }
    const [emp, ap, ar, reg, per, tip] = await Promise.all([
      empresasQ, porPeriodo, porRealizacion, registros,
      supabase.from("profiles").select("id, nombre"),
      supabase.from("actividad_tipos").select("clave, nombre"),
    ]);
    const err = emp.error || ap.error || ar.error || reg.error || per.error || tip.error;
    if (err) {
      console.error("Asistente: error leyendo datos", err);
      return { error: "No se pudieron leer los datos del periodo.", respuesta: null };
    }

    const nombre = new Map((per.data ?? []).map((p) => [p.id, p.nombre]));
    const tipo = new Map((tip.data ?? []).map((t) => [t.clave, t.nombre]));
    const empresa = new Map((emp.data ?? []).map((e) => [e.id, e.nombre]));
    const limpiar = (a: Record<string, unknown>) => ({
      empresa: empresa.get(a.empresa_id as string) ?? "Empresa",
      actividad: tipo.get(a.tipo_clave as string) ?? a.tipo_clave,
      estado: a.estado,
      periodo_correspondiente: `${MESES[(a.periodo_mes as number) - 1]} ${a.periodo_anio}`,
      responsable: a.responsable_id ? nombre.get(a.responsable_id as string) ?? "Usuario" : null,
      fecha_inicio: a.fecha_inicio,
      fecha_realizacion: a.fecha_realizacion,
      ultima_modificacion: a.updated_at,
      isr_pagado: a.isr_pagado,
      iva_pagado: a.iva_pagado,
      iva_a_favor: a.iva_a_favor,
      opinion_cumplimiento: a.opinion_resultado,
      opinion_fecha: a.opinion_fecha,
      datos: a.datos,
      comentarios: a.comentarios,
    });

    const contexto = {
      periodo_consultado: `${MESES[data.mes - 1]} ${data.anio}`,
      zona_horaria: "America/Mazatlan",
      empresas: emp.data ?? [],
      datos_fiscales_del_periodo_mensual: (reg.data ?? []).map((r) => ({ ...r, empresa: empresa.get(r.empresa_id) })),
      actividades_correspondientes_al_periodo: (ap.data ?? []).map(limpiar),
      actividades_realizadas_en_el_mes: (ar.data ?? []).map(limpiar),
    };

    const system = `Eres el asistente interno de un despacho contable mexicano. Respondes al CEO en español, de forma breve y clara (máximo ~250 palabras), usando ÚNICAMENTE los datos JSON proporcionados.
Reglas:
- No inventes cifras, fechas ni nombres. Si un dato no está, di explícitamente que no está registrado.
- Distingue "periodo correspondiente" (a qué mes pertenece la actividad) de "fecha de realización" (cuándo se completó).
- Formatea montos como pesos mexicanos ($15,400.00). Fechas en formato dd/mm/aaaa, hora de Mazatlán.
- No des asesoría fiscal definitiva; limítate a describir los datos.`;

    const prompt = `Datos:\n${JSON.stringify(contexto)}\n\nPregunta del CEO: ${data.pregunta}`;

    const { responderPregunta, ErrorAsistente } = await import("./asistente.server");
    try {
      const respuesta = await responderPregunta(system, prompt);
      return { error: null, respuesta };
    } catch (e) {
      return { error: e instanceof ErrorAsistente ? e.message : "El asistente no pudo responder.", respuesta: null };
    }
  });
