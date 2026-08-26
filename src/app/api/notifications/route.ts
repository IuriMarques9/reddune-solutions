import { getLeadsNovosRecentes } from "@/lib/mongodb/leads";
import { getComentariosNaoLidosRecentes } from "@/lib/mongodb/portal";
import { getProjetoTitulosByIds } from "@/lib/mongodb/projetos";
import { getAllMensalidades } from "@/lib/mongodb/mensalidades";
import { getAllPagamentos } from "@/lib/mongodb/pagamentos";
import { getAllDespesas } from "@/lib/mongodb/despesas";
import { getDismissedNotifIds } from "@/lib/mongodb/notif-dismissed";
import { SUBJECT_LABELS } from "@/lib/validation";
import { apiOk, apiError, withAuth } from "@/lib/api";
import { todayLisbonYmd } from "@/lib/dates";
import {
  cobrancasAVencer,
  cobrancasVencidas,
  diffDias,
  resumoMensalidade,
  todasCobrancas,
} from "@/lib/mensalidades";

export const dynamic = "force-dynamic";

/**
 * GET /api/notifications — feed de notificações in-app (SÓ LEITURA).
 *
 * Só coisas ACCIONÁVEIS: leads por tratar (estado "novo"), comentários do
 * portal por ler e cobranças de mensalidades (vencidas, a vencer ou planos
 * cumpridos à espera de decisão). As edições/actividade (audit_log) NÃO entram
 * — isso é para a página de Auditoria, não para notificações. Nada é escrito na
 * BD; as dispensadas (colecção notif_dismissidas) são filtradas.
 *
 *   { unread: number, items: NotificationItem[] }
 */

const MAX_LEADS = 50;
const MAX_COMENTARIOS = 50;
const MAX_ITEMS = 20;
/** Antecedência com que uma cobrança começa a aparecer no sino. */
const AVISO_DIAS = 3;

type NotificationItem = {
  id: string;
  type: "lead" | "comment" | "cobranca";
  title: string;
  description: string;
  href: string;
  /** ISO 8601 — timestamp do evento, para ordenação/relativos no cliente. */
  timestamp: string;
  /** true = por tratar/novo (todos os items deste feed são accionáveis). */
  unread: boolean;
};

export const GET = withAuth(async () => {
  try {
    const [leads, comentarios, dismissed, mensalidades, pagamentos, despesas] = await Promise.all([
      getLeadsNovosRecentes(MAX_LEADS),
      getComentariosNaoLidosRecentes(MAX_COMENTARIOS),
      getDismissedNotifIds(),
      getAllMensalidades(),
      getAllPagamentos(),
      getAllDespesas(),
    ]);

    const hoje = todayLisbonYmd();
    // Os dois sentidos: cobrar ao cliente E pagar o alojamento.
    const cobrancas = todasCobrancas(mensalidades, [...pagamentos, ...despesas], hoje);
    const planoPorId = new Map(mensalidades.map((m) => [m.id, m]));

    const titulos = await getProjetoTitulosByIds([
      ...new Set([
        ...comentarios.map((c) => c.projetoId),
        ...mensalidades.map((m) => m.projetoId),
      ]),
    ]);

    const leadItems: NotificationItem[] = leads.map((l) => ({
      id: `lead-${l.id}`,
      type: "lead" as const,
      title: `Novo lead · ${l.nome}`,
      description: SUBJECT_LABELS[l.subject] ?? l.subject,
      href: "/painel/leads",
      timestamp: l.criadoEm,
      unread: true,
    }));

    const comentarioItems: NotificationItem[] = comentarios.map((c) => ({
      id: `comentario-${c.id}`,
      type: "comment" as const,
      title: `💬 Comentário · ${c.autorNome ?? "Cliente"}`,
      description: titulos[c.projetoId]
        ? `${titulos[c.projetoId]} — ${c.texto}`
        : c.texto,
      href: `/painel/projetos/${c.projetoId}`,
      timestamp: c.criadoEm,
      unread: true,
    }));

    // Cobranças que já deviam ter entrado + as que estão à porta. O id inclui o
    // número da prestação, por isso dispensar uma não cala as seguintes.
    const cobrancaItems: NotificationItem[] = [
      ...cobrancasVencidas(cobrancas),
      ...cobrancasAVencer(cobrancas, hoje, AVISO_DIAS),
    ].map((c) => {
      const plano = planoPorId.get(c.mensalidadeId);
      const atraso = diffDias(c.dataPrevista, hoje);
      const quando =
        atraso > 0
          ? `vencida há ${atraso} ${atraso === 1 ? "dia" : "dias"}`
          : atraso === 0
            ? "vence hoje"
            : `vence em ${-atraso} ${atraso === -1 ? "dia" : "dias"}`;
      const emFalta = Math.max(0, c.valor - c.pago).toLocaleString("pt-PT", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      const nome = titulos[c.projetoId] ?? "Projecto";
      return {
        id: `cobranca-${c.mensalidadeId}-${c.numero}`,
        type: "cobranca" as const,
        title: `Cobrança · ${nome}`,
        description: `${plano?.titulo ?? "Plano"} ${c.numero}/${
          plano?.numeroCobrancas ?? c.numero
        } — ${emFalta} € · ${quando}`,
        href: `/painel/projetos/${c.projetoId}#mensalidades`,
        timestamp: `${c.dataPrevista}T09:00:00.000Z`,
        unread: true,
      };
    });

    // Planos cumpridos à espera de decisão: renovar ou fechar.
    const terminadosItems: NotificationItem[] = mensalidades
      .filter((m) => !m.fechadoEm && resumoMensalidade(m, cobrancas).terminada)
      .map((m) => ({
        id: `mensalidade-${m.id}-terminada`,
        type: "cobranca" as const,
        title: `Plano cumprido · ${titulos[m.projetoId] ?? "Projecto"}`,
        description: `${m.titulo} — ${m.numeroCobrancas} cobranças pagas. Renovar ou fechar?`,
        href: `/painel/projetos/${m.projetoId}#mensalidades`,
        timestamp: new Date().toISOString(),
        unread: true,
      }));

    // Esconde os dispensados (global) ANTES de contar/cortar.
    const naoDispensados = [
      ...leadItems,
      ...comentarioItems,
      ...cobrancaItems,
      ...terminadosItems,
    ].filter((i) => !dismissed.has(i.id));
    const unread = naoDispensados.filter((i) => i.unread).length;

    const items = naoDispensados
      .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
      .slice(0, MAX_ITEMS);

    return apiOk({ unread, items }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("GET /api/notifications error:", error);
    return apiError("Internal error", 500);
  }
});
