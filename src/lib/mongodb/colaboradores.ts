import "server-only";
import { getDb } from "./client";
import type { Colaborador } from "@/types/colaborador";

const COLLECTION = "colaboradores";

export async function getAllColaboradores(): Promise<Colaborador[]> {
  const db = await getDb();
  return db
    .collection<Colaborador>(COLLECTION)
    .find({}, { projection: { _id: 0 } })
    .sort({ nome: 1 })
    .toArray();
}

export async function getColaboradorById(id: string): Promise<Colaborador | null> {
  const db = await getDb();
  return db
    .collection<Colaborador>(COLLECTION)
    .findOne({ id }, { projection: { _id: 0 } });
}

export async function upsertColaborador(colaborador: Colaborador): Promise<void> {
  const db = await getDb();
  await db
    .collection<Colaborador>(COLLECTION)
    .updateOne({ id: colaborador.id }, { $set: colaborador }, { upsert: true });
}

export async function deleteColaborador(id: string): Promise<boolean> {
  const db = await getDb();
  const result = await db.collection<Colaborador>(COLLECTION).deleteOne({ id });
  return result.deletedCount > 0;
}

/**
 * Onde é que este colaborador ainda está a ser usado. Apagar a ficha com
 * pagamentos ou projectos agarrados deixava-os órfãos (o histórico passa a
 * apontar para um id que já não existe) — a rota DELETE usa isto para recusar
 * e sugerir arquivar em vez de apagar.
 */
export async function colaboradorEmUso(
  id: string
): Promise<{ projetos: number; pagamentos: number }> {
  const db = await getDb();
  const [projetos, pagamentos] = await Promise.all([
    db.collection("projetos").countDocuments({ "colaboradores.colaboradorId": id }),
    db.collection("despesas").countDocuments({ colaboradorId: id }),
  ]);
  return { projetos, pagamentos };
}
