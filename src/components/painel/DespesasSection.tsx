"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Pencil, Receipt, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { safeDelete } from "@/lib/safe-fetch";
import { DESPESA_CATEGORIA_LABEL, type Despesa } from "@/types/despesa";
import type { Colaborador } from "@/types/colaborador";
import { DespesaFormSheet, type ProjetoOption } from "./DespesaFormSheet";

const MAX_VISIVEIS = 8;

type Props = {
  /** Despesas manuais mais recentes (já ordenadas por data desc no loader). */
  despesas: Despesa[];
  /** Projectos para mostrar o título da despesa quando está ligada a um. */
  projetos: ProjetoOption[];
  /** Fichas para o form de edição abrir com a pessoa já escolhida numa despesa
   * da categoria "colaboradores" — sem elas a validação bloqueava a gravação. */
  colaboradores?: Colaborador[];
  /** Destino do "Ver tudo" — o log completo de gastos nos relatórios. */
  verTudoHref?: string;
};

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

function fmtEuro(v: number): string {
  return v.toLocaleString("pt-PT", { maximumFractionDigits: 2 });
}

/**
 * DespesasSection — card "Despesas recentes" da visão geral: últimas despesas
 * manuais, com editar e apagar (o apagar é optimista). Registar continua a ser
 * só pelo botão "Novo" da Topbar (NovoMenu → Nova despesa) — uma entrada única,
 * como projectos/clientes/lembretes.
 * Só mostra as manuais; o log completo (com os gastos de linhas de projecto)
 * vive nos relatórios — ver GastosLog.
 */
export function DespesasSection({ despesas, projetos, colaboradores = [], verTudoHref }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const confirm = useConfirm();
  const [, startTransition] = useTransition();
  // Ids escondidos optimisticamente enquanto o DELETE corre (repostos em erro).
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [aEditar, setAEditar] = useState<Despesa | null>(null);

  const projetoTitulo = new Map(projetos.map((p) => [p.id, p.titulo]));
  const visiveis = despesas.filter((d) => !hidden.has(d.id)).slice(0, MAX_VISIVEIS);

  async function remove(id: string) {
    const ok = await confirm({
      title: "Apagar despesa?",
      description: "Esta acção remove a despesa permanentemente e recalcula os gastos nos relatórios.",
      confirmLabel: "Apagar",
      tone: "destructive",
    });
    if (!ok) return;
    setHidden((prev) => new Set(prev).add(id));
    const res = await safeDelete(`/api/despesas/${encodeURIComponent(id)}`);
    if (!res.ok) {
      setHidden((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      toast({ title: "Erro a apagar despesa", description: res.error, variant: "destructive" });
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <div className="card">
      <div className="card-head">
        <span className="card-title">Despesas recentes</span>
        {verTudoHref && (
          <Link className="link-more" href={verTudoHref}>
            Ver tudo <ArrowRight className="ic" aria-hidden="true" />
          </Link>
        )}
      </div>
      {visiveis.length === 0 ? (
        <p className="muted" style={{ fontSize: 13 }}>
          Sem despesas manuais registadas. Regista a primeira no botão &quot;Novo&quot; aqui em cima.
        </p>
      ) : (
        visiveis.map((d) => {
          const proj = d.projetoId ? projetoTitulo.get(d.projetoId) : null;
          return (
            <div key={d.id} className="act">
              <span className="a-ic"><Receipt className="ic" aria-hidden="true" /></span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="who truncate">{d.descricao}</div>
                <div className="muted truncate" style={{ fontSize: 11.5 }}>
                  {DESPESA_CATEGORIA_LABEL[d.categoria]} · {fmtDate(d.data)}
                  {proj ? ` · ${proj}` : ""}
                </div>
              </div>
              <b style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 13.5, whiteSpace: "nowrap" }}>
                {fmtEuro(d.valor)} €
              </b>
              {/* O .act separa os filhos a 9px — largo de mais entre acções. */}
              <span style={{ display: "inline-flex", gap: 4 }}>
                <button
                  type="button"
                  onClick={() => setAEditar(d)}
                  className="icon-mini"
                  aria-label={`Editar despesa ${d.descricao}`}
                  title="Editar"
                >
                  <Pencil aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => remove(d.id)}
                  className="icon-mini"
                  aria-label={`Apagar despesa ${d.descricao}`}
                >
                  <Trash2 aria-hidden="true" />
                </button>
              </span>
            </div>
          );
        })
      )}

      {/* Sheet de edição montado uma vez, fora da lista. A key remonta o form
          a cada despesa — todo o estado dele nasce de inicializadores. */}
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
    </div>
  );
}
