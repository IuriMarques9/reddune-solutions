// Agregação de gastos da empresa a partir das duas fontes:
//   1. Linhas de custo de projectos marcadas `gastoEmpresa` (atribuídas ao mês do
//      projecto — proxy: dataCriado, quando as compras normalmente acontecem).
//   2. Despesas manuais (colecção `despesas`) — têm data própria.
// Funções puras sobre dados já carregados (sem DB) — usadas pelo dashboard e
// pelos relatórios para os números baterem certo entre ecrãs.
import {
  computeGastoEmpresa,
  linhaContaComoGasto,
  type LinhaCategoria,
  type Projeto,
} from "@/types/projeto";
import { DESPESA_CATEGORIA, type Despesa, type DespesaCategoria } from "@/types/despesa";

/**
 * Mapeia a categoria da linha (visível ao cliente) para o balde de despesa dos
 * relatórios (interno). `mao-obra` cai em "outros": marcada como gasto só faz
 * sentido quando é trabalho subcontratado, e não há balde próprio para isso.
 */
const LINHA_TO_DESPESA: Record<LinhaCategoria, DespesaCategoria> = {
  peca: "pecas",
  portes: "portes",
  deslocacao: "deslocacoes",
  software: "software",
  "mao-obra": "outros",
  outro: "outros",
};

export function linhaCatToDespesaCat(cat: LinhaCategoria): DespesaCategoria {
  return LINHA_TO_DESPESA[cat];
}

/** Data que atribui um gasto de linha de projecto a um mês (proxy: início do projecto). */
export function projetoGastoDate(p: Projeto): string | null {
  return p.dataCriado ?? p.dataFechado ?? null;
}

export type GastoEvent = {
  /** Chave estável: id da despesa (manual) ou `<projetoId>:<linhaId>` (linha). */
  id: string;
  data: string; // ISO
  descricao: string;
  valor: number;
  categoria: DespesaCategoria;
  projetoId: string | null;
  fonte: "linha" | "manual";
};

/** Achata todas as fontes de gasto num único array de eventos. */
export function collectGastos(projetos: Projeto[], despesas: Despesa[]): GastoEvent[] {
  const events: GastoEvent[] = [];
  for (const p of projetos) {
    const fallback = projetoGastoDate(p);
    if (!p.linhas) continue;
    for (const l of p.linhas) {
      // Linhas de plano nunca são gasto nosso — ver linhaContaComoGasto.
      if (!linhaContaComoGasto(l)) continue;
      // Regime de caixa: data própria da linha (quando o Iuri pagou) tem
      // prioridade; sem data, cai no mês do projecto como antes.
      const data = l.data ?? fallback;
      if (!data) continue;
      events.push({
        id: `${p.id}:${l.id}`,
        data,
        descricao: l.descricao,
        valor: l.quantidade * l.precoUnit,
        categoria: linhaCatToDespesaCat(l.categoria),
        projetoId: p.id,
        fonte: "linha",
      });
    }
  }
  for (const d of despesas) {
    events.push({
      id: d.id,
      data: d.data,
      descricao: d.descricao,
      valor: d.valor,
      categoria: d.categoria,
      projetoId: d.projetoId,
      fonte: "manual",
    });
  }
  return events;
}

/**
 * Gasto da empresa imputado a UM projecto, para toda a vida do projecto — as
 * mesmas duas fontes que `collectGastos` conta nos relatórios (linhas ✓ +
 * despesas ligadas). Usado pelo "Lucro" da ficha do projecto, para os dois
 * ecrãs não darem respostas diferentes a "quanto gastei neste projecto".
 *
 * Nota: `collectGastos` ignora linhas sem data possível (linha sem `data` E
 * projecto sem `dataCriado`/`dataFechado`), porque não as consegue pôr num mês.
 * Aqui contam à mesma — o dinheiro saiu. Nesse caso raro a ficha fica acima do
 * total mensal dos relatórios, e é a ficha que está certa.
 */
export function gastoEmpresaDoProjeto(
  projeto: Projeto,
  despesasDoProjeto: Despesa[]
): number {
  return (
    computeGastoEmpresa(projeto.linhas) +
    despesasDoProjeto.reduce((s, d) => s + d.valor, 0)
  );
}

/**
 * Divide os gastos entre o que o cliente devolve e o que fica a custar à
 * empresa. NÃO se infere da categoria (uma peça pode ser stock que já era teu;
 * a categoria só diz o que a coisa é): infere-se de estar ligado a um projecto
 * — se há projecto, há alguém a pagar aquilo de volta; se não há, é custo de
 * ter a empresa aberta (ferramentas, domínios, deslocações…).
 *
 * Excepção: pagamentos a colaboradores. Estão ligados a um projecto (é lá que
 * se registam), mas o cliente não os devolve — saem da nossa margem. Contam
 * como custo da empresa, senão o corte "repassado vs empresa" mentia sempre que
 * partilhamos um projecto com alguém.
 */
export function splitRepassadoEmpresa(events: GastoEvent[], keys?: Set<string>) {
  let repassado = 0;
  let empresa = 0;
  for (const e of events) {
    if (keys && !keys.has(monthKey(e.data))) continue;
    if (e.projetoId && e.categoria !== "colaboradores") repassado += e.valor;
    else empresa += e.valor;
  }
  return { repassado, empresa };
}

/** Ordena por data desc (mais recente primeiro); empate → manuais depois das linhas. */
export function sortGastosDesc(events: GastoEvent[]): GastoEvent[] {
  return [...events].sort((a, b) => b.data.localeCompare(a.data) || a.fonte.localeCompare(b.fonte));
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

/** Soma dos gastos num mês (chave yyyy-mm). */
export function sumGastosInMonth(events: GastoEvent[], key: string): number {
  return events.reduce((s, e) => (monthKey(e.data) === key ? s + e.valor : s), 0);
}

/** Soma total dos gastos cujas datas caem num conjunto de chaves de mês. */
export function sumGastosInMonths(events: GastoEvent[], keys: Set<string>): number {
  return events.reduce((s, e) => (keys.has(monthKey(e.data)) ? s + e.valor : s), 0);
}

/** Total de gastos por categoria, opcionalmente filtrando por chaves de mês. */
export function gastosByCategoria(
  events: GastoEvent[],
  keys?: Set<string>
): Record<DespesaCategoria, number> {
  // Construído a partir de DESPESA_CATEGORIA — acrescentar uma categoria nova
  // ao tipo não pode deixar um balde por inicializar aqui.
  const acc = Object.fromEntries(DESPESA_CATEGORIA.map((c) => [c, 0])) as Record<
    DespesaCategoria,
    number
  >;
  for (const e of events) {
    if (keys && !keys.has(monthKey(e.data))) continue;
    acc[e.categoria] += e.valor;
  }
  return acc;
}
