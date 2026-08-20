import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { getColaboradorById, upsertColaborador } from "@/lib/mongodb/colaboradores";
import { logMutation } from "@/lib/mongodb/mutation-audit";
import { colaboradorInputSchema } from "@/lib/validation-projeto";
import { apiOk, withAuth, parseJson } from "@/lib/api";
import type { Colaborador } from "@/types/colaborador";

export const dynamic = "force-dynamic";

export const POST = withAuth(async (session, request) => {
  const parsed = await parseJson(request, colaboradorInputSchema);
  if (!parsed.ok) return parsed.response;
  const input = parsed.data;

  const id = input.id ?? randomUUID();
  // Editar sem mexer no estado: sem `ativo` no payload fica o que já lá estava
  // (e um colaborador novo nasce activo).
  const anterior = input.id ? await getColaboradorById(input.id) : null;

  const colaborador: Colaborador = {
    id,
    nome: input.nome,
    papel: input.papel ?? null,
    email: input.email ?? null,
    telefone: input.telefone ?? null,
    nif: input.nif ?? null,
    notas: input.notas ?? null,
    ativo: input.ativo ?? anterior?.ativo ?? true,
    criadoEm: input.criadoEm ?? anterior?.criadoEm ?? new Date().toISOString(),
  };

  await upsertColaborador(colaborador);
  await logMutation({
    collection: "colaboradores",
    entityId: id,
    op: input.id ? "update" : "create",
    userEmail: session.user.email ?? null,
    after: colaborador,
  });
  revalidatePath("/painel/colaboradores");
  revalidatePath(`/painel/colaboradores/${id}`);
  revalidatePath("/painel/relatorios");
  return apiOk({ ok: true, id });
});
