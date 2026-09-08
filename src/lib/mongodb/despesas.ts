import "server-only";
import { getDb } from "./client";
import type { Despesa } from "@/types/despesa";

const COLLECTION = "despesas";

export async function getAllDespesas(): Promise<Despesa[]> {
  const db = await getDb();
  return db
    .collection<Despesa>(COLLECTION)
    .find({}, { projection: { _id: 0 } })
    .sort({ data: -1 })
    .toArray();
}

export async function getDespesasByProjeto(projetoId: string): Promise<Despesa[]> {
  const db = await getDb();
  return db
    .collection<Despesa>(COLLECTION)
    .find({ projetoId }, { projection: { _id: 0 } })
    .sort({ data: -1 })
    .toArray();
}

export async function getDespesaById(id: string): Promise<Despesa | null> {
  const db = await getDb();
  return (
    (await db.collection<Despesa>(COLLECTION).findOne({ id }, { projection: { _id: 0 } })) ?? null
  );
}

/**
 * SUBSTITUI o documento inteiro: qualquer campo omitido no objecto passado é
 * reescrito com o que a rota calculou, não é preservado da BD. Quem edita tem
 * de ler o existente primeiro (getDespesaById) e decidir campo a campo — foi
 * assim que uma edição sem `mensalidadeId` apagava a ligação ao plano.
 * Só o `criadoEm` escapa, via $setOnInsert.
 */
export async function upsertDespesa(d: Despesa): Promise<void> {
  const db = await getDb();
  const col = db.collection<Despesa>(COLLECTION);
  // Não reescrever `criadoEm` em updates — só no insert via $setOnInsert.
  const { criadoEm, ...updateDoc } = d;
  await col.updateOne(
    { id: d.id },
    { $set: updateDoc, $setOnInsert: { criadoEm } },
    { upsert: true }
  );
}

export async function deleteDespesa(id: string): Promise<boolean> {
  const db = await getDb();
  const result = await db.collection<Despesa>(COLLECTION).deleteOne({ id });
  return result.deletedCount > 0;
}
