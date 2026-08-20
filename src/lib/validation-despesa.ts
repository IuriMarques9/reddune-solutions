import { z } from "zod";
import { DESPESA_CATEGORIA } from "@/types/despesa";

export const despesaSchema = z.object({
  id: z.string().min(1).max(128),
  descricao: z.string().min(1).max(300),
  categoria: z.enum(DESPESA_CATEGORIA),
  valor: z.number().finite().min(0),
  data: z.string().min(1),
  projetoId: z.string().max(128).nullish().transform((v) => v ?? null),
  colaborador: z.string().max(120).nullish().transform((v) => v ?? null),
  notas: z.string().max(2000).nullish().transform((v) => v ?? null),
  criadoEm: z.string(),
});

export const despesaInputSchema = despesaSchema.partial({ id: true, criadoEm: true });

export type DespesaInput = z.infer<typeof despesaInputSchema>;
