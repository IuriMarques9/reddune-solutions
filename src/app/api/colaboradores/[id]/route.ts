import { revalidatePath } from "next/cache";
import { colaboradorEmUso, deleteColaborador } from "@/lib/mongodb/colaboradores";
import { logMutation } from "@/lib/mongodb/mutation-audit";
import { apiOk, apiError, withAuth } from "@/lib/api";

export const dynamic = "force-dynamic";

export const DELETE = withAuth(
  async (session, _request, context: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await context.params;
      if (!id) return apiError("Missing id", 400);

      // Apagar a ficha com histórico agarrado deixaria pagamentos e projectos a
      // apontar para um id que já não existe (nome desaparece dos relatórios).
      // Nesse caso a saída é arquivar — o botão do painel oferece isso.
      const uso = await colaboradorEmUso(id);
      if (uso.projetos > 0 || uso.pagamentos > 0) {
        const partes = [
          uso.projetos > 0 ? `${uso.projetos} projecto${uso.projetos === 1 ? "" : "s"}` : null,
          uso.pagamentos > 0
            ? `${uso.pagamentos} pagamento${uso.pagamentos === 1 ? "" : "s"}`
            : null,
        ].filter(Boolean);
        return apiError(
          `Não dá para apagar: está em ${partes.join(" e ")}. Arquiva em vez de apagar.`,
          409
        );
      }

      const ok = await deleteColaborador(id);
      if (!ok) return apiError("Colaborador não encontrado", 404);

      await logMutation({
        collection: "colaboradores",
        entityId: id,
        op: "delete",
        userEmail: session.user.email ?? null,
      });

      revalidatePath("/painel/colaboradores");
      return apiOk({ ok: true });
    } catch (e) {
      console.error(e);
      return apiError("Internal error", 500);
    }
  }
);
