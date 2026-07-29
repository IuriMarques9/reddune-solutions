import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { resolvePortalToken } from "@/lib/portal-auth";
import { rateLimitDistributed, getClientIp } from "@/lib/rate-limit";
import { pullArquivo } from "@/lib/mongodb/projetos";
import { deleteManagedBlob } from "@/lib/blob";
import { logMutation } from "@/lib/mongodb/mutation-audit";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

function isInline(tipo: string): boolean {
  return tipo.startsWith("image/") || tipo === "application/pdf" || tipo === "text/html";
}

// Proxy de ficheiros do PORTAL: auth por token (?t=), não por sessão.
// O blobUrl continua server-only; revogar o token corta o acesso.
export async function GET(request: Request, { params }: { params: Params }) {
  const ip = getClientIp(request);
  const rl = await rateLimitDistributed(`portal-arquivo:${ip}`, 60, 60 * 1000);
  if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { id } = await params;
  const token = new URL(request.url).searchParams.get("t");
  const projeto = await resolvePortalToken(token);
  if (!projeto) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const arquivo = projeto.arquivos?.find((a) => a.id === id);
  if (!arquivo?.blobUrl) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  let upstream: Response;
  try {
    upstream = await fetch(arquivo.blobUrl, { cache: "no-store" });
  } catch {
    return NextResponse.json({ error: "Falha ao obter ficheiro" }, { status: 502 });
  }
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: "Falha ao obter ficheiro" }, { status: 502 });
  }

  const disposition = isInline(arquivo.tipo) ? "inline" : "attachment";
  const headers = new Headers();
  headers.set("Content-Type", arquivo.tipo || "application/octet-stream");
  // filename simples (ASCII, fallback) + filename* (RFC 5987) para nomes com
  // acentos/espaços comuns em PT não saírem percent-encoded no download.
  const asciiName = arquivo.nome.replace(/[^\x20-\x7E]/g, "_").replace(/"/g, "");
  headers.set(
    "Content-Disposition",
    `${disposition}; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(arquivo.nome)}`
  );
  headers.set("Cache-Control", "private, no-store");
  headers.set("X-Robots-Tag", "noindex, nofollow");
  if (arquivo.tipo === "text/html") {
    // Defesa em profundidade: o HTML é embebido no portal via `srcdoc` (o token
    // nunca entra no URL do iframe). Ainda assim bloqueamos egress — sem
    // connect-src/img-src externos, um fetch/beacon do mockup não sai.
    headers.set(
      "Content-Security-Policy",
      "sandbox allow-scripts; default-src 'none'; style-src 'unsafe-inline' data:; img-src data:; font-src data:; media-src data:"
    );
    headers.set("X-Content-Type-Options", "nosniff");
  }

  return new NextResponse(upstream.body, { status: 200, headers });
}

export async function DELETE(request: Request, { params }: { params: Params }) {
  const ip = getClientIp(request);
  const rl = await rateLimitDistributed(`portal-arquivo-delete:${ip}`, 20, 60 * 1000);
  if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { id } = await params;
  const token = new URL(request.url).searchParams.get("t");
  const projeto = await resolvePortalToken(token);
  if (!projeto) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const arquivo = projeto.arquivos?.find((a) => a.id === id);
  if (!arquivo) return NextResponse.json({ error: "Ficheiro não encontrado" }, { status: 404 });
  if (arquivo.origem !== "cliente") {
    return NextResponse.json({ error: "Só pode remover ficheiros enviados por si" }, { status: 403 });
  }

  const ok = await pullArquivo(projeto.id, id);
  if (!ok) {
    return NextResponse.json({ error: "Falha ao actualizar projeto" }, { status: 500 });
  }

  if (arquivo.blobUrl) {
    await deleteManagedBlob(arquivo.blobUrl);
  }

  await logMutation({
    collection: "projetos",
    entityId: projeto.id,
    op: "update",
    userEmail: `portal:${projeto.id}`,
    after: { arquivoRemovido: { id, nome: arquivo.nome } },
  });

  revalidatePath(`/painel/projetos/${projeto.id}`);

  return NextResponse.json({ ok: true });
}
