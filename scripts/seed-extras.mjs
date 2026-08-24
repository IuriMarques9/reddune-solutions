/**
 * Seed do grupo "Extras" na colecção `servicos`.
 *
 * Extras = taxas gerais (urgência, deslocação) que valem para as três
 * categorias e por isso não pertencem à tabela de preços de nenhuma. Vivem em
 * `slug: "extras"`, nunca são renderizadas numa tabela pública e servem só para
 * os tokens `{{preco:label|fallback}}` do texto corrido (ver
 * src/lib/preco-tokens.ts). Editam-se no painel em /painel/precos.
 *
 * Os valores aqui são EXACTAMENTE os fallbacks que já estão escritos nos
 * content JSON, por isso criar as linhas não muda nada no site — passa só a ser
 * o painel a mandar no número.
 *
 * Idempotente: se já existir uma linha de extras cujo título contenha o label
 * do token, não faz nada.
 *
 * Como correr:
 *   node scripts/seed-extras.mjs           (dry-run, mostra o plano)
 *   node scripts/seed-extras.mjs --apply   (escreve)
 *
 * Nota: escrever por aqui não passa pela API, logo não há `revalidatePath` —
 * a página pública só refresca no próximo deploy ou no primeiro guardar feito
 * pelo painel. Como os valores são iguais aos fallbacks, não há diferença
 * visível de qualquer maneira.
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
// Igual ao src/lib/mongodb/client.ts: sem MONGODB_DB_NAME usa a BD default do URI.
const dbName = process.env.MONGODB_DB_NAME || undefined;
const APPLY = process.argv.includes("--apply");

if (!uri) {
  console.error("MONGODB_URI não definido (scripts/.env ou .env.local).");
  process.exit(1);
}

const now = new Date().toISOString();

const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

const EXTRAS = [
  {
    titulo: "Taxa de urgência (<48h)",
    tituloEn: "Rush fee (<48h)",
    precoBase: 25,
    precoTipo: "eur",
    nota: "sob disponibilidade",
    notaEn: "subject to availability",
  },
  {
    // Urgência dos websites é à parte da assistência: percentagem sobre o
    // orçamento, não valor fixo (decisão do Iuri, 2026-08-24).
    titulo: "Taxa de urgência web",
    tituloEn: "Website rush fee",
    precoBase: 25,
    precoTipo: "percent",
    nota: "sobre o valor do orçamento",
    notaEn: "on the quoted price",
  },
  {
    titulo: "Deslocação ao domicílio",
    tituloEn: "On-site call-out",
    precoBase: 0.8,
    precoTipo: "eur",
    nota: "por km, a partir da Fuseta",
    notaEn: "per km, from Fuseta",
  },
];

function doc(extra, ordem) {
  return {
    id: randomUUID(),
    slug: "extras",
    titulo: extra.titulo,
    tituloI18n: { pt: extra.titulo, en: extra.tituloEn },
    descricao: null,
    descricaoI18n: null,
    precoBase: extra.precoBase,
    precoMax: null,
    precoDesde: false,
    precoTipo: extra.precoTipo,
    variantes: null,
    precoTexto: null,
    precoTextoI18n: null,
    nota: extra.nota,
    notaI18n: { pt: extra.nota, en: extra.notaEn },
    imageUrl: null,
    ordem,
    ativo: true,
    criadoEm: now,
    atualizadoEm: now,
  };
}

const client = new MongoClient(uri);
try {
  await client.connect();
  const col = client.db(dbName).collection("servicos");
  const existentes = await col.find({ slug: "extras" }, { projection: { _id: 0 } }).toArray();
  console.log(`BD: ${client.db(dbName).databaseName} · extras existentes: ${existentes.length}`);
  for (const e of existentes) console.log(`  - ${e.titulo} (${e.precoBase}€)`);

  let ordem = existentes.length;
  const novos = [];
  for (const extra of EXTRAS) {
    const alvo = norm(extra.titulo);
    const jaExiste = existentes.some((e) => {
      const t = norm(e.titulo ?? "");
      return t.includes(alvo) || (t.length > 0 && alvo.includes(t));
    });
    if (jaExiste) {
      console.log(`SKIP  ${extra.titulo} — já existe uma linha com este título`);
      continue;
    }
    novos.push(doc(extra, ordem));
    ordem += 1;
    const un = extra.precoTipo === "percent" ? "%" : "€";
    console.log(`NOVO  ${extra.titulo} — ${extra.precoBase}${un}`);
  }

  if (novos.length === 0) {
    console.log("Nada a fazer.");
  } else if (!APPLY) {
    console.log(`\nDry-run: ${novos.length} linha(s) por criar. Corre com --apply para escrever.`);
  } else {
    await col.insertMany(novos);
    console.log(`\n${novos.length} linha(s) criada(s).`);
  }
} finally {
  await client.close();
}
