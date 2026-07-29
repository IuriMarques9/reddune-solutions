import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { publicEnv } from "@/lib/env";
import { getLembretesParaBrief } from "@/lib/mongodb/lembretes";
import { getProjetosParaBrief, getProjetosBriefByIds } from "@/lib/mongodb/projetos";

export const dynamic = "force-dynamic";

// Endpoint SÓ DE LEITURA para o Resumo Matinal (tarefa agendada do Claude):
// devolve projectos no fluxo activo + lembretes pendentes/resolvidos há <48h.
// Auth por token (env BRIEF_TOKEN), sem sessão NextAuth — a tarefa agendada não
// tem cookies. O rate limit global de /api (middleware) também cobre esta rota.
// A classificação (atenção vs resolvido) é feita pelo consumidor; isto só
// devolve dados crus, sem campos sensíveis (valores, linhas, bodyMd, contactos).

const NO_STORE = { "Cache-Control": "no-store" } as const;

// sha256 de ambos os lados antes do timingSafeEqual: iguala os comprimentos
// (o timingSafeEqual exige buffers iguais) e evita vazar o tamanho do token
// real por um early-return de length-mismatch.
function tokenValido(candidato: string | null): boolean {
  const secreto = process.env.BRIEF_TOKEN?.trim();
  if (!secreto || !candidato) return false;
  const a = createHash("sha256").update(candidato).digest();
  const b = createHash("sha256").update(secreto).digest();
  return timingSafeEqual(a, b);
}

// Auth SÓ por header — nunca via query string (o token vazaria em logs de
// acesso e no Referer). O caller do Resumo Matinal (tarefa cowork) chama por
// curl com `Authorization: Bearer`; `X-Brief-Token` fica como alternativa para
// fetchers que reservem o header Authorization.
function extrairToken(request: Request): string | null {
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice("Bearer ".length).trim();
  const custom = request.headers.get("x-brief-token");
  if (custom) return custom.trim();
  return null;
}

// Sanitização leve dos campos de texto livre antes de os devolver ao LLM
// externo do Resumo Matinal: remove caracteres de controlo (inclui \n, \r, \t)
// e colapsa espaços. Parte do texto (ex.: clienteNome) pode vir influenciada
// pelo cliente via portal — reduz a superfície de prompt-injection de 2ª ordem.
// Não altera a estrutura do JSON, só limpa os valores string.
function sanitizeBriefText(s: string | null | undefined): string | null {
  if (s == null) return null;
  return s
    .replace(/\p{Cc}/gu, " ")
    .replace(/ {2,}/g, " ")
    .trim();
}

export async function GET(request: Request) {
  if (!tokenValido(extrairToken(request))) {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401, headers: NO_STORE }
    );
  }

  try {
    const agora = new Date();
    const corte48h = new Date(agora.getTime() - 48 * 3600 * 1000).toISOString();

    const [projetos, lembretes] = await Promise.all([
      getProjetosParaBrief(),
      getLembretesParaBrief(corte48h),
    ]);

    // Contexto dos projectos referidos por lembretes que não estão na lista
    // activa (lembretes existem em qualquer estado, incl. fechados e ideias).
    const idsLembretes = [...new Set(lembretes.map((l) => l.projetoId))];
    const idsAtivos = new Set(projetos.map((p) => p.id));
    const extras = await getProjetosBriefByIds(
      idsLembretes.filter((id) => !idsAtivos.has(id))
    );
    const porId = new Map(
      [...projetos, ...extras].map((p) => [p.id, p] as const)
    );

    const base = publicEnv.baseUrl;

    return NextResponse.json(
      {
        generatedAt: agora.toISOString(),
        // `?? null` em todos os opcionais: docs antigos têm campos em falta
        // (undefined), e o JSON.stringify omitia a chave — contrato instável
        // para o consumidor do resumo. Campos de texto livre passam por
        // sanitizeBriefText (limpa control chars; não muda a estrutura).
        projects: projetos.map((p) => ({
          id: p.id,
          ref: p.ref ?? null,
          name: sanitizeBriefText(p.titulo),
          client: sanitizeBriefText(p.clienteNome),
          status: p.status,
          nextAction: sanitizeBriefText(p.proximaAccao),
          due: p.prazo ?? null,
          warrantyUntil: p.garantiaAte ?? null,
          url: `${base}/painel/projetos/${p.id}`,
        })),
        reminders: lembretes.map((l) => {
          const projeto = porId.get(l.projetoId);
          return {
            id: l.id,
            title: sanitizeBriefText(l.titulo),
            due: l.prazo ?? null,
            dueTime: l.prazoHora ?? null,
            done: l.feita === true,
            completedAt: l.feitaEm ?? null,
            note: sanitizeBriefText(l.notas),
            projectId: l.projetoId,
            projectName: sanitizeBriefText(projeto?.titulo),
            projectRef: projeto?.ref ?? null,
            projectStatus: projeto?.status ?? null,
            url: projeto
              ? `${base}/painel/projetos/${l.projetoId}`
              : `${base}/painel/lembretes`,
          };
        }),
      },
      { headers: NO_STORE }
    );
  } catch (error) {
    console.error("GET /api/brief error:", error);
    return NextResponse.json(
      { error: "internal" },
      { status: 500, headers: NO_STORE }
    );
  }
}
