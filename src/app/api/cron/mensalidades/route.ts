import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { getAllMensalidades } from "@/lib/mongodb/mensalidades";
import { getAllPagamentos } from "@/lib/mongodb/pagamentos";
import { getProjetoTitulosByIds } from "@/lib/mongodb/projetos";
import {
  avisoKey,
  getAvisosEnviados,
  marcarAvisosEnviados,
  type AvisoTipo,
} from "@/lib/mongodb/mensalidade-avisos";
import { sendPushToAll } from "@/lib/push";
import { todayLisbonYmd } from "@/lib/dates";
import {
  cobrancasAVencer,
  cobrancasVencidas,
  resumoMensalidade,
  todasCobrancas,
} from "@/lib/mensalidades";

export const dynamic = "force-dynamic";

/**
 * Aviso diário de cobranças por push. Chamado pelo Vercel Cron (ver vercel.json).
 *
 * As cobranças são derivadas e não têm campo "avisado" — a colecção
 * `mensalidade_avisos` é que guarda o que já foi enviado, senão o mesmo push
 * repetia-se todas as manhãs enquanto a cobrança estivesse vencida.
 *
 * Degrada em silêncio: sem chaves VAPID, `sendPushToAll` é no-op e o resto do
 * painel (calendário, sino, Dívidas) continua a mostrar tudo à mesma.
 */

// sha256 dos dois lados antes do timingSafeEqual: iguala comprimentos (o
// timingSafeEqual exige buffers iguais) e não vaza o tamanho do segredo.
function segredoValido(candidato: string | null): boolean {
  const secreto = process.env.CRON_SECRET?.trim();
  if (!secreto || !candidato) return false;
  const a = createHash("sha256").update(candidato).digest();
  const b = createHash("sha256").update(secreto).digest();
  return timingSafeEqual(a, b);
}

function extrairSegredo(request: Request): string | null {
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice("Bearer ".length).trim();
  return null;
}

function eur(v: number): string {
  return `${v.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

export async function GET(request: Request) {
  if (!segredoValido(extrairSegredo(request))) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  const [mensalidades, pagamentos] = await Promise.all([
    getAllMensalidades(),
    getAllPagamentos(),
  ]);

  const hoje = todayLisbonYmd();
  const cobrancas = todasCobrancas(mensalidades, pagamentos, hoje);

  // Três coisas dignas de um toque no telemóvel: venceu hoje, está em atraso,
  // ou o plano chegou ao fim e falta decidir.
  type Aviso = { key: string; tipo: AvisoTipo; projetoId: string; linha: string };
  const candidatos: Aviso[] = [];

  const planoPorId = new Map(mensalidades.map((m) => [m.id, m]));
  const titulos = await getProjetoTitulosByIds([
    ...new Set(mensalidades.map((m) => m.projetoId)),
  ]);

  for (const c of cobrancasAVencer(cobrancas, hoje, 0)) {
    const plano = planoPorId.get(c.mensalidadeId);
    candidatos.push({
      key: avisoKey(c.mensalidadeId, c.numero, "vence"),
      tipo: "vence",
      projetoId: c.projetoId,
      linha: `${titulos[c.projetoId] ?? "Projecto"} · ${plano?.titulo ?? "Plano"} ${c.numero} — ${eur(
        Math.max(0, c.valor - c.pago)
      )} vence hoje`,
    });
  }

  for (const c of cobrancasVencidas(cobrancas)) {
    const plano = planoPorId.get(c.mensalidadeId);
    candidatos.push({
      key: avisoKey(c.mensalidadeId, c.numero, "vencida"),
      tipo: "vencida",
      projetoId: c.projetoId,
      linha: `${titulos[c.projetoId] ?? "Projecto"} · ${plano?.titulo ?? "Plano"} ${c.numero} — ${eur(
        Math.max(0, c.valor - c.pago)
      )} em atraso`,
    });
  }

  for (const m of mensalidades) {
    if (m.fechadoEm) continue;
    if (!resumoMensalidade(m, cobrancas).terminada) continue;
    candidatos.push({
      // numero 0: o aviso é do plano inteiro, não de uma prestação.
      key: avisoKey(m.id, 0, "terminada"),
      tipo: "terminada",
      projetoId: m.projetoId,
      linha: `${titulos[m.projetoId] ?? "Projecto"} · ${m.titulo} cumprido — renovar ou fechar?`,
    });
  }

  const jaEnviados = await getAvisosEnviados(candidatos.map((a) => a.key));
  const novos = candidatos.filter((a) => !jaEnviados.has(a.key));

  if (novos.length === 0) {
    return NextResponse.json(
      { ok: true, avaliados: candidatos.length, enviados: 0 },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  // Um push só, com o resumo — não um por cobrança.
  const titulo =
    novos.length === 1 ? "Cobrança" : `${novos.length} cobranças a tratar`;
  const corpo = novos
    .slice(0, 4)
    .map((a) => a.linha)
    .join("\n");
  const resto = novos.length > 4 ? `\n+${novos.length - 4} …` : "";

  await sendPushToAll({
    title: titulo,
    body: corpo + resto,
    // Um único destino leva ao projecto; vários levam à lista.
    url:
      novos.length === 1
        ? `/painel/projetos/${novos[0].projetoId}#mensalidades`
        : "/painel/dividas?v=mensalidades",
  });

  await marcarAvisosEnviados(novos.map((a) => a.key));

  return NextResponse.json(
    { ok: true, avaliados: candidatos.length, enviados: novos.length },
    { headers: { "Cache-Control": "no-store" } }
  );
}
