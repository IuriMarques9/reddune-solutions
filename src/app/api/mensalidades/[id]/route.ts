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

    // A linha que o plano criou nos Custos:
    //  - JÁ houve pagamentos → FICA, só perde a marca. O dinheiro foi real e
    //    pode já ter sido facturado; apagá-la reescrevia história.
    //  - Nunca recebeu nada → SAI com o plano. Deixar 200 € no orçamento de um
    //    plano que nunca arrancou é um fantasma que ninguém percebe de onde vem.
    let linhaRemovida = false;
    if (existente) {
      const projeto = await getProjetoById(existente.projetoId);
      const linhas = projeto?.linhas ?? null;
      if (linhas?.some((l) => l.mensalidadeId === id)) {
        const houveDinheiro = desligados > 0;
        const novasLinhas = houveDinheiro
          ? linhas.map((l) => (l.mensalidadeId === id ? { ...l, mensalidadeId: null } : l))
          : linhas.filter((l) => l.mensalidadeId !== id);
        linhaRemovida = !houveDinheiro;
        await patchProjeto(existente.projetoId, {
          linhas: novasLinhas,
          // `valorEstimado` = soma das linhas, a mesma conta do CustosCard.
          // Sem linhas nenhumas fica como estava: nunca escrever 0 por cima de
          // um orçamento que existia.
          ...(novasLinhas.length > 0
            ? {
                valorEstimado:
                  Math.round(
                    novasLinhas.reduce((sum, l) => sum + l.quantidade * l.precoUnit, 0) * 100
                  ) / 100,
              }
            : {}),
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
        after: { pagamentosDesligados: desligados, linhaRemovida },
      });
    }

    if (existente) revalidatePath(`/painel/projetos/${existente.projetoId}`);
    revalidatePath("/painel/dividas");
    revalidatePath("/painel/relatorios");
    revalidatePath("/painel/calendario");
    revalidatePath("/painel");
    return apiOk({ ok, pagamentosDesligados: desligados, linhaRemovida });
  }
);
