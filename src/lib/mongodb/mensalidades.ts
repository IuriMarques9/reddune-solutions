import "server-only";
import { getDb } from "./client";
import type { Mensalidade } from "@/types/mensalidade";

const COLLECTION = "mensalidades";

export async function getMensalidadesByProjeto(projetoId: string): Promise<Mensalidade[]> {
  const db = await getDb();
  return db
    .collection<Mensalidade>(COLLECTION)
    .find({ projetoId }, { projection: { _id: 0 } })
    .sort({ criadoEm: 1 })
    .toArray();
}

export async function getMensalidadesByCliente(clienteId: string): Promise<Mensalidade[]> {
  const db = await getDb();
  return db
    .collection<Mensalidade>(COLLECTION)
    .find({ clienteId }, { projection: { _id: 0 } })
    .sort({ criadoEm: 1 })
    .toArray();
}

export async function getAllMensalidades(): Promise<Mensalidade[]> {
  const db = await getDb();
  return db
    .collection<Mensalidade>(COLLECTION)
    .find({}, { projection: { _id: 0 } })
    .sort({ criadoEm: 1 })
    .toArray();
}

export async function getMensalidadeById(id: string): Promise<Mensalidade | null> {
  const db = await getDb();
  return db.collection<Mensalidade>(COLLECTION).findOne({ id }, { projection: { _id: 0 } });
}

export async function upsertMensalidade(m: Mensalidade): Promise<void> {
  const db = await getDb();
  // NÃO reescrever `criadoEm` em updates — senão editar o valor ou desligar o
  // plano apagava a data de criação real (mesma armadilha dos pagamentos).
  const { criadoEm, ...updateDoc } = m;
  await db
    .collection<Mensalidade>(COLLECTION)
    .updateOne({ id: m.id }, { $set: updateDoc, $setOnInsert: { criadoEm } }, { upsert: true });
}

export async function deleteMensalidade(id: string): Promise<boolean> {
  const db = await getDb();
  const result = await db.collection<Mensalidade>(COLLECTION).deleteOne({ id });
  return result.deletedCount > 0;
}
