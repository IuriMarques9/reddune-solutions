// Despesas da empresa (gastos que o Iuri compra/paga do bolso).
// Duas fontes alimentam os relatórios de gastos:
//   1. Linhas de custo do projecto com `gastoEmpresa: true` (ver ProjetoLinha).
//   2. Despesas manuais NÃO ligadas a projecto (stock da loja, domínios,
//      marketing, licenças…) — esta colecção.
// `projetoId` opcional permite também registar manualmente um gasto ligado a um
// projecto sem ser via linha, mas o caso principal é gasto geral (projetoId null).

// As chaves antigas mantêm-se (há registos na BD com elas) — só mudaram rótulos
// e juntaram-se as que faltavam ao trabalho real: portes, ferramentas e
// deslocações. A categoria diz O QUE a despesa é; NÃO diz se saiu do bolso da
// empresa (isso é o ✓ `gastoEmpresa` nas linhas) nem se o cliente a devolve
// (isso é ter, ou não, `projetoId` — ver DESPESA_REPASSAVEL em lib/gastos.ts).
export const DESPESA_CATEGORIA = [
  "pecas",
  "portes",
  "ferramentas",
  "software",
  "dominios",
  "marketing",
  "deslocacoes",
  "stock",
  "colaboradores",
  "outros",
] as const;

export type DespesaCategoria = (typeof DESPESA_CATEGORIA)[number];

export const DESPESA_CATEGORIA_LABEL: Record<DespesaCategoria, string> = {
  pecas: "Componentes & peças",
  portes: "Portes & envios",
  ferramentas: "Ferramentas & consumíveis",
  software: "Software & licenças",
  dominios: "Domínios & alojamento",
  marketing: "Marketing & publicidade",
  deslocacoes: "Deslocações",
  stock: "Stock da loja",
  colaboradores: "Colaboradores",
  outros: "Outros",
};

/** Dica no form — o que entra em cada categoria, para não hesitares. */
export const DESPESA_CATEGORIA_HINT: Record<DespesaCategoria, string> = {
  pecas: "peças e componentes para um trabalho",
  portes: "envios, transportadoras",
  ferramentas: "chaves, pasta térmica, aparelhos de bancada",
  software: "licenças, subscrições",
  dominios: "domínios, alojamento, renovações",
  marketing: "anúncios, cartões, brindes",
  deslocacoes: "combustível, portagens, viagens a clientes",
  stock: "comprado para revender, sem cliente à espera",
  colaboradores: "pagamentos a quem trabalha contigo num projecto (ex.: Jaime)",
  outros: "o que não encaixa acima",
};

// Ordem de apresentação nos gráficos/listas de gastos por categoria.
export const DESPESA_CATEGORIA_ORDER: DespesaCategoria[] = [
  "pecas",
  "portes",
  "ferramentas",
  "software",
  "dominios",
  "marketing",
  "deslocacoes",
  "stock",
  "colaboradores",
  "outros",
];

export interface Despesa {
  id: string;
  descricao: string;
  categoria: DespesaCategoria;
  valor: number;
  data: string; // ISO date (yyyy-mm-dd) — quando o gasto foi feito
  projetoId: string | null; // opcional: gasto ligado a um projecto
  // A quem foi pago, quando a categoria é "colaboradores": aponta para
  // Colaborador.id (ficha). Agrupa os totais por pessoa nos relatórios sem
  // depender de como o nome foi escrito; noutras categorias fica null.
  colaboradorId?: string | null;
  notas: string | null;
  criadoEm: string; // ISO — quando foi registado no painel
}
