import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  daysInMonth,
  firstWeekdayOfMonth,
  isToday,
  parseIsoDate,
  todayLisbonDate,
} from "@/lib/dates";
import type { Projeto } from "@/types/projeto";
import type { Lembrete } from "@/types/lembrete";
import type { CobrancaCalendario } from "@/lib/mensalidades";
import { CobrancaPill } from "./CobrancaPill";

type CalendarEntry =
  | { kind: "projeto"; item: Projeto }
  | { kind: "lembrete"; item: Lembrete }
  | { kind: "cobranca"; item: CobrancaCalendario };

type Props = {
  year: number;
  monthIndex: number;
  projetos: Projeto[];
  lembretes?: Lembrete[];
  cobrancas?: CobrancaCalendario[];
};

const DAYS_HEADER = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

function isoDate(year: number, monthIndex: number, day: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function MonthCalendar({
  year,
  monthIndex,
  projetos,
  lembretes = [],
  cobrancas = [],
}: Props) {
  // "Hoje" no fuso de Portugal (não no do servidor Vercel, que corre em UTC).
  const hojeLisboa = todayLisbonDate();
  const totalDays = daysInMonth(year, monthIndex);
  const firstWeekday = firstWeekdayOfMonth(year, monthIndex);
  const totalCells = Math.ceil((firstWeekday + totalDays) / 7) * 7;
  // Dias do mês anterior para preencher as células .out (o protótipo mostra o número).
  const prevMonthDays = new Date(year, monthIndex, 0).getDate();

  const byDay = new Map<number, CalendarEntry[]>();

  function addToDay(day: number, entry: CalendarEntry) {
    const list = byDay.get(day) ?? [];
    list.push(entry);
    byDay.set(day, list);
  }

  for (const p of projetos) {
    const d = parseIsoDate(p.prazo);
    if (!d) continue;
    if (d.getFullYear() !== year || d.getMonth() !== monthIndex) continue;
    addToDay(d.getDate(), { kind: "projeto", item: p });
  }

  for (const t of lembretes) {
    if (!t.prazo) continue;
    const d = parseIsoDate(t.prazo);
    if (!d) continue;
    if (d.getFullYear() !== year || d.getMonth() !== monthIndex) continue;
    addToDay(d.getDate(), { kind: "lembrete", item: t });
  }

  // As cobranças já vêm com data yyyy-mm-dd calculada no servidor: compara-se
  // como texto, sem passar por Date, para nenhum fuso deslocar o dia.
  const prefixoMes = `${year}-${String(monthIndex + 1).padStart(2, "0")}-`;
  for (const c of cobrancas) {
    if (!c.dataPrevista.startsWith(prefixoMes)) continue;
    addToDay(Number(c.dataPrevista.slice(8, 10)), { kind: "cobranca", item: c });
  }

  // day: dia do mês corrente; outDay: dia do mês adjacente (célula .out)
  const cells: Array<{ day: number | null; outDay: number; entries: CalendarEntry[] }> = [];
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - firstWeekday + 1;
    if (dayNum < 1) {
      cells.push({ day: null, outDay: prevMonthDays + dayNum, entries: [] });
    } else if (dayNum > totalDays) {
      cells.push({ day: null, outDay: dayNum - totalDays, entries: [] });
    } else {
      cells.push({ day: dayNum, outDay: 0, entries: byDay.get(dayNum) ?? [] });
    }
  }

  return (
    <div className="cal">
      <div className="cal-grid" style={{ marginBottom: 6 }}>
        {DAYS_HEADER.map((d) => (
          <div key={`dow-${d}`} className="cal-dow">
            {d}
          </div>
        ))}
      </div>
      <div className="cal-grid">
        {cells.map((cell, idx) => {
          if (cell.day === null) {
            return (
              <div key={`out-${idx}`} className="cal-cell out">
                <div className="d">{cell.outDay}</div>
              </div>
            );
          }
          const dateForDay = new Date(year, monthIndex, cell.day);
          const todayCell = isToday(dateForDay.toISOString(), hojeLisboa);
          const visible = cell.entries.slice(0, 3);
          const overflow = cell.entries.length - visible.length;

          return (
            <div key={`day-${cell.day}`} className={cn("cal-cell", todayCell && "today")}>
              <div className="d">{cell.day}</div>
              {visible.map((entry, i) => {
                if (entry.kind === "projeto") {
                  const p = entry.item;
                  return (
                    <Link
                      key={`p-${p.id}-${i}`}
                      href={`/painel/projetos/${p.id}`}
                      className="cal-ev"
                      title={`${p.titulo}${p.clienteNome ? ` — ${p.clienteNome}` : ""}`}
                    >
                      {p.titulo}
                    </Link>
                  );
                }
                if (entry.kind === "cobranca") {
                  const c = entry.item;
                  return (
                    <CobrancaPill key={`c-${c.mensalidadeId}-${c.numero}-${i}`} cobranca={c} />
                  );
                }
                const t = entry.item;
                return (
                  <Link
                    key={`t-${t.id}-${i}`}
                    href={`/painel/projetos/${t.projetoId}`}
                    className="cal-ev b"
                    title={`Lembrete: ${t.titulo}`}
                  >
                    {t.prazoHora ? `${t.prazoHora} · ` : ""}{t.titulo}
                  </Link>
                );
              })}
              {overflow > 0 && (
                <Link
                  href={`/painel/calendario?view=dia&date=${isoDate(year, monthIndex, cell.day)}`}
                  className="cal-ev b"
                  title={`Ver dia ${cell.day} completo`}
                >
                  +{overflow}
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
