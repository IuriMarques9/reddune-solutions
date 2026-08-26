"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, UserPlus, MessageSquare, CalendarClock, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "@/components/ui/dropdown-menu";
import { safeFetch, safeJsonPost } from "@/lib/safe-fetch";

type NotificationItem = {
  id: string;
  type: "lead" | "comment" | "cobranca";
  title: string;
  description: string;
  href: string;
  timestamp: string;
  unread: boolean;
};

type NotificationsPayload = {
  unread: number;
  items: NotificationItem[];
};

/** Intervalo de polling — refresca o feed em segundo plano (60s). */
const POLL_MS = 60_000;

function fmtRelative(iso: string): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  // As cobranças têm data FUTURA (vencem daqui a dias) — sem este ramo, uma
  // cobrança a vencer na semana que vem aparecia como "agora".
  if (diff < -60_000) {
    const min = Math.round(-diff / 60_000);
    if (min < 60) return `daqui a ${min} min`;
    const h = Math.round(min / 60);
    if (h < 24) return `daqui a ${h} h`;
    return `daqui a ${Math.round(h / 24)} d`;
  }
  const min = Math.round(diff / 60_000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24);
  return `há ${d} d`;
}

/**
 * NotificationsBell — sino real (in-app) da Topbar.
 *
 * Fetch a /api/notifications no mount e a cada 60s. Cada item traz `unread`
 * (lead novo / comentário por ler = novo; audit = histórico) e ganha um ponto.
 * Dispensar é GLOBAL (utilizador único, vários dispositivos): POST ao servidor
 * que esconde a notificação em todo o lado (não toca no lead/comentário/audit).
 * O badge vem do servidor, já sem as dispensadas.
 */
export function NotificationsBell() {
  const [data, setData] = useState<NotificationsPayload | null>(null);
  // Esconde optimisticamente enquanto o POST + reload não chega (snappy).
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    const res = await safeFetch<NotificationsPayload>("/api/notifications");
    if (res.ok) {
      setData(res.data);
      setHidden(new Set()); // o servidor já filtra as dispensadas
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  const allItems = useMemo(() => data?.items ?? [], [data]);
  const serverUnread = data?.unread ?? 0;

  const visibleItems = allItems.filter((i) => !hidden.has(i.id));
  const hiddenUnread = allItems.filter((i) => i.unread && hidden.has(i.id)).length;
  const badge = Math.max(0, serverUnread - hiddenUnread);
  const hasBadge = badge > 0;

  const dispensar = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) return;
      setHidden((prev) => {
        const next = new Set(prev);
        for (const id of ids) next.add(id);
        return next;
      });
      const res = await safeJsonPost("/api/notifications/dismiss", { ids });
      if (res.ok) load();
    },
    [load]
  );

  const ariaLabel = hasBadge ? `Notificações, ${badge} por tratar` : "Notificações";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={hasBadge ? "bell unread" : "bell"}
          aria-label={ariaLabel}
          type="button"
        >
          <Bell className="ic" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={8} className="w-80 p-0">
        <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-dune-deep/10">
          <span className="font-headline text-sm font-semibold text-ink">
            Notificações
          </span>
          {visibleItems.length > 0 && (
            <button
              type="button"
              onClick={() => dispensar(visibleItems.map((i) => i.id))}
              className="text-[11px] font-medium text-ink-soft hover:text-ember transition-colors"
            >
              Limpar
            </button>
          )}
        </div>

        {visibleItems.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <div className="text-sm font-medium text-ink">Sem novidades</div>
            <div className="mt-1 text-[12px] text-ink-soft">
              Novos leads, comentários e cobranças aparecem aqui.
            </div>
          </div>
        ) : (
          <ul className="max-h-[22rem] overflow-y-auto py-1">
            {visibleItems.map((item) => (
              <li
                key={item.id}
                className="flex items-start transition-colors hover:bg-cream-deep"
              >
                <Link
                  href={item.href}
                  className="flex min-w-0 flex-1 items-start gap-2.5 px-3.5 py-2.5 outline-none focus-visible:bg-cream-deep"
                >
                  <span
                    aria-hidden="true"
                    className="relative mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                    style={{
                      background: "rgba(214, 66, 42, 0.12)",
                      color: "var(--ember, #d6422a)",
                    }}
                  >
                    {item.type === "lead" ? (
                      <UserPlus size={14} />
                    ) : item.type === "cobranca" ? (
                      <CalendarClock size={14} />
                    ) : (
                      <MessageSquare size={14} />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      {item.unread && (
                        <span
                          aria-label="Nova"
                          className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-ember"
                        />
                      )}
                      <span className="block truncate text-[13px] font-medium text-ink">
                        {item.title}
                      </span>
                    </span>
                    <span className="block truncate text-[12px] text-ink-soft">
                      {item.description}
                    </span>
                    <span className="mt-0.5 block text-[10.5px] text-ink-mute">
                      {fmtRelative(item.timestamp)}
                    </span>
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    dispensar([item.id]);
                  }}
                  aria-label="Dispensar notificação"
                  title="Dispensar"
                  className="mt-2.5 mr-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-ink-mute/70 transition-colors hover:bg-dune-deep/10 hover:text-ink"
                >
                  <X size={13} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
