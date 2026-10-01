import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Plus, Undo2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  CamposEspecificos,
  FORM_VACIO,
  formDesdeActividad,
  payloadEspecifico,
  type FormEspecifico,
} from "@/components/actividades/CamposEspecificos";
import { EstadoBadge } from "@/components/EstadoBadge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  ACCION_LABEL,
  COLUMNAS_ACTIVIDAD,
  TIPO_NOMBRE_FALLBACK,
  diaMazatlan,
  formatoFecha,
  infoPrincipal,
  periodoActividad,
  type ActividadFila,
} from "@/lib/actividades";
import {
  ESTADOS,
  ESTADO_LABEL,
  MESES,
  formatoFechaHora,
  periodoLabel,
  type ActividadEstado,
} from "@/lib/dominio";

const TODOS = "todos";

type Historial = {
  id: string;
  actividad_id: string;
  usuario_id: string | null;
  fecha: string;
  accion: string;
  estado_anterior: ActividadEstado | null;
  estado_nuevo: ActividadEstado | null;
  revierte_id: string | null;
  detalle: Record<string, unknown> | null;
};

export function useTiposActividad() {
  return useQuery({
    queryKey: ["actividad-tipos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("actividad_tipos")
        .select("clave, nombre, orden")
        .eq("activo", true)
        .order("orden");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60_000,
  });
}

export function usePersonas() {
  return useQuery({
    queryKey: ["personas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, nombre, activo, user_roles(role)")
        .order("nombre");
      if (error) throw error;
      return (data ?? []) as unknown as {
        id: string;
        nombre: string;
        activo: boolean;
        user_roles: { role: string }[];
      }[];
    },
  });
}

const anioActual = new Date().getFullYear();
const ANIOS = Array.from({ length: 16 }, (_, i) => anioActual + 3 - i);

export function ActividadesEmpresa({ empresaId, empresaNombre }: { empresaId: string; empresaNombre: string }) {
  const queryClient = useQueryClient();
  const tipos = useTiposActividad();
  const personas = usePersonas();
  const [fTipo, setFTipo] = useState(TODOS);
  const [fEstado, setFEstado] = useState(TODOS);
  const [fResp, setFResp] = useState(TODOS);
  const [fPeriodo, setFPeriodo] = useState(TODOS);
  const [fDesde, setFDesde] = useState("");
  const [fHasta, setFHasta] = useState("");
  const [nueva, setNueva] = useState(false);
  const [verId, setVerId] = useState<string | null>(null);
  const [revertirId, setRevertirId] = useState<string | null>(null);

  const actividades = useQuery({
    queryKey: ["actividades-empresa", empresaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("actividades")
        .select(COLUMNAS_ACTIVIDAD)
        .eq("empresa_id", empresaId)
        .order("periodo_anio", { ascending: false })
        .order("periodo_mes", { ascending: false })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as ActividadFila[];
    },
  });

  const historial = useQuery({
    queryKey: ["historial-empresa", empresaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("actividad_historial")
        .select("id, actividad_id, usuario_id, fecha, accion, estado_anterior, estado_nuevo, revierte_id, detalle")
        .eq("empresa_id", empresaId)
        .order("fecha", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as Historial[];
    },
  });

  const nombreTipo = (c: string) =>
    tipos.data?.find((t) => t.clave === c)?.nombre ?? TIPO_NOMBRE_FALLBACK[c] ?? c;
  const nombrePersona = (id: string | null) =>
    id ? personas.data?.find((p) => p.id === id)?.nombre ?? "Usuario" : null;

  const revertibles = useMemo(() => {
    const h = historial.data ?? [];
    const revertidos = new Set(h.filter((x) => x.revierte_id).map((x) => x.revierte_id));
    return new Set(h.filter((x) => x.accion === "CAMBIO_ESTADO" && !revertidos.has(x.id)).map((x) => x.actividad_id));
  }, [historial.data]);

  const filas = actividades.data ?? [];
  const periodos = [...new Map(filas.map((a) => [`${a.periodo_anio}-${a.periodo_mes}`, a])).values()].sort(
    (a, b) => b.periodo_anio * 100 + b.periodo_mes - (a.periodo_anio * 100 + a.periodo_mes),
  );

  const visibles = filas.filter((a) => {
    const dia = a.fecha_realizacion ? diaMazatlan(a.fecha_realizacion) : null;
    return (
      (fTipo === TODOS || a.tipo_clave === fTipo) &&
      (fEstado === TODOS || a.estado === fEstado) &&
      (fResp === TODOS || (fResp === "sin" ? !a.responsable_id : a.responsable_id === fResp)) &&
      (fPeriodo === TODOS || `${a.periodo_anio}-${a.periodo_mes}` === fPeriodo) &&
      (!fDesde || (dia !== null && dia >= fDesde)) &&
      (!fHasta || (dia !== null && dia <= fHasta))
    );
  });

  const conteo = (e?: ActividadEstado) => visibles.filter((a) => !e || a.estado === e).length;

  const refrescar = () => {
    queryClient.invalidateQueries({ queryKey: ["actividades-empresa", empresaId] });
    queryClient.invalidateQueries({ queryKey: ["historial-empresa", empresaId] });
    queryClient.invalidateQueries({ queryKey: ["periodos", empresaId] });
    queryClient.invalidateQueries({ queryKey: ["todas-actividades"] });
  };

  const cambiarEstado = useMutation({
    mutationFn: async ({ id, estado }: { id: string; estado: ActividadEstado }) => {
      const { error } = await supabase.from("actividades").update({ estado }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Estado actualizado");
      refrescar();
    },
    onError: () => toast.error("No se pudo actualizar el estado."),
  });

  const revertir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("revertir_actividad", { _actividad_id: id });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Cambio revertido");
      setRevertirId(null);
      refrescar();
    },
    onError: (e: Error) => toast.error(e.message || "No se pudo revertir."),
  });

  const limpiar = () => {
    setFTipo(TODOS);
    setFEstado(TODOS);
    setFResp(TODOS);
    setFPeriodo(TODOS);
    setFDesde("");
    setFHasta("");
  };

  const actividadVer = filas.find((a) => a.id === verId) ?? null;

  return (
    <section className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { l: "Total", v: conteo() },
          { l: "Pendientes", v: conteo("PENDIENTE") },
          { l: "En proceso", v: conteo("EN_PROCESO") },
          { l: "Realizadas", v: conteo("REALIZADO") },
        ].map((t) => (
          <div key={t.l} className="panel p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{t.l}</p>
            <p className="mt-1 text-2xl font-semibold">{t.v}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Actividades</h2>
        <Button className="gap-2" onClick={() => setNueva(true)}>
          <Plus className="size-4" /> Agregar actividad
        </Button>
      </div>

      <div className="panel grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6">
        <FiltroSelect label="Actividad" value={fTipo} onChange={setFTipo}
          opciones={(tipos.data ?? []).map((t) => ({ value: t.clave, label: t.nombre }))} />
        <FiltroSelect label="Estado" value={fEstado} onChange={setFEstado}
          opciones={ESTADOS.map((e) => ({ value: e, label: ESTADO_LABEL[e] }))} />
        <FiltroSelect label="Responsable" value={fResp} onChange={setFResp}
          opciones={[{ value: "sin", label: "No asignado" },
            ...(personas.data ?? []).map((p) => ({ value: p.id, label: p.nombre }))]} />
        <FiltroSelect label="Periodo" value={fPeriodo} onChange={setFPeriodo}
          opciones={periodos.map((p) => ({ value: `${p.periodo_anio}-${p.periodo_mes}`, label: periodoActividad(p) }))} />
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Realizada desde</p>
          <Input type="date" aria-label="Fecha de realización desde" value={fDesde} onChange={(e) => setFDesde(e.target.value)} />
        </div>
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Realizada hasta</p>
          <Input type="date" aria-label="Fecha de realización hasta" value={fHasta} onChange={(e) => setFHasta(e.target.value)} />
        </div>
        <div className="sm:col-span-2 lg:col-span-6">
          <Button variant="ghost" size="sm" onClick={limpiar}>Limpiar filtros</Button>
        </div>
      </div>

      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[60rem] text-sm">
          <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="p-3">Actividad</th>
              <th className="p-3">Estado</th>
              <th className="p-3">Responsable</th>
              <th className="p-3">Fecha de realización</th>
              <th className="p-3">Periodo correspondiente</th>
              <th className="p-3">Información principal</th>
              <th className="p-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {visibles.map((a) => (
              <tr key={a.id}>
                <td className="p-3 font-medium">{nombreTipo(a.tipo_clave)}</td>
                <td className="p-3">
                  <Select value={a.estado} onValueChange={(v) => cambiarEstado.mutate({ id: a.id, estado: v as ActividadEstado })}>
                    <SelectTrigger className="h-8 w-36" aria-label={`Estado de ${nombreTipo(a.tipo_clave)} ${periodoActividad(a)}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ESTADOS.map((e) => (
                        <SelectItem key={e} value={e}>{ESTADO_LABEL[e]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="p-3">{nombrePersona(a.responsable_id) ?? "No asignado"}</td>
                <td className="p-3">{formatoFecha(a.fecha_realizacion)}</td>
                <td className="p-3">{periodoActividad(a)}</td>
                <td className="p-3 text-muted-foreground">{infoPrincipal(a)}</td>
                <td className="p-3">
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" className="gap-1" onClick={() => setVerId(a.id)}>
                      <Eye className="size-3.5" /> Ver
                    </Button>
                    {revertibles.has(a.id) && (
                      <Button variant="ghost" size="sm" className="gap-1" onClick={() => setRevertirId(a.id)}>
                        <Undo2 className="size-3.5" /> Revertir
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {actividades.isFetched && visibles.length === 0 && (
          <p className="p-4 text-sm text-muted-foreground">No hay actividades con estos filtros.</p>
        )}
      </div>

      <NuevaActividad abierto={nueva} onClose={() => setNueva(false)} empresaId={empresaId}
        tipos={tipos.data ?? []} onCreada={refrescar} />

      <DetalleActividad
        actividad={actividadVer}
        empresaNombre={empresaNombre}
        nombreTipo={nombreTipo}
        nombrePersona={nombrePersona}
        historial={(historial.data ?? []).filter((h) => h.actividad_id === verId)}
        onClose={() => setVerId(null)}
        onGuardado={refrescar}
      />

      <AlertDialog open={!!revertirId} onOpenChange={(o) => !o && setRevertirId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Revertir el último cambio de estado?</AlertDialogTitle>
            <AlertDialogDescription>
              La actividad regresará a su estado anterior. No se borra la actividad ni su historial; la
              reversión quedará registrada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={revertir.isPending} onClick={() => revertirId && revertir.mutate(revertirId)}>
              Revertir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function FiltroSelect({ label, value, onChange, opciones }: {
  label: string; value: string; onChange: (v: string) => void; opciones: { value: string; label: string }[];
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger aria-label={`Filtrar por ${label}`}><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value={TODOS}>Todos</SelectItem>
          {opciones.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function NuevaActividad({ abierto, onClose, empresaId, tipos, onCreada }: {
  abierto: boolean; onClose: () => void; empresaId: string;
  tipos: { clave: string; nombre: string }[]; onCreada: () => void;
}) {
  const hoy = new Date();
  const [tipo, setTipo] = useState("");
  const [mes, setMes] = useState(hoy.getMonth() + 1);
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [comentarios, setComentarios] = useState("");
  const [esp, setEsp] = useState<FormEspecifico>(FORM_VACIO);

  useEffect(() => {
    if (abierto) {
      setTipo(""); setComentarios(""); setEsp(FORM_VACIO);
      setMes(hoy.getMonth() + 1); setAnio(hoy.getFullYear());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto]);

  const crear = useMutation({
    mutationFn: async () => {
      if (!tipo) throw new Error("Selecciona el tipo de actividad.");
      const extra = payloadEspecifico(tipo, esp);
      const { error } = await supabase.from("actividades").insert({
        empresa_id: empresaId,
        tipo_clave: tipo,
        periodo_mes: mes,
        periodo_anio: anio,
        comentarios: comentarios.trim() || null,
        ...extra,
        datos: extra.datos as never,
      });
      if (error) throw new Error("No se pudo crear la actividad.");
    },
    onSuccess: () => {
      toast.success("Actividad creada");
      onCreada();
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader><DialogTitle>Agregar actividad</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo de actividad *</Label>
            <Select value={tipo} onValueChange={(v) => { setTipo(v); setEsp(FORM_VACIO); }}>
              <SelectTrigger aria-label="Tipo de actividad"><SelectValue placeholder="Selecciona..." /></SelectTrigger>
              <SelectContent>
                {tipos.map((t) => (<SelectItem key={t.clave} value={t.clave}>{t.nombre}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Periodo: mes *</Label>
              <Select value={String(mes)} onValueChange={(v) => setMes(Number(v))}>
                <SelectTrigger aria-label="Mes del periodo"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MESES.map((m, i) => (<SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Periodo: año *</Label>
              <Select value={String(anio)} onValueChange={(v) => setAnio(Number(v))}>
                <SelectTrigger aria-label="Año del periodo"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ANIOS.map((a) => (<SelectItem key={a} value={String(a)}>{a}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Estado inicial: Pendiente. Las fechas de inicio y realización y el responsable se registran
            automáticamente al cambiar el estado.
          </p>
          {tipo && <CamposEspecificos tipo={tipo} valor={esp} onChange={setEsp} />}
          <div className="space-y-2">
            <Label htmlFor="n-com">Comentarios</Label>
            <Textarea id="n-com" value={comentarios} onChange={(e) => setComentarios(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={crear.isPending} onClick={() => crear.mutate()}>Guardar actividad</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DetalleActividad({ actividad, empresaNombre, nombreTipo, nombrePersona, historial, onClose, onGuardado }: {
  actividad: ActividadFila | null; empresaNombre: string;
  nombreTipo: (c: string) => string; nombrePersona: (id: string | null) => string | null;
  historial: Historial[]; onClose: () => void; onGuardado: () => void;
}) {
  const { esStaff } = useAuth();
  const personas = usePersonas();
  const [esp, setEsp] = useState<FormEspecifico>(FORM_VACIO);
  const [comentarios, setComentarios] = useState("");
  const [mes, setMes] = useState(1);
  const [anio, setAnio] = useState(anioActual);

  useEffect(() => {
    if (actividad) {
      setEsp(formDesdeActividad(actividad));
      setComentarios(actividad.comentarios ?? "");
      setMes(actividad.periodo_mes);
      setAnio(actividad.periodo_anio);
    }
  }, [actividad]);

  const guardar = useMutation({
    mutationFn: async () => {
      if (!actividad) return;
      const extra = payloadEspecifico(actividad.tipo_clave, esp);
      const { error } = await supabase.from("actividades").update({
        comentarios: comentarios.trim() || null,
        periodo_mes: mes,
        periodo_anio: anio,
        ...extra,
        datos: extra.datos as never,
      }).eq("id", actividad.id);
      if (error) throw new Error("No se pudieron guardar los cambios.");
    },
    onSuccess: () => { toast.success("Información guardada"); onGuardado(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const asignar = useMutation({
    mutationFn: async (responsable_id: string | null) => {
      if (!actividad) return;
      const { error } = await supabase.from("actividades").update({ responsable_id }).eq("id", actividad.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { toast.success("Responsable asignado"); onGuardado(); },
    onError: () => toast.error("No se pudo asignar el responsable."),
  });

  const a = actividad;
  return (
    <Sheet open={!!a} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        {a && (
          <>
            <SheetHeader>
              <SheetTitle>{nombreTipo(a.tipo_clave)} — {periodoActividad(a)}</SheetTitle>
            </SheetHeader>
            <div className="space-y-5 px-4 pb-6">
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <Dato l="Empresa" v={empresaNombre} />
                <div><dt className="text-xs uppercase text-muted-foreground">Estado</dt><dd className="mt-1"><EstadoBadge estado={a.estado} /></dd></div>
                <Dato l="Responsable actual" v={nombrePersona(a.responsable_id) ?? "No asignado"} />
                <Dato l="Periodo correspondiente" v={periodoActividad(a)} />
                <Dato l="Fecha de creación" v={formatoFechaHora(a.created_at)} />
                <Dato l="Fecha de inicio" v={formatoFechaHora(a.fecha_inicio)} />
                <Dato l="Fecha de realización" v={formatoFechaHora(a.fecha_realizacion)} />
                <Dato l="Última modificación" v={formatoFechaHora(a.updated_at)} />
              </dl>

              {esStaff && (
                <div className="space-y-2">
                  <Label>Asignar responsable (CEO / Supervisor)</Label>
                  <Select value={a.responsable_id ?? "sin"} onValueChange={(v) => asignar.mutate(v === "sin" ? null : v)}>
                    <SelectTrigger aria-label="Responsable"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sin">No asignado</SelectItem>
                      {(personas.data ?? []).filter((p) => p.activo).map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Periodo: mes</Label>
                  <Select value={String(mes)} onValueChange={(v) => setMes(Number(v))}>
                    <SelectTrigger aria-label="Mes del periodo"><SelectValue /></SelectTrigger>
                    <SelectContent>{MESES.map((m, i) => (<SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Periodo: año</Label>
                  <Select value={String(anio)} onValueChange={(v) => setAnio(Number(v))}>
                    <SelectTrigger aria-label="Año del periodo"><SelectValue /></SelectTrigger>
                    <SelectContent>{ANIOS.map((x) => (<SelectItem key={x} value={String(x)}>{x}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
              </div>
              <CamposEspecificos tipo={a.tipo_clave} valor={esp} onChange={setEsp} />
              <div className="space-y-2">
                <Label htmlFor="d-com">Comentarios</Label>
                <Textarea id="d-com" value={comentarios} onChange={(e) => setComentarios(e.target.value)} />
              </div>
              <Button disabled={guardar.isPending} onClick={() => guardar.mutate()}>Guardar cambios</Button>

              <div className="space-y-2 border-t border-border pt-4">
                <h3 className="font-semibold">Historial de cambios</h3>
                {historial.length === 0 && <p className="text-sm text-muted-foreground">Sin cambios registrados todavía.</p>}
                <ol className="space-y-2">
                  {[...historial].reverse().map((h) => (
                    <li key={h.id} className="rounded-md border border-border p-2 text-sm">
                      <p className="text-xs text-muted-foreground">{formatoFechaHora(h.fecha)} · {nombrePersona(h.usuario_id) ?? "Sistema"}</p>
                      <p>
                        {ACCION_LABEL[h.accion] ?? h.accion}
                        {(h.accion === "CAMBIO_ESTADO" || h.accion === "REVERSION") && h.estado_anterior && h.estado_nuevo &&
                          `: ${ESTADO_LABEL[h.estado_anterior]} → ${ESTADO_LABEL[h.estado_nuevo]}`}
                        {h.accion === "EDICION" && h.detalle && ` (${Object.keys(h.detalle).join(", ")})`}
                      </p>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Dato({ l, v }: { l: string; v: string }) {
  return (
    <div>
      <dt className="text-xs uppercase text-muted-foreground">{l}</dt>
      <dd className="mt-1">{v}</dd>
    </div>
  );
}

export { periodoLabel };
