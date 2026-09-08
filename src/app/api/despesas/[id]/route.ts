import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { deleteDespesa, getDespesaById } from "@/lib/mongodb/despesas";
import { logMutation } from "@/lib/mongodb/mutation-audit";

export const dynamic = "force-dynamic";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  // Lido antes de apagar: é a única altura em que ainda se sabe a que projecto e
  // a que pessoa o gasto pertencia — para o audit e para as caches deles.
  const existing = await getDespesaById(id);
  const ok = await deleteDespesa(id);
  if (ok) {
    await logMutation({
      collection: "despesas",
      entityId: id,
      op: "delete",
      userEmail: session.user.email ?? null,
      before: existing,
    });
  }
  revalidatePath("/painel/relatorios");
  revalidatePath("/painel/calendario");
  revalidatePath("/painel");
  if (existing?.projetoId) revalidatePath(`/painel/projetos/${existing.projetoId}`);
  if (existing?.colaboradorId) {
    revalidatePath("/painel/colaboradores");
    revalidatePath(`/painel/colaboradores/${existing.colaboradorId}`);
  }
  return NextResponse.json({ ok });
}
