import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { apiError, apiOk, parseJson, withAuth } from "@/lib/api";
import { getMensalidadeById, upsertMensalidade } from "@/lib/mongodb/mensalidades";
import { getProjetoById, patchProjeto } from "@/lib/mongodb/projetos";
import { sincronizarLinhaDoPlano } from "@/lib/mensalidades";
import { LINHA_CATEGORIA } from "@/types/projeto";
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
  // Opcional: um plano pode ser combinado hoje e só arrancar quando o cliente
  // pagar. Sem data não gera cobranças nenhumas.
  primeiraCobranca: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida (yyyy-mm-dd)")
    .nullish(),
  numeroCobrancas: z.number().int().min(1).max(MENSALIDADE_MAX_COBRANCAS),
  ativo: z.boolean(),
  // Já não vem do formulário: um plano de receita é SEMPRE dono da sua linha
  // nos Custos, logo é sempre parte do valor. Fica opcional só para não partir
  // chamadas antigas — o valor enviado é ignorado.
  dentroDoValor: z.boolean().nullish(),
  // Omitido = herda o do projecto (mesma regra do Pagamento.comIva).
  comIva: z.boolean().nullish(),
  // Categoria da linha nos Custos — só conta quando dentroDoValor é false.
  categoriaCusto: z.enum(LINHA_CATEGORIA).nullish(),
  // O que o plano nos custa por período, e se esse número já traz IVA.
  custo: z.number().finite().min(0).nullish(),
  custoComIva: z.boolean().nullish(),
  notas: z.string().max(2000).nullish(),
  fechadoEm: z.string().nullish(),
});

export const POST = withAuth(async (session, request) => {
  const parsed = await parseJson(request, schema);
  if (!parsed.ok) return parsed.response;
  const input = parsed.data;

  const projeto = await getProjetoById(input.projetoId);
  if (!projeto) return apiError("Projeto não encontrado", 404);

  // Um plano sem valor não é um combinado, é um vazio.
  if (input.valor <= 0) {
    return apiError("Um plano precisa de um valor por cobrança", 400);
  }

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
    primeiraCobranca: input.primeiraCobranca || null,
    numeroCobrancas: input.numeroCobrancas,
    ativo: input.ativo,
    // Sempre parte do valor: o plano é dono da sua linha nos Custos.
    dentroDoValor: true,
    comIva: input.comIva ?? projeto.comIva ?? false,
    categoriaCusto: input.categoriaCusto ?? existente?.categoriaCusto ?? undefined,
    custo: input.custo ?? undefined,
    custoComIva: input.custoComIva ?? undefined,
    notas: input.notas?.trim() || null,
    // Só aplicado no insert (upsertMensalidade usa $setOnInsert).
    criadoEm: existente?.criadoEm ?? new Date().toISOString(),
    fechadoEm: input.fechadoEm ?? null,
  };

  await upsertMensalidade(mensalidade);

  // Custos: um plano "dinheiro por cima" ganha a sua linha, para o cliente ver
  // a rubrica no portal. `gastoEmpresa: false` — é dinheiro a receber, não um
  // gasto nosso; enquanto não for pago não desconta nada à RedDune.
  const sync = sincronizarLinhaDoPlano(
    projeto.linhas,
    projeto.valorEstimado,
    mensalidade,
    randomUUID
  );
  if (sync) {
    await patchProjeto(input.projetoId, {
      linhas: sync.linhas,
      valorEstimado: sync.valorEstimado,
    });
  }

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
