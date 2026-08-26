import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { apiError, apiOk, parseJson, withAuth } from "@/lib/api";
import { getMensalidadeById, upsertMensalidade } from "@/lib/mongodb/mensalidades";
import { getProjetoById } from "@/lib/mongodb/projetos";
import { logMutation } from "@/lib/mongodb/mutation-audit";
import {
  MENSALIDADE_MAX_COBRANCAS,
  MENSALIDADE_PERIODO,
  type Mensalidade,
} from "@/types/mensalidade";

export const dynamic = "force-dynamic";

const schema = z.object({
  id: z.string().max(128).optional(),
  projetoId: z.string().min(1).max(128),
  titulo: z.string().min(1).max(120),
  valor: z.number().finite().min(0),
  periodo: z.enum(MENSALIDADE_PERIODO),
  // A única âncora de datas do plano — ver a nota em src/types/mensalidade.ts.
  primeiraCobranca: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida (yyyy-mm-dd)"),
  numeroCobrancas: z.number().int().min(1).max(MENSALIDADE_MAX_COBRANCAS),
  ativo: z.boolean(),
  dentroDoValor: z.boolean(),
  notas: z.string().max(2000).nullish(),
  fechadoEm: z.string().nullish(),
});

export const POST = withAuth(async (session, request) => {
  const parsed = await parseJson(request, schema);
  if (!parsed.ok) return parsed.response;
  const input = parsed.data;

  const projeto = await getProjetoById(input.projetoId);
  if (!projeto) return apiError("Projeto não encontrado", 404);

  // Num update, o projecto do plano não muda — impede mover um plano para outro
  // projecto por payload e deixar os pagamentos ligados órfãos.
  const existente = input.id ? await getMensalidadeById(input.id) : null;
  if (existente && existente.projetoId !== input.projetoId) {
    return apiError("Uma mensalidade não muda de projecto", 400);
  }

  const id = input.id ?? randomUUID();
  const mensalidade: Mensalidade = {
    id,
    projetoId: input.projetoId,
    // Desnormalizado do projecto, como em Pagamento.
    clienteId: projeto.clienteId ?? null,
    titulo: input.titulo.trim(),
    valor: input.valor,
    periodo: input.periodo,
    primeiraCobranca: input.primeiraCobranca,
    numeroCobrancas: input.numeroCobrancas,
    ativo: input.ativo,
    dentroDoValor: input.dentroDoValor,
    notas: input.notas?.trim() || null,
    // Só aplicado no insert (upsertMensalidade usa $setOnInsert).
    criadoEm: existente?.criadoEm ?? new Date().toISOString(),
    fechadoEm: input.fechadoEm ?? null,
  };

  await upsertMensalidade(mensalidade);
  await logMutation({
    collection: "mensalidades",
    entityId: id,
    op: existente ? "update" : "create",
    userEmail: session.user.email ?? null,
    after: mensalidade,
  });

  revalidatePath(`/painel/projetos/${input.projetoId}`);
  revalidatePath("/painel/dividas");
  revalidatePath("/painel/relatorios");
  revalidatePath("/painel/calendario");
  revalidatePath("/painel");
  return apiOk({ ok: true, id });
});
