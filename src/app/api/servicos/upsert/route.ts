import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { auth } from "@/lib/auth";
import { upsertServico, getServicoById, getServicosBySlug } from "@/lib/mongodb/servicos";
import { logMutation } from "@/lib/mongodb/mutation-audit";
import { servicoInputSchema } from "@/lib/validation-servico";
import { deleteManagedBlob } from "@/lib/blob";
import type { Servico } from "@/types/servico";

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

  const parsed = servicoInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 400 });
  }

  const input = parsed.data;
  const id = input.id ?? randomUUID();
  const existing = input.id ? await getServicoById(input.id) : null;
  const now = new Date().toISOString();

  let ordem = input.ordem;
  if (ordem == null) {
    if (existing) ordem = existing.ordem;
    else {
      const irmaos = await getServicosBySlug(input.slug, false);
      ordem = irmaos.length;
    }
  }

  // `variantes` e `precoBase` são mutuamente exclusivos na intenção do user.
  // Se o input mandou `variantes` (mesmo []), respeita. Senão fallback ao existing.
  const variantes =
    input.variantes !== undefined ? input.variantes ?? null : existing?.variantes ?? null;
  const precoBase =
    input.precoBase !== undefined ? input.precoBase ?? null : existing?.precoBase ?? null;
  const precoMax =
    input.precoMax !== undefined ? input.precoMax ?? null : existing?.precoMax ?? null;
  const precoDesde =
    input.precoDesde !== undefined ? (input.precoDesde ?? false) : (existing?.precoDesde ?? false);

  const imageUrl =
    input.imageUrl !== undefined ? (input.imageUrl ?? null) : (existing?.imageUrl ?? null);

  // Cleanup blob antigo se imagem foi trocada/removida.
  let orphanUrl: string | null = null;
  if (existing?.imageUrl && existing.imageUrl !== imageUrl) {
    orphanUrl = existing.imageUrl;
  }

  // Campos de texto: `??` não servia — mandar `null` para LIMPAR caía no
  // `existing` e ressuscitava o valor antigo (impossível apagar uma nota, uma
  // tradução EN ou o `precoTexto` legacy). `undefined` = não mexer, `null` =
  // limpar — o mesmo contrato que `variantes`/`precoBase`/`imageUrl` acima.
  const keep = <T,>(sent: T | null | undefined, atual: T | null | undefined): T | null =>
    sent !== undefined ? (sent ?? null) : (atual ?? null);

  const servico: Servico = {
    id,
    slug: input.slug,
    titulo: input.titulo,
    tituloI18n: keep(input.tituloI18n, existing?.tituloI18n),
    descricao: keep(input.descricao, existing?.descricao),
    descricaoI18n: keep(input.descricaoI18n, existing?.descricaoI18n),
    precoBase: variantes && variantes.length > 0 ? null : precoBase,
    precoMax: variantes && variantes.length > 0 ? null : precoMax,
    precoDesde,
    precoTipo: keep(input.precoTipo, existing?.precoTipo),
    variantes: variantes && variantes.length > 0 ? variantes : null,
    precoTexto: keep(input.precoTexto, existing?.precoTexto),
    precoTextoI18n: keep(input.precoTextoI18n, existing?.precoTextoI18n),
    nota: keep(input.nota, existing?.nota),
    notaI18n: keep(input.notaI18n, existing?.notaI18n),
    imageUrl,
    ordem,
    ativo: input.ativo ?? existing?.ativo ?? true,
    criadoEm: existing?.criadoEm ?? now,
    atualizadoEm: now,
  };

  await upsertServico(servico);
  if (orphanUrl) {
    await deleteManagedBlob(orphanUrl);
  }
  await logMutation({
    collection: "servicos",
    entityId: id,
    op: existing ? "update" : "create",
    userEmail: session.user.email ?? null,
    after: servico,
  });
  revalidatePath("/servicos");
  revalidatePath(`/servicos/${input.slug}`);
  return NextResponse.json({ ok: true, id });
}
