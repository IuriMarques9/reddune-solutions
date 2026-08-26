import "server-only";
import { getDb } from "./client";
import type { Pagamento } from "@/types/pagamento";

const COLLECTION = "pagamentos";

export async function getPagamentosByProjeto(projetoId: string): Promise<Pagamento[]> {
  const db = await getDb();
  return db
    .collection<Pagamento>(COLLECTION)
    .find({ projetoId }, { projection: { _id: 0 } })
    .sort({ data: -1 })
    .toArray();
}

export async function getPagamentosByCliente(clienteId: string): Promise<Pagamento[]> {
  const db = await getDb();
  return db
    .collection<Pagamento>(COLLECTION)
    .find({ clienteId }, { projection: { _id: 0 } })
    .sort({ data: -1 })
    .toArray();
}

export async function getAllPagamentos(): Promise<Pagamento[]> {
  const db = await getDb();
  return db
    .collection<Pagamento>(COLLECTION)
    .find({}, { projection: { _id: 0 } })
    .sort({ data: -1 })
    .toArray();
}

export async function upsertPagamento(p: Pagamento): Promise<void> {
  const db = await getDb();
  const col = db.collection<Pagamento>(COLLECTION);
  // NÃO reescrever `criadoEm` em updates — senão qualquer edição (valor, notas)
  // apagava a data de registo real. Só se define no insert via $setOnInsert.
  const { criadoEm, ...updateDoc } = p;
  await col.updateOne(
    { id: p.id },
    { $set: updateDoc, $setOnInsert: { criadoEm } },
    { upsert: true }
  );
}

/**
 * Corta a ligação dos pagamentos a um plano recorrente apagado. Os pagamentos
 * FICAM (o dinheiro entrou mesmo, e continua a contar na receita) — passam só a
 * ser avulso. Sem isto ficavam a apontar a uma mensalidade que já não existe.
 * Devolve quantos foram desligados.
 */
export async function desligarPagamentosDaMensalidade(mensalidadeId: string): Promise<number> {
  const db = await getDb();
  const result = await db
    .collection<Pagamento>(COLLECTION)
    .updateMany(
      { mensalidadeId },
      { $unset: { mensalidadeId: "", cobrancaNumero: "" } }
    );
  return result.modifiedCount;
}

export async function deletePagamento(id: string): Promise<boolean> {
  const db = await getDb();
  const result = await db.collection<Pagamento>(COLLECTION).deleteOne({ id });
  return result.deletedCount > 0;
}
