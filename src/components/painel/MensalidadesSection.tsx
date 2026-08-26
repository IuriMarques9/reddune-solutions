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
import {
  resumoMensalidade,
  isPlanoDespesa,
  isPlanoPorArrancar,
  margemDoPlano,
  CATEGORIA_CUSTO_PADRAO,
} from "@/lib/mensalidades";
import { LINHA_CATEGORIA, LINHA_CATEGORIA_LABEL, type LinhaCategoria } from "@/types/projeto";
import { comIva, IVA_LABEL, IVA_TAXA } from "@/lib/iva";
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
  const porArrancar = isPlanoPorArrancar(m);
  const margem = useMemo(() => margemDoPlano(m), [m]);
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
      custo: m.custo ?? 0,
      custoComIva: m.custoComIva ?? true,
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
        : "Nunca recebeu nada — a linha que criou nos Custos sai com ele.",
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
            className="pill warm"
            title="Dinheiro NOSSO a sair (alojamento, base de dados, domínio). Não é dívida do cliente nem aparece no portal dele."
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
            className="pill mute"
            title="Estas cobranças são o valor do projecto partido em prestações — as Dívidas não somam o mesmo dinheiro duas vezes."
          >
            dentro do valor
          </span>
        )}
        {porArrancar && (
          <span
            className="pill warm"
            title="Combinado mas sem data. A linha já está nos Custos; o calendário nasce quando o cliente pagar."
          >
            por arrancar
          </span>
        )}
        {!m.ativo && !porArrancar && (
          <span
            className="pill mute"
            title="Desligado: não gera cobranças novas. As que já venceram por pagar mantêm-se."
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
          {porArrancar ? (
            // Sem cobranças, `porCobrar` é 0 — e 0 por cobrar NÃO é liquidado.
            <span style={{ color: "var(--ink-soft)" }}>
              {money(resumo.valorTotal)} € combinados
            </span>
          ) : semValor ? (
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
        {!semValor && !porArrancar && (
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${Math.max(2, pct)}%` }} />
          </div>
        )}
      </div>

      {/* Margem — INTERNA. O cliente vê só o que paga. */}
      {margem && (
        <div
          title="Só para ti: o cliente nunca vê o custo nem a margem. Ambos em base s/ IVA — o IVA que pagas é dedutível."
          style={{
            marginTop: 10,
            fontFamily: "var(--font-mono)",
            fontSize: 11.5,
            display: "flex",
            gap: 14,
            flexWrap: "wrap",
            color: "var(--ink-soft)",
          }}
        >
          <span>cobro {money(margem.receita)} €</span>
          <span>custa-me {money(margem.custo)} €</span>
          <span style={{ color: margem.margem >= 0 ? "var(--dune)" : "var(--ember)", fontWeight: 700 }}>
            margem {money(margem.margem)} € · {margem.pct}%
          </span>
        </div>
      )}

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

      {/* Interruptor — só depois de arrancar. Um plano sem data ainda não está
          a correr: o que há para fazer é Arrancar, não ligar/desligar. */}
      {!resumo.terminada && !porArrancar && (
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

      {porArrancar && (
        <div
          style={{
            marginTop: 10,
            padding: "8px 10px",
            borderRadius: 10,
            background: "rgba(176,121,63,.10)",
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: 12.5 }}>
            Sem data — nada vence nem avisa. Arranca quando o cliente pagar a primeira.
          </span>
          <span style={{ marginLeft: "auto" }}>
            <ArrancarPlano onArrancar={gravar} ocupado={ocupado} hoje={hoje} />
          </span>
        </div>
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
  // Plano de receita COM custo: o mesmo gesto regista o que entrou e o que
  // saiu. Vem pré-preenchido com o custo previsto, editável — a Vercel muda de
  // preço e é o número real que conta.
  const temCusto = !ehDespesa && (plano.custo ?? 0) > 0;
  const [custoReal, setCustoReal] = useState(temCusto ? String(plano.custo) : "");
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
    // Um plano de receita com custo grava também a despesa: "tem de ser
    // cobrado E entrar nos gastos" — um clique, os dois lados.
    const cr = parseMoney(custoReal);
    if (temCusto && cr != null && cr > 0) {
      const resCusto = await safeJsonPost("/api/despesas/upsert", {
        descricao: `${plano.titulo} — custo`,
        categoria: plano.categoriaDespesa ?? "dominios",
        valor: cr,
        data,
        projetoId,
        notas: null,
        mensalidadeId: c.mensalidadeId,
        cobrancaNumero: c.numero,
      });
      if (!resCusto.ok) {
        toast({
          title: "Pagamento registado, mas o custo falhou",
          description: resCusto.error,
          variant: "destructive",
        });
      }
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
      {temCusto && (
        <div className="field">
          <label htmlFor={`cb-custo-${c.mensalidadeId}-${c.numero}`}>
            Custo real deste período € (entra nos gastos)
          </label>
          <input
            id={`cb-custo-${c.mensalidadeId}-${c.numero}`}
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={custoReal}
            onChange={(e) => setCustoReal(e.target.value)}
            disabled={saving}
            placeholder="deixa vazio para não registar gasto"
          />
        </div>
      )}

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



/**
 * Pôr o plano a andar. A data que interessa é a do PRIMEIRO pagamento — é ela
 * que define o dia do mês de todas as cobranças seguintes.
 */
function ArrancarPlano({
  onArrancar,
  ocupado,
  hoje,
}: {
  onArrancar: (patch: Partial<Mensalidade>, erroMsg: string) => Promise<void>;
  ocupado: boolean;
  hoje: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [data, setData] = useState(hoje);

  if (!aberto) {
    return (
      <button
        type="button"
        className="btn-ghost"
        onClick={() => setAberto(true)}
        disabled={ocupado}
      >
        <CalendarClock style={{ width: 13, height: 13 }} aria-hidden="true" />
        Arrancar
      </button>
    );
  }

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <input
        type="date"
        className="in-sm"
        value={data}
        onChange={(e) => setData(e.target.value)}
        disabled={ocupado}
        aria-label="Data da primeira cobrança"
      />
      <button
        type="button"
        className="btn-primary"
        disabled={ocupado || !/^\d{4}-\d{2}-\d{2}$/.test(data)}
        onClick={async () => {
          // Arrancar é ligar: um plano que começa a cobrar está, por definição,
          // activo. Sem isto ficava com data mas sem gerar nada.
          await onArrancar(
            { primeiraCobranca: data, ativo: true, fechadoEm: null },
            "Erro a arrancar o plano"
          );
          setAberto(false);
        }}
      >
        Confirmar
      </button>
      <button type="button" className="btn-ghost" onClick={() => setAberto(false)} disabled={ocupado}>
        Cancelar
      </button>
    </span>
  );
}

/* ────────────── Custo e margem (INTERNO — o cliente nunca vê) ────────────── */

/**
 * O que o plano nos custa e o que sobra. `valorBase` é sempre a base s/ IVA; o
 * custo pode vir bruto (é o que a factura diz) e o IVA pago é dedutível, por
 * isso desconta-se antes de comparar. Sem isso a margem aparecia 23% abaixo da
 * real.
 */
function BlocoMargem({
  valorBase,
  levaIva,
  custo,
  setCusto,
  custoComIva,
  setCustoComIva,
  saving,
}: {
  valorBase: number | null;
  levaIva: boolean;
  custo: string;
  setCusto: (v: string) => void;
  custoComIva: boolean;
  setCustoComIva: (v: boolean) => void;
  saving: boolean;
}) {
  const c = parseMoney(custo);
  const custoBase = c != null && c > 0 ? c / (custoComIva ? 1 + IVA_TAXA : 1) : null;
  const margem = valorBase != null && custoBase != null ? valorBase - custoBase : null;
  const pct = margem != null && valorBase && valorBase > 0 ? Math.round((margem / valorBase) * 100) : null;

  return (
    <div
      style={{
        border: "1px dashed rgba(90,14,14,.16)",
        borderRadius: 10,
        padding: "10px 12px",
        marginBottom: 10,
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
        <div className="field">
          <label htmlFor="mn-custo">Custa-me por período € (opcional)</label>
          <input
            id="mn-custo"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={custo}
            onChange={(e) => setCusto(e.target.value)}
            disabled={saving}
            placeholder="alojamento, BD, domínio"
          />
        </div>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 12.5,
            paddingTop: 18,
            cursor: saving ? "default" : "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={custoComIva}
            onChange={(e) => setCustoComIva(e.target.checked)}
            disabled={saving}
          />
          Este custo já inclui IVA
        </label>
      </div>

      {margem != null && valorBase != null ? (
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            borderTop: "1px dashed rgba(90,14,14,.12)",
            paddingTop: 8,
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <span style={{ display: "flex", justifyContent: "space-between" }}>
            <span className="muted">Cobro (base)</span>
            <b>{money(valorBase)} €</b>
          </span>
          <span style={{ display: "flex", justifyContent: "space-between" }}>
            <span className="muted">Custa-me (base)</span>
            <b>−{money(custoBase!)} €</b>
          </span>
          <span
            style={{
              display: "flex",
              justifyContent: "space-between",
              color: margem >= 0 ? "var(--dune)" : "var(--ember)",
            }}
          >
            <span>Margem por {levaIva ? "período" : "período"}</span>
            <b>
              {money(margem)} €{pct != null ? ` · ${pct}%` : ""}
            </b>
          </span>
        </div>
      ) : (
        <p style={{ fontSize: 11.5, color: "var(--ink-mute)", margin: 0 }}>
          Só para ti: o cliente vê apenas o que paga, nunca o custo nem a margem. O teu tempo
          não se mete aqui — trabalho teu é lucro, não é custo.
        </p>
      )}
      {margem != null && (
        <p style={{ fontSize: 11.5, color: "var(--ink-mute)", margin: "8px 0 0" }}>
          Só para ti — o cliente vê apenas o que paga. Ao registares o recebimento, o custo
          entra como despesa deste projecto e o Lucro já aparece com a diferença.
        </p>
      )}
    </div>
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
  const porArrancar = primeira.trim() === "";
  const [quantas, setQuantas] = useState(String(mensalidade?.numeroCobrancas ?? 12));
  // Herda o do projecto num plano novo; num plano existente manda o que lá está.
  const [levaIva, setLevaIva] = useState(mensalidade?.comIva ?? projetoComIva);
  const [custo, setCusto] = useState(
    mensalidade?.custo && mensalidade.custo > 0 ? String(mensalidade.custo) : ""
  );
  const [custoComIva, setCustoComIva] = useState(mensalidade?.custoComIva ?? true);
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
    if (primeira.trim() !== "" && !/^\d{4}-\d{2}-\d{2}$/.test(primeira)) {
      return setError("Data inválida.");
    }

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
      primeiraCobranca: primeira.trim() || null,
      numeroCobrancas: n,
      ativo: mensalidade?.ativo ?? true,
      comIva: levaIva,
      custo: parseMoney(custo) ?? 0,
      custoComIva,
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
          <label htmlFor="mn-primeira">Primeira cobrança (opcional)</label>
          <input
            id="mn-primeira"
            type="date"
            value={primeira}
            onChange={(e) => setPrimeira(e.target.value)}
            disabled={saving}
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
        {porArrancar ? (
          <>
            <b>Deixa vazio se ainda não arrancou.</b> O preço fica fechado e a linha entra nos
            Custos, mas o calendário só nasce quando o cliente pagar — depois é só carregar em
            Arrancar no cartão do plano.
          </>
        ) : (
          <>
            As cobranças seguintes caem no mesmo dia do mês (ou do ano). Dia 31 passa para o
            último dia dos meses mais curtos.
          </>
        )}
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

      {/* Todo o plano de receita é dono da sua linha nos Custos. */}
      {!ehDespesa && (
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
            Nasce nos Custos a linha{" "}
            <b>
              {(titulo.trim() || (periodo === "anual" ? "Anuidade" : "Mensalidade"))} (
              {PERIODO_SUFIXO[periodo]})
            </b>
            {v != null && Number.isFinite(n) && n > 0 && (
              <> — {n} × {money(v)} € = {money(v * n)} €</>
            )}
            , ou seja o <b>plano todo</b>. É essa linha que põe o valor no orçamento do
            projecto. Não conta como gasto da RedDune — é dinheiro a receber. Numa anuidade
            que possa não ser renovada, põe <b>1 cobrança</b> e usa o botão Renovar a cada ano.
          </p>
        </div>
      )}

        </>
      )}

      {!ehDespesa && <BlocoMargem
        valorBase={v}
        levaIva={levaIva}
        custo={custo}
        setCusto={setCusto}
        custoComIva={custoComIva}
        setCustoComIva={setCustoComIva}
        saving={saving}
      />}

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
