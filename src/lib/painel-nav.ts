import {
  LayoutDashboard,
  ListChecks,
  Users,
  CalendarDays,
  BarChart3,
  FolderKanban,
  HardHat,
  AlertTriangle,
  Tag,
  ShoppingBag,
  Briefcase,
  Settings,
  History,
  Inbox,
  Search,
  type LucideIcon,
} from "lucide-react";

export type PainelCategoria = "principal" | "site" | "ferramentas";

export type PainelNavItem = {
  href: string;
  label: string;
  Icon: LucideIcon;
  exact?: boolean;
  category: PainelCategoria;
};

/** Categorias da navegação, na ordem em que aparecem. */
export const PAINEL_CATEGORIAS: { id: PainelCategoria; label: string }[] = [
  { id: "principal", label: "Principal" },
  { id: "site", label: "Site público" },
  { id: "ferramentas", label: "Ferramentas" },
];

const CAT_ORDER: Record<PainelCategoria, number> = {
  principal: 0,
  site: 1,
  ferramentas: 2,
};

export const PAINEL_NAV_DEFAULT: PainelNavItem[] = [
  // Principal — trabalho do dia-a-dia.
  { href: "/painel", label: "Visão geral", Icon: LayoutDashboard, exact: true, category: "principal" },
  { href: "/painel/lembretes", label: "Lembretes", Icon: ListChecks, category: "principal" },
  { href: "/painel/projetos", label: "Projectos", Icon: FolderKanban, category: "principal" },
  { href: "/painel/clientes", label: "Clientes", Icon: Users, category: "principal" },
  { href: "/painel/colaboradores", label: "Colaboradores", Icon: HardHat, category: "principal" },
  { href: "/painel/leads", label: "Leads", Icon: Inbox, category: "principal" },
  { href: "/painel/dividas", label: "Dívidas", Icon: AlertTriangle, category: "principal" },
  { href: "/painel/calendario", label: "Calendário", Icon: CalendarDays, category: "principal" },
  // Site público — edição da landing / loja / portfólio.
  { href: "/painel/precos", label: "Serviços", Icon: Tag, category: "site" },
  { href: "/painel/loja", label: "Loja", Icon: ShoppingBag, category: "site" },
  { href: "/painel/portfolio", label: "Portfólio", Icon: Briefcase, category: "site" },
  // Ferramentas — relatórios, pesquisa, definições, auditoria.
  { href: "/painel/relatorios", label: "Relatórios", Icon: BarChart3, category: "ferramentas" },
  { href: "/painel/procurar", label: "Procurar", Icon: Search, category: "ferramentas" },
  { href: "/painel/definicoes", label: "Definições", Icon: Settings, category: "ferramentas" },
  { href: "/painel/auditoria", label: "Auditoria", Icon: History, category: "ferramentas" },
];

/**
 * Ordena por categoria (ordem fixa das categorias), preservando a ordem
 * relativa dentro de cada categoria (Array.sort é estável). Garante que a
 * ordem das tabs é sempre o reflexo das categorias.
 */
export function groupByCategoria(nav: PainelNavItem[]): PainelNavItem[] {
  return [...nav].sort((a, b) => CAT_ORDER[a.category] - CAT_ORDER[b.category]);
}

export const TAB_ORDER_KEY = "painel.tabOrder";
export const TAB_ORDER_EVENT = "painel:tabOrderChanged";

/**
 * Aplica ordem custom (array de hrefs) ao NAV default e RE-AGRUPA por
 * categoria — a ordem custom só reordena dentro de cada categoria; nunca
 * mistura categorias. Itens não listados ficam no fim (dentro da sua
 * categoria). Hrefs inválidos são ignorados.
 */
export function applyTabOrder(
  order: string[] | null,
  nav: PainelNavItem[] = PAINEL_NAV_DEFAULT
): PainelNavItem[] {
  if (!order || order.length === 0) return groupByCategoria(nav);
  const byHref = new Map(nav.map((n) => [n.href, n]));
  const result: PainelNavItem[] = [];
  const seen = new Set<string>();
  for (const href of order) {
    const item = byHref.get(href);
    if (item && !seen.has(href)) {
      result.push(item);
      seen.add(href);
    }
  }
  for (const item of nav) {
    if (!seen.has(item.href)) result.push(item);
  }
  return groupByCategoria(result);
}

export function readTabOrder(): string[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(TAB_ORDER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.every((s) => typeof s === "string")
      ? (parsed as string[])
      : null;
  } catch {
    return null;
  }
}

export function writeTabOrder(order: string[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TAB_ORDER_KEY, JSON.stringify(order));
  window.dispatchEvent(new CustomEvent(TAB_ORDER_EVENT));
}

export function clearTabOrder(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TAB_ORDER_KEY);
  window.dispatchEvent(new CustomEvent(TAB_ORDER_EVENT));
}
