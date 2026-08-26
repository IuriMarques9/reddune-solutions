import Link from "next/link";
import { getAllProjetos } from "@/lib/mongodb/projetos";
import { getAllClientes } from "@/lib/mongodb/clientes";
import { totalACobrar, semIva, cents } from "@/lib/iva";
import { getAllPagamentos } from "@/lib/mongodb/pagamentos";
import { getAllDespesas } from "@/lib/mongodb/despesas";
import { getAllColaboradores } from "@/lib/mongodb/colaboradores";
import { getAllMensalidades } from "@/lib/mongodb/mensalidades";
import { Topbar } from "@/components/painel/Topbar";
import { GastosLog, type GastoFiltro } from "@/components/painel/GastosLog";
import { DualLineChart } from "@/components/painel/DualLineChart";
import { STATUS_GROUPS, TIPO_TO_CATEGORIA } from "@/types/projeto";
import { DESPESA_CATEGORIA_LABEL, DESPESA_CATEGORIA_ORDER } from "@/types/despesa";
import type { Pagamento } from "@/types/pagamento";
import {
  collectGastos,
  sumGastosInMonth,
  gastosByCategoria,
  sortGastosDesc,
  gastoEmpresaDoProjeto,
  splitRepassadoEmpresa,
} from "@/lib/gastos";
import { todayLisbonDate, todayLisbonYmd } from "@/lib/dates";
import {
  cobrancasNoMes,
  planosReceita,
  pontualidade,
  receitaRecorrente,
  somaPorCobrar,
  todasCobrancas,
} from "@/lib/mensalidades";
import { PERIODO_SUFIXO } from "@/types/mensalidade";
import { requirePainelSession } from "@/lib/painel-auth";

export const dynamic = "force-dynamic";

const MES_ABBR = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

function fmtEuro(v: number): string {
  return `${Math.round(v).toLocaleString("pt-PT")} €`;
}

/** "+3,5 d" (atrasado) · "−2 d" (adiantado) · "em dia". */
function fmtDias(v: number): string {
  const arredondado = Math.round(v * 10) / 10;
  if (arredondado === 0) return "em dia";
  const n = Math.abs(arredondado).toLocaleString("pt-PT", { maximumFractionDigits: 1 });
  return `${arredondado > 0 ? "+" : "−"}${n} d`;
}

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: Promise<{ g?: string }>;
}) {
  await requirePainelSession();

  const [projetos, clientes, pagamentos, despesas, colaboradores, mensalidades, params] =
    await Promise.all([
      getAllProjetos(),
      getAllClientes(),
      getAllPagamentos(),
      getAllDespesas(),
      getAllColaboradores(),
      getAllMensalidades(),
      searchParams,
    ]);

  const clienteNome = new Map(clientes.map((c) => [c.id, c.nome]));
  // Ancorado ao dia de Lisboa para o "mês corrente" não deslizar em UTC.
  const now = todayLisbonDate();

  // Últimos 7 meses (mais antigo → actual) para os gráficos.
  const months7: { key: string; label: string }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months7.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label: MES_ABBR[d.getMonth()] });
  }
  const currentKey = months7[months7.length - 1].key;

  // Receita mensal (pagamentos) SEM a parcela de IVA: esse dinheiro é do
  // Estado, não é receita nossa e não pode entrar no lucro. Ver src/lib/iva.ts.
  const receitaPorMes = new Map<string, number>();
  for (const pg of pagamentos as Pagamento[]) {
    if (!pg.data) continue;
    const base = semIva(pg.valor, pg.comIva);
    receitaPorMes.set(monthKey(pg.data), (receitaPorMes.get(monthKey(pg.data)) ?? 0) + base);
  }

  // Gastos: linhas de projecto marcadas `gastoEmpresa` + despesas manuais
  const gastoEvents = collectGastos(projetos, despesas);
  const gastosPorMes = months7.map((m) => sumGastosInMonth(gastoEvents, m.key));

  const dualData = months7.map((m, i) => ({
    l: m.label,
    rec: Math.round(receitaPorMes.get(m.key) ?? 0),
    gas: Math.round(gastosPorMes[i]),
  }));

  // KPIs do mês corrente: Receita → Gastos → Lucro
  const receitaMes = receitaPorMes.get(currentKey) ?? 0;
  const gastosMes = gastosPorMes[gastosPorMes.length - 1];
  const lucroMes = receitaMes - gastosMes;

  // ── Planos recorrentes ──────────────────────────────────────────────────
  // As cobranças são derivadas (nunca guardadas): ver src/lib/mensalidades.ts.
  // Previsto, receita recorrente e pontualidade são o lado da RECEITA. O lado
  // da despesa já entra nos gastos pela colecção `despesas`, ao confirmar.
  const cobrancas = todasCobrancas(planosReceita(mensalidades), pagamentos, todayLisbonYmd());
  // "Previsto" é o que estava COMBINADO para entrar este mês. Fica ao lado da
  // Receita, nunca misturado com ela: a Receita é dinheiro que entrou mesmo.
  const previstoMes = cobrancasNoMes(cobrancas, currentKey).reduce((s, c) => s + c.valor, 0);
  const porCobrarMes = somaPorCobrar(cobrancasNoMes(cobrancas, currentKey));
  const recorrente = receitaRecorrente(mensalidades, cobrancas);
  const pont = pontualidade(cobrancas);
  // Planos activos, para o card mostrar de onde vem o MRR.
  const planosRows = planosReceita(mensalidades)
    .filter((m) => m.ativo && !m.fechadoEm)
    .map((m) => {
      const minhas = cobrancas.filter((c) => c.mensalidadeId === m.id);
      const pagas = minhas.filter((c) => c.estado === "paga").length;
      return {
        m,
        pagas,
        porCobrar: somaPorCobrar(minhas),
        projetoTitulo: projetos.find((p) => p.id === m.projetoId)?.titulo ?? "Projecto",
      };
    })
    .filter((r) => r.porCobrar > 0)
    .sort((a, b) => b.porCobrar - a.porCobrar);
  const planosMax = Math.max(1, ...planosRows.map((r) => r.porCobrar));

  // Desvio por cliente: quem paga a horas e quem faz esperar.
  const pontPorCliente = new Map<string, { nome: string; n: number; soma: number }>();
  for (const c of cobrancas) {
    if (c.desvioDias == null || !c.clienteId) continue;
    const slot = pontPorCliente.get(c.clienteId) ?? {
      nome: clienteNome.get(c.clienteId) ?? "(sem nome)",
      n: 0,
      soma: 0,
    };
    slot.n += 1;
    slot.soma += c.desvioDias;
    pontPorCliente.set(c.clienteId, slot);
  }
  const pontRows = [...pontPorCliente.entries()]
    .map(([id, v]) => ({ id, nome: v.nome, n: v.n, media: v.soma / v.n }))
    .sort((a, b) => b.media - a.media);

  // Gastos por categoria (mês corrente) — largura % do máximo. Só mostra as
  // categorias com valor: a lista tem 9 e a maioria fica a zero num mês normal.
  const catTotais = gastosByCategoria(gastoEvents, new Set([currentKey]));
  const catRows = DESPESA_CATEGORIA_ORDER.map((c) => ({ c, v: catTotais[c] })).filter((r) => r.v > 0);
  const catMax = Math.max(1, ...catRows.map((r) => r.v));
  const temGastosMes = catRows.length > 0;
  // O que o cliente devolve vs o que custa ter a empresa aberta (ver gastos.ts).
  const { repassado: repassadoMes, empresa: empresaMes } = splitRepassadoEmpresa(
    gastoEvents,
    new Set([currentKey])
  );

  // Barras empilhadas: contagem de projectos por categoria em cada mês
  const mbarCounts = new Map<string, { web: number; assist: number; soft: number }>();
  for (const m of months7) mbarCounts.set(m.key, { web: 0, assist: 0, soft: 0 });
  for (const p of projetos) {
    if (!p.dataCriado) continue;
    const slot = mbarCounts.get(monthKey(p.dataCriado));
    if (!slot) continue;
    const cat = p.categoria ?? (p.tipo ? TIPO_TO_CATEGORIA[p.tipo] : null);
    if (cat === "web-digital") slot.web += 1;
    else if (cat === "assistencia-tecnica") slot.assist += 1;
    else if (cat === "software-recuperacao") slot.soft += 1;
  }
  const EMPTY_SLOT = { web: 0, assist: 0, soft: 0 };
  const mbarMax = Math.max(1, ...months7.map((m) => {
    const s = mbarCounts.get(m.key) ?? EMPTY_SLOT;
    return s.web + s.assist + s.soft;
  }));
  // Altura por unidade: escala ao mês mais cheio, com tecto para poucos projectos.
  // Cada segmento com projectos tem um mínimo de 16px para o número caber SEMPRE
  // (senão 1-2 projectos ficam uma fatia fina e ilegível). O 140 (e não os 150
  // antigos) deixa folga no .mbars de 190px para os mínimos não estourarem a
  // coluna no pior caso (mês cheio + duas categorias de 1).
  const hpu = Math.min(40, 140 / mbarMax);
  const MIN_SEG = 16;
  const mbarData = months7.map((m) => {
    const s = mbarCounts.get(m.key) ?? EMPTY_SLOT;
    // Ordem no DOM = de baixo para cima (.stack é column-reverse): Web, Assistência, Software.
    const segs = [
      { k: "web", n: s.web, label: "Web & Digital", color: "var(--ember)" },
      { k: "assist", n: s.assist, label: "Assistência", color: "var(--apricot)" },
      { k: "soft", n: s.soft, label: "Software", color: "var(--dune)" },
    ].map((seg) => ({ ...seg, h: seg.n > 0 ? Math.max(MIN_SEG, Math.round(seg.n * hpu)) : 0 }));
    return { key: m.key, l: m.label, total: s.web + s.assist + s.soft, segs };
  });

  // Donut: pipeline actual (cores do protótipo, linhas 764-769)
  const donut = [
    { l: "Em curso", v: projetos.filter((p) => STATUS_GROUPS.ativo.includes(p.status)).length, c: "var(--ember)" },
    { l: "Próximos", v: projetos.filter((p) => STATUS_GROUPS.proximo.includes(p.status)).length, c: "var(--apricot)" },
    { l: "A aguardar", v: projetos.filter((p) => STATUS_GROUPS.aguarda.includes(p.status)).length, c: "#c89b6a" },
    { l: "Finalizado", v: projetos.filter((p) => STATUS_GROUPS.pronto.includes(p.status)).length, c: "var(--dune)" },
  ];
  const donutTotal = donut.reduce((s, d) => s + d.v, 0);
  const donutVisiveis = donut.filter((d) => d.v > 0);
  let donutAcc = 0;
  const donutStops = donutVisiveis.map((d, i) => {
    const from = donutAcc;
    donutAcc = i === donutVisiveis.length - 1 ? 100 : donutAcc + (d.v / donutTotal) * 100;
    return `${d.c} ${from}% ${donutAcc}%`;
  });
  const donutBg =
    donutTotal > 0 ? `conic-gradient(${donutStops.join(", ")})` : "conic-gradient(rgba(90,14,14,.08) 0% 100%)";

  // Top clientes por LUCRO — todo o histórico. Ordenar por valor pago engana
  // quando as peças são passadas a preço de custo: um PC de 2045€ com 1884€ de
  // componentes deixa 161€, uma app de 650€ sem peças deixa 650€. O gasto por
  // cliente usa a mesma conta da ficha do projecto (gastoEmpresaDoProjeto).
  const recPorCliente = new Map<string, number>();
  for (const pg of pagamentos as Pagamento[]) {
    if (!pg.clienteId || !pg.data) continue;
    recPorCliente.set(pg.clienteId, (recPorCliente.get(pg.clienteId) ?? 0) + semIva(pg.valor, pg.comIva));
  }
  const gastoPorCliente = new Map<string, number>();
  for (const p of projetos) {
    if (!p.clienteId) continue;
    const g = gastoEmpresaDoProjeto(p, despesas.filter((d) => d.projetoId === p.id));
    if (g > 0) gastoPorCliente.set(p.clienteId, (gastoPorCliente.get(p.clienteId) ?? 0) + g);
  }
  const topClientes = [...recPorCliente.entries()]
    .map(([id, rec]) => {
      const gas = gastoPorCliente.get(id) ?? 0;
      return { id, nome: clienteNome.get(id) ?? "(sem nome)", v: rec - gas, rec, gas };
    })
    .sort((a, b) => b.v - a.v)
    .slice(0, 5);
  const topMax = Math.max(1, ...topClientes.map((x) => x.v));

  // Lucro por tipo de trabalho — todo o histórico. Responde a "que trabalho
  // compensa": montar PCs move muito dinheiro com margem curta, web/software
  // move pouco e fica quase todo. Mesma conta do resto (gastoEmpresaDoProjeto).
  const CAT_LABEL: Record<string, string> = {
    "assistencia-tecnica": "Assistência técnica",
    "web-digital": "Web & Digital",
    "software-recuperacao": "Software & Recuperação",
  };
  // Dois mapas: `pago` bruto (o que o cliente entregou, para a dívida) e
  // `recebido` sem IVA (o que é receita nossa, para o lucro/margem).
  const pagoPorProjeto = new Map<string, number>();
  const recebidoPorProjeto = new Map<string, number>();
  for (const pg of pagamentos as Pagamento[]) {
    if (!pg.data) continue;
    pagoPorProjeto.set(pg.projetoId, (pagoPorProjeto.get(pg.projetoId) ?? 0) + pg.valor);
    recebidoPorProjeto.set(
      pg.projetoId,
      (recebidoPorProjeto.get(pg.projetoId) ?? 0) + semIva(pg.valor, pg.comIva)
    );
  }
  const porTipo = new Map<string, { rec: number; gas: number; porReceber: number }>();
  for (const p of projetos) {
    const cat = p.categoria ?? (p.tipo ? TIPO_TO_CATEGORIA[p.tipo] : null);
    if (!cat) continue;
    const slot = porTipo.get(cat) ?? { rec: 0, gas: 0, porReceber: 0 };
    const pago = pagoPorProjeto.get(p.id) ?? 0;
    slot.rec += recebidoPorProjeto.get(p.id) ?? 0;
    slot.gas += gastoEmpresaDoProjeto(p, despesas.filter((d) => d.projetoId === p.id));
    // Sem isto o card mente: o hardware aparece negativo por estar POR PAGAR,
    // não por dar prejuízo — e a conclusão seria deixar de o fazer.
    slot.porReceber += Math.max(0, cents((totalACobrar(p) ?? 0) - pago));
    porTipo.set(cat, slot);
  }
  const tipoRows = [...porTipo.entries()]
    .map(([cat, v]) => ({
      cat,
      label: CAT_LABEL[cat] ?? cat,
      ...v,
      lucro: v.rec - v.gas,
      margem: v.rec > 0 ? Math.round(((v.rec - v.gas) / v.rec) * 100) : 0,
    }))
    .filter((r) => r.rec > 0 || r.gas > 0)
    .sort((a, b) => b.lucro - a.lucro);
  const tipoMax = Math.max(1, ...tipoRows.map((r) => r.lucro));

  // Pagamentos a colaboradores — quanto já foi pago a cada pessoa (ex.: Jaime).
  // Fonte: despesas categoria "colaboradores", agrupadas pelo id da ficha (não
  // pelo nome: gralhas e maiúsculas não podem partir a pessoa em duas linhas).
  // Já contam nos gastos/lucro acima; este card é só o corte por pessoa.
  const nomeColab = new Map(colaboradores.map((c) => [c.id, c.nome]));
  const colabTotais = new Map<
    string,
    { id: string; nome: string; total: number; mes: number; n: number }
  >();
  for (const d of despesas) {
    if (d.categoria !== "colaboradores") continue;
    const cid = d.colaboradorId ?? "";
    const slot =
      colabTotais.get(cid) ??
      { id: cid, nome: nomeColab.get(cid) ?? "(sem ficha)", total: 0, mes: 0, n: 0 };
    slot.total += d.valor;
    slot.n += 1;
    if (monthKey(d.data) === currentKey) slot.mes += d.valor;
    colabTotais.set(cid, slot);
  }
  const colabRows = [...colabTotais.values()].sort((a, b) => b.total - a.total);
  const colabMax = Math.max(1, ...colabRows.map((r) => r.total));

  // Projectos para o log resolver o título de cada gasto (mais recentes primeiro).
  const projetoOptions = [...projetos]
    .sort((a, b) => (b.dataCriado ?? "").localeCompare(a.dataCriado ?? ""))
    .map((p) => ({ id: p.id, titulo: p.titulo }));

  // Log completo: despesas manuais + linhas de projecto marcadas gastoEmpresa.
  const filtro: GastoFiltro =
    params.g === "linha" || params.g === "manual" ? (params.g as GastoFiltro) : "todos";
  const logTodos = sortGastosDesc(gastoEvents);
  const logVisivel = filtro === "todos" ? logTodos : logTodos.filter((e) => e.fonte === filtro);
  const logTotal = logVisivel.reduce((s, e) => s + e.valor, 0);
  const nLinha = logTodos.filter((e) => e.fonte === "linha").length;
  const nManual = logTodos.length - nLinha;

  return (
    <>
      {/* Sem acções: os relatórios são para ler. Registar despesa vive na visão
          geral (botão Novo + card "Despesas recentes"). */}
      <Topbar crumbs={["Relatórios"]} titleHtml="Relatórios" />

      {/* Pipeline actual + Top clientes */}
      <div className="rep-grid">
        <div className="card">
          <div className="card-head"><span className="card-title">Pipeline actual</span></div>
          <div className="donut" style={{ background: donutBg }}>
            <div className="donut-c"><b>{donutTotal}</b><span>projectos</span></div>
          </div>
          <div className="legend">
            {donut.map((d) => (
              <div key={d.l} className="lg">
                <span className="sw" style={{ background: d.c }} />{d.l} <b>{d.v}</b>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="card-head"><span className="card-title">Top clientes</span><span className="kpi-label">por lucro · todo o histórico</span></div>
          {topClientes.length === 0 ? (
            <p className="muted" style={{ fontSize: 13 }}>Sem pagamentos registados.</p>
          ) : (
            topClientes.map((x) => (
              <div
                key={x.id}
                className="bar-row"
                title={`Recebido ${fmtEuro(x.rec)} − gasto da empresa ${fmtEuro(x.gas)}${
                  x.rec > 0 ? ` · margem ${Math.round((x.v / x.rec) * 100)}%` : ""
                }`}
              >
                <div className="bl">
                  <Link href={`/painel/clientes/${x.id}`} style={{ color: "inherit" }} className="hover:text-ember">{x.nome}</Link>
                  <b>{fmtEuro(x.v)}</b>
                </div>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${Math.max(4, Math.round((x.v / topMax) * 100))}%` }} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* KPIs do mês: Receita / Gastos / Lucro */}
      <div className="mini-kpis" style={{ marginTop: 16 }}>
        <div className="k"><div className="kpi-label">Receita · este mês</div><div className="kpi-num">{fmtEuro(receitaMes)}</div></div>
        {previstoMes > 0 && (
          <div
            className="k"
            title="O que estava combinado para entrar este mês pelos planos de mensalidade e anuidade. Não é receita — é o que se espera cobrar."
          >
            <div className="kpi-label">Previsto · este mês</div>
            <div className="kpi-num">{fmtEuro(previstoMes)}</div>
            {porCobrarMes > 0 && (
              <div className="kpi-label" style={{ marginTop: 2, color: "var(--ember)" }}>
                {fmtEuro(porCobrarMes)} por cobrar
              </div>
            )}
          </div>
        )}
        <div className="k"><div className="kpi-label">Gastos · este mês</div><div className="kpi-num" style={{ color: "var(--ember)" }}>{fmtEuro(gastosMes)}</div></div>
        <div className="k accent"><div className="kpi-label">Lucro · este mês</div><div className="kpi-num">{fmtEuro(lucroMes)}</div></div>
      </div>

      {/* Receita vs Gastos */}
      <div className="card chart-card" style={{ marginTop: 16 }}>
        <div className="card-head"><span className="card-title">Receita vs Gastos</span><span className="kpi-label">últimos 7 meses</span></div>
        <DualLineChart data={dualData} />
        <div className="mlegend" style={{ marginTop: 6 }}>
          <div className="lg"><span className="sw" style={{ background: "#d6422a" }} />Receita</div>
          <div className="lg"><span className="sw" style={{ background: "#b0793f" }} />Gastos</div>
        </div>
      </div>

      {/* Gastos por categoria */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-head">
          <span className="card-title">Gastos por categoria</span>
          <span className="kpi-label">este mês · {fmtEuro(gastosMes)}</span>
        </div>
        {!temGastosMes ? (
          <p className="muted" style={{ fontSize: 13 }}>
            Sem gastos registados este mês — marca ✓ &quot;Paguei do bolso&quot; nas linhas dos projectos, ou regista uma despesa.
          </p>
        ) : (
          <>
            {/* O corte que interessa: o que volta vs o que custa ter a empresa. */}
            <div className="msum" style={{ marginBottom: 16 }}>
              <div title="Gastos ligados a um projecto — o cliente paga-os de volta">
                <div className="kpi-label">Repassado ao cliente</div>
                <div className="m-num sm">{fmtEuro(repassadoMes)}</div>
              </div>
              <div title="Gastos sem projecto (e pagamentos a colaboradores) — o que custa ter a RedDune aberta">
                <div className="kpi-label">Custo da empresa</div>
                <div className={empresaMes > 0 ? "m-num sm neg" : "m-num sm"}>{fmtEuro(empresaMes)}</div>
              </div>
            </div>
          </>
        )}
        {temGastosMes && (
          catRows.map((r) => (
            <div key={r.c} className="bar-row">
              <div className="bl">
                {DESPESA_CATEGORIA_LABEL[r.c]} <b>{r.v.toLocaleString("pt-PT", { maximumFractionDigits: 2 })} €</b>
              </div>
              <div className="bar-track">
                <div className="bar-fill exp" style={{ width: r.v > 0 ? `${Math.max(4, Math.round((r.v / catMax) * 100))}%` : 0 }} />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Receita recorrente — só aparece quando há planos a correr */}
      {recorrente.planosAtivos > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-head">
            <span className="card-title">Receita recorrente</span>
            <span className="kpi-label">
              {recorrente.planosAtivos} plano{recorrente.planosAtivos === 1 ? "" : "s"} a correr
            </span>
          </div>
          <div className="msum" style={{ marginBottom: 16 }}>
            <div title="Receita mensal recorrente: as anuidades entram a dividir por 12.">
              <div className="kpi-label">Por mês</div>
              <div className="m-num sm">{fmtEuro(recorrente.mrr)}</div>
            </div>
            <div title="Tudo o que está combinado nos planos e ainda não entrou — incluindo cobranças que ainda nem venceram.">
              <div className="kpi-label">Comprometido</div>
              <div className="m-num sm">{fmtEuro(recorrente.comprometido)}</div>
            </div>
          </div>
          {planosRows.map((r) => (
            <div
              key={r.m.id}
              className="bar-row"
              title={`${r.projetoTitulo} — ${fmtEuro(r.m.valor)} por ${PERIODO_SUFIXO[r.m.periodo]}`}
            >
              <div className="bl">
                <span>
                  <Link href={`/painel/projetos/${r.m.projetoId}#mensalidades`}>{r.m.titulo}</Link>{" "}
                  <span className="muted" style={{ fontSize: 11.5 }}>
                    {r.projetoTitulo} · {r.pagas}/{r.m.numeroCobrancas} pagas
                  </span>
                </span>
                <b>{fmtEuro(r.porCobrar)}</b>
              </div>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{ width: `${Math.max(4, Math.round((r.porCobrar / planosMax) * 100))}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pontualidade — a diferença entre o dia combinado e o dia em que entrou */}
      {pont.total > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-head">
            <span className="card-title">Pontualidade dos pagamentos</span>
            <span className="kpi-label">
              {pont.total} cobrança{pont.total === 1 ? "" : "s"} paga{pont.total === 1 ? "" : "s"} ·
              todo o histórico
            </span>
          </div>
          <div className="msum" style={{ marginBottom: 16 }}>
            <div title="Pagaram antes do dia combinado.">
              <div className="kpi-label">Adiantadas</div>
              <div className="m-num sm">{pont.adiantadas}</div>
            </div>
            <div title="Pagaram no dia combinado.">
              <div className="kpi-label">Em dia</div>
              <div className="m-num sm">{pont.emDia}</div>
            </div>
            <div title="Pagaram depois do dia combinado.">
              <div className="kpi-label">Atrasadas</div>
              <div className={pont.atrasadas > 0 ? "m-num sm neg" : "m-num sm"}>{pont.atrasadas}</div>
            </div>
            <div title="Média de dias entre o dia previsto e o dia em que o dinheiro entrou.">
              <div className="kpi-label">Desvio médio</div>
              <div className="m-num sm">{fmtDias(pont.mediaDias)}</div>
            </div>
          </div>
          {pontRows.map((r) => (
            <div
              key={r.id}
              className="bar-row"
              title={`${r.n} cobrança${r.n === 1 ? "" : "s"} paga${r.n === 1 ? "" : "s"}`}
            >
              <div className="bl">
                <span>
                  <Link href={`/painel/clientes/${r.id}`}>{r.nome}</Link>{" "}
                  <span className="muted" style={{ fontSize: 11.5 }}>
                    {r.n} cobrança{r.n === 1 ? "" : "s"}
                  </span>
                </span>
                <b style={{ color: r.media > 0 ? "var(--ember)" : undefined }}>{fmtDias(r.media)}</b>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lucro por tipo de trabalho — onde o dinheiro fica mesmo */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-head">
          <span className="card-title">Lucro por tipo de trabalho</span>
          <span className="kpi-label">já recebido · todo o histórico</span>
        </div>
        {tipoRows.length === 0 ? (
          <p className="muted" style={{ fontSize: 13 }}>Sem trabalhos com valores registados.</p>
        ) : (
          tipoRows.map((r) => (
            <div
              key={r.cat}
              className="bar-row"
              title={
                `Recebido ${fmtEuro(r.rec)} − gasto ${fmtEuro(r.gas)}` +
                (r.porReceber > 0
                  ? `. Faltam receber ${fmtEuro(r.porReceber)} — o gasto já saiu, o dinheiro ainda não entrou.`
                  : "")
              }
            >
              <div className="bl">
                <span>
                  {r.label}{" "}
                  <span className="muted" style={{ fontSize: 11.5 }}>
                    {fmtEuro(r.rec)} recebidos · margem {r.margem}%
                    {r.porReceber > 0 ? ` · ${fmtEuro(r.porReceber)} por receber` : ""}
                  </span>
                </span>
                <b style={{ color: r.lucro < 0 ? "var(--ember)" : undefined }}>{fmtEuro(r.lucro)}</b>
              </div>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{ width: `${Math.max(4, Math.round((Math.max(0, r.lucro) / tipoMax) * 100))}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagamentos a colaboradores — só aparece quando existem */}
      {colabRows.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-head">
            <span className="card-title">Pagamentos a colaboradores</span>
            <span className="kpi-label">todo o histórico</span>
          </div>
          {colabRows.map((r) => (
            <div key={r.id || "__sem_ficha"} className="bar-row">
              <div className="bl">
                <span>
                  {r.id ? (
                    <Link href={`/painel/colaboradores/${r.id}`}>{r.nome}</Link>
                  ) : (
                    r.nome
                  )}{" "}
                  <span className="muted" style={{ fontSize: 11.5 }}>
                    {r.n} pagamento{r.n === 1 ? "" : "s"}
                    {r.mes > 0 ? ` · ${fmtEuro(r.mes)} este mês` : ""}
                  </span>
                </span>
                <b>{fmtEuro(r.total)}</b>
              </div>
              <div className="bar-track">
                <div
                  className="bar-fill exp"
                  style={{ width: `${Math.max(4, Math.round((r.total / colabMax) * 100))}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Projectos por categoria · por mês */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-head">
          <span className="card-title">Projectos por categoria · por mês</span>
          <span className="kpi-label">últimos 7 meses</span>
        </div>
        <div className="mbars">
          {mbarData.map((m) => (
            <div key={m.key} className="mbar">
              <div className={m.total === 0 ? "stack empty-stack" : "stack"}>
                {m.segs.map((s) =>
                  s.n > 0 ? (
                    <div
                      key={s.k}
                      className="seg"
                      style={{ height: s.h, background: s.color }}
                      title={`${s.label}: ${s.n}`}
                    >
                      <b>{s.n}</b>
                    </div>
                  ) : null
                )}
              </div>
              <span className="ml">{m.l}</span>
            </div>
          ))}
        </div>
        <div className="mlegend">
          <div className="lg"><span className="sw" style={{ background: "var(--ember)" }} />Web &amp; Digital</div>
          <div className="lg"><span className="sw" style={{ background: "var(--apricot)" }} />Assistência</div>
          <div className="lg"><span className="sw" style={{ background: "var(--dune)" }} />Software</div>
        </div>
      </div>

      {/* Log de gastos — todas as fontes (manuais + linhas de projecto) */}
      <div style={{ marginTop: 22 }}>
        <div className="card-head">
          <span className="card-title">Log de gastos</span>
          <span className="kpi-label">
            {logVisivel.length} {logVisivel.length === 1 ? "registo" : "registos"} · {fmtEuro(logTotal)}
          </span>
        </div>
        <div style={{ marginBottom: 14 }}>
          <nav className="view-tabs" aria-label="Filtrar gastos por origem">
            <GastoTab g="todos" cur={filtro} label="Todos" n={logTodos.length} />
            <GastoTab g="linha" cur={filtro} label="De projectos" n={nLinha} />
            <GastoTab g="manual" cur={filtro} label="Manuais" n={nManual} />
          </nav>
        </div>
        <GastosLog events={logVisivel} projetos={projetoOptions} filtro={filtro} />
      </div>
    </>
  );
}

function GastoTab({ g, cur, label, n }: { g: GastoFiltro; cur: GastoFiltro; label: string; n: number }) {
  const href = g === "todos" ? "/painel/relatorios" : `/painel/relatorios?g=${g}`;
  return (
    <Link
      href={href}
      scroll={false}
      className={cur === g ? "on" : undefined}
      aria-current={cur === g ? "true" : undefined}
    >
      {label}
      <span className="num">{n}</span>
    </Link>
  );
}
