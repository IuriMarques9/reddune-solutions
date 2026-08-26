import "server-only";
import { getDb } from "./client";

const COLLECTION = "mensalidade_avisos";

/**
 * Registo dos avisos de cobrança JÁ ENVIADOS por push.
 *
 * As cobranças são derivadas e não têm campo "avisado". Sem este registo, o
 * cron diário repetia o mesmo push todas as manhãs enquanto a cobrança
 * estivesse vencida — o Iuri desligava as notificações ao terceiro dia.
 *
 * Chave: `<mensalidadeId>:<numero>:<tipo>`. TTL de 400 dias (mais do que um
 * ciclo anual completo, para uma anuidade não ser avisada duas vezes).
 */
type AvisoDoc = { key: string; at: Date };

export type AvisoTipo = "vence" | "vencida" | "terminada";

export function avisoKey(mensalidadeId: string, numero: number, tipo: AvisoTipo): string {
  return `${mensalidadeId}:${numero}:${tipo}`;
}

export async function getAvisosEnviados(keys: string[]): Promise<Set<string>> {
  if (keys.length === 0) return new Set();
  const db = await getDb();
  const docs = await db
    .collection<AvisoDoc>(COLLECTION)
    .find({ key: { $in: keys } }, { projection: { key: 1, _id: 0 } })
    .toArray();
  return new Set(docs.map((d) => d.key));
}

/**
 * Marca avisos como enviados. `$setOnInsert` + upsert: se dois pedidos
 * chegarem ao mesmo tempo, o índice único garante que só um grava.
 */
export async function marcarAvisosEnviados(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  const db = await getDb();
  const at = new Date();
  await db.collection<AvisoDoc>(COLLECTION).bulkWrite(
    keys.map((key) => ({
      updateOne: { filter: { key }, update: { $setOnInsert: { key, at } }, upsert: true },
    })),
    { ordered: false }
  );
}
