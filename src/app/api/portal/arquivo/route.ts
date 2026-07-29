import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { resolvePortalToken } from "@/lib/portal-auth";
import { rateLimitDistributed, getClientIp } from "@/lib/rate-limit";
import { pushArquivo } from "@/lib/mongodb/projetos";
import { logMutation } from "@/lib/mongodb/mutation-audit";
import { sendPushToAll } from "@/lib/push";
import type { ProjetoArquivo } from "@/types/projeto";

export const dynamic = "force-dynamic";

const MAX_BYTES = 10 * 1024 * 1024; // 10MB por ficheiro
const MAX_24H = 20; // por projecto, por dia
const MAX_TOTAL = 60; // por projecto (tecto de custo do Blob)

// Allowlist do que o CLIENTE pode enviar. Propositadamente SEM `text/html` e sem
// SVG: HTML/SVG de terceiros servido no nosso domínio é XSS na origem reddune
// (ver hospedar-html-nao-confiavel-no-teu-dominio). Mockups HTML continuam a
// entrar só pelo painel, com CSP sandbox.
const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "text/csv": "csv",
  "text/plain": "txt",
  "application/zip": "zip",
};

/** MIME normalizado, ou null se o tipo não for aceite. */
function tipoAceite(file: File): string | null {
  const t = (file.type || "").toLowerCase().split(";")[0]!.trim();
  if (t === "application/x-zip-compressed" || t === "application/x-zip") return "application/zip";
  if (EXT_BY_MIME[t]) return t;
  // Windows/Android nem sempre põem MIME no .zip — aceita pela extensão.
  if ((t === "" || t === "application/octet-stream") && /\.zip$/i.test(file.name)) {
    return "application/zip";
  }
  return null;
}

function safeName(name: string): string {
  return name.replace(/[\r\n"]/g, "").trim().slice(0, 200) || "ficheiro";
}

/**
 * Upload do CLIENTE pelo portal (/p/[token]) — sem sessão, autenticado pelo
 * token do projecto. Anti-abuso igual ao comentário: honeypot + rate-limit por
 * IP + tectos por projecto (24h e total). Fica no mesmo array `arquivos` do
 * projecto com `origem: "cliente"` (apagar o projecto continua a limpar tudo).
 */
export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rl = await rateLimitDistributed(`portal-upload:${ip}`, 10, 10 * 60 * 1000);
  if (!rl.allowed) return NextResponse.json({ error: "Demasiados envios" }, { status: 429 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Pedido inválido" }, { status: 400 });
  }

  // Honeypot — 200 silencioso, o bot pensa que correu bem.
  const honeypot = form.get("website");
  if (typeof honeypot === "string" && honeypot !== "") {
    return NextResponse.json({ ok: true });
  }

  const projeto = await resolvePortalToken(form.get("t"));
  if (!projeto) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Ficheiro em falta" }, { status: 400 });
  }

  const tipo = tipoAceite(file);
  if (!tipo) {
    return NextResponse.json(
      { error: `Tipo de ficheiro não aceite (${file.type || "desconhecido"})` },
      { status: 415 }
    );
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "Ficheiro vazio" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `Ficheiro demasiado grande (${(file.size / 1024 / 1024).toFixed(1)}MB > 10MB)` },
      { status: 413 }
    );
  }

  // Tectos por projecto — travam o flood distribuído que o limite por IP não vê.
  const doCliente = (projeto.arquivos ?? []).filter((a) => a.origem === "cliente");
  if (doCliente.length >= MAX_TOTAL) {
    return NextResponse.json(
      { error: "Limite de ficheiros deste projeto atingido. Fale connosco." },
      { status: 429 }
    );
  }
  const desde = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  if (doCliente.filter((a) => a.dataUpload >= desde).length >= MAX_24H) {
    return NextResponse.json(
      { error: "Já enviou muitos ficheiros hoje. Tente amanhã." },
      { status: 429 }
    );
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "Envio indisponível de momento" }, { status: 503 });
  }

  const arquivoId = randomUUID();
  // addRandomSuffix: TRUE — sem sufixo o URL público do Blob seria adivinhável
  // e contornaria o proxy/revogação (ver /api/projetos/arquivo).
  const basePath = `projetos/${projeto.id}/${arquivoId}.${EXT_BY_MIME[tipo]}`;

  let blobUrl: string;
  let pathname: string;
  try {
    const blob = await put(basePath, file, {
      access: "public",
      contentType: tipo,
      addRandomSuffix: true,
    });
    blobUrl = blob.url;
    pathname = blob.pathname;
  } catch (err) {
    console.error("Blob put (portal) falhou:", err);
    return NextResponse.json({ error: "Não foi possível guardar o ficheiro" }, { status: 500 });
  }

  const arquivo: ProjetoArquivo = {
    id: arquivoId,
    pathname,
    blobUrl, // server-only
    url: `/api/projetos/arquivo/${arquivoId}?projetoId=${projeto.id}`,
    nome: safeName(file.name),
    tamanho: file.size,
    tipo,
    dataUpload: new Date().toISOString(),
    origem: "cliente",
  };

  const ok = await pushArquivo(projeto.id, arquivo);
  if (!ok) {
    return NextResponse.json({ error: "Não foi possível guardar o ficheiro" }, { status: 500 });
  }

  await logMutation({
    collection: "projetos",
    entityId: projeto.id,
    op: "update",
    userEmail: `portal:${projeto.id}`,
    after: { arquivoDoCliente: { id: arquivoId, nome: arquivo.nome, tamanho: arquivo.tamanho } },
  });

  // Push best-effort — o ficheiro do cliente não pode passar despercebido.
  try {
    await sendPushToAll({
      title: "📎 Ficheiro do cliente",
      body: `${arquivo.nome} — ${projeto.titulo}`,
      url: `/painel/projetos/${projeto.id}`,
    });
  } catch (e) {
    console.error("push upload portal falhou:", e);
  }

  revalidatePath(`/painel/projetos/${projeto.id}`);

  // Só a forma do DTO do portal (nunca blobUrl/pathname).
  return NextResponse.json({
    arquivo: {
      id: arquivo.id,
      nome: arquivo.nome,
      tipo: arquivo.tipo,
      tamanho: arquivo.tamanho,
      origem: "cliente" as const,
    },
  });
}
