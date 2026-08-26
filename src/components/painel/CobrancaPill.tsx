import Link from "next/link";
import { cn } from "@/lib/utils";
import type { CobrancaCalendario } from "@/lib/mensalidades";

/**
 * Pill de uma cobrança prevista, partilhada pelas três vistas do calendário.
 * Não duplicar: alterar aqui muda o mês, a semana e o dia de uma vez.
 */
export function CobrancaPill({
  cobranca: c,
  className,
  style,
}: {
  cobranca: CobrancaCalendario;
  className?: string;
  style?: React.CSSProperties;
}) {
  const valor = c.valor.toLocaleString("pt-PT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const quem = c.clienteNome ?? c.projetoTitulo;
  const estadoCls = c.estado === "paga" ? "done" : c.estado === "vencida" || c.estado === "parcial" ? "late" : "";

  return (
    <Link
      href={`/painel/projetos/${c.projetoId}#mensalidades`}
      className={cn("cal-ev e", estadoCls, className)}
      style={style}
      title={`${c.planoTitulo} ${c.numero}/${c.totalCobrancas} · ${valor} € · ${c.projetoTitulo}${
        c.clienteNome ? ` — ${c.clienteNome}` : ""
      }`}
    >
      {valor} € · {quem}
    </Link>
  );
}
