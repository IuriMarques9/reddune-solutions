"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  Check,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import {
  COBRANCA_ESTADO_LABEL,
  MENSALIDADE_PERIODO,
  PERIODO_LABEL,
  PERIODO_SUFIXO,
  PLANO_TIPO,
  PLANO_TIPO_LABEL,
  type Cobranca,
  type Mensalidade,
  type MensalidadePeriodo,
  type PlanoTipo,
} from "@/types/mensalidade";
import {
  DESPESA_CATEGORIA,
  DESPESA_CATEGORIA_LABEL,
  type Despesa,
  type DespesaCategoria,
} from "@/types/despesa";
import {
  METODO_PAGAMENTO,
  METODO_LABEL,
  type MetodoPagamento,
  type Pagamento,
} from "@/types/pagamento";
import { resumoMensalidade, isPlanoDespesa, CATEGORIA_CUSTO_PADRAO } from "@/lib/mensalidades";
import { LINHA_CATEGORIA, LINHA_CATEGORIA_LABEL, type LinhaCategoria } from "@/types/projeto";
import { comIva, IVA_LABEL } from "@/lib/iva";
import { parseMoney } from "@/lib/parse-number";
import { safeDelete, safeJsonPost } from "@/lib/safe-fetch";
import { useToast } from "@/hooks/use-toast";
import { useConfirm } from "@/components/ui/confirm-dialog";

type Props = {
  projetoId: string;
  mensalidades: Mensalidade[];
  /** Cobranças JÁ derivadas no servidor (fuso de Lisboa) — ver a nota abaixo. */
  cobrancas: Cobranca[];
  /** Pagamentos do projecto — só para adivinhar o método usado da última vez. */
  pagamentos: Pagamento[];
  /** Despesas do projecto — fecham as previsões dos planos de despesa. */
  despesas: Despesa[];
  /** `Projeto.comIva` — o default de um plano novo (pode divergir por plano). */
  projetoComIva: boolean;
  /** yyyy-mm-dd de hoje em Lisboa, calculado no servidor. */
  hoje: string;
};

// As cobranças e o `hoje` vêm do SERVIDOR de propósito. Se este componente as
// derivasse com `new Date()`, um browser noutro fuso classificava as prestações
// de forma diferente do resto do painel e a hidratação partia.

function money(n: number): string {
  return n.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(ymd: string): string {
  try {
    const [y, m, d] = ymd.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("pt-PT", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return ymd;
  }
}

/** "+4 dias" / "−2 dias" / "em dia" — a diferença entre o combinado e o real. */
function fmtDesvio(dias: number): string {
  if (dias === 0) return "em dia";
  if (dias > 0) return `+${dias} ${dias === 1 ? "dia" : "dias"}`;
  return `−${Math.abs(dias)} ${Math.abs(dias) === 1 ? "dia" : "dias"}`;
}

const ESTADO_COR: Record<Cobranca["estado"], string> = {
  paga: "var(--dune)",
  parcial: "var(--apricot)",
  vencida: "var(--ember)",
  "a-vencer": "var(--apricot)",
  futura: "var(--ink-mute)",
};

/** Quantas cobranças se mostram antes de ser preciso carregar em "ver todas". */
const VISIVEIS_POR_DEFEITO = 6;

export function MensalidadesSection({
  projetoId,
  mensalidades,
  cobrancas,
  pagamentos,
  despesas,
  projetoComIva,
  hoje,
}: Props) {
  const [aCriar, setACriar] = useState(false);
  const [aEditar, setAEditar] = useState<string | null>(null);

  return (
    <section className="card" id="mensalidades">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <div className="card-label" style={{ margin: 0 }}>
          <CalendarClock className="ic" aria-hidden="true" />
          Mensalidades e anuidades
        </div>
        {!aCriar && aEditar == null && (
          <button type="button" className="btn-ghost" onClick={() => setACriar(true)}>
            <Plus style={{ width: 13, height: 13 }} aria-hidden="true" />
            Novo plano
          </button>
        )}
      </div>

      {aCriar && (
        <PlanoForm
          projetoId={projetoId}
          projetoComIva={projetoComIva}
          onFechar={() => setACriar(false)}
        />
      )}

      {mensalidades.length === 0 && !aCriar ? (
        <p style={{ fontSize: 12, color: "var(--ink-mute)", fontStyle: "italic", margin: 0 }}>
          Sem planos. Um plano parte um valor em prestações (12 × 366,67 €), cobra todos os
          anos (manutenção), ou lembra-te do que <em>tu</em> pagas — alojamento, base de dados,
          domínio.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {mensalidades.map((m) =>
            aEditar === m.id ? (
              <PlanoForm
                key={m.id}
                projetoId={projetoId}
                projetoComIva={projetoComIva}
                mensalidade={m}
                onFechar={() => setAEditar(null)}
              />
            ) : (
              <PlanoCard
                key={m.id}
                mensalidade={m}
                cobrancas={cobrancas.filter((c) => c.mensalidadeId === m.id)}
                pagamentos={pagamentos}
                despesas={despesas}
                projetoId={projetoId}
                hoje={hoje}
                onEditar={() => setAEditar(m.id)}
              />
            )
          )}
        </div>
      )}
    </section>
  );
}

/* ─────────────────────────── Cartão de um plano ─────────────────────────── */

function PlanoCard({
  mensalidade: m,
  cobrancas,
  pagamentos,
  despesas,
  projetoId,
  hoje,
  onEditar,
}: {
  mensalidade: Mensalidade;
  cobrancas: Cobranca[];
  pagamentos: Pagamento[];
  despesas: Despesa[];
  projetoId: string;
  hoje: string;
  onEditar: () => void;
}) {
  const ehDespesa = isPlanoDespesa(m);
  const router = useRouter();
  const { toast } = useToast();
  const confirm = useConfirm();
  const [, startTransition] = useTransition();
  const [aConfirmar, setAConfirmar] = useState<number | null>(null);
  const [verTodas, setVerTodas] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  const resumo = useMemo(() => resumoMensalidade(m, cobrancas), [m, cobrancas]);
  // Plano sem valor previsto (lembrete de renovação): não há barra de progresso
  // nem "liquidado" que faça sentido — 0 por cobrar não quer dizer pago.
  const semValor = m.valor <= 0;
  const porLiquidar = cobrancas.filter((c) => c.estado !== "paga").length;
  const pct = resumo.valorTotal > 0 ? Math.min(100, (resumo.recebido / resumo.valorTotal) * 100) : 0;

  // Mostra as pagas mais recentes e o que aí vem; o resto esconde-se atrás do
  // botão para um plano de 12 meses não empurrar a página toda para baixo.
  const visiveis = verTodas ? cobrancas : cobrancas.slice(0, VISIVEIS_POR_DEFEITO);
  const escondidas = cobrancas.length - visiveis.length;

  async function gravar(patch: Partial<Mensalidade>, erroMsg: string) {
    setOcupado(true);
    const res = await safeJsonPost("/api/mensalidades/upsert", {
      id: m.id,
      projetoId: m.projetoId,
      titulo: m.titulo,
      tipo: m.tipo ?? "receita",
      valor: m.valor,
      periodo: m.periodo,
      categoriaDespesa: m.categoriaDespesa,
      primeiraCobranca: m.primeiraCobranca,
      numeroCobrancas: m.numeroCobrancas,
      ativo: m.ativo,
      dentroDoValor: m.dentroDoValor,
      comIva: m.comIva ?? false,
      notas: m.notas,
      fechadoEm: m.fechadoEm,
      ...patch,
    });
    setOcupado(false);
    if (!res.ok) {
      toast({ title: erroMsg, description: res.error, variant: "destructive" });
      return;
    }
    startTransition(() => router.refresh());
  }

  async function apagar() {
    const ligados = (ehDespesa ? despesas : pagamentos).filter(
      (p) => p.mensalidadeId === m.id
    ).length;
    const ok = await confirm({
      title: "Apagar plano?",
      description: ligados
        ? `${ligados === 1 ? "O registo" : `Os ${ligados} registos`} já ${
            ligados === 1 ? "feito" : "feitos"
          } NÃO ${ligados === 1 ? "desaparece" : "desaparecem"}: ${
            ehDespesa
              ? "as despesas continuam a contar nos gastos"
              : "os pagamentos continuam a contar na receita"
          }, só passam a avulso. Apaga-se o plano, não o dinheiro.`
        : "Este plano ainda não tem nada registado.",
      confirmLabel: "Apagar plano",
      tone: "destructive",
    });
    if (!ok) return;
    setOcupado(true);
    const res = await safeDelete(`/api/mensalidades/${encodeURIComponent(m.id)}`);
    setOcupado(false);
    if (!res.ok) {
      toast({ title: "Erro a apagar plano", description: res.error, variant: "destructive" });
      return;
    }
    startTransition(() => router.refresh());
  }

  const sufixo = PERIODO_SUFIXO[m.periodo];

  return (
    <div
      style={{
        border: "1px solid rgba(90,14,14,.10)",
        borderRadius: 12,
        padding: 12,
        background: m.ativo ? "#fff" : "rgba(90,14,14,.03)",
      }}
    >
      {/* Cabeçalho */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
        <b style={{ fontFamily: "var(--font-display)", fontSize: 14.5 }}>{m.titulo}</b>
        <span
          style={{ fontFamily: "var(--font-mono)", fontSize: 12.5 }}
          title={m.comIva ? `${money(m.valor)} € base + ${IVA_LABEL}` : undefined}
        >
          {m.valor > 0 ? (
            <>
              {money(ehDespesa ? m.valor : comIva(m.valor, m.comIva))} € / {sufixo}
              {m.comIva ? " c/ IVA" : ""}
            </>
          ) : (
            <span style={{ color: "var(--ink-mute)" }}>valor por definir / {sufixo}</span>
          )}
        </span>
        {ehDespesa && (
          <span
            title="Dinheiro NOSSO a sair (alojamento, base de dados, domínio). Não é dívida do cliente nem aparece no portal dele."
            style={{
              fontSize: 10.5,
              padding: "1px 7px",
              borderRadius: 999,
              background: "rgba(176,121,63,.18)",
              color: "#8a5a2b",
            }}
          >
            a pagar por nós
          </span>
        )}
        <span
          className="mono"
          style={{ fontSize: 11.5, color: "var(--ink-mute)" }}
        >
          {resumo.pagas}/{m.numeroCobrancas}
        </span>
        {m.dentroDoValor && (
          <span
            title="Estas cobranças são o valor do projecto partido em prestações — as Dívidas não somam o mesmo dinheiro duas vezes."
            style={{
              fontSize: 10.5,
              padding: "1px 7px",
              borderRadius: 999,
              background: "rgba(90,14,14,.07)",
              color: "var(--ink-soft)",
            }}
          >
            dentro do valor
          </span>
        )}
        {!m.ativo && (
          <span
            title="Desligado: não gera cobranças novas. As que já venceram por pagar mantêm-se."
            style={{
              fontSize: 10.5,
              padding: "1px 7px",
              borderRadius: 999,
              background: "rgba(90,14,14,.07)",
              color: "var(--ink-mute)",
            }}
          >
            desligado
          </span>
        )}

        <span style={{ marginLeft: "auto", display: "inline-flex", gap: 4 }}>
          <button
            type="button"
            className="icon-mini"
            onClick={onEditar}
            aria-label="Editar plano"
            title="Editar plano"
            disabled={ocupado}
          >
            <Pencil aria-hidden="true" />
          </button>
          <button
            type="button"
            className="icon-mini"
            onClick={apagar}
            aria-label="Apagar plano"
            title="Apagar plano"
            disabled={ocupado}
          >
            <Trash2 aria-hidden="true" />
          </button>
        </span>
      </div>

      {/* Progresso */}
      <div style={{ marginTop: 10 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontFamily: "var(--font-mono)",
            fontSize: 11.5,
            marginBottom: semValor ? 0 : 4,
          }}
        >
          <span>
            {money(resumo.recebido)} € {ehDespesa ? "pagos" : "recebidos"}
          </span>
          {semValor ? (
            <span style={{ color: porLiquidar > 0 ? "var(--ink-soft)" : "var(--dune)" }}>
              {porLiquidar > 0
                ? `${porLiquidar} por pagar · valor por definir`
                : "Todas registadas"}
            </span>
          ) : (
            <span style={{ color: resumo.porCobrar > 0 ? "var(--ember)" : "var(--dune)" }}>
              {resumo.porCobrar > 0
                ? `${money(resumo.porCobrar)} € ${ehDespesa ? "por pagar" : "por cobrar"}`
                : "Liquidado"}
            </span>
          )}
        </div>
        {!semValor && (
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${Math.max(2, pct)}%` }} />
          </div>
        )}
      </div>

      {/* Fim do plano: renovar ou fechar */}
      {resumo.terminada && !m.fechadoEm && (
        <div
          style={{
            marginTop: 10,
            padding: "8px 10px",
            borderRadius: 10,
            background: "rgba(214,66,42,.07)",
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: 12.5 }}>
            Plano cumprido — {m.numeroCobrancas} cobranças pagas. Renovar ou fechar?
          </span>
          <span style={{ marginLeft: "auto", display: "inline-flex", gap: 6 }}>
            <button
              type="button"
              className="btn-ghost"
              disabled={ocupado}
              onClick={() =>
                gravar(
                  { numeroCobrancas: m.numeroCobrancas + (m.periodo === "anual" ? 1 : 12) },
                  "Erro a renovar plano"
                )
              }
            >
              <RefreshCw style={{ width: 13, height: 13 }} aria-hidden="true" />
              Renovar (+{m.periodo === "anual" ? 1 : 12})
            </button>
            <button
              type="button"
              className="btn-ghost"
              disabled={ocupado}
              onClick={() =>
                gravar({ ativo: false, fechadoEm: new Date().toISOString() }, "Erro a fechar plano")
              }
            >
              <X style={{ width: 13, height: 13 }} aria-hidden="true" />
              Fechar
            </button>
          </span>
        </div>
      )}

      {/* Interruptor */}
      {!resumo.terminada && (
        <label
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            marginTop: 10,
            fontSize: 12.5,
            cursor: ocupado ? "default" : "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={m.ativo}
            disabled={ocupado}
            onChange={(e) =>
              gravar(
                { ativo: e.target.checked, fechadoEm: e.target.checked ? null : m.fechadoEm },
                "Erro a mudar o estado do plano"
              )
            }
          />
          Activo
        </label>
      )}

      {/* Cobranças */}
      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
        {visiveis.map((c) =>
          aConfirmar === c.numero ? (
            <ConfirmarCobranca
              key={c.numero}
              cobranca={c}
              projetoId={projetoId}
              pagamentos={pagamentos}
              plano={m}
              comIva={m.comIva ?? false}
              hoje={hoje}
              onFechar={() => setAConfirmar(null)}
            />
          ) : (
            <LinhaCobranca
              key={c.numero}
              cobranca={c}
              ehDespesa={ehDespesa}
              onConfirmar={() => setAConfirmar(c.numero)}
            />
          )
        )}
        {escondidas > 0 && (
          <button
            type="button"
            className="btn-ghost"
            style={{ alignSelf: "flex-start" }}
            onClick={() => setVerTodas(true)}
          >
            Ver todas ({cobrancas.length})
          </button>
        )}
      </div>

      {m.notas && (
        <p style={{ fontSize: 12, color: "var(--ink-mute)", margin: "10px 0 0" }}>{m.notas}</p>
      )}
    </div>
  );
}

function LinhaCobranca({
  cobranca: c,
  ehDespesa,
  onConfirmar,
}: {
  cobranca: Cobranca;
  ehDespesa: boolean;
  onConfirmar: () => void;
}) {
  const paga = c.estado === "paga";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        flexWrap: "wrap",
        padding: "6px 0",
        borderBottom: "1px dashed rgba(90,14,14,.08)",
        opacity: c.estado === "futura" ? 0.65 : 1,
      }}
    >
      <span className="mono" style={{ fontSize: 11, color: "var(--ink-mute)", width: 28 }}>
        {c.numero}.
      </span>
      <span className="mono" style={{ fontSize: 12 }}>
        {fmtDate(c.dataPrevista)}
      </span>
      <span style={{ fontSize: 12.5, fontWeight: 600 }}>
        {c.valor > 0 ? (
          `${money(c.valor)} €`
        ) : (
          <span style={{ color: "var(--ink-mute)", fontWeight: 400 }}>por definir</span>
        )}
      </span>
      <span style={{ fontSize: 11.5, color: ESTADO_COR[c.estado] }}>
        {COBRANCA_ESTADO_LABEL[c.estado]}
        {c.estado === "parcial" && ` · ${money(c.pago)} € de ${money(c.valor)} €`}
      </span>
      {/* A data REAL e o desvio face ao combinado — o pedido do Iuri. */}
      {c.dataPaga && (
        <span style={{ fontSize: 11.5, color: "var(--ink-mute)" }}>
          {ehDespesa ? "pago a " : "pago a "}{fmtDate(c.dataPaga)}
          {c.desvioDias != null && ` · ${fmtDesvio(c.desvioDias)}`}
        </span>
      )}
      {!paga && (
        <button
          type="button"
          className="btn-ghost"
          style={{ marginLeft: "auto" }}
          onClick={onConfirmar}
        >
          <Check style={{ width: 13, height: 13 }} aria-hidden="true" />
          {ehDespesa ? "Paguei" : "Recebido"}
        </button>
      )}
    </div>
  );
}

/**
 * Confirmar que o dinheiro se moveu. A data vem a HOJE mas é editável de
 * propósito: o cliente pode ter pago a anuidade num dia que não é o previsto, e
 * é a data real que conta para o mês.
 *
 * Num plano de RECEITA grava um `Pagamento`; num plano de DESPESA grava uma
 * `Despesa` ligada ao projecto. É o mesmo gesto, destinos diferentes — por isso
 * o gasto do alojamento entra nos relatórios sem passos extra.
 */
function ConfirmarCobranca({
  cobranca: c,
  projetoId,
  pagamentos,
  plano,
  comIva: levaIva,
  hoje,
  onFechar,
}: {
  cobranca: Cobranca;
  projetoId: string;
  pagamentos: Pagamento[];
  plano: Mensalidade;
  /** O plano leva IVA — o recibo herda a marca, para o lucro descontar a parcela. */
  comIva: boolean;
  hoje: string;
  onFechar: () => void;
}) {
  const ehDespesa = isPlanoDespesa(plano);
  const router = useRouter();
  const { toast } = useToast();
  const [, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const emFalta = Math.max(0, Math.round((c.valor - c.pago) * 100) / 100);
  // Sem previsão de valor (planos de despesa criados como lembrete) o campo
  // nasce vazio — escreve-se o que a factura disser.
  const [valor, setValor] = useState(emFalta > 0 ? String(emFalta) : "");
  const [categoria, setCategoria] = useState<DespesaCategoria>(
    plano.categoriaDespesa ?? "dominios"
  );
  const [data, setData] = useState(hoje);
  const ultimoMetodo = useMemo(() => {
    const ordenados = [...pagamentos].sort((a, b) => (a.data < b.data ? 1 : -1));
    return ordenados.find((p) => p.metodo)?.metodo ?? "";
  }, [pagamentos]);
  const [metodo, setMetodo] = useState<MetodoPagamento | "">(ultimoMetodo);
  const [notas, setNotas] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submeter(e: React.FormEvent) {
    e.preventDefault();
    const v = parseMoney(valor);
    if (v == null || v <= 0) {
      setError("Valor inválido.");
      return;
    }
    setSaving(true);
    setError(null);
    const res = ehDespesa
      ? await safeJsonPost("/api/despesas/upsert", {
          descricao: plano.titulo,
          categoria,
          valor: v,
          data,
          projetoId,
          notas: notas.trim() || null,
          mensalidadeId: c.mensalidadeId,
          cobrancaNumero: c.numero,
        })
      : await safeJsonPost("/api/pagamentos/upsert", {
          projetoId,
          valor: v,
          data,
          metodo: metodo || null,
          notas: notas.trim() || null,
          comIva: levaIva,
          mensalidadeId: c.mensalidadeId,
          cobrancaNumero: c.numero,
        });
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      toast({
        title: ehDespesa ? "Erro a registar despesa" : "Erro a registar pagamento",
        description: res.error,
        variant: "destructive",
      });
      return;
    }
    onFechar();
    startTransition(() => router.refresh());
  }

  return (
    <form
      ref={formRef}
      onSubmit={submeter}
      style={{
        border: "1px solid rgba(214,66,42,.25)",
        borderRadius: 10,
        padding: 10,
        background: "#fff",
      }}
    >
      <div style={{ fontSize: 12, color: "var(--ink-soft)", marginBottom: 8 }}>
        {ehDespesa ? "Renovação" : "Cobrança"} {c.numero} · prevista para{" "}
        {fmtDate(c.dataPrevista)}
        {levaIva && !ehDespesa && <> · valor já com {IVA_LABEL}</>}
        {ehDespesa && c.valor <= 0 && <> · escreve o que a factura diz</>}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0 12px" }}>
        <div className="field">
          <label htmlFor={`cb-valor-${c.mensalidadeId}-${c.numero}`}>Valor €</label>
          <input
            id={`cb-valor-${c.mensalidadeId}-${c.numero}`}
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
          <label htmlFor={`cb-data-${c.mensalidadeId}-${c.numero}`}>
            {ehDespesa ? "Paguei a" : "Entrou a"}
          </label>
          <input
            id={`cb-data-${c.mensalidadeId}-${c.numero}`}
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            disabled={saving}
            required
          />
        </div>
        <div className="field">
          {ehDespesa ? (
            <>
              <label htmlFor={`cb-cat-${c.mensalidadeId}-${c.numero}`}>Categoria</label>
              <select
                id={`cb-cat-${c.mensalidadeId}-${c.numero}`}
                value={categoria}
                onChange={(e) => setCategoria(e.target.value as DespesaCategoria)}
                disabled={saving}
              >
                {DESPESA_CATEGORIA.map((cc) => (
                  <option key={cc} value={cc}>
                    {DESPESA_CATEGORIA_LABEL[cc]}
                  </option>
                ))}
              </select>
            </>
          ) : (
            <>
              <label htmlFor={`cb-metodo-${c.mensalidadeId}-${c.numero}`}>Método</label>
              <select
                id={`cb-metodo-${c.mensalidadeId}-${c.numero}`}
                value={metodo}
                onChange={(e) => setMetodo(e.target.value as MetodoPagamento | "")}
                disabled={saving}
              >
                <option value="">—</option>
                {METODO_PAGAMENTO.map((mm) => (
                  <option key={mm} value={mm}>
                    {METODO_LABEL[mm]}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>
      </div>
      <div className="field">
        <label htmlFor={`cb-notas-${c.mensalidadeId}-${c.numero}`}>Observações</label>
        <textarea
          id={`cb-notas-${c.mensalidadeId}-${c.numero}`}
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          rows={2}
          maxLength={2000}
          disabled={saving}
        />
      </div>
      {error && <p style={{ fontSize: 12, color: "var(--ember)", margin: "0 0 10px" }}>{error}</p>}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button type="button" className="btn-ghost" onClick={onFechar} disabled={saving}>
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
  );
}

/* ──────────────────────── Formulário de plano ──────────────────────── */

function PlanoForm({
  projetoId,
  projetoComIva,
  mensalidade,
  onFechar,
}: {
  projetoId: string;
  projetoComIva: boolean;
  mensalidade?: Mensalidade;
  onFechar: () => void;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [, startTransition] = useTransition();
  const [tipo, setTipo] = useState<PlanoTipo>(mensalidade?.tipo ?? "receita");
  const ehDespesa = tipo === "despesa";
  const [categoriaDespesa, setCategoriaDespesa] = useState<DespesaCategoria>(
    mensalidade?.categoriaDespesa ?? "dominios"
  );
  const [titulo, setTitulo] = useState(mensalidade?.titulo ?? "");
  const [valor, setValor] = useState(mensalidade ? String(mensalidade.valor) : "");
  const [periodo, setPeriodo] = useState<MensalidadePeriodo>(mensalidade?.periodo ?? "mensal");
  const [primeira, setPrimeira] = useState(mensalidade?.primeiraCobranca ?? "");
  const [quantas, setQuantas] = useState(String(mensalidade?.numeroCobrancas ?? 12));
  const [dentroDoValor, setDentroDoValor] = useState(mensalidade?.dentroDoValor ?? true);
  // Herda o do projecto num plano novo; num plano existente manda o que lá está.
  const [levaIva, setLevaIva] = useState(mensalidade?.comIva ?? projetoComIva);
  const [categoriaCusto, setCategoriaCusto] = useState<LinhaCategoria>(
    mensalidade?.categoriaCusto ?? CATEGORIA_CUSTO_PADRAO
  );
  const [notas, setNotas] = useState(mensalidade?.notas ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const v = parseMoney(valor);
  const n = Number.parseInt(quantas, 10);
  const porCobranca = v != null ? comIva(v, levaIva) : null;
  const total =
    porCobranca != null && Number.isFinite(n) && n > 0 ? porCobranca * n : null;

  async function submeter(e: React.FormEvent) {
    e.preventDefault();
    // Num plano de despesa o valor é opcional: nasce como lembrete da
    // renovação e o número real escreve-se quando a factura chegar.
    if (!ehDespesa && (v == null || v <= 0)) {
      return setError("Um plano a receber precisa de um valor por cobrança.");
    }
    if (ehDespesa && valor.trim() !== "" && v == null) return setError("Valor inválido.");
    if (!Number.isFinite(n) || n < 1) return setError("Número de cobranças inválido.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(primeira)) return setError("Escolhe a data da primeira cobrança.");

    setSaving(true);
    setError(null);
    const res = await safeJsonPost("/api/mensalidades/upsert", {
      id: mensalidade?.id,
      projetoId,
      titulo:
        titulo.trim() ||
        (ehDespesa ? "Renovação" : periodo === "anual" ? "Anuidade" : "Mensalidade"),
      tipo,
      valor: v ?? 0,
      categoriaDespesa,
      periodo,
      primeiraCobranca: primeira,
      numeroCobrancas: n,
      ativo: mensalidade?.ativo ?? true,
      dentroDoValor,
      comIva: levaIva,
      categoriaCusto,
      notas: notas.trim() || null,
      fechadoEm: mensalidade?.fechadoEm ?? null,
    });
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      toast({ title: "Erro a gravar plano", description: res.error, variant: "destructive" });
      return;
    }
    onFechar();
    startTransition(() => router.refresh());
  }

  return (
    <form
      onSubmit={submeter}
      style={{
        border: "1px solid rgba(90,14,14,.10)",
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
        background: "#fff",
      }}
    >
      <div className="field">
        <label htmlFor="mn-tipo">Sentido do dinheiro</label>
        <select
          id="mn-tipo"
          value={tipo}
          onChange={(e) => setTipo(e.target.value as PlanoTipo)}
          disabled={saving}
        >
          {PLANO_TIPO.map((t) => (
            <option key={t} value={t}>
              {PLANO_TIPO_LABEL[t]}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="mn-titulo">Nome do plano</label>
        <input
          id="mn-titulo"
          type="text"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder={
            ehDespesa
              ? "Alojamento e domínio"
              : periodo === "anual"
                ? "Manutenção anual"
                : "Mensalidade 12x"
          }
          maxLength={120}
          disabled={saving}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
        <div className="field">
          <label htmlFor="mn-valor">
            {ehDespesa ? "Valor € (opcional)" : "Valor de cada cobrança € (s/ IVA)"}
          </label>
          <input
            id="mn-valor"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            disabled={saving}
            required={!ehDespesa}
            placeholder={ehDespesa ? "deixa vazio se ainda não sabes" : undefined}
          />
        </div>
        <div className="field">
          <label htmlFor="mn-periodo">De quanto em quanto tempo</label>
          <select
            id="mn-periodo"
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value as MensalidadePeriodo)}
            disabled={saving}
          >
            {MENSALIDADE_PERIODO.map((p) => (
              <option key={p} value={p}>
                {PERIODO_LABEL[p]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
        <div className="field">
          <label htmlFor="mn-primeira">Primeira cobrança</label>
          <input
            id="mn-primeira"
            type="date"
            value={primeira}
            onChange={(e) => setPrimeira(e.target.value)}
            disabled={saving}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="mn-quantas">Quantas cobranças</label>
          <input
            id="mn-quantas"
            type="number"
            step="1"
            min="1"
            value={quantas}
            onChange={(e) => setQuantas(e.target.value)}
            disabled={saving}
            required
          />
        </div>
      </div>

      {/* O dia do mês sai da data da primeira cobrança — não há campo separado. */}
      <p style={{ fontSize: 11.5, color: "var(--ink-mute)", margin: "0 0 10px" }}>
        As cobranças seguintes caem no mesmo dia do mês (ou do ano). Dia 31 passa para o último
        dia dos meses mais curtos.
        {total != null && (
          <>
            {" "}
            Total do plano: <b>{money(total)} €</b>
            {levaIva && porCobranca != null && (
              <> — {money(porCobranca)} € por cobrança, já com {IVA_LABEL}</>
            )}
            .
          </>
        )}
      </p>

      {!ehDespesa && (
        <>
      <label
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 8,
          marginBottom: 10,
          fontSize: 12.5,
          cursor: saving ? "default" : "pointer",
        }}
      >
        <input
          type="checkbox"
          checked={levaIva}
          onChange={(e) => setLevaIva(e.target.checked)}
          disabled={saving}
          style={{ marginTop: 3 }}
        />
        <span>
          Acrescentar {IVA_LABEL}
          <span style={{ display: "block", color: "var(--ink-mute)", fontSize: 11.5 }}>
            O valor acima é sempre a base s/ IVA. Ligado, cada cobrança passa a ser
            cobrada com IVA por cima — é esse o número que tem de bater com o
            pagamento registado.
          </span>
        </span>
      </label>

      <label
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 8,
          marginBottom: 10,
          fontSize: 12.5,
          cursor: saving ? "default" : "pointer",
        }}
      >
        <input
          type="checkbox"
          checked={dentroDoValor}
          onChange={(e) => setDentroDoValor(e.target.checked)}
          disabled={saving}
          style={{ marginTop: 3 }}
        />
        <span>
          Faz parte do valor do projecto
          <span style={{ display: "block", color: "var(--ink-mute)", fontSize: 11.5 }}>
            Ligado: estas cobranças SÃO o valor já orçamentado, partido em prestações — as
            Dívidas não contam o mesmo dinheiro duas vezes. Desligado: é dinheiro por cima
            (manutenção, alojamento, avença) e o painel cria a linha nos Custos por ti.
          </span>
        </span>
      </label>

      {/* Só aparece quando o plano vai mesmo gerar linha — senão é ruído. */}
      {!dentroDoValor && (
        <div
          style={{
            border: "1px dashed rgba(90,14,14,.16)",
            borderRadius: 10,
            padding: "10px 12px",
            marginBottom: 10,
          }}
        >
          <div className="field" style={{ marginBottom: 6 }}>
            <label htmlFor="mn-cat">Categoria nos Custos</label>
            <select
              id="mn-cat"
              value={categoriaCusto}
              onChange={(e) => setCategoriaCusto(e.target.value as LinhaCategoria)}
              disabled={saving}
            >
              {LINHA_CATEGORIA.map((c) => (
                <option key={c} value={c}>
                  {LINHA_CATEGORIA_LABEL[c]}
                </option>
              ))}
            </select>
          </div>
          <p style={{ fontSize: 11.5, color: "var(--ink-mute)", margin: 0 }}>
            Nasce a linha{" "}
            <b>
              {(titulo.trim() || (periodo === "anual" ? "Anuidade" : "Mensalidade"))} (
              {PERIODO_SUFIXO[periodo]})
            </b>
            {v != null && <> — {money(v)} €</>}, com o valor de <b>um período</b>. Não conta
            como gasto da RedDune: é dinheiro a receber, e serve para o cliente ver a rubrica
            no portal. Editas ou apagas nos Custos como qualquer outra linha.
          </p>
        </div>
      )}

        </>
      )}

      {ehDespesa && (
        <div
          style={{
            border: "1px dashed rgba(90,14,14,.16)",
            borderRadius: 10,
            padding: "10px 12px",
            marginBottom: 10,
          }}
        >
          <div className="field" style={{ marginBottom: 6 }}>
            <label htmlFor="mn-catdesp">Categoria da despesa</label>
            <select
              id="mn-catdesp"
              value={categoriaDespesa}
              onChange={(e) => setCategoriaDespesa(e.target.value as DespesaCategoria)}
              disabled={saving}
            >
              {DESPESA_CATEGORIA.map((cc) => (
                <option key={cc} value={cc}>
                  {DESPESA_CATEGORIA_LABEL[cc]}
                </option>
              ))}
            </select>
          </div>
          <p style={{ fontSize: 11.5, color: "var(--ink-mute)", margin: 0 }}>
            Isto é dinheiro <b>teu</b> a sair. Não cria linha nos Custos, não é dívida do
            cliente e <b>não aparece no portal dele</b>. No dia certo avisa-te no calendário e
            no sino; carregas em <b>Paguei</b>, escreves o que a factura diz, e nasce a
            despesa ligada a este projecto — a entrar logo nos gastos e no lucro.
          </p>
          <p style={{ fontSize: 11.5, color: "var(--ink-mute)", margin: "8px 0 0" }}>
            O teu tempo de manutenção <b>não</b> se regista aqui: trabalho teu é lucro, não é
            gasto. Só entra o que sai mesmo do banco.
          </p>
        </div>
      )}

      <div className="field">
        <label htmlFor="mn-notas">Notas internas</label>
        <textarea
          id="mn-notas"
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          rows={2}
          maxLength={2000}
          disabled={saving}
          placeholder="Não vai ao portal do cliente."
        />
      </div>

      {error && <p style={{ fontSize: 12, color: "var(--ember)", margin: "0 0 10px" }}>{error}</p>}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button type="button" className="btn-ghost" onClick={onFechar} disabled={saving}>
          Cancelar
        </button>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving && (
            <Loader2 className="animate-spin" style={{ width: 14, height: 14 }} aria-hidden="true" />
          )}
          {mensalidade ? "Guardar" : "Criar plano"}
        </button>
      </div>
    </form>
  );
}
