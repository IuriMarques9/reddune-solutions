import {
  PROJETO_TIPO_LABEL,
  STATUS_LABELS,
  type Projeto,
  type ProjetoTipo,
} from "@/types/projeto";
import type { Cliente } from "@/types/cliente";
import type { Lembrete } from "@/types/lembrete";

/**
 * Pesquisa global do painel — lógica pura partilhada entre a página
 * /painel/procurar (fallback mobile) e a rota /api/procurar (dropdown
 * inline da topbar). Sem acesso a BD: recebe as listas já carregadas.
 */

/** Lowercase + strip diacritics, para match insensível a acentos. */
export function normPesquisa(s: string | null | undefined): string {
  return (s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

function projetoHaystack(p: Projeto): string {
  const tipos = [p.tipo, ...(p.tipos ?? [])].filter(Boolean) as ProjetoTipo[];
  const tiposLabel = tipos.map((t) => PROJETO_TIPO_LABEL[t] ?? t).join(" ");
  return normPesquisa(
    [p.titulo, p.clienteNome ?? "", tipos.join(" "), tiposLabel, p.notasResumo ?? ""].join(" ")
  );
}

function clienteHaystack(c: Cliente): string {
  return normPesquisa([c.nome, c.empresa ?? "", c.email ?? "", c.telefone ?? "", c.nif ?? ""].join(" "));
}

function lembreteHaystack(t: Lembrete): string {
  return normPesquisa([t.titulo, t.notas ?? ""].join(" "));
}

export type ProcurarHits = {
  projetos: Projeto[];
  clientes: Cliente[];
  lembretes: Lembrete[];
};

/**
 * Filtra as três colecções pelo termo `q` (insensível a acentos/maiúsculas).
 * Devolve os objectos completos — é o que a página /painel/procurar usa
 * para renderizar tabelas ricas (StatusBadge, contactos, etc.).
 */
export function matchAll(
  q: string,
  projetos: Projeto[],
  clientes: Cliente[],
  lembretes: Lembrete[]
): ProcurarHits {
  const nq = normPesquisa(q.trim());
  if (!nq) return { projetos: [], clientes: [], lembretes: [] };
  return {
    projetos: projetos.filter((p) => projetoHaystack(p).includes(nq)),
    clientes: clientes.filter((c) => clienteHaystack(c).includes(nq)),
    lembretes: lembretes.filter((t) => lembreteHaystack(t).includes(nq)),
  };
}

export type ProcurarTipo = "projeto" | "cliente" | "lembrete";

/** Campos mínimos para render no dropdown inline (.gsearch-pop). */
export type ProcurarResultado = {
  id: string;
  titulo: string;
  sub: string | null;
  tipo: ProcurarTipo;
  /** Destino de navegação (lembrete → projecto a que pertence). */
  href: string;
};

export type ProcurarResultados = {
  projetos: ProcurarResultado[];
  clientes: ProcurarResultado[];
  lembretes: ProcurarResultado[];
};

/**
 * Pesquisa e projecta para o formato mínimo de render do dropdown.
 * `limit` (opcional) corta cada grupo — a rota /api/procurar usa 6.
 */
export function searchAll(
  q: string,
  projetos: Projeto[],
  clientes: Cliente[],
  lembretes: Lembrete[],
  limit?: number
): ProcurarResultados {
  const hits = matchAll(q, projetos, clientes, lembretes);
  const cap = <T,>(arr: T[]): T[] =>
    typeof limit === "number" && limit >= 0 ? arr.slice(0, limit) : arr;
  const projetoById = new Map(projetos.map((p) => [p.id, p]));

  return {
    projetos: cap(hits.projetos).map((p) => ({
      id: p.id,
      titulo: p.titulo,
      sub: `${p.clienteNome ?? "Interno"} · ${STATUS_LABELS[p.status] ?? p.status}`,
      tipo: "projeto" as const,
      href: `/painel/projetos/${p.id}`,
    })),
    clientes: cap(hits.clientes).map((c) => ({
      id: c.id,
      titulo: c.nome,
      sub: c.telefone ?? c.email ?? (c.nif ? `NIF ${c.nif}` : null),
      tipo: "cliente" as const,
      href: `/painel/clientes/${c.id}`,
    })),
    lembretes: cap(hits.lembretes).map((t) => {
      const proj = projetoById.get(t.projetoId);
      return {
        id: t.id,
        titulo: t.titulo,
        sub: `${proj?.titulo ?? "Projecto desconhecido"}${t.feita ? " · feito" : ""}`,
        tipo: "lembrete" as const,
        href: `/painel/projetos/${t.projetoId}`,
      };
    }),
  };
}
