import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { getProjetoById } from "@/lib/mongodb/projetos";
import { setProjetoPortal, revokeProjetoPortal } from "@/lib/mongodb/portal";
import { generatePortalToken, hashPortalToken, encryptPortalToken } from "@/lib/portal-token";
import { logMutation } from "@/lib/mongodb/mutation-audit";

export const dynamic = "force-dynamic";

// Gestão do portal do cliente (painel): gerar/regenerar devolve o token em
// claro UMA vez (só o hash fica na BD); revogar corta o acesso de imediato.
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { projetoId?: string; action?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { projetoId, action } = body;
  if (!projetoId || (action !== "gerar" && action !== "revogar")) {
    return NextResponse.json({ error: "Pedido inválido" }, { status: 400 });
  }

  const projeto = await getProjetoById(projetoId);
  if (!projeto) return NextResponse.json({ error: "Projeto não encontrado" }, { status: 404 });

  if (action === "gerar") {
    const token = generatePortalToken();
    const ok = await setProjetoPortal(projetoId, {
      tokenHash: hashPortalToken(token),
      // Sem PORTAL_TOKEN_KEY fica null: o portal funciona na mesma, só não se
      // consegue voltar a ver o link (comportamento antigo).
      tokenEnc: encryptPortalToken(token),
      criadoEm: new Date().toISOString(),
      revogadoEm: null,
    });
    if (!ok) return NextResponse.json({ error: "Falha ao guardar" }, { status: 500 });
    await logMutation({
      collection: "projetos",
      entityId: projetoId,
      op: "update",
      userEmail: session.user.email ?? null,
      after: { portal: "link gerado" },
    });
    revalidatePath(`/painel/projetos/${projetoId}`);
    return NextResponse.json({ token });
  }

  const ok = await revokeProjetoPortal(projetoId);
  if (!ok) return NextResponse.json({ error: "Portal não existe" }, { status: 404 });
  await logMutation({
    collection: "projetos",
    entityId: projetoId,
    op: "update",
    userEmail: session.user.email ?? null,
    after: { portal: "link revogado" },
  });
  revalidatePath(`/painel/projetos/${projetoId}`);
  return NextResponse.json({ ok: true });
}
