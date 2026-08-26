import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { requirePainelSession } from "@/lib/painel-auth";
import { getAllProjetos } from "@/lib/mongodb/projetos";
import { getAllLembretes } from "@/lib/mongodb/lembretes";
import { getAllMensalidades } from "@/lib/mongodb/mensalidades";
import { getAllPagamentos } from "@/lib/mongodb/pagamentos";
import { getAllDespesas } from "@/lib/mongodb/despesas";
import { Topbar } from "@/components/painel/Topbar";
import { MonthCalendar } from "@/components/painel/MonthCalendar";
import { WeekCalendar } from "@/components/painel/WeekCalendar";
import { DayCalendar } from "@/components/painel/DayCalendar";
import { CalendarViewToggle } from "@/components/painel/CalendarViewToggle";
import {
  monthKey,
  parseMonthKey,
  parseIsoDate,
  isToday,
  isWithinNextDays,
  todayLisbonDate,
  todayLisbonYmd,
} from "@/lib/dates";
import {
  cobrancasParaCalendario,
  todasCobrancas,
  type CobrancaCalendario,
} from "@/lib/mensalidades";
import { STATUS_GROUPS, type Projeto } from "@/types/projeto";
import type { Lembrete } from "@/types/lembrete";

export const dynamic = "force-dynamic";

type View = "mes" | "semana" | "dia";
type SearchParams = Promise<{ m?: string; view?: string; date?: string }>;

const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function parseDate(s: string | undefined): Date | null {
  if (!s) return null;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfWeek(d: Date): Date {
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  const out = new Date(d);
  out.setDate(d.getDate() + diff);
  out.setHours(0, 0, 0, 0);
  return out;
}

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requirePainelSession();

  const [projetos, lembretes, mensalidades, pagamentos, despesas, params] = await Promise.all([
    getAllProjetos(),
    getAllLembretes(),
    getAllMensalidades(),
    getAllPagamentos(),
    getAllDespesas(),
    searchParams,
  ]);

  // Cobranças derivadas no servidor (fuso de Lisboa) e já com o nome do plano,
  // do projecto e do cliente — as vistas do calendário são componentes cliente.
  const cobrancas = cobrancasParaCalendario(
    // Pagamentos e despesas apontam ao plano pelo mesmo campo e nunca se
    // cruzam (um pagamento nunca fecha um plano de despesa), por isso juntar as
    // duas listas basta para derivar os dois sentidos de uma vez.
    todasCobrancas(mensalidades, [...pagamentos, ...despesas], todayLisbonYmd()),
    mensalidades,
    projetos
  );

  const view: View =
    params.view === "semana" || params.view === "dia" ? params.view : "mes";

  // "Hoje" no fuso de Portugal (o servidor Vercel corre em UTC).
  const today = todayLisbonDate();
  const requested = params.m ? parseMonthKey(params.m) : null;
  const target = requested ?? { year: today.getFullYear(), monthIndex: today.getMonth() };
  const focusDate = parseDate(params.date) ?? today;

  const prev = new Date(target.year, target.monthIndex - 1, 1);
  const next = new Date(target.year, target.monthIndex + 1, 1);

  const weekStart = startOfWeek(focusDate);
  const weekPrev = new Date(weekStart);
  weekPrev.setDate(weekStart.getDate() - 7);
  const weekNext = new Date(weekStart);
  weekNext.setDate(weekStart.getDate() + 7);

  const dayPrev = new Date(focusDate);
  dayPrev.setDate(focusDate.getDate() - 1);
  const dayNext = new Date(focusDate);
  dayNext.setDate(focusDate.getDate() + 1);

  let titleHtml = "";
  let prevHref = "";
  let nextHref = "";
  let todayHref = "";
  if (view === "mes") {
    titleHtml = `${MONTH_NAMES[target.monthIndex]} <em>${target.year}</em>`;
    prevHref = `/painel/calendario?view=mes&m=${monthKey(prev)}`;
    nextHref = `/painel/calendario?view=mes&m=${monthKey(next)}`;
    todayHref = `/painel/calendario?view=mes&m=${monthKey(today)}`;
  } else if (view === "semana") {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    titleHtml =
      weekStart.getMonth() === weekEnd.getMonth()
        ? `${weekStart.getDate()}–${weekEnd.getDate()} <em>${MONTH_NAMES[weekStart.getMonth()]}</em>`
        : `${weekStart.getDate()} ${MONTH_NAMES[weekStart.getMonth()]} – ${weekEnd.getDate()} <em>${MONTH_NAMES[weekEnd.getMonth()]}</em>`;
    prevHref = `/painel/calendario?view=semana&date=${isoDate(weekPrev)}`;
    nextHref = `/painel/calendario?view=semana&date=${isoDate(weekNext)}`;
    todayHref = `/painel/calendario?view=semana&date=${isoDate(today)}`;
  } else {
    titleHtml = `${focusDate.getDate()} ${MONTH_NAMES[focusDate.getMonth()]} <em>${focusDate.getFullYear()}</em>`;
    prevHref = `/painel/calendario?view=dia&date=${isoDate(dayPrev)}`;
    nextHref = `/painel/calendario?view=dia&date=${isoDate(dayNext)}`;
    todayHref = `/painel/calendario?view=dia&date=${isoDate(today)}`;
  }

  return (
    <>
      <Topbar
        crumbs={["Calendário"]}
        titleHtml={titleHtml}
        actions={
          <>
            <CalendarViewToggle current={view} />
            <Link href={prevHref} className="btn-ghost" aria-label="Anterior">
              <ChevronLeft style={{ width: 14, height: 14 }} aria-hidden="true" />
            </Link>
            <Link href={todayHref} className="btn-ghost">
              Hoje
            </Link>
            <Link href={nextHref} className="btn-ghost" aria-label="Seguinte">
              <ChevronRight style={{ width: 14, height: 14 }} aria-hidden="true" />
            </Link>
          </>
        }
      />

      {view === "mes" && (
        <div className="grid items-start gap-[18px] lg:grid-cols-[3fr_1fr]">
          <div className="cal-month-scroll min-w-0">
            <MonthCalendar
              year={target.year}
              monthIndex={target.monthIndex}
              projetos={projetos}
              lembretes={lembretes}
              cobrancas={cobrancas}
            />
          </div>
          <AgendaSide projetos={projetos} lembretes={lembretes} cobrancas={cobrancas} />
        </div>
      )}
      {view === "semana" && (
        <WeekCalendar
          projetos={projetos}
          lembretes={lembretes}
          weekStart={weekStart}
          cobrancas={cobrancas}
        />
      )}
      {view === "dia" && (
        <DayCalendar
          projetos={projetos}
          lembretes={lembretes}
          day={focusDate}
          cobrancas={cobrancas}
        />
      )}
    </>
  );
}

// `accionavel`: entrada em estado accionável (lembrete não-feita / projecto não
// fechado nem cancelado). O cartão "Hoje" da agenda mostra só accionáveis, para
// alinhar com o widget "Hoje" do dashboard (páginel/page.tsx), que só conta
// projectos activos. A grelha mensal (MonthCalendar) mantém tudo, de propósito,
// porque mostra o mês completo tal como está na base de dados.
type AgendaEntry = { id: string; href: string; label: string; sub: string | null; date: Date; accionavel: boolean };

function buildAgenda(
  projetos: Projeto[],
  lembretes: Lembrete[],
  cobrancas: CobrancaCalendario[]
) {
  // "Hoje" no fuso de Portugal (o servidor Vercel corre em UTC).
  const now = todayLisbonDate();
  const entries: AgendaEntry[] = [];
  for (const p of projetos) {
    const d = parseIsoDate(p.prazo ?? null);
    if (!d) continue;
    const accionavel = !STATUS_GROUPS.arquivo.includes(p.status);
    entries.push({ id: `p-${p.id}`, href: `/painel/projetos/${p.id}`, label: p.titulo, sub: p.clienteNome ?? null, date: d, accionavel });
  }
  for (const t of lembretes) {
    const d = parseIsoDate(t.prazo ?? null);
    if (!d) continue;
    entries.push({ id: `t-${t.id}`, href: `/painel/projetos/${t.projetoId}`, label: t.titulo, sub: "Lembrete", date: d, accionavel: !t.feita });
  }
  for (const c of cobrancas) {
    const d = parseIsoDate(c.dataPrevista);
    if (!d) continue;
    const valor = c.valor.toLocaleString("pt-PT", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    entries.push({
      id: `c-${c.mensalidadeId}-${c.numero}`,
      href: `/painel/projetos/${c.projetoId}#mensalidades`,
      label: c.ehFimDoPlano
        ? `${c.planoTitulo} acaba`
        : `${valor} € · ${c.clienteNome ?? c.projetoTitulo}`,
      sub: c.ehFimDoPlano
        ? "Acaba — renovar ou deixar cair"
        : `${c.planoTitulo} ${c.numero}/${c.totalCobrancas}`,
      date: d,
      // Uma cobrança já paga não é accionável — fica só na grelha do mês.
      accionavel: c.estado !== "paga",
    });
  }
  const hoje = entries
    .filter((e) => e.accionavel && isToday(e.date.toISOString(), now))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
  const proximos = entries
    .filter((e) => e.accionavel && !isToday(e.date.toISOString(), now) && isWithinNextDays(e.date.toISOString(), 7, now))
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 8);
  return { hoje, proximos };
}

function AgendaSide({
  projetos,
  lembretes,
  cobrancas,
}: {
  projetos: Projeto[];
  lembretes: Lembrete[];
  cobrancas: CobrancaCalendario[];
}) {
  const { hoje, proximos } = buildAgenda(projetos, lembretes, cobrancas);
  const fmtDay = (d: Date) =>
    d.toLocaleDateString("pt-PT", { weekday: "short", day: "2-digit", month: "short" });

  return (
    <div className="col" style={{ gap: 14 }}>
      <div className="card">
        <div className="card-label" style={{ marginBottom: 4 }}>Hoje</div>
        <div className="muted" style={{ fontSize: 12 }}>
          {todayLisbonDate().toLocaleDateString("pt-PT", { weekday: "long", day: "2-digit", month: "long" })}
        </div>
        <div style={{ marginTop: 8 }}>
          {hoje.length === 0 ? (
            <p className="muted" style={{ fontSize: 12.5, margin: 0 }}>Nada agendado hoje.</p>
          ) : (
            hoje.map((e, i) => (
              <Link
                key={e.id}
                href={e.href}
                style={{ display: "block", padding: "10px 0", borderBottom: i < hoje.length - 1 ? "1px dashed rgba(90, 14, 14, 0.10)" : "0" }}
              >
                <div style={{ color: "var(--ink)", fontWeight: 500, fontSize: 13 }}>{e.label}</div>
                {e.sub && <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>{e.sub}</div>}
              </Link>
            ))
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-label">Próximos · esta semana</div>
        <div>
          {proximos.length === 0 ? (
            <p className="muted" style={{ fontSize: 12.5, margin: 0 }}>Sem prazos nos próximos 7 dias.</p>
          ) : (
            proximos.map((e, i) => (
              <Link
                key={e.id}
                href={e.href}
                style={{ display: "block", padding: "10px 0", borderBottom: i < proximos.length - 1 ? "1px dashed rgba(90, 14, 14, 0.10)" : "0" }}
              >
                <div className="mono muted" style={{ fontSize: 10.5, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 3 }}>{fmtDay(e.date)}</div>
                <div style={{ color: "var(--ink)", fontWeight: 500, fontSize: 13 }}>{e.label}</div>
                {e.sub && <div className="muted" style={{ fontSize: 11.5, marginTop: 1 }}>{e.sub}</div>}
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
