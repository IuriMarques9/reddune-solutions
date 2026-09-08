"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { safeDelete } from "@/lib/safe-fetch";
import { DESPESA_CATEGORIA_LABEL, type Despesa } from "@/types/despesa";
import type { Colaborador } from "@/types/colaborador";
import type { GastoEvent } from "@/lib/gastos";
import { DespesaFormSheet, type ProjetoOption } from "./DespesaFormSheet";

/** Filtro do log por origem do gasto. */
export type GastoFiltro = "todos" | "linha" | "manual";

type Props = {
  /** Todos os gastos já ordenados e filtrados no servidor. */
  events: GastoEvent[];
  /** Projectos para resolver o título de cada gasto ligado a projecto. */
  projetos: ProjetoOption[];
  /** Filtro activo — o vazio tem de falar da vista, não do log todo. */
  filtro: GastoFiltro;
  /** Despesas manuais completas: o `GastoEvent` é um achatamento com perda. */
  despesas: Despesa[];
  /** Fichas para o form abrir preenchido em pagamentos a colaboradores. */
  colaboradores: Colaborador[];
};

const VAZIO: Record<GastoFiltro, { titulo: string; desc: string }> = {
  todos: {
    titulo: "Sem gastos registados",
    desc: 'Marca ✓ "Paguei do bolso" nas linhas de custo dos projectos, ou regista uma despesa manual.',
  },
  linha: {
    titulo: "Sem gastos de projectos",
    desc: 'Marca ✓ "Paguei do bolso" nas linhas da secção Custos de um projecto.',
  },
  manual: {
    titulo: "Sem despesas manuais",
    desc: 'Regista a primeira na visão geral — botão "Novo" → "Nova despesa", ou o card "Despesas recentes".',
  },
};

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

function fmtEuro(v: number): string {
  return `${v.toLocaleString("pt-PT", { maximumFractionDigits: 2 })} €`;
}

/**
 * GastosLog — log completo de gastos dos relatórios: despesas manuais E linhas
 * de custo de projecto marcadas `gastoEmpresa`, na mesma tabela.
 * Só as manuais se editam e apagam aqui (têm rota própria); as de linha
 * editam-se na secção Custos do projecto, por isso a linha aponta para lá.
 */
export function GastosLog({ events, projetos, filtro, despesas, colaboradores }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const confirm = useConfirm();
  const [, startTransition] = useTransition();
  // Ids escondidos optimisticamente enquanto o DELETE corre (repostos em erro).
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [aEditar, setAEditar] = useState<Despesa | null>(null);

  const projetoTitulo = new Map(projetos.map((p) => [p.id, p.titulo]));
  // O evento não chega para editar — não tem notas, colaborador nem ligação ao
  // plano —, por isso a despesa verdadeira resolve-se por id.
  const despesaPorId = new Map(despesas.map((d) => [d.id, d]));
  const visiveis = events.filter((e) => !hidden.has(e.id));
  // Coluna de acções só existe se houver algo para apagar — as linhas de
  // projecto editam-se no projecto, logo em ?g=linha a coluna seria sempre vazia.
  const temManuais = visiveis.some((e) => e.fonte === "manual");

  async function remove(e: GastoEvent) {
    const ok = await confirm({
      title: "Apagar despesa?",
      description: "Esta acção remove a despesa permanentemente e recalcula os gastos nos relatórios.",
      confirmLabel: "Apagar",
      tone: "destructive",
    });
    if (!ok) return;
    setHidden((prev) => new Set(prev).add(e.id));
    const res = await safeDelete(`/api/despesas/${encodeURIComponent(e.id)}`);
    if (!res.ok) {
      setHidden((prev) => {
        const next = new Set(prev);
        next.delete(e.id);
        return next;
      });
      toast({ title: "Erro a apagar despesa", description: res.error, variant: "destructive" });
      return;
    }
    startTransition(() => router.refresh());
  }

  if (visiveis.length === 0) {
    const vazio = VAZIO[filtro];
    return (
      <div className="empty">
        <div className="t">{vazio.titulo}</div>
        <div className="desc">{vazio.desc}</div>
      </div>
    );
  }

  return (
    <>
      <table className="tbl">
        <thead>
          <tr>
            <th>Data</th>
            <th>Descrição</th>
            <th className="col-hide-sm">Categoria</th>
            <th className="col-hide-sm">Origem</th>
            <th className="col-hide-sm">Projecto</th>
            <th>Valor</th>
            {temManuais && <th />}
          </tr>
        </thead>
        <tbody>
          {visiveis.map((e) => {
            const titulo = e.projetoId ? projetoTitulo.get(e.projetoId) : null;
            // Só as manuais são despesas: o id de uma linha é `<projetoId>:<linhaId>`.
            const despesa = e.fonte === "manual" ? despesaPorId.get(e.id) : undefined;
            return (
              <tr key={`${e.fonte}-${e.id}`}>
                <td className="muted" style={{ whiteSpace: "nowrap" }}>{fmtDate(e.data)}</td>
                <td className="name">{e.descricao}</td>
                <td className="col-hide-sm muted">{DESPESA_CATEGORIA_LABEL[e.categoria]}</td>
                <td className="col-hide-sm">
                  <span className={e.fonte === "linha" ? "pill warm" : "pill mute"}>
                    {e.fonte === "linha" ? "Projecto" : "Manual"}
                  </span>
                </td>
                <td className="col-hide-sm muted">
                  {e.projetoId ? (
                    <Link href={`/painel/projetos/${e.projetoId}`}>{titulo ?? "Abrir projecto"}</Link>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="num warn" style={{ whiteSpace: "nowrap" }}>{fmtEuro(e.valor)}</td>
                {temManuais && (
                  <td style={{ textAlign: "right" }}>
                    {e.fonte === "manual" ? (
                      <span style={{ display: "inline-flex", gap: 4, justifyContent: "flex-end" }}>
                        {despesa && (
                          <button
                            type="button"
                            onClick={() => setAEditar(despesa)}
                            className="icon-mini"
                            title="Editar"
                            aria-label={`Editar despesa ${e.descricao}`}
                          >
                            <Pencil aria-hidden="true" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => remove(e)}
                          className="icon-mini"
                          title="Apagar"
                          aria-label={`Apagar despesa ${e.descricao}`}
                        >
                          <Trash2 aria-hidden="true" />
                        </button>
                      </span>
                    ) : null}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Sheet de edição — montado uma vez, fora da tabela. key remonta o form
          a cada abertura para os campos serem os da despesa escolhida. */}
      {aEditar && (
        <DespesaFormSheet
          key={aEditar.id}
          despesa={aEditar}
          projetos={projetos}
          colaboradores={colaboradores}
          open
          hideTrigger
          onOpenChange={(o) => {
            if (!o) setAEditar(null);
          }}
        />
      )}
    </>
  );
}
