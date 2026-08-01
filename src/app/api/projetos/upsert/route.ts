import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { auth } from "@/lib/auth";
import { upsertProjeto, getProjetoById, nextRefForPrefix } from "@/lib/mongodb/projetos";
import { logMutation } from "@/lib/mongodb/mutation-audit";
import { projetoInputSchema } from "@/lib/validation-projeto";
import {
  TIPO_TO_CATEGORIA,
  firstBaseTipo,
  refPrefixForCategoria,
  type Projeto,
  type ProjetoTipo,
} from "@/types/projeto";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = projetoInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const input = parsed.data;
  const id = input.id ?? randomUUID();
  const now = new Date().toISOString().slice(0, 10);

  const existing = input.id ? await getProjetoById(input.id) : null;

  // Merge: undefined no input preserva existing; null explícito apaga
  const pick = <K extends keyof Projeto>(
    key: K,
    fallback: Projeto[K]
  ): Projeto[K] => {
    const v = (input as Record<string, unknown>)[key as string];
    if (v === undefined) return existing?.[key] ?? fallback;
    return v as Projeto[K];
  };

  // Multi-tipo: tipos array drives single tipo + categoria derivation
  const tiposInput = (input as Record<string, unknown>).tipos;
  let tiposFinal: string[] | null;
  if (tiposInput === undefined) {
    tiposFinal = existing?.tipos ?? null;
  } else if (tiposInput === null) {
    tiposFinal = null;
  } else {
    tiposFinal = tiposInput as string[];
  }

  let tipoFinal: ProjetoTipo | null = pick("tipo", null) as ProjetoTipo | null;
  // If tipos provided, derive tipo from first base element for compat
  if (tiposInput !== undefined && tiposFinal && tiposFinal.length > 0) {
    tipoFinal = firstBaseTipo(tiposFinal);
  }

  let categoriaFinal = pick("categoria", null);
  if (categoriaFinal == null && tiposFinal && tiposFinal.length > 0) {
    const derived = tiposFinal
      .map((t) => TIPO_TO_CATEGORIA[t as ProjetoTipo])
      .filter((c): c is NonNullable<typeof c> => c != null);
    if (derived.length > 0) categoriaFinal = derived[0]!;
  }
  if (categoriaFinal == null && tipoFinal != null) {
    categoriaFinal = TIPO_TO_CATEGORIA[tipoFinal];
  }

  // Código de referência: server-controlled e IMUTÁVEL. Gera atomicamente no
  // insert (quando não existe doc, mesmo que o payload traga um id órfão);
  // preserva o existente no update. Nunca aceita `ref` vindo do cliente.
  const refFinal = existing
    ? existing.ref ?? null
    : await nextRefForPrefix(refPrefixForCategoria(categoriaFinal));

  const statusFinal = input.status ?? existing?.status ?? "proximo";
  const wasOpen = existing && existing.status !== "terminado" && existing.status !== "fechado";
  const nowClosed = statusFinal === "terminado" || statusFinal === "fechado";
  let dataFechadoFinal = pick("dataFechado", null);
  // Auto-set dataFechado quando muda para terminado/fechado e ainda não estava preenchido.
  if (nowClosed && !dataFechadoFinal && (wasOpen || !existing)) {
    dataFechadoFinal = now;
  }

  const projeto: Projeto = {
    id,
    titulo: input.titulo ?? existing?.titulo ?? "",
    ref: refFinal,
    clienteId: pick("clienteId", null),
    clienteNome: pick("clienteNome", null),
    proximaAccao: pick("proximaAccao", null),
    status: statusFinal,
    categoria: categoriaFinal,
    tipo: tipoFinal,
    tipos: tiposFinal,
    prazo: pick("prazo", null),
    dataCriado: input.id ? (existing?.dataCriado ?? input.dataCriado ?? now) : now,
    dataFechado: dataFechadoFinal,
    valorEstimado: pick("valorEstimado", null),
    valorPago: pick("valorPago", null),
    metodoPagamento: pick("metodoPagamento", null),
    local: pick("local", null),
    notasResumo: pick("notasResumo", null),
    bodyMd: pick("bodyMd", null),
    linhas: pick("linhas", null),
    garantiaAte: pick("garantiaAte", null),
    hardware: pick("hardware", null),
    arquivos: pick("arquivos", null),
    // Geridos por rotas próprias (nunca vêm no payload do upsert) — preservar.
    links: existing?.links ?? null,
    portal: existing?.portal ?? null,
  };

  try {
    await upsertProjeto(projeto);
    await logMutation({
      collection: "projetos",
      entityId: id,
      op: existing ? "update" : "create",
      userEmail: session.user.email ?? null,
      before: existing,
      after: projeto,
    });
    revalidatePath("/painel/projetos");
    revalidatePath(`/painel/projetos/${id}`);
    revalidatePath("/painel/dividas");
    revalidatePath("/painel");
    return NextResponse.json({ ok: true, id });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
