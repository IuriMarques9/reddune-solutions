// Colaboradores — quem trabalha CONNOSCO (ex.: o Jaime), não é cliente: o
// cliente paga-nos, o colaborador recebe de nós. Ficha própria, à imagem da
// ficha de cliente, para poder ser escolhido de uma lista em vez de escrito à
// mão em cada projecto/pagamento (o nome escrito à mão partia os totais assim
// que houvesse uma gralha ou um "Jaime" vs "jaime").
//
// Onde é referenciado (sempre por `id`, nunca por nome):
//   - Projeto.colaboradores[].colaboradorId — a equipa daquele projecto
//   - Despesa.colaboradorId (categoria "colaboradores") — os pagamentos
export interface Colaborador {
  id: string;
  nome: string;
  /** Papel habitual (ex.: "Técnico", "Comercial"). O papel NUM projecto vive no projecto. */
  papel: string | null;
  email: string | null;
  telefone: string | null;
  /** Para recibos verdes / facturas que ele nos passe. */
  nif: string | null;
  notas: string | null;
  /** false = arquivado: some dos pickers, o histórico de pagamentos fica. */
  ativo: boolean;
  criadoEm: string;
}
