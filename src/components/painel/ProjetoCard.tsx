import Link from "next/link";
import { cn } from "@/lib/utils";
import { Clock, User } from "lucide-react";
import { InlineStatusSelect } from "./InlineStatusSelect";
import {
  PROJETO_TIPO_LABEL,
  type Projeto,
  type ProjetoTipo,
} from "@/types/projeto";
import { SERVICO_SLUG_LABEL } from "@/types/servico";
import { totalACobrar } from "@/lib/iva";

type Props = {
  projeto: Projeto;
  className?: string;
};

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString("pt-PT", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatValor(v: number | null): string | null {
  if (v == null) return null;
  return `${v.toLocaleString("pt-PT", { maximumFractionDigits: 0 })}€`;
}

/**
 * ProjetoCard — Oasis v5 (ex-`.tarefa`). Project summary card: meta (categoria · tipo),
 * title, client, next-action rail, footer (due + valor). Keeps the inline status
 * control so quick status changes still work from card views.
 */
export function ProjetoCard({ projeto, className }: Props) {
  const prazo = formatDate(projeto.prazo);
  const overdue =
    !!projeto.prazo &&
    new Date(projeto.prazo) < new Date() &&
    projeto.status !== "fechado" &&
    projeto.status !== "terminado";

  const categoria = projeto.categoria ? SERVICO_SLUG_LABEL[projeto.categoria] : null;
  const tipo = projeto.tipo ? PROJETO_TIPO_LABEL[projeto.tipo as ProjetoTipo] ?? projeto.tipo : null;
  const meta = [categoria, tipo].filter(Boolean).join(" · ");
  // Valor a cobrar (com IVA quando o projecto o leva) — ver src/lib/iva.ts.
  const valor = formatValor(totalACobrar(projeto));

  return (
    <Link href={`/painel/projetos/${projeto.id}`} className={cn("projeto-card", className)}>
      <div>
        <div className="row1">
          <div style={{ flex: 1, minWidth: 0 }}>
            {meta && <div className="meta">{meta}</div>}
            <div className="ttl" style={{ marginTop: 4 }}>
              {projeto.titulo}
            </div>
          </div>
          <InlineStatusSelect projetoId={projeto.id} status={projeto.status} />
        </div>
        {projeto.clienteNome && (
          <div className="client">
            <User className="ic" aria-hidden="true" />
            <span>{projeto.clienteNome}</span>
          </div>
        )}
      </div>

      {projeto.proximaAccao && (
        <div className="next">
          <span className="lab">Próximo</span>
          <span>{projeto.proximaAccao}</span>
        </div>
      )}

      <div className="foot">
        <span className={cn("due", overdue && "overdue")}>
          <Clock className="ic" aria-hidden="true" />
          {prazo ?? "Sem prazo"}
        </span>
        {valor && <span className="val">{valor}</span>}
      </div>
    </Link>
  );
}
