export const METODO_PAGAMENTO = [
  "dinheiro",
  "mb",
  "mbway",
  "transferencia",
  "outro",
] as const;

export type MetodoPagamento = (typeof METODO_PAGAMENTO)[number];

export const METODO_LABEL: Record<MetodoPagamento, string> = {
  dinheiro: "Dinheiro",
  mb: "Multibanco",
  mbway: "MB Way",
  transferencia: "Transferência",
  outro: "Outro",
};

export interface Pagamento {
  id: string;
  projetoId: string;
  clienteId: string | null;
  valor: number;
  data: string; // ISO date
  metodo: MetodoPagamento | null;
  notas: string | null;
  criadoEm: string;
  // Ligação opcional a um plano recorrente (ver src/types/mensalidade.ts): "sou
  // a Nª cobrança do plano X". Ambos opcionais de propósito — os pagamentos
  // avulso de sempre continuam válidos sem migração nenhuma. É esta ligação que
  // marca uma cobrança prevista como paga; `data` continua a ser o dia REAL em
  // que o dinheiro entrou, que pode não ser o dia previsto.
  mensalidadeId?: string | null;
  cobrancaNumero?: number | null;
}
