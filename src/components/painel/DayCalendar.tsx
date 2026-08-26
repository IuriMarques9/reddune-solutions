"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { parseIsoDate, startOfDay } from "@/lib/dates";
import type { Projeto, ProjetoStatus } from "@/types/projeto";
import type { Lembrete } from "@/types/lembrete";
import type { CobrancaCalendario } from "@/lib/mensalidades";
import { QuickLembreteModal } from "./QuickLembreteModal";
import { CobrancaPill } from "./CobrancaPill";

type Props = {
  projetos: Projeto[];
  lembretes: Lembrete[];
  day: Date;
  cobrancas?: CobrancaCalendario[];
};

const HOUR_START = 8;
const HOUR_END = 20;

const STATUS_DOT: Record<ProjetoStatus, string> = {
  "ideia-interna": "bg-violet-400",
  "ideia-cliente": "bg-amber-400",
  proximo: "bg-apricot",
  "em-curso": "bg-ember",
  aguardando: "bg-amber-400",
  terminado: "bg-amber-500",
  fechado: "bg-emerald-600",
};

function isoFromDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function sameDay(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

export function DayCalendar({ projetos, lembretes, day, cobrancas = [] }: Props) {
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickPrazo, setQuickPrazo] = useState<string | null>(null);
  const [quickHora, setQuickHora] = useState<string | null>(null);

  const slots: { hour: number; minute: number }[] = [];
  for (let h = HOUR_START; h < HOUR_END; h++) {
    slots.push({ hour: h, minute: 0 });
    slots.push({ hour: h, minute: 30 });
  }

  const dayProjetos = projetos.filter((p) => {
    const d = parseIsoDate(p.prazo);
    return d && sameDay(d, day);
  });
  const dayLembretes = lembretes.filter((t) => {
    const d = parseIsoDate(t.prazo);
    return d && sameDay(d, day);
  });
  const semHora = dayLembretes.filter((t) => !t.prazoHora);
  // Uma cobrança tem dia, não hora: vive sempre na faixa "Dia inteiro".
  const dayCobrancas = cobrancas.filter((c) => c.dataPrevista === isoFromDate(day));

  function openQuick(hour: number, minute: number) {
    setQuickPrazo(isoFromDate(day));
    setQuickHora(`${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
    setQuickOpen(true);
  }

  return (
    <>
      <div className="space-y-4">
        {(dayProjetos.length > 0 || semHora.length > 0 || dayCobrancas.length > 0) && (
          <div className="rounded-card border border-dune-deep/10 bg-cream/40 p-3 space-y-2">
            <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-ink-mute">
              Dia inteiro
            </p>
            <div className="flex flex-wrap gap-2">
              {dayProjetos.map((p) => (
                <Link
                  key={`p-${p.id}`}
                  href={`/painel/projetos/${p.id}`}
                  className="cal-ev"
                  style={{ marginTop: 0 }}
                  title={p.titulo}
                >
                  <span className={cn("inline-block h-1.5 w-1.5 rounded-full mr-1", STATUS_DOT[p.status])} />
                  {p.titulo}
                </Link>
              ))}
              {semHora.map((t) => (
                <Link
                  key={`t-${t.id}`}
                  href={`/painel/projetos/${t.projetoId}`}
                  className="cal-ev b"
                  style={{ marginTop: 0 }}
                  title={t.titulo}
                >
                  {t.titulo}
                </Link>
              ))}
              {dayCobrancas.map((c) => (
                <CobrancaPill
                  key={`c-${c.mensalidadeId}-${c.numero}`}
                  cobranca={c}
                  style={{ marginTop: 0 }}
                />
              ))}
            </div>
          </div>
        )}

        <div className="cal" style={{ padding: 0, overflow: "hidden" }}>
          {slots.map(({ hour, minute }, idx) => {
            const slotLembretes = dayLembretes.filter((t) => {
              if (!t.prazoHora) return false;
              const [h, m] = t.prazoHora.split(":").map((x) => parseInt(x, 10));
              return h === hour && (minute === 0 ? m < 30 : m >= 30);
            });
            return (
              <button
                type="button"
                key={idx}
                onClick={() => openQuick(hour, minute)}
                className="w-full grid grid-cols-[80px_1fr] border-b border-dune-deep/8 hover:bg-ember/5 text-left transition-colors"
              >
                <div className="px-3 py-2 text-[11px] font-mono text-ink-mute tabular-nums">
                  {String(hour).padStart(2, "0")}:{String(minute).padStart(2, "0")}
                </div>
                <div className="px-2 py-2 min-h-[40px]">
                  {slotLembretes.map((t) => (
                    <Link
                      key={t.id}
                      href={`/painel/projetos/${t.projetoId}`}
                      onClick={(e) => e.stopPropagation()}
                      className="cal-ev"
                      title={`${t.prazoHora} ${t.titulo}`}
                    >
                      <span className="font-mono tabular-nums">{t.prazoHora}</span> {t.titulo}
                    </Link>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <QuickLembreteModal
        open={quickOpen}
        onOpenChange={setQuickOpen}
        defaultPrazo={quickPrazo}
        defaultPrazoHora={quickHora}
        projetos={projetos}
      />
    </>
  );
}
