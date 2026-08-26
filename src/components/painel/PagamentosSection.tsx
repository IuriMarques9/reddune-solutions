"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2, Euro } from "lucide-react";
import { METODO_PAGAMENTO, METODO_LABEL, type Pagamento, type MetodoPagamento } from "@/types/pagamento";
import { parseMoney } from "@/lib/parse-number";
import {
  comIva as aplicaIva,
  parcelaIva,
  semIva,
  eurCompacto,
  IVA_LABEL,
  IVA_TAXA,
  cents,
} from "@/lib/iva";
import { safeJsonPost, safeDelete } from "@/lib/safe-fetch";
import { useToast } from "@/hooks/use-toast";
import { useConfirm } from "@/components/ui/confirm-dialog";

type Props = {
  projetoId: string;
  pagamentos: Pagamento[];
  /** BASE s/ IVA do orçamento — o IVA nunca está gravado aqui dentro. */
  valorEstimado?: number | null;
  /** Default de IVA do projecto; cada pagamento pode divergir. */
  projetoComIva?: boolean;
  projetoStatus?: string;
  projetoTitulo?: string;
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

const money = eurCompacto;

export function PagamentosSection({
  projetoId,
  pagamentos,
  valorEstimado,
  projetoComIva = false,
  projetoStatus,
  projetoTitulo,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const confirm = useConfirm();
  const [, startTransition] = useTransition();
  const [adding, setAdding] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [valor, setValor] = useState("");
  const [data, setData] = useState(todayIso());
  const [metodo, setMetodo] = useState<MetodoPagamento | "">("");
  const [notas, setNotas] = useState("");
  // Este recibo leva IVA? Arranca no default do projecto, mas o Iuri pode
  // desligar num pagamento só (parte do trabalho passada sem IVA).
  const [comIva, setComIva] = useState(projetoComIva);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tudo BRUTO: `valor` é o que o cliente entregou, `totalACobrar` é o
  // orçamento já com IVA quando o projecto o leva. Bruto contra bruto — a
  // dívida fecha mesmo com pagamentos mistos. Ver src/lib/iva.ts.
  const totalPago = cents(pagamentos.reduce((s, p) => s + p.valor, 0));
  const totalACobrar = valorEstimado != null ? aplicaIva(valorEstimado, projetoComIva) : null;
  const ivaOrcamento = totalACobrar != null ? cents(totalACobrar - valorEstimado!) : 0;
  const emDivida = totalACobrar != null ? cents(totalACobrar - totalPago) : null;
  const ivaRecebido = cents(pagamentos.reduce((s, p) => s + parcelaIva(p.valor, p.comIva), 0));
  const canClose = projetoStatus === "terminado" && emDivida != null && emDivida <= 0;

  // Quick payment helpers
  const ultimoMetodo: MetodoPagamento | null = (() => {
    const sorted = [...pagamentos].sort((a, b) => (a.data < b.data ? 1 : -1));
    for (const p of sorted) {
      if (p.metodo) return p.metodo;
    }
    return null;
  })();

  // Atalho = pré-preencher o formulário (valor + hoje + último método usado)
  // em vez de registar às escuras — permite confirmar/trocar o método e pôr
  // observações, exactamente como um pagamento manual.
  function quickPay(v: number) {
    if (!Number.isFinite(v) || v <= 0) return;
    setValor(String(cents(v)));
    setData(todayIso());
    setMetodo(ultimoMetodo ?? "");
    setNotas("");
    // Os atalhos saem do orçamento, logo seguem o IVA do projecto.
    setComIva(projetoComIva);
    setError(null);
    setAdding(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 0);
  }

  // Atalhos em valor BRUTO — é o que o cliente transfere.
  const entradaValor =
    totalACobrar != null && totalACobrar > 0 && totalPago === 0
      ? cents(totalACobrar * 0.5)
      : null;
  const restante = emDivida != null && emDivida > 0 ? emDivida : null;

  async function fecharProjeto() {
    if (!projetoTitulo) return;
    const res = await safeJsonPost("/api/projetos/upsert", {
      id: projetoId,
      titulo: projetoTitulo,
      status: "fechado",
    });
    if (!res.ok) {
      toast({ title: "Erro a fechar projecto", description: res.error, variant: "destructive" });
      return;
    }
    startTransition(() => router.refresh());
  }

  function reset() {
    setValor("");
    setData(todayIso());
    setMetodo("");
    setNotas("");
    setComIva(projetoComIva);
    setError(null);
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const v = parseMoney(valor);
    if (v == null || v <= 0) {
      setError("Valor inválido.");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await safeJsonPost("/api/pagamentos/upsert", {
      projetoId,
      valor: v,
      comIva,
      data,
      metodo: metodo || null,
      notas: notas.trim() || null,
    });
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      toast({ title: "Erro a registar pagamento", description: res.error, variant: "destructive" });
      return;
    }
    reset();
    setAdding(false);
    startTransition(() => router.refresh());
  }

  async function remove(id: string) {
    const ok = await confirm({
      title: "Apagar pagamento?",
      description: "Esta acção remove o pagamento permanentemente e recalcula o valor em dívida.",
      confirmLabel: "Apagar",
      tone: "destructive",
    });
    if (!ok) return;
    const res = await safeDelete(`/api/pagamentos/${encodeURIComponent(id)}`);
    if (!res.ok) {
      toast({ title: "Erro a apagar pagamento", description: res.error, variant: "destructive" });
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <section className="card">
      {/* Cabeçalho: label + Adicionar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div className="card-label" style={{ margin: 0 }}>
          <Euro className="ic" aria-hidden="true" />
          Pagamentos
        </div>
        {!adding && (
          <button
            type="button"
            className="btn-ghost"
            onClick={() => {
              setAdding(true);
              setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 0);
            }}
          >
            <Plus style={{ width: 13, height: 13 }} aria-hidden="true" />
            Adicionar
          </button>
        )}
      </div>

      {/* Resumo mono: Pago · Total · Em dívida */}
      <div
        style={{
          display: "flex",
          gap: 16,
          flexWrap: "wrap",
          alignItems: "center",
          fontFamily: "var(--font-mono)",
          fontSize: 12.5,
          marginBottom: 10,
        }}
      >
        <span>
          Pago: <b>{money(totalPago)}€</b>
          {ivaRecebido > 0 && (
            <span style={{ color: "var(--ink-mute)" }}> (inclui {money(ivaRecebido)}€ de IVA)</span>
          )}
        </span>
        {totalACobrar != null && (
          <>
            <span style={{ color: "var(--ink-mute)" }}>
              Total: {money(totalACobrar)}€
              {projetoComIva && (
                <> ({money(valorEstimado!)} s/ IVA + {money(ivaOrcamento)} de {IVA_LABEL})</>
              )}
            </span>
            {emDivida != null && emDivida > 0 && (
              <span style={{ color: "var(--ember)", fontWeight: 700 }}>
                Em dívida: {money(emDivida)}€
              </span>
            )}
            {emDivida != null && emDivida <= 0 && (
              <span style={{ color: "var(--dune)", fontWeight: 700 }}>Liquidado</span>
            )}
          </>
        )}
        {canClose && (
          <button
            type="button"
            className="btn-ghost"
            style={{ marginLeft: "auto" }}
            onClick={fecharProjeto}
          >
            Marcar como fechado
          </button>
        )}
      </div>

      {/* Quick-pay */}
      {(entradaValor != null || restante != null) && !adding && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          {entradaValor != null && (
            <button
              type="button"
              className="btn-ghost"
              onClick={() => quickPay(entradaValor)}
              disabled={saving}
            >
              Entrada (50%): {money(entradaValor)}€
            </button>
          )}
          {restante != null && (
            <button
              type="button"
              className="btn-ghost"
              onClick={() => quickPay(restante)}
              disabled={saving}
            >
              Liquidar restante: {money(restante)}€
            </button>
          )}
        </div>
      )}

      {/* Formulário de novo pagamento */}
      {adding && (
        <form
          ref={formRef}
          onSubmit={add}
          style={{
            border: "1px solid rgba(90,14,14,.10)",
            borderRadius: 12,
            padding: 12,
            marginBottom: 12,
            background: "#fff",
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0 12px" }}>
            <div className="field">
              <label htmlFor="pg-valor">Valor €</label>
              <input
                id="pg-valor"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                disabled={saving}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="pg-data">Data</label>
              <input
                id="pg-data"
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                disabled={saving}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="pg-metodo">Método</label>
              <select
                id="pg-metodo"
                value={metodo}
                onChange={(e) => setMetodo(e.target.value as MetodoPagamento | "")}
                disabled={saving}
              >
                <option value="">—</option>
                {METODO_PAGAMENTO.map((m) => (
                  <option key={m} value={m}>
                    {METODO_LABEL[m]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {/* IVA por pagamento: o valor acima é sempre o que o cliente
              entregou; este checkbox só diz se esses euros levam IVA dentro.
              Arranca no default do projecto e pode divergir. */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
              margin: "0 0 10px",
            }}
          >
            <label
              style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}
            >
              <input
                type="checkbox"
                className="accent-ember"
                checked={comIva}
                onChange={(e) => setComIva(e.target.checked)}
                disabled={saving}
              />
              Este pagamento leva IVA ({Math.round(IVA_TAXA * 100)}%)
            </label>
            {(() => {
              const v = parseMoney(valor);
              if (v == null || v <= 0) return null;
              const base = semIva(v, comIva);
              return (
                <span
                  style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink-mute)" }}
                >
                  {comIva
                    ? `${money(v)}€ = ${money(base)}€ base + ${money(cents(v - base))}€ IVA`
                    : `${money(v)}€ sem IVA`}
                </span>
              );
            })()}
          </div>
          <div className="field">
            <label htmlFor="pg-notas">Observações</label>
            <textarea
              id="pg-notas"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={2}
              maxLength={2000}
              disabled={saving}
            />
          </div>
          {error && (
            <p style={{ fontSize: 12, color: "var(--ember)", margin: "0 0 10px" }}>{error}</p>
          )}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => { setAdding(false); reset(); }}
              disabled={saving}
            >
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving && (
                <Loader2 className="animate-spin" style={{ width: 14, height: 14 }} aria-hidden="true" />
              )}
              Registar
            </button>
          </div>
        </form>
      )}

      {/* Lista de pagamentos */}
      {pagamentos.length === 0 ? (
        <p style={{ fontSize: 12, color: "var(--ink-mute)", fontStyle: "italic", margin: 0 }}>
          Sem pagamentos registados.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {pagamentos.map((p) => (
            <div key={p.id} className="pay">
              <b>{money(p.valor)}€</b>
              {/* Só marca o que é informativo: quando leva IVA, ou quando NÃO
                  leva num projecto que por defeito leva (a excepção). */}
              {p.comIva ? (
                <span
                  className="pm"
                  title={`${money(semIva(p.valor, true))}€ base + ${money(parcelaIva(p.valor, true))}€ IVA`}
                >
                  c/ IVA
                </span>
              ) : projetoComIva ? (
                <span className="pm" title="Registado sem IVA">
                  s/ IVA
                </span>
              ) : null}
              <span className="pd">{fmtDate(p.data)}</span>
              {p.metodo && <span className="pm">{METODO_LABEL[p.metodo]}</span>}
              {p.notas && (
                <span
                  style={{
                    fontSize: 12,
                    color: "var(--ink-mute)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    minWidth: 0,
                    flex: 1,
                  }}
                >
                  {p.notas}
                </span>
              )}
              <button
                type="button"
                className="icon-mini"
                onClick={() => remove(p.id)}
                aria-label="Apagar pagamento"
                title="Apagar pagamento"
              >
                <Trash2 aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
