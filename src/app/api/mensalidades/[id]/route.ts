import { revalidatePath } from "next/cache";
import { apiOk, withAuth } from "@/lib/api";
import { deleteMensalidade, getMensalidadeById } from "@/lib/mongodb/mensalidades";
import { desligarPagamentosDaMensalidade } from "@/lib/mongodb/pagamentos";
import { getProjetoById, patchProjeto } from "@/lib/mongodb/projetos";
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

    // A linha que o plano criou nos Custos FICA — o valor era real e pode já
    // ter sido facturado. Só perde a marca, passando a linha normal, escrita à
    // mão para todos os efeitos.
    if (existente) {
      const projeto = await getProjetoById(existente.projetoId);
      const linhas = projeto?.linhas ?? null;
      if (linhas?.some((l) => l.mensalidadeId === id)) {
        await patchProjeto(existente.projetoId, {
          linhas: linhas.map((l) =>
            l.mensalidadeId === id ? { ...l, mensalidadeId: null } : l
          ),
        });
      }
    }

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
