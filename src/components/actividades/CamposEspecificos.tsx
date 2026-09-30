import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CAMPOS_POR_TIPO, type ActividadFila } from "@/lib/actividades";
import type { Opinion } from "@/lib/dominio";

export type FormEspecifico = {
  isr: string;
  ivaModo: "NINGUNO" | "PAGADO" | "A_FAVOR";
  ivaMonto: string;
  opinion: Opinion | "SIN";
  opinionFecha: string;
  banco: string;
  cuenta: string;
  saldo: string;
  descripcion: string;
};

export const FORM_VACIO: FormEspecifico = {
  isr: "",
  ivaModo: "NINGUNO",
  ivaMonto: "",
  opinion: "SIN",
  opinionFecha: "",
  banco: "",
  cuenta: "",
  saldo: "",
  descripcion: "",
};

export function formDesdeActividad(a: ActividadFila): FormEspecifico {
  const d = a.datos ?? {};
  return {
    isr: a.isr_pagado?.toString() ?? "",
    ivaModo: a.iva_pagado !== null ? "PAGADO" : a.iva_a_favor !== null ? "A_FAVOR" : "NINGUNO",
    ivaMonto: (a.iva_pagado ?? a.iva_a_favor)?.toString() ?? "",
    opinion: a.opinion_resultado ?? "SIN",
    opinionFecha: a.opinion_fecha ?? "",
    banco: d.banco ?? "",
    cuenta: d.cuenta ?? "",
    saldo: d.saldo_conciliado?.toString() ?? "",
    descripcion: d.descripcion ?? "",
  };
}

function monto(v: string, etiqueta: string): number | null {
  if (v.trim() === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) throw new Error(`${etiqueta}: el monto debe ser un número mayor o igual a 0.`);
  return Math.round(n * 100) / 100;
}

/** Convierte el formulario a columnas; solo llena los campos del tipo. */
export function payloadEspecifico(tipo: string, f: FormEspecifico) {
  const campos = CAMPOS_POR_TIPO[tipo] ?? [];
  const tiene = (c: string) => campos.includes(c as never);
  const ivaValor = tiene("iva") && f.ivaModo !== "NINGUNO" ? monto(f.ivaMonto, "IVA") : null;
  const datos: Record<string, unknown> = {};
  if (tiene("conciliacion")) {
    if (f.banco.trim()) datos.banco = f.banco.trim();
    if (f.cuenta.trim()) datos.cuenta = f.cuenta.trim();
    const s = monto(f.saldo, "Saldo conciliado");
    if (s !== null) datos.saldo_conciliado = s;
  }
  if (tiene("descripcion") && f.descripcion.trim()) datos.descripcion = f.descripcion.trim();
  return {
    isr_pagado: tiene("isr") ? monto(f.isr, "ISR") : null,
    iva_pagado: f.ivaModo === "PAGADO" ? ivaValor : null,
    iva_a_favor: f.ivaModo === "A_FAVOR" ? ivaValor : null,
    opinion_resultado: tiene("opinion") && f.opinion !== "SIN" ? f.opinion : null,
    opinion_fecha: tiene("opinion") && f.opinionFecha ? f.opinionFecha : null,
    datos,
  };
}

export function CamposEspecificos({
  tipo,
  valor,
  onChange,
  disabled,
}: {
  tipo: string;
  valor: FormEspecifico;
  onChange: (v: FormEspecifico) => void;
  disabled?: boolean;
}) {
  const campos = CAMPOS_POR_TIPO[tipo] ?? [];
  if (campos.length === 0) return null;
  const set = (p: Partial<FormEspecifico>) => onChange({ ...valor, ...p });

  return (
    <div className="space-y-4 rounded-md border border-border p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Información de la actividad
      </p>
      {campos.includes("isr") && (
        <div className="space-y-2">
          <Label htmlFor="f-isr">ISR pagado</Label>
          <Input id="f-isr" type="number" min="0" step="0.01" disabled={disabled}
            value={valor.isr} onChange={(e) => set({ isr: e.target.value })} placeholder="0.00" />
        </div>
      )}
      {campos.includes("iva") && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>IVA</Label>
            <Select value={valor.ivaModo} disabled={disabled}
              onValueChange={(v) => set({ ivaModo: v as FormEspecifico["ivaModo"] })}>
              <SelectTrigger aria-label="Tipo de IVA"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="NINGUNO">Sin registrar</SelectItem>
                <SelectItem value="PAGADO">IVA pagado</SelectItem>
                <SelectItem value="A_FAVOR">IVA a favor</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {valor.ivaModo !== "NINGUNO" && (
            <div className="space-y-2">
              <Label htmlFor="f-iva">{valor.ivaModo === "PAGADO" ? "Monto IVA pagado" : "Monto IVA a favor"}</Label>
              <Input id="f-iva" type="number" min="0" step="0.01" disabled={disabled}
                value={valor.ivaMonto} onChange={(e) => set({ ivaMonto: e.target.value })} placeholder="0.00" />
            </div>
          )}
        </div>
      )}
      {campos.includes("opinion") && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Resultado</Label>
            <Select value={valor.opinion} disabled={disabled}
              onValueChange={(v) => set({ opinion: v as FormEspecifico["opinion"] })}>
              <SelectTrigger aria-label="Resultado de la opinión"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="SIN">Sin resultado</SelectItem>
                <SelectItem value="POSITIVA">Positiva</SelectItem>
                <SelectItem value="NEGATIVA">Negativa</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="f-opf">Fecha de la opinión</Label>
            <Input id="f-opf" type="date" disabled={disabled}
              value={valor.opinionFecha} onChange={(e) => set({ opinionFecha: e.target.value })} />
          </div>
        </div>
      )}
      {campos.includes("conciliacion") && (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="f-banco">Banco</Label>
            <Input id="f-banco" disabled={disabled} value={valor.banco} onChange={(e) => set({ banco: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="f-cuenta">Cuenta</Label>
            <Input id="f-cuenta" disabled={disabled} value={valor.cuenta} onChange={(e) => set({ cuenta: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="f-saldo">Saldo conciliado</Label>
            <Input id="f-saldo" type="number" step="0.01" min="0" disabled={disabled}
              value={valor.saldo} onChange={(e) => set({ saldo: e.target.value })} />
          </div>
        </div>
      )}
      {campos.includes("descripcion") && (
        <div className="space-y-2">
          <Label htmlFor="f-desc">Descripción</Label>
          <Input id="f-desc" disabled={disabled} value={valor.descripcion} onChange={(e) => set({ descripcion: e.target.value })} />
        </div>
      )}
    </div>
  );
}
