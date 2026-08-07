export interface Cliente {
  id: string;
  nome: string;
  empresa: string | null;
  email: string | null;
  telefone: string | null;
  nif: string | null;
  morada: string | null;
  notas: string | null;
  criadoEm: string;
}
