import "server-only";
import { getClient } from "./client";

let initialised = false;
let inFlight: Promise<void> | null = null;

async function doInit(): Promise<void> {
  const client = await getClient();
  const db = client.db(process.env.MONGODB_DB_NAME);

  await Promise.all([
    db.collection("projetos").createIndex({ id: 1 }, { unique: true }),
    db.collection("projetos").createIndex({ clienteId: 1 }),
    db.collection("projetos").createIndex({ status: 1 }),

    db.collection("projetos").createIndex(
      { "portal.tokenHash": 1 },
      { unique: true, partialFilterExpression: { "portal.tokenHash": { $type: "string" } } }
    ),
    // Código de referência único (safety net; a geração já é atómica via
    // contador). Parcial: só documentos com ref string entram no índice.
    db.collection("projetos").createIndex(
      { ref: 1 },
      { unique: true, partialFilterExpression: { ref: { $type: "string" } } }
    ),

    db.collection("portal_comentarios").createIndex({ id: 1 }, { unique: true }),
    db.collection("portal_comentarios").createIndex({ projetoId: 1, criadoEm: -1 }),

    db.collection("portal_sandboxes").createIndex({ id: 1 }, { unique: true }),
    db.collection("portal_sandboxes").createIndex({ projetoId: 1, criadoEm: -1 }),

    db.collection("lembretes").createIndex({ id: 1 }, { unique: true }),
    db.collection("lembretes").createIndex({ projetoId: 1 }),

    db.collection("clientes").createIndex({ id: 1 }, { unique: true }),
    db.collection("clientes").createIndex(
      { email: 1 },
      { unique: true, partialFilterExpression: { email: { $type: "string" } } }
    ),
    db.collection("clientes").createIndex(
      { nif: 1 },
      { unique: true, partialFilterExpression: { nif: { $type: "string" } } }
    ),

    db.collection("pagamentos").createIndex({ id: 1 }, { unique: true }),
    db.collection("pagamentos").createIndex({ projetoId: 1 }),
    db.collection("pagamentos").createIndex({ clienteId: 1 }),
    // Parcial: só os pagamentos ligados a um plano recorrente entram no índice
    // (a esmagadora maioria é avulso e não tem o campo).
    db.collection("pagamentos").createIndex(
      { mensalidadeId: 1 },
      { partialFilterExpression: { mensalidadeId: { $type: "string" } } }
    ),

    db.collection("mensalidades").createIndex({ id: 1 }, { unique: true }),
    db.collection("mensalidades").createIndex({ projetoId: 1 }),
    db.collection("mensalidades").createIndex({ clienteId: 1 }),

    db.collection("mensalidade_avisos").createIndex({ key: 1 }, { unique: true }),
    // TTL 400 dias: mais do que um ciclo anual completo, para uma anuidade não
    // voltar a ser avisada por o registo ter expirado entre cobranças.
    db.collection("mensalidade_avisos").createIndex(
      { at: 1 },
      { expireAfterSeconds: 400 * 24 * 60 * 60, name: "mens_aviso_ttl" }
    ),

    db.collection("servicos").createIndex({ id: 1 }, { unique: true }),
    db.collection("servicos").createIndex({ slug: 1, ordem: 1 }),

    db.collection("projeto_tipos_custom").createIndex({ id: 1 }, { unique: true }),
    db.collection("projeto_tipos_custom").createIndex({ slug: 1 }, { unique: true }),

    db.collection("auth_audit").createIndex({ at: -1 }),
    db.collection("auth_audit").createIndex({ email: 1, type: 1, at: -1 }),

    db.collection("audit_log").createIndex({ at: -1 }),
    db.collection("audit_log").createIndex({ collection: 1, entityId: 1, at: -1 }),
    db.collection("audit_log").createIndex({ userEmail: 1, at: -1 }),
    // Retenção do audit_log: 2 anos (RGPD — limitação da conservação). Purga
    // automática de entradas antigas; snapshots já são enxutos (ver mutation-audit).
    db.collection("audit_log").createIndex(
      { at: 1 },
      { expireAfterSeconds: 2 * 365 * 24 * 60 * 60, name: "audit_ttl" }
    ),

    db.collection("leads").createIndex({ id: 1 }, { unique: true }),
    db.collection("leads").createIndex({ estado: 1, criadoEm: -1 }),
    db.collection("leads").createIndex({ criadoEm: -1 }),

    db.collection("push_subscriptions").createIndex({ endpoint: 1 }, { unique: true }),

    db.collection("blocked_ips").createIndex({ ip: 1 }, { unique: true }),

    db.collection("settings").createIndex({ id: 1 }, { unique: true }),

    db.collection("despesas").createIndex({ id: 1 }, { unique: true }),
    db.collection("despesas").createIndex({ data: -1 }),
    db.collection("despesas").createIndex({ projetoId: 1 }),

    db.collection("notif_dismissidas").createIndex({ notifId: 1 }, { unique: true }),
    // TTL 1 ano: purga dispensas antigas (o lead/comentário já foi tratado).
    db.collection("notif_dismissidas").createIndex(
      { at: 1 },
      { expireAfterSeconds: 365 * 24 * 60 * 60, name: "notif_dismiss_ttl" }
    ),
  ]);
}

export async function ensureIndexes(): Promise<void> {
  if (initialised) return;
  if (inFlight) return inFlight;
  inFlight = doInit()
    .then(() => {
      initialised = true;
    })
    .catch((e) => {
      console.error("ensureIndexes failed", e);
      // não bloqueia — próxima chamada tenta de novo
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}
