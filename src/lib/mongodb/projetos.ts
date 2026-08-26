import "server-only";
import { getDb } from "./client";
import type { Projeto, ProjetoArquivo, ProjetoLink } from "@/types/projeto";
import { PROJETO_STATUS_FLUXO } from "@/types/projeto";

const COLLECTION = "projetos";

export async function getAllProjetos(): Promise<Projeto[]> {
  const db = await getDb();
  return db
    .collection<Projeto>(COLLECTION)
    .find({}, { projection: { _id: 0 } })
    .toArray();
}

export async function getProjetoById(id: string): Promise<Projeto | null> {
  const db = await getDb();
  return db
    .collection<Projeto>(COLLECTION)
    .findOne({ id }, { projection: { _id: 0 } });
}

/**
 * Próximo código de referência para um prefixo (ex.: "AT" -> "AT-0043").
 * Contador ATÓMICO por prefixo (findOneAndUpdate $inc) — sem race de
 * read-modify-write, monotónico, e não depende de fazer parse de texto (por
 * isso sobrevive a >9999). O contador é semeado com o máximo existente na
 * migração retroactiva.
 */
export async function nextRefForPrefix(prefix: string): Promise<string> {
  const db = await getDb();
  const doc = await db
    .collection<{ _id: string; seq: number }>("counters")
    .findOneAndUpdate(
      { _id: `projeto-ref:${prefix}` },
      { $inc: { seq: 1 } },
      { upsert: true, returnDocument: "after" }
    );
  const seq = doc?.seq ?? 1;
  return `${prefix}-${String(seq).padStart(4, "0")}`;
}

/** Projectos de um cliente. Usa o índice projetos.clienteId (antes filtrava em JS após getAllProjetos). */
export async function getProjetosByCliente(clienteId: string): Promise<Projeto[]> {
  const db = await getDb();
  return db
    .collection<Projeto>(COLLECTION)
    .find({ clienteId }, { projection: { _id: 0 } })
    .toArray();
}

export type ProjetoBrief = Pick<
  Projeto,
  | "id"
  | "ref"
  | "titulo"
  | "clienteNome"
  | "status"
  | "proximaAccao"
  | "prazo"
  | "garantiaAte"
>;

const BRIEF_PROJECTION = {
  _id: 0,
  id: 1,
  ref: 1,
  titulo: 1,
  clienteNome: 1,
  status: 1,
  proximaAccao: 1,
  prazo: 1,
  garantiaAte: 1,
} as const;

/**
 * Projectos para o resumo matinal (/api/brief): só o fluxo activo (sem ideias
 * nem fechados) e só campos leves não sensíveis — sem valores, linhas ou bodyMd.
 */
export async function getProjetosParaBrief(): Promise<ProjetoBrief[]> {
  const db = await getDb();
  const ativos = PROJETO_STATUS_FLUXO.filter((s) => s !== "fechado");
  return db
    .collection<Projeto>(COLLECTION)
    .find({ status: { $in: ativos } }, { projection: BRIEF_PROJECTION })
    .limit(100)
    .toArray() as Promise<ProjetoBrief[]>;
}

/**
 * Contexto leve (título/ref/status) dos projectos dos lembretes do brief —
 * inclui fechados e ideias, porque lembretes são visíveis em qualquer estado.
 */
export async function getProjetosBriefByIds(ids: string[]): Promise<ProjetoBrief[]> {
  if (ids.length === 0) return [];
  const db = await getDb();
  return db
    .collection<Projeto>(COLLECTION)
    .find({ id: { $in: ids } }, { projection: BRIEF_PROJECTION })
    .toArray() as Promise<ProjetoBrief[]>;
}

export type ProjetoResumo = Pick<
  Projeto,
  "id" | "status" | "valorEstimado" | "comIva" | "prazo" | "dataFechado" | "clienteId"
>;

/**
 * Só os campos leves necessários para contagens/listas. Evita puxar bodyMd
 * (até 50KB), linhas e arquivos de TODOS os projectos só para contar badges.
 */
export async function getProjetosResumo(): Promise<ProjetoResumo[]> {
  const db = await getDb();
  return db
    .collection<Projeto>(COLLECTION)
    .find(
      {},
      {
        projection: {
          _id: 0,
          id: 1,
          status: 1,
          valorEstimado: 1,
          // Sem isto as listas/badges calculavam a dívida contra a base s/ IVA
          // enquanto os pagamentos são brutos — dívida sempre errada.
          comIva: 1,
          prazo: 1,
          dataFechado: 1,
          clienteId: 1,
        },
      }
    )
    .toArray() as Promise<ProjetoResumo[]>;
}

/** Títulos de vários projectos por id (para o feed do sino não puxar docs inteiros). */
export async function getProjetoTitulosByIds(ids: string[]): Promise<Record<string, string>> {
  if (ids.length === 0) return {};
  const db = await getDb();
  const docs = await db
    .collection<Projeto>(COLLECTION)
    .find({ id: { $in: ids } }, { projection: { _id: 0, id: 1, titulo: 1 } })
    .toArray();
  return Object.fromEntries(docs.map((d) => [d.id, d.titulo]));
}

export async function upsertProjeto(projeto: Projeto): Promise<void> {
  const db = await getDb();
  const col = db.collection<Projeto>(COLLECTION);
  // `portal` e `links` são geridos por rotas próprias (atómicas). Não os pôr no
  // $set do documento inteiro, senão um upsert que leu um `existing` obsoleto
  // reverte silenciosamente um "Gerar link"/pushLink concorrente (lost update,
  // painel PWA/multi-dispositivo). Só entram no insert inicial, com $setOnInsert.
  const { portal, links, ...rest } = projeto;
  await col.updateOne(
    { id: projeto.id },
    { $set: rest, $setOnInsert: { portal: portal ?? null, links: links ?? null } },
    { upsert: true }
  );
}

export async function patchProjeto(
  id: string,
  patch: Partial<Projeto>
): Promise<boolean> {
  const db = await getDb();
  const result = await db
    .collection<Projeto>(COLLECTION)
    .updateOne({ id }, { $set: patch });
  return result.matchedCount > 0;
}

export async function deleteProjeto(id: string): Promise<boolean> {
  const db = await getDb();
  const result = await db.collection<Projeto>(COLLECTION).deleteOne({ id });
  return result.deletedCount > 0;
}

/**
 * Acrescenta um arquivo ATÓMICAMENTE (update de 1 documento) — evita o lost
 * update do read-modify-write do array inteiro com escritas concorrentes.
 * Pipeline com $ifNull para funcionar mesmo se `arquivos` for null.
 */
export async function pushArquivo(
  projetoId: string,
  arquivo: ProjetoArquivo
): Promise<boolean> {
  const db = await getDb();
  const result = await db.collection<Projeto>(COLLECTION).updateOne({ id: projetoId }, [
    {
      $set: {
        arquivos: {
          $concatArrays: [{ $ifNull: ["$arquivos", []] }, [arquivo]],
        },
      },
    },
  ]);
  return result.matchedCount > 0;
}

/** Acrescenta um link de preview atomicamente (ver pushArquivo). */
export async function pushLink(projetoId: string, link: ProjetoLink): Promise<boolean> {
  const db = await getDb();
  const result = await db.collection<Projeto>(COLLECTION).updateOne({ id: projetoId }, [
    { $set: { links: { $concatArrays: [{ $ifNull: ["$links", []] }, [link]] } } },
  ]);
  return result.matchedCount > 0;
}

/** Remove um link pelo id, atomicamente. */
export async function pullLink(projetoId: string, linkId: string): Promise<boolean> {
  const db = await getDb();
  const result = await db.collection<Projeto>(COLLECTION).updateOne({ id: projetoId }, [
    {
      $set: {
        links: {
          $filter: {
            input: { $ifNull: ["$links", []] },
            as: "k",
            cond: { $ne: ["$$k.id", linkId] },
          },
        },
      },
    },
  ]);
  return result.matchedCount > 0;
}

/**
 * Actualiza campos de um arquivo (categoria/descrição), atomicamente ($map
 * sobre o array — ver pushArquivo para o porquê de não fazer
 * read-modify-write). Só os campos presentes no patch são tocados.
 */
export async function patchArquivo(
  projetoId: string,
  arquivoId: string,
  patch: Partial<Pick<ProjetoArquivo, "categoria" | "descricao">>
): Promise<boolean> {
  const db = await getDb();
  const result = await db.collection<Projeto>(COLLECTION).updateOne({ id: projetoId }, [
    {
      $set: {
        arquivos: {
          $map: {
            input: { $ifNull: ["$arquivos", []] },
            as: "a",
            in: {
              $cond: [
                { $eq: ["$$a.id", arquivoId] },
                { $mergeObjects: ["$$a", patch] },
                "$$a",
              ],
            },
          },
        },
      },
    },
  ]);
  return result.matchedCount > 0;
}

/** Remove um arquivo pelo id, atomicamente (ver pushArquivo). */
export async function pullArquivo(
  projetoId: string,
  arquivoId: string
): Promise<boolean> {
  const db = await getDb();
  const result = await db.collection<Projeto>(COLLECTION).updateOne({ id: projetoId }, [
    {
      $set: {
        arquivos: {
          $filter: {
            input: { $ifNull: ["$arquivos", []] },
            as: "a",
            cond: { $ne: ["$$a.id", arquivoId] },
          },
        },
      },
    },
  ]);
  return result.matchedCount > 0;
}
