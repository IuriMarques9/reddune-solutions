import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { upsertPagamento } from "@/lib/mongodb/pagamentos";
import { getProjetoById } from "@/lib/mongodb/projetos";
import { logMutation } from "@/lib/mongodb/mutation-audit";
import { METODO_PAGAMENTO, type Pagamento } from "@/types/pagamento";

export const dynamic = "force-dynamic";

const schema = z.object({
  id: z.string().max(128).optional(),
  projetoId: z.string().min(1).max(128),
  valor: z.number().finite().min(0),
  comIva: z.boolean().nullish(),
  data: z.string().min(1),
  metodo: z.enum(METODO_PAGAMENTO).nullish(),
  notas: z.string().max(2000).nullish(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 400 });
  }

  const input = parsed.data;
  const projeto = await getProjetoById(input.projetoId);
  if (!projeto) return NextResponse.json({ error: "Projeto não encontrado" }, { status: 404 });

  const id = input.id ?? randomUUID();
  const pagamento: Pagamento = {
    id,
    projetoId: input.projetoId,
    clienteId: projeto.clienteId ?? null,
    valor: input.valor,
    // Default = o do projecto, mas o painel manda-o explícito e pode divergir:
    // parte do trabalho pode ser passada sem IVA no mesmo projecto.
    comIva: input.comIva ?? projeto.comIva ?? false,
    data: input.data,
    metodo: input.metodo ?? null,
    notas: input.notas ?? null,
    // Só é aplicado no insert (upsertPagamento usa $setOnInsert); em updates o
    // `criadoEm` existente é preservado.
    criadoEm: new Date().toISOString(),
  };

  await upsertPagamento(pagamento);
  await logMutation({
    collection: "pagamentos",
    entityId: id,
    op: input.id ? "update" : "create",
    userEmail: session.user.email ?? null,
    after: pagamento,
  });
  revalidatePath(`/painel/projetos/${input.projetoId}`);
  revalidatePath("/painel/dividas");
  revalidatePath("/painel/relatorios");
  revalidatePath("/painel");
  return NextResponse.json({ ok: true, id });
}
