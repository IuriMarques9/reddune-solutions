/**
 * Migração one-time: colaboradores escritos à mão → fichas próprias.
 *
 * Antes: cada projecto guardava {id, nome, papel, valorAcordado} e cada despesa
 * de categoria "colaboradores" guardava o nome em texto (`colaborador`). O nome
 * era a chave que juntava pessoa e pagamentos — frágil a gralhas e renomeações.
 *
 * Depois: colecção `colaboradores` (a ficha), e as referências passam a ser por
 * id — Projeto.colaboradores[].colaboradorId e Despesa.colaboradorId.
 *
 * As pessoas são deduplicadas por nome normalizado (trim + minúsculas, sem
 * acentos): "Jaime" e "jaime " são a mesma ficha.
 *
 * Idempotente: correr duas vezes não duplica fichas nem mexe no que já migrou.
 *
 * Como correr:
 *   node scripts/migrate-colaboradores.mjs           # simulação, não escreve
 *   node scripts/migrate-colaboradores.mjs --aplicar # escreve
 */
import path from "node:path";
import url from "node:url";
import { randomUUID } from "node:crypto";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI não definido");
  process.exit(1);
}

const aplicar = process.argv.includes("--aplicar");
const chave = (nome) =>
  String(nome ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();

const client = new MongoClient(uri);

try {
  await client.connect();
  // Sem nome de DB nas envs usa a default da connection string — é a que o
  // painel usa (ver nota "DB efectiva" no CLAUDE.md).
  const db = process.env.MONGODB_DB_NAME ? client.db(process.env.MONGODB_DB_NAME) : client.db();
  console.log(`DB: ${db.databaseName}${aplicar ? "" : "  (SIMULAÇÃO — nada é escrito)"}\n`);

  const projetos = db.collection("projetos");
  const despesas = db.collection("despesas");
  const colaboradores = db.collection("colaboradores");

  // 1. Recolher todos os nomes usados, das duas fontes.
  const nomes = new Map(); // chave normalizada -> nome tal como escrito
  const comColabs = await projetos
    .find({ colaboradores: { $exists: true, $ne: null } })
    .toArray();
  for (const p of comColabs) {
    for (const c of p.colaboradores ?? []) {
      if (c?.nome && !nomes.has(chave(c.nome))) nomes.set(chave(c.nome), String(c.nome).trim());
    }
  }
  const pagamentosAntigos = await despesas
    .find({ categoria: "colaboradores", colaborador: { $exists: true, $ne: null } })
    .toArray();
  for (const d of pagamentosAntigos) {
    if (d?.colaborador && !nomes.has(chave(d.colaborador))) {
      nomes.set(chave(d.colaborador), String(d.colaborador).trim());
    }
  }

  if (nomes.size === 0) {
    console.log("Nada a migrar: nenhum colaborador escrito à mão encontrado.");
    process.exit(0);
  }

  // 2. Uma ficha por pessoa (reutiliza a que já exista com o mesmo nome).
  const idPorChave = new Map();
  for (const [k, nome] of nomes) {
    const existente = await colaboradores.findOne({
      nome: { $regex: `^${nome.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
    });
    if (existente) {
      idPorChave.set(k, existente.id);
      console.log(`= ficha já existe: ${nome} (${existente.id})`);
      continue;
    }
    const ficha = {
      id: randomUUID(),
      nome,
      papel: null,
      email: null,
      telefone: null,
      nif: null,
      notas: null,
      ativo: true,
      criadoEm: new Date().toISOString(),
    };
    idPorChave.set(k, ficha.id);
    console.log(`+ ficha nova: ${nome} (${ficha.id})`);
    if (aplicar) await colaboradores.insertOne(ficha);
  }

  // 3. Projectos: entradas embebidas → referências.
  let nProjetos = 0;
  for (const p of comColabs) {
    const antes = p.colaboradores ?? [];
    if (!antes.some((c) => c?.nome)) continue; // já migrado
    const depois = antes
      .map((c) => {
        const id = c?.colaboradorId ?? idPorChave.get(chave(c?.nome));
        if (!id) return null;
        return {
          colaboradorId: id,
          papel: c?.papel ?? null,
          valorAcordado: c?.valorAcordado ?? null,
        };
      })
      .filter(Boolean);
    console.log(`~ projecto "${p.titulo}": ${antes.length} → ${depois.length} referência(s)`);
    nProjetos += 1;
    if (aplicar) {
      await projetos.updateOne(
        { id: p.id },
        { $set: { colaboradores: depois.length ? depois : null } }
      );
    }
  }

  // 4. Despesas: nome em texto → colaboradorId (e o campo antigo sai).
  let nDespesas = 0;
  for (const d of pagamentosAntigos) {
    const id = d.colaboradorId ?? idPorChave.get(chave(d.colaborador));
    if (!id) continue;
    console.log(`~ pagamento ${d.valor} € a "${d.colaborador}" → ${id}`);
    nDespesas += 1;
    if (aplicar) {
      await despesas.updateOne(
        { id: d.id },
        { $set: { colaboradorId: id }, $unset: { colaborador: "" } }
      );
    }
  }

  console.log(
    `\n${aplicar ? "✓ Migrado" : "Simulação"}: ${nomes.size} ficha(s), ${nProjetos} projecto(s), ${nDespesas} pagamento(s).`
  );
  if (!aplicar) console.log("Corre outra vez com --aplicar para escrever.");
} catch (err) {
  console.error("Migração falhou:", err);
  process.exit(1);
} finally {
  await client.close();
}
