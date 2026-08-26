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
  // BRUTO: o que o cliente entregou de facto. Nunca a base — é este número que
  // se compara com o total a cobrar do projecto (ver src/lib/iva.ts).
  valor: number;
  // Este recibo em concreto levou IVA? Herda `Projeto.comIva` ao registar, mas
  // pode divergir: o mesmo projecto pode ter parte passada com IVA e parte sem.
  // Opcional: registos antigos sem o campo = false.
  comIva?: boolean;
  data: string; // ISO date
  metodo: MetodoPagamento | null;
  notas: string | null;
  criadoEm: string;
}
