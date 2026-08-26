import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { upsertPagamento } from "@/lib/mongodb/pagamentos";
import { getProjetoById } from "@/lib/mongodb/projetos";
import { getMensalidadeById } from "@/lib/mongodb/mensalidades";
import { logMutation } from "@/lib/mongodb/mutation-audit";
import { METODO_PAGAMENTO, type Pagamento } from "@/types/pagamento";
import { MENSALIDADE_MAX_COBRANCAS } from "@/types/mensalidade";

export const dynamic = "force-dynamic";

const schema = z.object({
  id: z.string().max(128).optional(),
  projetoId: z.string().min(1).max(128),
  valor: z.number().finite().min(0),
  data: z.string().min(1),
  metodo: z.enum(METODO_PAGAMENTO).nullish(),
  notas: z.string().max(2000).nullish(),
  // Ligação opcional a uma prestação de um plano recorrente. Os dois campos
  // andam sempre juntos: um plano sem número (ou o contrário) não identifica
  // cobrança nenhuma e deixaria a prestação eternamente por pagar.
  mensalidadeId: z.string().max(128).nullish(),
  cobrancaNumero: z.number().int().min(1).max(MENSALIDADE_MAX_COBRANCAS).nullish(),
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

  // Valida a ligação ao plano recorrente, quando existe: o plano tem de ser
  // deste projecto e o número tem de ser uma prestação que ele tenha mesmo.
  // Sem isto, um pagamento podia ficar preso a uma cobrança inexistente e o
  // dinheiro desaparecia da vista (contava na receita, mas nenhuma prestação
  // ficava paga).
  const mensalidadeId = input.mensalidadeId ?? null;
  const cobrancaNumero = input.cobrancaNumero ?? null;
  if ((mensalidadeId == null) !== (cobrancaNumero == null)) {
    return NextResponse.json(
      { error: "mensalidadeId e cobrancaNumero andam sempre juntos" },
      { status: 400 }
    );
  }
  if (mensalidadeId != null && cobrancaNumero != null) {
    const mensalidade = await getMensalidadeById(mensalidadeId);
    if (!mensalidade || mensalidade.projetoId !== input.projetoId) {
      return NextResponse.json({ error: "Mensalidade não encontrada" }, { status: 404 });
    }
    if (cobrancaNumero > mensalidade.numeroCobrancas) {
      return NextResponse.json(
        { error: `Este plano só tem ${mensalidade.numeroCobrancas} cobranças` },
        { status: 400 }
      );
    }
  }

  const id = input.id ?? randomUUID();
  const pagamento: Pagamento = {
    id,
    projetoId: input.projetoId,
    clienteId: projeto.clienteId ?? null,
    valor: input.valor,
    data: input.data,
    metodo: input.metodo ?? null,
    notas: input.notas ?? null,
    mensalidadeId,
    cobrancaNumero,
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
  revalidatePath("/painel/calendario");
  revalidatePath("/painel");
  return NextResponse.json({ ok: true, id });
}
