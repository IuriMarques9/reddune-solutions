import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { auth } from "@/lib/auth";
import { upsertDespesa } from "@/lib/mongodb/despesas";
import { logMutation } from "@/lib/mongodb/mutation-audit";
import { despesaInputSchema } from "@/lib/validation-despesa";
import type { Despesa } from "@/types/despesa";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = despesaInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 400 });
  }

  const input = parsed.data;
  const id = input.id ?? randomUUID();
  const despesa: Despesa = {
    id,
    descricao: input.descricao ?? "",
    categoria: input.categoria!,
    valor: input.valor!,
    data: input.data!,
    projetoId: input.projetoId ?? null,
    // Nome normalizado (trim) — é a chave de agrupamento por pessoa nos relatórios.
    colaborador: input.colaborador?.trim() || null,
    notas: input.notas ?? null,
    // Só aplicado no insert (upsertDespesa usa $setOnInsert).
    criadoEm: new Date().toISOString(),
  };

  await upsertDespesa(despesa);
  await logMutation({
    collection: "despesas",
    entityId: id,
    op: input.id ? "update" : "create",
    userEmail: session.user.email ?? null,
    after: despesa,
  });
  revalidatePath("/painel/relatorios");
  revalidatePath("/painel");
  if (despesa.projetoId) revalidatePath(`/painel/projetos/${despesa.projetoId}`);
  return NextResponse.json({ ok: true, id });
}
