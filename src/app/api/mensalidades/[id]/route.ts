import { revalidatePath } from "next/cache";
import { apiOk, withAuth } from "@/lib/api";
import { deleteMensalidade, getMensalidadeById } from "@/lib/mongodb/mensalidades";
import { desligarPagamentosDaMensalidade } from "@/lib/mongodb/pagamentos";
import { logMutation } from "@/lib/mongodb/mutation-audit";

export const dynamic = "force-dynamic";

export const DELETE = withAuth(
  async (session, _request, context: { params: Promise<{ id: string }> }) => {
    const { id } = await context.params;
    const existente = await getMensalidadeById(id);

    // Apagar o plano NUNCA apaga dinheiro: os pagamentos ficam, só perdem a
    // ligação e voltam a ser avulso. Continuam a contar na receita, nas dívidas
    // e no histórico do cliente, como sempre contaram.
    const desligados = await desligarPagamentosDaMensalidade(id);
    const ok = await deleteMensalidade(id);

    if (ok) {
      await logMutation({
        collection: "mensalidades",
        entityId: id,
        op: "delete",
        userEmail: session.user.email ?? null,
        after: { pagamentosDesligados: desligados },
      });
    }

    if (existente) revalidatePath(`/painel/projetos/${existente.projetoId}`);
    revalidatePath("/painel/dividas");
    revalidatePath("/painel/relatorios");
    revalidatePath("/painel/calendario");
    revalidatePath("/painel");
    return apiOk({ ok, pagamentosDesligados: desligados });
  }
);
