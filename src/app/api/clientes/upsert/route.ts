import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { upsertCliente } from "@/lib/mongodb/clientes";
import { logMutation } from "@/lib/mongodb/mutation-audit";
import { clienteInputSchema } from "@/lib/validation-projeto";
import { apiOk, withAuth, parseJson } from "@/lib/api";
import type { Cliente } from "@/types/cliente";

export const dynamic = "force-dynamic";

export const POST = withAuth(async (session, request) => {
  const parsed = await parseJson(request, clienteInputSchema);
  if (!parsed.ok) return parsed.response;
  const input = parsed.data;

  const id = input.id ?? randomUUID();
  const now = new Date().toISOString();

  const cliente: Cliente = {
    id,
    nome: input.nome,
    empresa: input.empresa ?? null,
    email: input.email ?? null,
    telefone: input.telefone ?? null,
    nif: input.nif ?? null,
    morada: input.morada ?? null,
    notas: input.notas ?? null,
    criadoEm: input.criadoEm ?? now,
  };

  await upsertCliente(cliente);
  await logMutation({
    collection: "clientes",
    entityId: id,
    op: input.id ? "update" : "create",
    userEmail: session.user.email ?? null,
    after: cliente,
  });
  revalidatePath("/painel/clientes");
  revalidatePath(`/painel/clientes/${id}`);
  return apiOk({ ok: true, id });
});
