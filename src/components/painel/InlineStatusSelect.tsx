"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck, ThumbsUp, Lock } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  STATUS_LABELS,
  PROJETO_STATUS,
  type ProjetoStatus,
} from "@/types/projeto";
import { safeJsonPost } from "@/lib/safe-fetch";
import { useToast } from "@/hooks/use-toast";

type Props = {
  projetoId: string;
  status: ProjetoStatus;
  className?: string;
  triggerClassName?: string;
  stopPropagation?: boolean;
  pagoTotal?: number;
  /**
   * Total a cobrar ao cliente, JÁ com IVA quando o projecto o leva (ver
   * src/lib/iva.ts). Tem de ser bruto: `pagoTotal` também é bruto, e é a
   * comparação dos dois que liberta o "Fechar".
   */
  totalACobrar?: number | null;
};

type QuickAction = { icon: React.ReactNode; label: string; target: ProjetoStatus };

// Mapeia status prod → classe de design .badge.<x> (igual ao StatusBadge / mockup).
const STATUS_DESIGN: Record<ProjetoStatus, string> = {
  "ideia-interna": "ideia",
  "ideia-cliente": "ideia",
  proximo: "proximo",
  "em-curso": "curso",
  aguardando: "aguarda",
  terminado: "terminado",
  fechado: "fechado",
};

export function InlineStatusSelect({
  projetoId,
  status,
  className,
  triggerClassName,
  stopPropagation = true,
  pagoTotal,
  totalACobrar,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [current, setCurrent] = useState<ProjetoStatus>(status);
  const [error, setError] = useState<string | null>(null);

  async function onChange(next: string) {
    const newStatus = next as ProjetoStatus;
    const previous = current;
    setCurrent(newStatus);
    setError(null);
    const res = await safeJsonPost("/api/projetos/edit", {
      projetoId,
      field: "status",
      newValue: newStatus,
    });
    if (!res.ok) {
      setError(res.error);
      setCurrent(previous);
      toast({ title: "Erro a mudar estado", description: res.error, variant: "destructive" });
      return;
    }
    startTransition(() => router.refresh());
  }

  const quickActions: QuickAction[] = [];
  if (current === "ideia-cliente") {
    quickActions.push({ icon: <ThumbsUp className="h-3.5 w-3.5" />, label: "Confirmar", target: "proximo" });
  }
  if (current === "em-curso") {
    quickActions.push({ icon: <CheckCheck className="h-3.5 w-3.5" />, label: "Finalizar", target: "terminado" });
  }
  if (current === "terminado") {
    const liquidado =
      totalACobrar == null ||
      (pagoTotal != null && pagoTotal >= totalACobrar);
    if (liquidado) {
      quickActions.push({ icon: <Lock className="h-3.5 w-3.5" />, label: "Fechar", target: "fechado" });
    }
  }

  return (
    <div
      className={cn("inline-flex items-center gap-1", className)}
      onClick={stopPropagation ? (e) => e.stopPropagation() : undefined}
      onPointerDown={stopPropagation ? (e) => e.stopPropagation() : undefined}
    >
      <Select value={current} onValueChange={onChange} disabled={pending}>
        <SelectTrigger
          className={cn(
            "badge",
            STATUS_DESIGN[current],
            "h-auto w-auto cursor-pointer outline-none border-0",
            "[&>svg]:h-3 [&>svg]:w-3 [&>svg]:opacity-60 [&>svg]:shrink-0",
            triggerClassName
          )}
          aria-label={`Mudar estado (actual: ${STATUS_LABELS[current]})`}
        >
          <span className="dot" aria-hidden="true" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PROJETO_STATUS.map((s) => (
            <SelectItem key={s} value={s}>
              {STATUS_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {quickActions.map((qa) => (
        <button
          key={qa.target}
          type="button"
          title={qa.label}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onChange(qa.target);
          }}
          disabled={pending}
          className="h-7 w-7 flex items-center justify-center rounded-btn border border-dune-deep/15 bg-white/60 hover:bg-ember/10 transition-colors text-ink-soft hover:text-ink"
        >
          {qa.icon}
        </button>
      ))}
      {error && <span className="sr-only">{error}</span>}
    </div>
  );
}
