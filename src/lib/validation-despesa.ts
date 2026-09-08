import { z } from "zod";
import { DESPESA_CATEGORIA } from "@/types/despesa";

export const despesaSchema = z.object({
  id: z.string().min(1).max(128),
  descricao: z.string().min(1).max(300),
  categoria: z.enum(DESPESA_CATEGORIA),
  valor: z.number().finite().min(0),
  data: z.string().min(1),
  projetoId: z.string().max(128).nullish().transform((v) => v ?? null),
  colaboradorId: z.string().max(128).nullish().transform((v) => v ?? null),
  notas: z.string().max(2000).nullish().transform((v) => v ?? null),
  // Ligação a um plano recorrente de despesa (ver types/mensalidade.ts).
  // CONTRATO com /api/despesas/upsert: campo AUSENTE sai do parse como
  // `undefined` e a rota preserva o que está na BD; só `null` explícito apaga a
  // ligação. NUNCA converter undefined→null aqui — sem essa distinção uma edição
  // que não reenviasse o par desligava a despesa da cobrança que ela fecha
  // (é o bug que validation-projeto.ts já documenta nos projectos).
  // Vale só para estes dois: `despesaInputSchema` continua a exigir
  // descricao/categoria/valor/data — não existe PATCH parcial de despesa.
  mensalidadeId: z.string().max(128).nullish(),
  cobrancaNumero: z.number().int().min(1).max(120).nullish(),
  criadoEm: z.string(),
});

export const despesaInputSchema = despesaSchema.partial({ id: true, criadoEm: true });

export type DespesaInput = z.infer<typeof despesaInputSchema>;
