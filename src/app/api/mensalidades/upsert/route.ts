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
  PLANO_TIPO,
  type Mensalidade,
} from "@/types/mensalidade";
import { DESPESA_CATEGORIA } from "@/types/despesa";

export const dynamic = "force-dynamic";

const schema = z.object({
  id: z.string().max(128).optional(),
  projetoId: z.string().min(1).max(128),
  titulo: z.string().min(1).max(120),
  // Ausente = "receita" (todos os planos anteriores a esta funcionalidade).
  tipo: z.enum(PLANO_TIPO).nullish(),
  // 0 só é aceitável num plano de despesa — ver a validação abaixo.
  valor: z.number().finite().min(0),
  periodo: z.enum(MENSALIDADE_PERIODO),
  // A única âncora de datas do plano — ver a nota em src/types/mensalidade.ts.
  primeiraCobranca: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida (yyyy-mm-dd)"),
  numeroCobrancas: z.number().int().min(1).max(MENSALIDADE_MAX_COBRANCAS),
  ativo: z.boolean(),
  dentroDoValor: z.boolean(),
  // Omitido = herda o do projecto (mesma regra do Pagamento.comIva).
  comIva: z.boolean().nullish(),
  // Categoria da linha nos Custos — só conta quando dentroDoValor é false.
  categoriaCusto: z.enum(LINHA_CATEGORIA).nullish(),
  // Categoria da Despesa gerada ao confirmar, nos planos de despesa.
  categoriaDespesa: z.enum(DESPESA_CATEGORIA).nullish(),
  notas: z.string().max(2000).nullish(),
  fechadoEm: z.string().nullish(),
});

export const POST = withAuth(async (session, request) => {
  const parsed = await parseJson(request, schema);
  if (!parsed.ok) return parsed.response;
  const input = parsed.data;

  const projeto = await getProjetoById(input.projetoId);
  if (!projeto) return apiError("Projeto não encontrado", 404);

  const tipo = input.tipo ?? "receita";
  // Um plano de receita SEM valor não é um combinado — é um vazio. Já um plano
  // de despesa pode nascer sem número: serve de lembrete da renovação até a
  // factura chegar, e o valor real escreve-se ao confirmar.
  if (tipo === "receita" && input.valor <= 0) {
    return apiError("Um plano a receber precisa de um valor por cobrança", 400);
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
    tipo,
    titulo: input.titulo.trim(),
    valor: input.valor,
    periodo: input.periodo,
    primeiraCobranca: input.primeiraCobranca,
    numeroCobrancas: input.numeroCobrancas,
    ativo: input.ativo,
    // Um plano de despesa nunca é "o valor do projecto partido em prestações":
    // é dinheiro nosso a sair, nada tem que ver com o que a cliente paga.
    dentroDoValor: tipo === "despesa" ? false : input.dentroDoValor,
    // Idem para o IVA: a despesa regista o que saiu do banco, já com o que
    // vier na factura.
    comIva: tipo === "despesa" ? false : input.comIva ?? projeto.comIva ?? false,
    categoriaCusto: input.categoriaCusto ?? existente?.categoriaCusto ?? undefined,
    categoriaDespesa:
      tipo === "despesa"
        ? input.categoriaDespesa ?? existente?.categoriaDespesa ?? "dominios"
        : undefined,
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
