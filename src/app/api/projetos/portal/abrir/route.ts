import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getProjetoById } from "@/lib/mongodb/projetos";
import { decryptPortalToken } from "@/lib/portal-token";

export const dynamic = "force-dynamic";

/**
 * Atalho do painel (ícone do globo no kanban): abre directamente o portal do
 * cliente. O token em claro nunca vai no payload da lista de projectos — é
 * decifrado aqui, no servidor, só quando o Iuri clica. Sem portal (ou sem token
 * recuperável) cai na ficha do projecto, na secção onde se gera o link.
 */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const projetoId = new URL(request.url).searchParams.get("projetoId");
  if (!projetoId) return NextResponse.json({ error: "projetoId em falta" }, { status: 400 });

  const projeto = await getProjetoById(projetoId);
  if (!projeto) return NextResponse.json({ error: "Projeto não encontrado" }, { status: 404 });

  const activo = !!projeto.portal && !projeto.portal.revogadoEm;
  const token = activo ? decryptPortalToken(projeto.portal?.tokenEnc) : null;
  const destino = token ? `/p/${token}` : `/painel/projetos/${projetoId}#portal`;

  const res = NextResponse.redirect(new URL(destino, request.url), 302);
  res.headers.set("Cache-Control", "private, no-store");
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  res.headers.set("Referrer-Policy", "no-referrer");
  return res;
}
