import { CheckCircle2, Circle, Clock } from "lucide-react";

import { ESTADO_LABEL, type ActividadEstado } from "@/lib/dominio";
import { cn } from "@/lib/utils";

const estilos: Record<ActividadEstado, string> = {
  PENDIENTE: "bg-pendiente text-pendiente-foreground border-pendiente-foreground/20",
  EN_PROCESO: "bg-proceso text-proceso-foreground border-proceso-foreground/20",
  REALIZADO: "bg-realizado text-realizado-foreground border-realizado-foreground/20",
};

const iconos: Record<ActividadEstado, typeof Circle> = {
  PENDIENTE: Circle,
  EN_PROCESO: Clock,
  REALIZADO: CheckCircle2,
};

export function EstadoBadge({
  estado,
  className,
}: {
  estado: ActividadEstado;
  className?: string;
}) {
  const Icono = iconos[estado];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        estilos[estado],
        className,
      )}
    >
      <Icono className="size-3.5" aria-hidden />
      {ESTADO_LABEL[estado]}
    </span>
  );
}
