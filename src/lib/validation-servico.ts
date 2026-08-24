import { z } from "zod";
import { SERVICO_GRUPO } from "@/types/servico";

export const i18nTextSchema = z
  .object({
    pt: z.string().max(2000).nullish(),
    en: z.string().max(2000).nullish(),
  })
  .nullish();

export const variantePrecoSchema = z.object({
  label: z.string().min(1).max(40),
  labelI18n: i18nTextSchema,
  preco: z.number().finite().min(0),
  precoMax: z.number().finite().min(0).nullish(),
});

export const servicoSchema = z.object({
  id: z.string().min(1).max(128),
  slug: z.enum(SERVICO_GRUPO),
  titulo: z.string().min(1).max(200),
  tituloI18n: i18nTextSchema,
  descricao: z.string().max(2000).nullish(),
  descricaoI18n: i18nTextSchema,
  precoBase: z.number().finite().min(0).nullish(),
  precoMax: z.number().finite().min(0).nullish(),
  precoDesde: z.boolean().optional(),
  precoTipo: z.enum(["eur", "percent"]).nullish(),
  variantes: z.array(variantePrecoSchema).max(20).nullish(),
  precoTexto: z.string().max(300).nullish(),
  precoTextoI18n: i18nTextSchema,
  nota: z.string().max(300).nullish(),
  notaI18n: i18nTextSchema,
  imageUrl: z.string().max(500).nullish(),
  ordem: z.number().int().min(0),
  ativo: z.boolean(),
  criadoEm: z.string(),
  atualizadoEm: z.string(),
});

export const servicoInputSchema = servicoSchema.partial({
  id: true,
  criadoEm: true,
  atualizadoEm: true,
  ordem: true,
  ativo: true,
});

export type ServicoInput = z.infer<typeof servicoInputSchema>;
