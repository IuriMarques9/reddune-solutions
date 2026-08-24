import "server-only";
import { getDb } from "./client";
import { SERVICO_EXTRAS, type Servico, type ServicoGrupo } from "@/types/servico";

const COLLECTION = "servicos";

export async function getAllServicos(): Promise<Servico[]> {
  const db = await getDb();
  return db
    .collection<Servico>(COLLECTION)
    .find({}, { projection: { _id: 0 } })
    .sort({ slug: 1, ordem: 1 })
    .toArray();
}

export async function getServicosBySlug(slug: ServicoGrupo, soAtivos = true): Promise<Servico[]> {
  const db = await getDb();
  const filter = soAtivos ? { slug, ativo: true } : { slug };
  return db
    .collection<Servico>(COLLECTION)
    .find(filter, { projection: { _id: 0 } })
    .sort({ ordem: 1 })
    .toArray();
}

/**
 * Linhas do grupo "Extras" — taxas gerais (urgência, deslocação) partilhadas por
 * todas as categorias. Nunca são renderizadas numa tabela pública; servem só
 * para os tokens `{{preco:…}}` do texto corrido, por isso vêm sempre TODAS
 * (incluindo `ativo:false`, tal como as linhas inactivas de uma categoria).
 */
export async function getServicosExtras(): Promise<Servico[]> {
  return getServicosBySlug(SERVICO_EXTRAS, false);
}

export async function getServicoById(id: string): Promise<Servico | null> {
  const db = await getDb();
  return db.collection<Servico>(COLLECTION).findOne({ id }, { projection: { _id: 0 } });
}

export async function upsertServico(s: Servico): Promise<void> {
  const db = await getDb();
  const col = db.collection<Servico>(COLLECTION);
  await col.updateOne({ id: s.id }, { $set: s }, { upsert: true });
}

export async function deleteServico(id: string): Promise<boolean> {
  const db = await getDb();
  const result = await db.collection<Servico>(COLLECTION).deleteOne({ id });
  return result.deletedCount > 0;
}
