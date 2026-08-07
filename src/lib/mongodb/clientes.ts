import "server-only";
import { randomUUID } from "node:crypto";
import { getDb } from "./client";
import type { Cliente } from "@/types/cliente";
import type { Lead } from "@/types/lead";

const COLLECTION = "clientes";

export async function getAllClientes(): Promise<Cliente[]> {
  const db = await getDb();
  return db
    .collection<Cliente>(COLLECTION)
    .find({}, { projection: { _id: 0 } })
    .sort({ nome: 1 })
    .toArray();
}

export async function getClienteById(id: string): Promise<Cliente | null> {
  const db = await getDb();
  return db
    .collection<Cliente>(COLLECTION)
    .findOne({ id }, { projection: { _id: 0 } });
}

/**
 * Procura um cliente por email (case-insensitive). Usado na conversão de
 * leads para não duplicar clientes que já existam com o mesmo email.
 */
export async function getClienteByEmail(email: string): Promise<Cliente | null> {
  const trimmed = email.trim();
  if (!trimmed) return null;
  const db = await getDb();
  return db.collection<Cliente>(COLLECTION).findOne(
    { email: { $regex: `^${escapeRegex(trimmed)}$`, $options: "i" } },
    { projection: { _id: 0 } }
  );
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Cria um Cliente a partir dos campos de um Lead e insere-o.
 * Se já existir um cliente com o mesmo email, devolve o existente (não duplica).
 * Devolve { cliente, created } para o caller saber se foi reutilizado.
 */
export async function createClienteFromLead(
  lead: Lead
): Promise<{ cliente: Cliente; created: boolean }> {
  const email = lead.email?.trim() || null;

  if (email) {
    const existing = await getClienteByEmail(email);
    if (existing) return { cliente: existing, created: false };
  }

  const cliente: Cliente = {
    id: randomUUID(),
    nome: lead.nome,
    empresa: null,
    email,
    telefone: null,
    nif: null,
    morada: null,
    notas: lead.mensagem ?? null,
    criadoEm: new Date().toISOString(),
  };

  await upsertCliente(cliente);
  return { cliente, created: true };
}

export async function upsertCliente(cliente: Cliente): Promise<void> {
  const db = await getDb();
  const col = db.collection<Cliente>(COLLECTION);
  await col.updateOne({ id: cliente.id }, { $set: cliente }, { upsert: true });
}

export async function deleteCliente(id: string): Promise<boolean> {
  const db = await getDb();
  const result = await db.collection<Cliente>(COLLECTION).deleteOne({ id });
  return result.deletedCount > 0;
}
