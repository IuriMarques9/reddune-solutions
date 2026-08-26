"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Euro, Receipt } from "lucide-react";
import { LinhasEditor, computeTotal } from "./LinhasEditor";
import type { Projeto, ProjetoLinha } from "@/types/projeto";
import { DESPESA_CATEGORIA_LABEL, type Despesa } from "@/types/despesa";
import { parseMoney } from "@/lib/parse-number";
import { comIva as aplicaIva, totalACobrarLinhas, eurIva, IVA_LABEL, IVA_TAXA } from "@/lib/iva";
import { safeJsonPost } from "@/lib/safe-fetch";
import { useToast } from "@/hooks/use-toast";

type Props = {
  projeto: Projeto;
  /**
   * Despesas manuais ligadas a este projecto (ex.: renovação de domínio).
   * Somam ao chip "Gasto empresa" e são listadas por baixo das linhas —
   * registam-se/apagam-se nos Relatórios, aqui são só leitura.
   */
  despesas?: Despesa[];
};

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

export function CustosCard({ projeto, despesas = [] }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [, startTransition] = useTransition();
  const initial: ProjetoLinha[] = projeto.linhas ?? [];
  const [linhas, setLinhas] = useState<ProjetoLinha[]>(initial);
  // Retrato do que o SERVIDOR trouxe da última vez que sincronizámos. Sem isto
  // o cartão ficava preso às linhas do primeiro render: criar um plano gerava a
  // sua linha na base de dados e aqui não aparecia nada até recarregar a página.
  const [sincronizado, setSincronizado] = useState(() => JSON.stringify(initial));
  const [valorLegacy, setValorLegacy] = useState(
    projeto.valorEstimado != null ? String(projeto.valorEstimado) : ""
  );
  const hasLegacy = projeto.linhas == null && projeto.valorEstimado != null;
  const [useLegacy, setUseLegacy] = useState(hasLegacy);
  // Linhas e valorEstimado são sempre BASE s/ IVA — este flag só decide se o
  // cliente leva os 23% por cima. Ver src/lib/iva.ts.
  const [comIva, setComIva] = useState(projeto.comIva ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // O servidor mudou por baixo (ex.: um plano acabou de criar a sua linha).
  // Adoptamos o que veio — EXCEPTO se houver edições por gravar, que nunca se
  // deitam fora sem o Iuri saber. Padrão de "ajustar estado quando as props
  // mudam", feito no render de propósito: um useEffect pintava o valor velho
  // primeiro e via-se o número a saltar.
  const doServidor = JSON.stringify(initial);
  if (doServidor !== sincronizado) {
    const semEdicoesPendentes = JSON.stringify(linhas) === sincronizado;
    setSincronizado(doServidor);
    if (semEdicoesPendentes) setLinhas(initial);
  }

  const gastoDespesas = despesas.reduce((s, d) => s + d.valor, 0);

  const ivaDirty = comIva !== (projeto.comIva ?? false);
  const valoresDirty = useLegacy
    ? valorLegacy.trim() !== (projeto.valorEstimado != null ? String(projeto.valorEstimado) : "")
    : JSON.stringify(linhas) !== doServidor;
  const dirty = ivaDirty || valoresDirty;

  // Total mostrado no cartão: o que está no ecrã AGORA (linhas por editar ou
  // campo legacy), para o número acompanhar o que se está a escrever. O resto
  // do painel lê o `valorEstimado` já guardado — ver totalACobrar em lib/iva.
  const baseAtual = useLegacy
    ? parseMoney(valorLegacy) ?? 0
    : computeTotal(linhas);
  // Linhas de planos trazem o IVA do seu plano (`ivaProprio`) e o checkbox
  // global NÃO lhes toca — senão contava IVA duas vezes sobre o mesmo dinheiro.
  // Nesse caso o total soma linha a linha, cada uma com a sua regra.
  const ivaPorLinha = !useLegacy && linhas.some((l) => l.ivaProprio !== undefined);
  const totalComIva = ivaPorLinha
    ? totalACobrarLinhas({ valorEstimado: baseAtual, comIva, linhas }) ?? baseAtual
    : aplicaIva(baseAtual, comIva);

  function convertLegacy() {
    const v = parseMoney(valorLegacy) ?? NaN;
    if (Number.isFinite(v) && v > 0) {
      setLinhas([
        {
          id: `l_${Date.now()}`,
          descricao: "Valor estimado",
          categoria: "outro",
          quantidade: 1,
          precoUnit: v,
        },
      ]);
    }
    setUseLegacy(false);
  }

  async function save() {
    setSaving(true);
    setError(null);
    // Só o IVA mudou -> mandar APENAS o flag. Se mandássemos sempre os valores,
    // ligar o checkbox num projecto sem linhas nem valor gravava `linhas: []` e
    // `valorEstimado: 0` por cima de `null` (passava a mostrar "Orçado 0 €").
    const payload: Record<string, unknown> = {
      id: projeto.id,
      titulo: projeto.titulo,
      status: projeto.status,
      comIva,
    };
    if (valoresDirty) {
      if (useLegacy) {
        const v = valorLegacy.trim() ? parseMoney(valorLegacy) : null;
        if (valorLegacy.trim() && v === null) {
          setError("Valor inválido.");
          setSaving(false);
          return;
        }
        payload.valorEstimado = v;
        payload.linhas = null;
      } else {
        payload.linhas = linhas;
        payload.valorEstimado = computeTotal(linhas);
      }
    }
    const res = await safeJsonPost("/api/projetos/upsert", payload);
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      toast({ title: "Erro a guardar custos", description: res.error, variant: "destructive" });
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <section className="card">
      {/* Cabeçalho: label + hint + Guardar custos */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div className="card-label" style={{ margin: 0 }}>
          <Euro className="ic" aria-hidden="true" />
          Custos
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "var(--ink-mute)",
              letterSpacing: ".04em",
              textTransform: "none",
            }}
          >
            ✓ = paguei do meu bolso
          </span>
        </div>
        {dirty && (
          <button type="button" className="btn-ghost" onClick={save} disabled={saving}>
            {saving && (
              <Loader2 className="animate-spin" style={{ width: 13, height: 13 }} aria-hidden="true" />
            )}
            Guardar custos
          </button>
        )}
      </div>

      {useLegacy ? (
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8, flexWrap: "wrap" }}>
          <div className="field" style={{ marginBottom: 0, width: 180 }}>
            <label htmlFor="vl">Valor estimado (€)</label>
            <input
              id="vl"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={valorLegacy}
              onChange={(e) => setValorLegacy(e.target.value)}
              disabled={saving}
            />
          </div>
          <button
            type="button"
            className="btn-ghost"
            onClick={convertLegacy}
            disabled={saving}
            style={{ marginBottom: 4 }}
          >
            Converter em linhas
          </button>
        </div>
      ) : (
        <LinhasEditor
          linhas={linhas}
          onChange={setLinhas}
          disabled={saving}
          gastoDespesas={gastoDespesas}
        />
      )}

      {/* IVA — o orçamento acima é a BASE s/ IVA (regra da casa). Ligar isto
          não mexe nas linhas: só acrescenta os 23% ao que o cliente paga. */}
      <div
        style={{
          marginTop: 12,
          paddingTop: 10,
          borderTop: "1px dashed rgba(90,14,14,.14)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
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
          Acrescentar IVA ({Math.round(IVA_TAXA * 100)}%)
          {ivaPorLinha && (
            <span style={{ color: "var(--ink-mute)", fontSize: 11.5 }}>
              — só nas linhas escritas à mão
            </span>
          )}
        </label>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 12.5,
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "baseline",
          }}
        >
          <span style={{ color: "var(--ink-mute)" }}>Base: {eurIva(baseAtual)} €</span>
          {totalComIva !== baseAtual && (
            <>
              <span style={{ color: "var(--ink-mute)" }}>
                {IVA_LABEL}: {eurIva(totalComIva - baseAtual)} €
              </span>
              <b style={{ fontSize: 13.5 }}>Total a cobrar: {eurIva(totalComIva)} €</b>
            </>
          )}
        </div>
      </div>

      {despesas.length > 0 && (
        <div className="psub">
          <p className="plabel">
            <Receipt className="ic" aria-hidden="true" />
            Despesas ligadas
            <Link
              className="link-more"
              href="/painel/relatorios?g=manual"
              style={{ marginLeft: "auto", textTransform: "none", letterSpacing: 0 }}
            >
              Gerir nos relatórios
            </Link>
          </p>
          {despesas.map((d) => (
            <div key={d.id} className="act">
              <span className="a-ic">
                <Receipt className="ic" aria-hidden="true" />
              </span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="who truncate">{d.descricao}</div>
                <div className="muted truncate" style={{ fontSize: 11.5 }}>
                  {DESPESA_CATEGORIA_LABEL[d.categoria]} · {fmtDate(d.data)}
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
                {d.valor.toLocaleString("pt-PT", { maximumFractionDigits: 2 })} €
              </b>
            </div>
          ))}
        </div>
      )}

      {error && (
        <p style={{ fontSize: 12, color: "var(--ember)", margin: "10px 0 0" }}>{error}</p>
      )}
    </section>
  );
}
