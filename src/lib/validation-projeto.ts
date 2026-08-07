import { z } from "zod";
import {
  PROJETO_STATUS,
  PROJETO_TIPO,
  PROJETO_LOCAL,
  LINHA_CATEGORIA,
} from "@/types/projeto";
import { SERVICO_SLUG } from "@/types/servico";

export const linhaSchema = z.object({
  id: z.string().min(1).max(128),
  descricao: z.string().max(300),
  categoria: z.enum(LINHA_CATEGORIA),
  quantidade: z.number().finite().min(0),
  precoUnit: z.number().finite(),
  gastoEmpresa: z.boolean().optional(),
  data: z.preprocess(
    (v) => (v === "" || v === undefined ? null : v),
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  ),
});

// ATENÇÃO ao contrato do upsert parcial (/api/projetos/upsert): campo AUSENTE
// tem de sair do parse como `undefined` (a rota preserva o valor existente);
// só `null`/"" explícitos apagam. NUNCA converter undefined→null aqui — foi o
// bug que fazia "Guardar custos" apagar cliente/responsável/tipo/etc.
// (ver validation-projeto.test.ts).
export const projetoSchema = z.object({
  id: z.string().min(1).max(128),
  titulo: z.string().min(1).max(300),
  // `ref` NÃO está no schema de propósito: é gerado e gerido só no servidor.
  // z.object descarta chaves desconhecidas, por isso um `ref` no payload é
  // ignorado (imutável do lado do cliente).
  clienteId: z.string().max(128).nullish(),
  clienteNome: z.string().max(300).nullish(),
  proximaAccao: z.string().max(500).nullish(),
  status: z.enum(PROJETO_STATUS),
  categoria: z.preprocess((v) => (v === "" ? null : v), z.enum(SERVICO_SLUG).nullish()),
  tipo: z.preprocess((v) => (v === "" ? null : v), z.enum(PROJETO_TIPO).nullish()),
  tipos: z.array(z.string()).nullish(),
  hardware: z
    .object({
      marca: z.string().max(100).optional(),
      modelo: z.string().max(100).optional(),
      serial: z.string().max(100).optional(),
      acessoriosEntregues: z.string().max(500).optional(),
    })
    .nullish(),
  prazo: z.string().nullish(),
  dataCriado: z.string().nullish(),
  dataFechado: z.string().nullish(),
  valorEstimado: z.number().finite().nullish(),
  valorPago: z.number().finite().nullish(),
  metodoPagamento: z.string().max(100).nullish(),
  local: z.preprocess((v) => (v === "" ? null : v), z.enum(PROJETO_LOCAL).nullish()),
  notasResumo: z.string().max(500).nullish(),
  bodyMd: z.string().max(50000).nullish(),
  linhas: z.array(linhaSchema).nullish(),
  garantiaAte: z.string().nullish(),
});

export const projetoInputSchema = projetoSchema.partial({ id: true });

export const lembreteSchema = z.object({
  id: z.string().min(1).max(128),
  projetoId: z.string().min(1).max(128),
  titulo: z.string().min(1).max(300),
  feita: z.boolean(),
  prazo: z.string().nullable(),
  prazoHora: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .nullish(),
  notas: z.string().max(1000).nullable(),
  ordem: z.number().int(),
  criadoEm: z.string(),
});

export const lembreteInputSchema = lembreteSchema.partial({ id: true, criadoEm: true });

export const clienteSchema = z.object({
  id: z.string().min(1).max(128),
  nome: z.string().min(1).max(300),
  empresa: z.string().max(300).nullable(),
  email: z.string().max(300).nullable(),
  telefone: z.string().max(50).nullable(),
  nif: z.string().max(20).nullable(),
  morada: z.string().max(500).nullable(),
  notas: z.string().max(5000).nullable(),
  criadoEm: z.string(),
});

export const clienteInputSchema = clienteSchema.partial({ id: true, criadoEm: true, empresa: true });

export type ProjetoInput = z.infer<typeof projetoInputSchema>;
export type LembreteInput = z.infer<typeof lembreteInputSchema>;
export type ClienteInput = z.infer<typeof clienteInputSchema>;
