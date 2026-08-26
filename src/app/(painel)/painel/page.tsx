import Link from "next/link";
import {
  ArrowRight,
  Euro,
  FolderKanban,
  FolderPlus,
  Images,
  Inbox,
  ListChecks,
  Package,
  UserPlus,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { getAllProjetos } from "@/lib/mongodb/projetos";
import { totalACobrar } from "@/lib/iva";
import { getAllClientes } from "@/lib/mongodb/clientes";
import { getAllColaboradores } from "@/lib/mongodb/colaboradores";
import { getAllPagamentos } from "@/lib/mongodb/pagamentos";
import { getAllMensalidades } from "@/lib/mongodb/mensalidades";
import { getAllLembretes } from "@/lib/mongodb/lembretes";
import { getAllDespesas } from "@/lib/mongodb/despesas";
import { getRecentAuditEntries, type AuditEntry } from "@/lib/mongodb/mutation-audit";
import { collectGastos, sumGastosInMonth } from "@/lib/gastos";
import {
  cobrancasNoMes,
  cobrancasVencidas,
  porCobrarDentroDoValor,
  proximaCobranca,
  somaPorCobrar,
  todasCobrancas,
} from "@/lib/mensalidades";
import { requirePainelSession } from "@/lib/painel-auth";
import { Topbar } from "@/components/painel/Topbar";
import { NovoMenu } from "@/components/painel/NovoMenu";
import { DespesasSection } from "@/components/painel/DespesasSection";
import { STATUS_GROUPS, LEMBRETES_VISIVEIS_STATUSES, type Projeto } from "@/types/projeto";
import {
  formatRelativeDay,
  isOverdue,
  isToday,
  isWithinNextDays,
  parseIsoDate,
  startOfDay,
  todayLisbonDate,
  todayLisbonMonth,
  todayLisbonYmd,
} from "@/lib/dates";

export const dynamic = "force-dynamic";

const COLL_LABEL: Record<string, string> = {
  projetos: "Projecto",
  clientes: "Cliente",
  lembretes: "Lembrete",
  tarefas: "Lembrete", // legado — entradas de audit anteriores ao rename da colecção
  pagamentos: "Pagamento",
  products: "Produto",
  portfolio: "Trabalho",
  servicos: "Serviço",
};
// Colecções com rótulo feminino (concordância do particípio: criada/editada/apagada).
const COLL_FEM = new Set<string>([]);
const OP_PART: Record<string, string> = { create: "criad", update: "editad", delete: "apagad" };

// Hora actual em Lisboa (o servidor Vercel corre em UTC — getHours() cru
// daria "Bom dia" à 01:00 de Lisboa no Verão).
const LISBON_HOUR = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Lisbon",
  hour: "2-digit",
  hourCycle: "h23",
});

function greeting(hourLisbon: number): string {
  if (hourLisbon < 12) return "Bom dia";
  if (hourLisbon < 20) return "Boa tarde";
  return "Boa noite";
}

function fmtRel(d: Date): string {
  const diff = Date.now() - new Date(d).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h}h`;
  if (h < 48) return "ontem";
  return new Date(d).toLocaleDateString("pt-PT", { day: "2-digit", month: "short" });
}

function auditObj(e: AuditEntry): string {
  const after = e.after as { titulo?: string; nome?: string; name?: unknown } | null;
  if (after?.titulo) return after.titulo;
  if (after?.nome) return after.nome;
  return `${COLL_LABEL[e.collection] ?? e.collection} · ${e.entityId.slice(0, 8)}`;
}

/** "Projecto criado" / "Lembrete editado" / "Pagamento apagado" … */
function auditWho(e: AuditEntry): string {
  const label = COLL_LABEL[e.collection] ?? e.collection;
  const part = OP_PART[e.op];
  if (!part) return label;
  return `${label} ${part}${COLL_FEM.has(e.collection) ? "a" : "o"}`;
}

function auditIcon(e: AuditEntry): LucideIcon {
  if (e.collection === "projetos") return e.op === "create" ? FolderPlus : FolderKanban;
  switch (e.collection) {
    case "clientes":
      return UserPlus;
    case "lembretes":
    case "tarefas": // legado — audit antigo
      return ListChecks;
    case "pagamentos":
      return Euro;
    case "products":
      return Package;
    case "portfolio":
      return Images;
    case "servicos":
      return Wrench;
    default:
      return Inbox;
  }
}

// ---------- Hero "O teu dia" (lembretes + prazos de projecto accionáveis) ----------

type Foco = "hoje" | "semana";

type HeroItem = {
  key: string;
  href: string;
  titulo: string;
  meta: string;
  time: string | null;
  overdue: boolean;
  /** Vencida ou com prazo hoje (conta para o "Tens N coisas para hoje"). */
  hoje: boolean;
  pill: string; // rótulo do .pill-late quando overdue ("atrasado")
  color: string;
  sortKey: number;
};

function heroDotColor(prazo: string | null, hoje: Date): string {
  if (isOverdue(prazo, hoje)) return "var(--flame)";
  if (isToday(prazo, hoje)) return "var(--apricot)";
  return "var(--peach)"; // próximos dias (vista Semana)
}

function heroTime(prazo: string | null, prazoHora: string | null, hoje: Date): string | null {
  if (!prazo) return null;
  if (isToday(prazo, hoje)) return prazoHora ?? "hoje";
  const rel = formatRelativeDay(prazo, hoje).toLowerCase();
  return prazoHora ? `${rel} · ${prazoHora}` : rel;
}

function heroSortKey(prazo: string | null, prazoHora: string | null): number {
  const d = parseIsoDate(prazo);
  if (!d) return Number.MAX_SAFE_INTEGER;
  let key = startOfDay(d).getTime();
  if (prazoHora) {
    const [hh, mm] = prazoHora.split(":").map(Number);
    if (!Number.isNaN(hh)) key += (hh * 60 + (mm || 0)) * 60000;
  } else {
    key += 24 * 3600000 - 1; // sem hora → depois das que têm hora no mesmo dia
  }
  return key;
}

const eur = (n: number) => Math.round(n).toLocaleString("pt-PT");

export default async function PainelOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ foco?: string }>;
}) {
  await requirePainelSession();

  const [
    projetos,
    clientes,
    pagamentos,
    lembretes,
    despesas,
    colaboradores,
    mensalidades,
    audit,
    params,
  ] = await Promise.all([
    getAllProjetos(),
    getAllClientes(),
    getAllPagamentos(),
    getAllLembretes(),
    getAllDespesas(),
    getAllColaboradores(),
    getAllMensalidades(),
    getRecentAuditEntries(6),
    searchParams,
  ]);

  const foco: Foco = params.foco === "semana" ? "semana" : "hoje";

  const now = new Date();
  // "Hoje" no fuso de Portugal para comparações de dia/mês (o servidor Vercel
  // corre em UTC). `now` mantém-se como instante real p/ rótulos relativos.
  const hojeLisboa = todayLisbonDate(now);
  const saudacao = `${greeting(Number(LISBON_HOUR.format(now)))}, <em>Iuri</em>.`;

  if (projetos.length === 0) {
    return (
      <>
        <Topbar
          titleHtml={saudacao}
          description="Ainda não há projectos."
          actions={<NovoMenu projetos={projetos} clientes={clientes} colaboradores={colaboradores} />}
        />
        <div className="empty">
          <div className="t">Sem dados ainda</div>
          <div className="desc">
            Usa o botão <strong>Novo</strong> ou vai a <strong>Projectos</strong> e cria o
            primeiro projecto.
          </div>
        </div>
      </>
    );
  }

  const pagoPorProjeto = new Map<string, number>();
  for (const p of pagamentos) {
    pagoPorProjeto.set(p.projetoId, (pagoPorProjeto.get(p.projetoId) ?? 0) + p.valor);
  }

  // Cobranças dos planos recorrentes — derivadas, nunca guardadas.
  const cobrancas = todasCobrancas(mensalidades, pagamentos, todayLisbonYmd(now));
  const vencidasPlanos = cobrancasVencidas(cobrancas);

  // MESMA conta da página /painel/dividas, de propósito: o que está por cobrar
  // através de um plano "dentro do valor do projecto" sai daqui e entra pelas
  // cobranças vencidas — senão os dois ecrãs davam números diferentes para a
  // mesma pergunta ("quanto me devem?"). Bruto contra bruto: `totalACobrar` já
  // traz o IVA quando o projecto o leva (ver src/lib/iva.ts).
  const dividaDoProjeto = (p: Projeto) =>
    (totalACobrar(p) ?? 0) -
    (pagoPorProjeto.get(p.id) ?? 0) -
    porCobrarDentroDoValor(mensalidades, cobrancas, p.id);

  const dividas = projetos.filter(
    (p) => p.status === "terminado" && totalACobrar(p) != null && dividaDoProjeto(p) > 0.005
  );
  const dividasValor =
    dividas.reduce((sum, p) => sum + dividaDoProjeto(p), 0) + somaPorCobrar(vencidasPlanos);

  const counts = {
    emCurso: projetos.filter((p) => STATUS_GROUPS.ativo.includes(p.status)).length,
    proximos: projetos.filter((p) => STATUS_GROUPS.proximo.includes(p.status)).length,
    aguarda: projetos.filter((p) => STATUS_GROUPS.aguarda.includes(p.status)).length,
    pronto: projetos.filter((p) => STATUS_GROUPS.pronto.includes(p.status)).length,
  };

  const active = projetos.filter(
    (p) =>
      STATUS_GROUPS.ativo.includes(p.status) ||
      STATUS_GROUPS.proximo.includes(p.status) ||
      STATUS_GROUPS.aguarda.includes(p.status)
  );

  // Hero "O teu dia": lembretes não feitas + prazos de projecto — atrasados e de
  // hoje; a vista Semana acrescenta os próximos 7 dias.
  const isHoje = (prazo: string | null): boolean =>
    isOverdue(prazo, hojeLisboa) || isToday(prazo, hojeLisboa);
  const inScope = (prazo: string | null): boolean => {
    if (!prazo) return false;
    return isHoje(prazo) || isWithinNextDays(prazo, 7, hojeLisboa);
  };

  const projetoById = new Map<string, Projeto>(projetos.map((p) => [p.id, p]));
  const lembretesVisiveis = new Set<string>(LEMBRETES_VISIVEIS_STATUSES);

  const heroAll: HeroItem[] = [];
  for (const t of lembretes) {
    if (t.feita || !inScope(t.prazo)) continue;
    const proj = projetoById.get(t.projetoId);
    if (!proj || !lembretesVisiveis.has(proj.status)) continue;
    heroAll.push({
      key: `t-${t.id}`,
      href: `/painel/projetos/${proj.id}`,
      titulo: t.titulo,
      meta: proj.clienteNome ? `${proj.titulo} · ${proj.clienteNome}` : proj.titulo,
      time: heroTime(t.prazo, t.prazoHora, hojeLisboa),
      overdue: isOverdue(t.prazo, hojeLisboa),
      hoje: isHoje(t.prazo),
      pill: "atrasado",
      color: heroDotColor(t.prazo, hojeLisboa),
      sortKey: heroSortKey(t.prazo, t.prazoHora),
    });
  }
  for (const p of active) {
    if (!inScope(p.prazo)) continue;
    heroAll.push({
      key: `p-${p.id}`,
      href: `/painel/projetos/${p.id}`,
      titulo: p.titulo,
      meta: p.clienteNome ? `Prazo do projecto · ${p.clienteNome}` : "Prazo do projecto",
      time: heroTime(p.prazo, null, hojeLisboa),
      overdue: isOverdue(p.prazo, hojeLisboa),
      hoje: isHoje(p.prazo),
      pill: "atrasado",
      color: heroDotColor(p.prazo, hojeLisboa),
      sortKey: heroSortKey(p.prazo, null),
    });
  }
  heroAll.sort((a, b) => a.sortKey - b.sortKey);
  const heroHoje = heroAll.filter((it) => it.hoje);
  const heroShown = foco === "hoje" ? heroHoje : heroAll;

  // Sub da saudação — formato do protótipo, a omitir partes a zero:
  // "Tens 3 coisas para hoje · 1 vencida · 1 projeto em dívida"
  const vencidas = heroHoje.filter((it) => it.overdue).length;
  const subParts: string[] = [];
  subParts.push(
    heroHoje.length > 0
      ? `Tens ${heroHoje.length} coisa${heroHoje.length === 1 ? "" : "s"} para hoje`
      : "Sem prazos para hoje"
  );
  if (vencidas > 0) subParts.push(`${vencidas} vencida${vencidas === 1 ? "" : "s"}`);
  if (dividas.length > 0) {
    subParts.push(`${dividas.length} projeto${dividas.length === 1 ? "" : "s"} em dívida`);
  }

  const mesActual = todayLisbonMonth(now);
  const ganhosMes = pagamentos
    .filter((p) => p.data?.startsWith(mesActual))
    .reduce((s, p) => s + p.valor, 0);

  // Gastos do mês: linhas de projecto marcadas gastoEmpresa + despesas manuais.
  const gastoEvents = collectGastos(projetos, despesas);
  const gastosMes = sumGastosInMonth(gastoEvents, mesActual);
  const lucroMes = ganhosMes - gastosMes;

  // Card "Despesas recentes": só as manuais (as de linha vivem no projecto);
  // o log completo das duas fontes está em /painel/relatorios.
  const despesasRecentes = despesas.slice(0, 6);
  const projetoOptions = [...projetos]
    .sort((a, b) => (b.dataCriado ?? "").localeCompare(a.dataCriado ?? ""))
    .map((p) => ({ id: p.id, titulo: p.titulo }));

  // ── A cobrar este mês (planos recorrentes) ──────────────────────────────
  const cobrancasMes = cobrancasNoMes(cobrancas, mesActual);
  const previstoMes = cobrancasMes.reduce((s, c) => s + c.valor, 0);
  const porCobrarMes = somaPorCobrar(cobrancasMes);
  const proxima = proximaCobranca(cobrancas);
  const proximoProjeto = proxima
    ? projetos.find((p) => p.id === proxima.projetoId)?.titulo ?? null
    : null;

  const concluidosMes = projetos.filter((p) => p.dataFechado?.startsWith(mesActual)).length;
  const novosClientesMes = clientes.filter((c) => c.criadoEm?.startsWith(mesActual)).length;
  const pagamentosMes = pagamentos.filter((p) => p.data?.startsWith(mesActual)).length;
  const ticketMedio = pagamentosMes > 0 ? Math.round(ganhosMes / pagamentosMes) : 0;

  return (
    <>
      <Topbar
        titleHtml={saudacao}
        description={subParts.join(" · ")}
        actions={<NovoMenu projetos={projetos} clientes={clientes} colaboradores={colaboradores} />}
      />

      {/* ---------- Hero "O teu dia" ---------- */}
      <div className="hero">
        <div className="hero-head">
          <span className="eyebrow">O teu dia</span>
          <nav className="toggle" aria-label="Âmbito da lista">
            <Link
              href="/painel?foco=hoje"
              scroll={false}
              className={foco === "hoje" ? "on" : undefined}
              aria-current={foco === "hoje" ? "true" : undefined}
            >
              Hoje
            </Link>
            <Link
              href="/painel?foco=semana"
              scroll={false}
              className={foco === "semana" ? "on" : undefined}
              aria-current={foco === "semana" ? "true" : undefined}
            >
              Semana
            </Link>
          </nav>
        </div>

        {heroShown.length === 0 ? (
          <div className="hero-empty">
            {foco === "hoje"
              ? "Sem prazos para hoje. Tens o dia livre para avançar no que está em curso."
              : "Sem prazos nos próximos 7 dias. Semana desimpedida."}
          </div>
        ) : (
          <div>
            {heroShown.map((it) => (
              <Link key={it.key} href={it.href} className="htask">
                <span className="dot" style={{ background: it.color }} aria-hidden="true" />
                <span className="check" aria-hidden="true" />
                <div className="t-main">
                  <div className="t-title">
                    {it.titulo}
                    {it.overdue && <span className="pill-late">{it.pill}</span>}
                  </div>
                  <div className="t-meta">{it.meta}</div>
                </div>
                {it.time && <span className="t-time">{it.time}</span>}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* ---------- KPIs slim ---------- */}
      <div className="kpi-slim">
        <div className="kpi">
          <div className="kpi-label">Em curso</div>
          <div className="kpi-num">{counts.emCurso}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Próximos</div>
          <div className="kpi-num">{counts.proximos}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">A aguardar</div>
          <div className="kpi-num">{counts.aguarda}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Finalizado</div>
          <div className="kpi-num">{counts.pronto}</div>
        </div>
        <div className="kpi accent">
          <div className="kpi-label">Em dívida</div>
          <div className="kpi-num">{eur(dividasValor)}€</div>
          {vencidasPlanos.length > 0 && (
            <div className="kpi-label" style={{ marginTop: 2 }}>
              inclui {vencidasPlanos.length} cobrança{vencidasPlanos.length === 1 ? "" : "s"}
            </div>
          )}
        </div>
      </div>

      {/* ---------- A cobrar este mês (planos recorrentes) ---------- */}
      {cobrancas.length > 0 && (
        <div className="card" style={{ marginBottom: 18 }}>
          <div className="card-head">
            <span className="card-title">A cobrar este mês</span>
            <Link className="btn-ghost" href="/painel/dividas?v=mensalidades">
              Ver mensalidades
            </Link>
          </div>
          <div className="month msum">
            <div title="O que estava combinado para entrar este mês pelos planos de mensalidade e anuidade.">
              <div className="kpi-label">Previsto</div>
              <div className="m-num sm">{eur(previstoMes)} €</div>
            </div>
            <div title="Do previsto deste mês, o que ainda não entrou.">
              <div className="kpi-label">Por cobrar</div>
              <div className={porCobrarMes > 0 ? "m-num sm neg" : "m-num sm"}>
                {eur(porCobrarMes)} €
              </div>
            </div>
            <div title="Cobranças de qualquer mês que já passaram do dia previsto e continuam por pagar.">
              <div className="kpi-label">Vencidas</div>
              <div className={vencidasPlanos.length > 0 ? "m-num sm neg" : "m-num sm"}>
                {vencidasPlanos.length}
              </div>
            </div>
          </div>
          {proxima && (
            <p style={{ fontSize: 12.5, color: "var(--ink-soft)", margin: "12px 0 0" }}>
              Próxima:{" "}
              <Link href={`/painel/projetos/${proxima.projetoId}#mensalidades`}>
                {eur(proxima.valor)} € · {proximoProjeto ?? "projecto"}
              </Link>{" "}
              <span className="muted">
                a {new Date(proxima.dataPrevista).toLocaleDateString("pt-PT", {
                  day: "numeric",
                  month: "long",
                })}
              </span>
            </p>
          )}
        </div>
      )}

      {/* ---------- Resumo do mês · Atividade recente ---------- */}
      <div className="cols2">
        <div className="card">
          <div className="card-head">
            <span className="card-title">Resumo do mês</span>
          </div>
          <div className="month msum">
            <div>
              <div className="kpi-label">Receita</div>
              <div className="m-num pos">{eur(ganhosMes)} €</div>
            </div>
            <div>
              <div className="kpi-label">Gastos</div>
              <div className="m-num neg">{eur(gastosMes)} €</div>
            </div>
            <div>
              <div className="kpi-label">Lucro</div>
              <div className={lucroMes < 0 ? "m-num neg" : "m-num"}>{eur(lucroMes)} €</div>
            </div>
          </div>
          <div
            className="month msum"
            style={{
              marginTop: 14,
              borderTop: "1px dashed rgba(90,14,14,.12)",
              paddingTop: 14,
            }}
          >
            <div>
              <div className="kpi-label">Concluídos</div>
              <div className="m-num sm">{concluidosMes}</div>
            </div>
            <div>
              <div className="kpi-label">Novos clientes</div>
              <div className="m-num sm">{novosClientesMes}</div>
            </div>
            <div>
              <div className="kpi-label">Ticket médio</div>
              <div className="m-num sm">{eur(ticketMedio)} €</div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <span className="card-title">Atividade recente</span>
            <Link className="link-more" href="/painel/auditoria">
              Ver tudo <ArrowRight className="ic" aria-hidden="true" />
            </Link>
          </div>
          {audit.length === 0 ? (
            <p className="muted" style={{ fontSize: 13 }}>
              Sem atividade ainda.
            </p>
          ) : (
            audit.map((e, i) => {
              const Icon = auditIcon(e);
              return (
                <div className="act" key={i}>
                  <span className="a-ic">
                    <Icon className="ic" aria-hidden="true" />
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <span className="who">{auditWho(e)}</span> · {auditObj(e)}
                  </div>
                  <span className="when">{fmtRel(e.at)}</span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ---------- Despesas recentes (manuais) ---------- */}
      <div style={{ marginTop: 16 }}>
        <DespesasSection
          despesas={despesasRecentes}
          projetos={projetoOptions}
          verTudoHref="/painel/relatorios"
        />
      </div>
    </>
  );
}
