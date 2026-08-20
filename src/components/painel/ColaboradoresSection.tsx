"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Euro, Loader2, Plus, Trash2, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Projeto, ProjetoColaborador } from "@/types/projeto";
import type { Despesa } from "@/types/despesa";
import { DespesaFormSheet } from "./DespesaFormSheet";
import { parseMoney } from "@/lib/parse-number";
import { safeJsonPost, safeDelete } from "@/lib/safe-fetch";
import { useToast } from "@/hooks/use-toast";
import { useConfirm } from "@/components/ui/confirm-dialog";

function novoColaboradorId(): string {
  return `co_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Chave de junção pessoa ↔ pagamentos: tolera maiúsculas e espaços a mais. */
function chaveNome(nome: string | null | undefined): string {
  return (nome ?? "").trim().toLocaleLowerCase("pt-PT");
}

function fmtEuro(v: number): string {
  return `${v.toLocaleString("pt-PT", { maximumFractionDigits: 2 })} €`;
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

// Estado local editável: valorAcordado como texto (aceita vírgula) até guardar.
type Row = { id: string; nome: string; papel: string; valorAcordado: string };

function toRows(cs: ProjetoColaborador[]): Row[] {
  return cs.map((c) => ({
    id: c.id,
    nome: c.nome,
    papel: c.papel ?? "",
    valorAcordado: c.valorAcordado != null ? String(c.valorAcordado) : "",
  }));
}

type Props = {
  projeto: Projeto;
  /** Despesas ligadas a este projecto (a página já as carrega) — os pagamentos
   * aos colaboradores são as de categoria "colaboradores". */
  despesas: Despesa[];
};

/**
 * ColaboradoresSection — quem trabalha CONNOSCO neste projecto (ex.: o Jaime na
 * AquaElements), em vez de o pôr como cliente. Guarda a lista no próprio
 * projecto (upsert parcial) e regista os pagamentos como despesas de categoria
 * "colaboradores" ligadas ao projecto — assim contam sozinhos no Lucro do hero,
 * nos gráficos de gastos e nos relatórios, sem segundo mecanismo.
 */
export function ColaboradoresSection({ projeto, despesas }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const confirm = useConfirm();
  const [, startTransition] = useTransition();

  const iniciais = projeto.colaboradores ?? [];
  const pagamentos = despesas.filter((d) => d.categoria === "colaboradores");
  const hasData = iniciais.length > 0 || pagamentos.length > 0;

  const [open, setOpen] = useState(hasData);
  const [rows, setRows] = useState<Row[]>(toRows(iniciais));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Nome pré-preenchido no sheet de pagamento; null = sheet fechado.
  const [payFor, setPayFor] = useState<string | null>(null);

  const dirty = JSON.stringify(rows) !== JSON.stringify(toRows(iniciais));

  // Total pago por pessoa (chave normalizada — ver chaveNome).
  const pagoPorNome = new Map<string, number>();
  for (const d of pagamentos) {
    const k = chaveNome(d.colaborador) || "(sem nome)";
    pagoPorNome.set(k, (pagoPorNome.get(k) ?? 0) + d.valor);
  }
  const totalPago = pagamentos.reduce((s, d) => s + d.valor, 0);

  function updateRow(id: string, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  async function save() {
    setSaving(true);
    setError(null);
    // Linhas sem nome não se guardam (adicionadas e não preenchidas).
    const limpos: ProjetoColaborador[] = [];
    for (const r of rows) {
      if (!r.nome.trim()) continue;
      const v = r.valorAcordado.trim() ? parseMoney(r.valorAcordado) : null;
      if (r.valorAcordado.trim() && (v == null || v < 0)) {
        setError(`Valor acordado inválido para ${r.nome.trim()} — usa um número (aceita vírgula).`);
        setSaving(false);
        return;
      }
      limpos.push({
        id: r.id,
        nome: r.nome.trim(),
        papel: r.papel.trim() || null,
        valorAcordado: v != null ? Math.round(v * 100) / 100 : null,
      });
    }
    const res = await safeJsonPost("/api/projetos/upsert", {
      id: projeto.id,
      titulo: projeto.titulo,
      status: projeto.status,
      colaboradores: limpos.length ? limpos : null,
    });
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      toast({ title: "Erro a guardar colaboradores", description: res.error, variant: "destructive" });
      return;
    }
    setRows(toRows(limpos));
    startTransition(() => router.refresh());
  }

  async function apagarPagamento(d: Despesa) {
    const ok = await confirm({
      title: "Apagar pagamento?",
      description: `${fmtEuro(d.valor)} a ${d.colaborador ?? "(sem nome)"} · ${fmtDate(d.data)}. Sai dos gastos e dos relatórios.`,
      confirmLabel: "Apagar",
      tone: "destructive",
    });
    if (!ok) return;
    setDeleting(d.id);
    const res = await safeDelete(`/api/despesas/${d.id}`);
    setDeleting(null);
    if (!res.ok) {
      toast({ title: "Erro a apagar pagamento", description: res.error, variant: "destructive" });
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <section className={cn("card", open && "hw-open")}>
      <button
        type="button"
        className="card-label"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          width: "100%",
          background: "none",
          border: 0,
          cursor: "pointer",
          padding: 0,
          margin: 0,
          textAlign: "left",
        }}
      >
        <ChevronRight className="ic chev" aria-hidden="true" />
        <Users className="ic" aria-hidden="true" />
        Colaboradores
        {hasData && !open && (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "var(--ink-mute)",
              letterSpacing: ".04em",
              textTransform: "none",
            }}
          >
            {[
              iniciais.map((c) => c.nome).join(", "),
              totalPago > 0 ? `${fmtEuro(totalPago)} pagos` : "",
            ]
              .filter(Boolean)
              .join(" · ")}
          </span>
        )}
      </button>

      <div className="hw-body">
        {rows.length === 0 ? (
          <p style={{ fontSize: 12, color: "var(--ink-mute)", fontStyle: "italic", margin: "0 0 8px" }}>
            Sem colaboradores neste projecto. Quem trabalha contigo (angariou o cliente, co-gere,
            fez parte do trabalho) regista-se aqui — não como cliente.
          </p>
        ) : (
          rows.map((r) => (
            <div
              key={r.id}
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(120px, 1fr) minmax(0, 1.4fr) 110px 26px",
                gap: 8,
                alignItems: "center",
                border: "1px solid rgba(90,14,14,.10)",
                borderRadius: 10,
                padding: "7px 9px",
                background: "#fff",
                marginBottom: 8,
              }}
            >
              <input
                className="in-sm"
                value={r.nome}
                onChange={(e) => updateRow(r.id, { nome: e.target.value })}
                maxLength={120}
                placeholder="Nome — ex.: Jaime"
                disabled={saving}
                aria-label="Nome do colaborador"
              />
              <input
                className="in-sm"
                value={r.papel}
                onChange={(e) => updateRow(r.id, { papel: e.target.value })}
                maxLength={300}
                placeholder="Papel — ex.: angariou o cliente, co-gestão"
                disabled={saving}
                aria-label={`${r.nome || "colaborador"} — papel`}
              />
              <input
                className="in-sm"
                type="text"
                inputMode="decimal"
                value={r.valorAcordado}
                onChange={(e) => updateRow(r.id, { valorAcordado: e.target.value })}
                placeholder="Acordado €"
                disabled={saving}
                aria-label={`${r.nome || "colaborador"} — valor acordado`}
              />
              <button
                type="button"
                className="icon-mini"
                onClick={() => setRows((rs) => rs.filter((x) => x.id !== r.id))}
                disabled={saving}
                title="Remover colaborador"
                aria-label={`Remover ${r.nome || "colaborador"}`}
              >
                <Trash2 aria-hidden="true" />
              </button>
            </div>
          ))
        )}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn-ghost"
            onClick={() =>
              setRows((rs) => [...rs, { id: novoColaboradorId(), nome: "", papel: "", valorAcordado: "" }])
            }
            disabled={saving}
          >
            <Plus style={{ width: 13, height: 13 }} aria-hidden="true" />
            Adicionar colaborador
          </button>
        </div>
        <p style={{ fontSize: 11.5, color: "var(--ink-mute)", margin: "8px 0 0" }}>
          Interno: o cliente nunca vê isto no portal. O valor acordado é opcional — serve para a
          conta &quot;pago vs. combinado&quot; abaixo. Linhas sem nome não são guardadas.
        </p>

        {/* Pagamentos — despesas categoria "colaboradores" ligadas ao projecto.
            Contam sozinhas no Lucro do hero e nos gráficos (sem dupla contagem:
            NÃO marcar também uma linha de custo ✓ para o mesmo pagamento). */}
        <div className="psub">
          <p className="plabel">
            <Euro style={{ width: 13, height: 13 }} aria-hidden="true" />
            Pagamentos
          </p>

          {iniciais.map((c) => {
            const pago = pagoPorNome.get(chaveNome(c.nome)) ?? 0;
            const acordado = c.valorAcordado;
            const falta = acordado != null ? Math.max(0, acordado - pago) : null;
            return (
              <div key={c.id} className="act">
                <span className="a-ic">
                  <Users className="ic" aria-hidden="true" />
                </span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="who truncate">{c.nome}</div>
                  <div className="muted truncate" style={{ fontSize: 11.5 }}>
                    {acordado != null
                      ? `${fmtEuro(pago)} pagos de ${fmtEuro(acordado)} acordados${
                          falta && falta > 0 ? ` · faltam ${fmtEuro(falta)}` : " · liquidado"
                        }`
                      : `${fmtEuro(pago)} pagos`}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setPayFor(c.nome)}
                  disabled={saving}
                >
                  <Euro style={{ width: 13, height: 13 }} aria-hidden="true" />
                  Registar pagamento
                </button>
              </div>
            );
          })}

          {iniciais.length === 0 && (
            <p style={{ fontSize: 12, color: "var(--ink-mute)", fontStyle: "italic", margin: "0 0 8px" }}>
              Guarda primeiro um colaborador para registar pagamentos.
            </p>
          )}

          {pagamentos.map((d) => (
            <div key={d.id} className="act">
              <span className="a-ic">
                <Euro className="ic" aria-hidden="true" />
              </span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="who truncate">{d.descricao || `Pagamento a ${d.colaborador ?? "(sem nome)"}`}</div>
                <div className="muted truncate" style={{ fontSize: 11.5 }}>
                  {d.colaborador ?? "(sem nome)"} · {fmtDate(d.data)}
                </div>
              </div>
              <b
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 600,
                  fontSize: 13.5,
                  whiteSpace: "nowrap",
                }}
              >
                {fmtEuro(d.valor)}
              </b>
              <button
                type="button"
                className="icon-mini"
                onClick={() => apagarPagamento(d)}
                disabled={deleting === d.id}
                title="Apagar pagamento"
                aria-label={`Apagar pagamento de ${fmtEuro(d.valor)} a ${d.colaborador ?? "(sem nome)"}`}
              >
                {deleting === d.id ? (
                  <Loader2 className="animate-spin" aria-hidden="true" />
                ) : (
                  <Trash2 aria-hidden="true" />
                )}
              </button>
            </div>
          ))}
        </div>

        {error && (
          <p style={{ fontSize: 12, color: "var(--ember)", margin: "10px 0 0" }}>{error}</p>
        )}
        {dirty && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
            <button type="button" className="btn-primary" onClick={save} disabled={saving}>
              {saving && (
                <Loader2 className="animate-spin" style={{ width: 14, height: 14 }} aria-hidden="true" />
              )}
              Guardar
            </button>
          </div>
        )}
      </div>

      {/* Sheet de pagamento — reutiliza o form de despesa com categoria, projecto
          e nome já preenchidos. key remonta o form a cada abertura para o
          prefill pegar. */}
      {payFor != null && (
        <DespesaFormSheet
          key={payFor}
          projetos={[{ id: projeto.id, titulo: projeto.titulo }]}
          open
          onOpenChange={(o) => {
            if (!o) setPayFor(null);
          }}
          hideTrigger
          prefill={{ categoria: "colaboradores", projetoId: projeto.id, colaborador: payFor }}
        />
      )}
    </section>
  );
}
