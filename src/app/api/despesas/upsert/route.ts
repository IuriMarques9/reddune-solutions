import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { auth } from "@/lib/auth";
import { getDespesaById, upsertDespesa } from "@/lib/mongodb/despesas";
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
  const existing = input.id ? await getDespesaById(input.id) : null;
  // Sem esta guarda, gravar uma folha aberta sobre uma despesa entretanto
  // apagada RESSUSCITAVA-A, com `criadoEm` de agora e um audit a dizer "update".
  if (input.id && !existing) {
    return NextResponse.json({ error: "Despesa não encontrada" }, { status: 404 });
  }

  // A ligação ao plano não é campo de utilizador: viaja intacta pela edição. Se
  // o par vem ausente do payload herda-se do existente (é o que impede uma
  // edição do valor de reabrir a prestação no calendário, no cron e no sino).
  const heranca =
    input.mensalidadeId === undefined && input.cobrancaNumero === undefined ? existing : null;

  const despesa: Despesa = {
    id,
    descricao: input.descricao ?? "",
    categoria: input.categoria!,
    valor: input.valor!,
    data: input.data!,
    projetoId: input.projetoId ?? null,
    // Só faz sentido em pagamentos a colaboradores — noutras categorias fica
    // null para não deixar referências penduradas se a categoria mudar.
    colaboradorId: input.categoria === "colaboradores" ? input.colaboradorId ?? null : null,
    notas: input.notas ?? null,
    // Os dois andam juntos: um sem o outro não identifica renovação nenhuma e
    // deixava a previsão eternamente por fechar.
    mensalidadeId: heranca
      ? heranca.mensalidadeId ?? null
      : input.cobrancaNumero != null
        ? input.mensalidadeId ?? null
        : null,
    cobrancaNumero: heranca
      ? heranca.cobrancaNumero ?? null
      : input.mensalidadeId != null
        ? input.cobrancaNumero ?? null
        : null,
    // Só aplicado no insert (upsertDespesa usa $setOnInsert) — mas tem de ser o
    // verdadeiro, senão o snapshot do audit mentia em cada edição.
    criadoEm: existing?.criadoEm ?? new Date().toISOString(),
  };

  await upsertDespesa(despesa);
  await logMutation({
    collection: "despesas",
    entityId: id,
    op: existing ? "update" : "create",
    userEmail: session.user.email ?? null,
    before: existing,
    after: despesa,
  });
  revalidatePath("/painel/relatorios");
  revalidatePath("/painel/calendario");
  revalidatePath("/painel");
  // União antes∪depois: mover a despesa de projecto (ou tirar-lhe a categoria
  // "colaboradores") só revalidava o destino, e a ficha de origem ficava com o
  // gasto — logo com o Lucro e o total da pessoa errados.
  const projetos = new Set([existing?.projetoId, despesa.projetoId].filter(Boolean) as string[]);
  for (const pid of projetos) revalidatePath(`/painel/projetos/${pid}`);
  if (existing?.colaboradorId || despesa.colaboradorId) {
    revalidatePath("/painel/colaboradores");
    const pessoas = new Set(
      [existing?.colaboradorId, despesa.colaboradorId].filter(Boolean) as string[]
    );
    for (const cid of pessoas) revalidatePath(`/painel/colaboradores/${cid}`);
  }
  return NextResponse.json({ ok: true, id });
}
