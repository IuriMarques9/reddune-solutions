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
  const estadoCls =
    c.estado === "paga" ? "done" : c.estado === "vencida" || c.estado === "parcial" ? "late" : "";
  // Sem valor previsto (lembrete de renovação) mostra-se o nome do plano — um
  // "0,00 €" no calendário não diz nada e parece um erro.
  const rotulo = c.valor > 0 ? `${valor} € · ${quem}` : c.planoTitulo;
  const sinal = c.ehDespesa ? "↓" : "↑";
  // A última prestação é a que interessa marcar: é quando o plano acaba e há
  // decisão a tomar (renovar ou fechar).
  const ehUltima = c.numero === c.totalCobrancas;

  return (
    <Link
      href={`/painel/projetos/${c.projetoId}#mensalidades`}
      className={cn("cal-ev e", c.ehDespesa && "out", estadoCls, className)}
      style={style}
      title={`${c.ehDespesa ? "A pagar por nós" : "A receber"} · ${c.planoTitulo} ${c.numero}/${
        c.totalCobrancas
      }${ehUltima ? " (última — depois é renovar ou fechar)" : ""} · ${
        c.valor > 0 ? `${valor} €` : "valor por definir"
      } · ${c.projetoTitulo}${c.clienteNome ? ` — ${c.clienteNome}` : ""}`}
    >
      {sinal} {rotulo}
      {ehUltima && <> · fim</>}
    </Link>
  );
}
