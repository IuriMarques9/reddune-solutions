"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Euro, Loader2, Pencil, Plus, Trash2, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Projeto, ProjetoColaborador } from "@/types/projeto";
import type { Despesa } from "@/types/despesa";
import type { Colaborador } from "@/types/colaborador";
import { DespesaFormSheet } from "./DespesaFormSheet";
import { ColaboradorPicker } from "./ColaboradorPicker";
import { NovoColaboradorButton } from "./NovoColaboradorButton";
import { parseMoney } from "@/lib/parse-number";
import { safeJsonPost, safeDelete } from "@/lib/safe-fetch";
import { useToast } from "@/hooks/use-toast";
import { useConfirm } from "@/components/ui/confirm-dialog";

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
// `key` é só para o React — a identidade real é o colaboradorId (que pode estar
// vazio numa linha acabada de adicionar).
type Row = { key: string; colaboradorId: string; papel: string; valorAcordado: string };

let seq = 0;
function novaKey(): string {
  seq += 1;
  return `row_${seq}`;
}

function toRows(cs: ProjetoColaborador[]): Row[] {
  return cs.map((c) => ({
    key: c.colaboradorId,
    colaboradorId: c.colaboradorId,
    papel: c.papel ?? "",
    valorAcordado: c.valorAcordado != null ? String(c.valorAcordado) : "",
  }));
}

// O sheet de despesa serve dois gestos aqui: registar um pagamento novo a uma
// pessoa ou corrigir um já lançado. É o modo que decide a `key` da remontagem.
type SheetAlvo =
  | { modo: "novo"; colaboradorId: string }
  | { modo: "editar"; despesa: Despesa };

type Props = {
  projeto: Projeto;
  /** Despesas ligadas a este projecto (a página já as carrega) — os pagamentos
   * aos colaboradores são as de categoria "colaboradores". */
  despesas: Despesa[];
  /** Fichas de colaborador (colecção `colaboradores`). */
  colaboradores: Colaborador[];
};

/**
 * ColaboradoresSection — quem trabalha CONNOSCO neste projecto (ex.: o Jaime na
 * AquaElements), em vez de o pôr como cliente. A pessoa vem da ficha
 * (/painel/colaboradores); aqui guarda-se só a referência, o papel neste
 * projecto e o valor combinado. Os pagamentos são despesas de categoria
 * "colaboradores" ligadas ao projecto — contam sozinhos no Lucro do hero, nos
 * gráficos de gastos e nos relatórios, sem segundo mecanismo.
 */
export function ColaboradoresSection({ projeto, despesas, colaboradores }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const confirm = useConfirm();
  const [, startTransition] = useTransition();

  const iniciais = projeto.colaboradores ?? [];
  const pagamentos = despesas.filter((d) => d.categoria === "colaboradores");
  const hasData = iniciais.length > 0 || pagamentos.length > 0;

  const fichas = new Map(colaboradores.map((c) => [c.id, c]));
  const nomeDe = (id: string | null | undefined) =>
    (id && fichas.get(id)?.nome) || "(ficha apagada)";

  const [open, setOpen] = useState(hasData);
  const [rows, setRows] = useState<Row[]>(toRows(iniciais));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Alvo do sheet de pagamento — pessoa a pagar ou despesa a corrigir;
  // null = sheet fechado.
  const [alvo, setAlvo] = useState<SheetAlvo | null>(null);
  const [novoAberto, setNovoAberto] = useState(false);

  const dirty = JSON.stringify(rows.map(({ key: _key, ...r }) => r)) !==
    JSON.stringify(toRows(iniciais).map(({ key: _key, ...r }) => r));

  // Total pago por pessoa — chave = id da ficha, imune a gralhas no nome.
  const pagoPorId = new Map<string, number>();
  for (const d of pagamentos) {
    const k = d.colaboradorId ?? "";
    pagoPorId.set(k, (pagoPorId.get(k) ?? 0) + d.valor);
  }
  const totalPago = pagamentos.reduce((s, d) => s + d.valor, 0);

  function updateRow(key: string, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  async function save() {
    setSaving(true);
    setError(null);
    // Linhas sem pessoa escolhida não se guardam (adicionadas e não preenchidas).
    const limpos: ProjetoColaborador[] = [];
    const vistos = new Set<string>();
    for (const r of rows) {
      if (!r.colaboradorId) continue;
      if (vistos.has(r.colaboradorId)) {
        setError(`${nomeDe(r.colaboradorId)} está na lista duas vezes.`);
        setSaving(false);
        return;
      }
      vistos.add(r.colaboradorId);
      const v = r.valorAcordado.trim() ? parseMoney(r.valorAcordado) : null;
      if (r.valorAcordado.trim() && (v == null || v < 0)) {
        setError(
          `Valor acordado inválido para ${nomeDe(r.colaboradorId)} — usa um número (aceita vírgula).`
        );
        setSaving(false);
        return;
      }
      limpos.push({
        colaboradorId: r.colaboradorId,
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
      description: `${fmtEuro(d.valor)} a ${nomeDe(d.colaboradorId)} · ${fmtDate(d.data)}. Sai dos gastos e dos relatórios.`,
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
            className="truncate"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "var(--ink-mute)",
              letterSpacing: ".04em",
              textTransform: "none",
              minWidth: 0,
            }}
          >
            {[
              iniciais.map((c) => nomeDe(c.colaboradorId)).join(", "),
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
            fez parte do trabalho) escolhe-se aqui — não é cliente.
          </p>
        ) : (
          rows.map((r) => (
            <div key={r.key} className="colab-row">
              <ColaboradorPicker
                className="colab-pick"
                colaboradores={colaboradores}
                value={r.colaboradorId}
                onChange={(id) => updateRow(r.key, { colaboradorId: id })}
                disabled={saving}
                excluir={rows.filter((x) => x.key !== r.key).map((x) => x.colaboradorId)}
              />
              <input
                className="in-sm colab-papel"
                value={r.papel}
                onChange={(e) => updateRow(r.key, { papel: e.target.value })}
                maxLength={300}
                placeholder="Papel neste projecto"
                disabled={saving}
                aria-label="Papel neste projecto"
              />
              <input
                className="in-sm colab-valor"
                type="text"
                inputMode="decimal"
                value={r.valorAcordado}
                onChange={(e) => updateRow(r.key, { valorAcordado: e.target.value })}
                placeholder="Acordado €"
                disabled={saving}
                aria-label="Valor acordado"
              />
              <button
                type="button"
                className="icon-mini colab-del"
                onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
                disabled={saving}
                title="Tirar do projecto"
                aria-label="Tirar do projecto"
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
              setRows((rs) => [...rs, { key: novaKey(), colaboradorId: "", papel: "", valorAcordado: "" }])
            }
            disabled={saving}
          >
            <Plus style={{ width: 13, height: 13 }} aria-hidden="true" />
            Adicionar ao projecto
          </button>
          <NovoColaboradorButton
            label="Nova ficha"
            open={novoAberto}
            onOpenChange={setNovoAberto}
          />
        </div>
        <p style={{ fontSize: 11.5, color: "var(--ink-mute)", margin: "8px 0 0" }}>
          Interno: o cliente nunca vê isto no portal. Os dados da pessoa vivem na{" "}
          <Link href="/painel/colaboradores" style={{ textDecoration: "underline" }}>
            ficha de colaborador
          </Link>
          ; aqui fica só o papel e o valor combinado para este projecto (opcional).
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
            const pago = pagoPorId.get(c.colaboradorId) ?? 0;
            const acordado = c.valorAcordado;
            const falta = acordado != null ? Math.max(0, acordado - pago) : null;
            return (
              <div key={c.colaboradorId} className="act">
                <span className="a-ic">
                  <Users className="ic" aria-hidden="true" />
                </span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="who truncate">
                    <Link href={`/painel/colaboradores/${c.colaboradorId}`}>
                      {nomeDe(c.colaboradorId)}
                    </Link>
                  </div>
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
                  onClick={() => setAlvo({ modo: "novo", colaboradorId: c.colaboradorId })}
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
                <div className="who truncate">
                  {d.descricao || `Pagamento a ${nomeDe(d.colaboradorId)}`}
                </div>
                <div className="muted truncate" style={{ fontSize: 11.5 }}>
                  {nomeDe(d.colaboradorId)} · {fmtDate(d.data)}
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
              <span style={{ display: "inline-flex", gap: 4 }}>
                <button
                  type="button"
                  className="icon-mini"
                  onClick={() => setAlvo({ modo: "editar", despesa: d })}
                  disabled={deleting === d.id}
                  title="Editar pagamento"
                  aria-label={`Editar pagamento de ${fmtEuro(d.valor)} a ${nomeDe(d.colaboradorId)}`}
                >
                  <Pencil aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="icon-mini"
                  onClick={() => apagarPagamento(d)}
                  disabled={deleting === d.id}
                  title="Apagar pagamento"
                  aria-label={`Apagar pagamento de ${fmtEuro(d.valor)} a ${nomeDe(d.colaboradorId)}`}
                >
                  {deleting === d.id ? (
                    <Loader2 className="animate-spin" aria-hidden="true" />
                  ) : (
                    <Trash2 aria-hidden="true" />
                  )}
                </button>
              </span>
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

      {/* Sheet de pagamento — reutiliza o form de despesa, a registar com
          categoria, projecto e pessoa já preenchidos ou a corrigir um pagamento
          já lançado. key remonta o form a cada abertura para o prefill (ou a
          despesa) pegar. */}
      {alvo != null && (
        <DespesaFormSheet
          key={alvo.modo === "editar" ? alvo.despesa.id : alvo.colaboradorId}
          projetos={[{ id: projeto.id, titulo: projeto.titulo }]}
          colaboradores={colaboradores}
          open
          onOpenChange={(o) => {
            if (!o) setAlvo(null);
          }}
          hideTrigger
          despesa={alvo.modo === "editar" ? alvo.despesa : undefined}
          prefill={
            alvo.modo === "novo"
              ? { categoria: "colaboradores", projetoId: projeto.id, colaboradorId: alvo.colaboradorId }
              : undefined
          }
        />
      )}
    </section>
  );
}
