/**
 * Gera (ou verifica) o hash bcrypt da password do painel (AUTH_PASSWORD_HASH).
 *
 * Como correr:
 *   node scripts/auth-hash.mjs               → pede a password e imprime o hash
 *   node scripts/auth-hash.mjs --verificar   → testa uma password contra um hash
 *
 * Tudo é pedido interativamente (nada fica no histórico da shell) e a password
 * nunca é mostrada no ecrã. O hash gerado cola-se na Vercel em Settings →
 * Environment Variables → AUTH_PASSWORD_HASH — SEMPRE pelo dashboard, nunca
 * via terminal: os "$" do hash seriam interpretados pela shell e cortavam o
 * valor. Depois de alterar a variável é preciso Redeploy: as envs só entram
 * em vigor num deploy novo.
 */
import bcrypt from "bcryptjs";
import { createInterface } from "node:readline";

// Mesmo formato validado em src/lib/auth.ts.
const BCRYPT_HASH_RE = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;
const CUSTO = 12;

const temTty = process.stdin.isTTY === true;
const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: temTty,
});

// Truque clássico para esconder input no readline: enquanto `ocultar` estiver
// ativo, cada eco de tecla escreve "*" em vez do carácter.
let ocultar = false;
if (temTty) {
  const escreveOriginal = rl._writeToOutput.bind(rl);
  rl._writeToOutput = (texto) => {
    if (!ocultar || /^[\r\n]+$/.test(texto)) return escreveOriginal(texto);
    escreveOriginal("*");
  };
}

// Fila de linhas em vez de rl.question(): com stdin em pipe as linhas chegam
// todas de seguida e as que chegassem sem pergunta pendente perdiam-se.
const filaLinhas = [];
const esperas = [];
let inputFechado = false;
rl.on("line", (linha) => {
  const espera = esperas.shift();
  if (espera) espera(linha);
  else filaLinhas.push(linha);
});
rl.on("close", () => {
  inputFechado = true;
  while (esperas.length) esperas.shift()(null);
});

function lerLinha() {
  if (filaLinhas.length) return Promise.resolve(filaLinhas.shift());
  if (inputFechado) return Promise.resolve(null);
  return new Promise((resolve) => esperas.push(resolve));
}

async function perguntar(pergunta, { oculto = false } = {}) {
  process.stdout.write(pergunta);
  ocultar = oculto && temTty;
  const resposta = await lerLinha();
  ocultar = false;
  if (oculto && temTty) process.stdout.write("\n");
  if (resposta === null) {
    console.error("\nInput terminado — cancelado.");
    process.exit(1);
  }
  return resposta;
}

function diagnosticarFormato(hash) {
  if (BCRYPT_HASH_RE.test(hash)) return true;
  console.warn(
    `\n⚠️  Isto não parece um hash bcrypt válido (comprimento ${hash.length}, esperado 60).`
  );
  if (!hash.startsWith("$2")) {
    console.warn(
      '   Um hash bcrypt começa por "$2a$", "$2b$" ou "$2y$". Se este valor foi definido' +
        '\n   via terminal, a shell provavelmente "comeu" os "$" — cola-o pelo dashboard da Vercel.'
    );
  }
  return false;
}

const modo = process.argv[2];

if (modo === "--verificar" || modo === "-v") {
  const password = await perguntar("Password a testar: ", { oculto: true });
  const hash = (
    await perguntar("Hash bcrypt (cola aqui o valor de AUTH_PASSWORD_HASH): ")
  ).trim();
  diagnosticarFormato(hash);
  const corresponde = await bcrypt.compare(password, hash);
  if (corresponde) {
    console.log("\n✅ A password CORRESPONDE a este hash.");
    console.log(
      "   Se o login continua a falhar: confirma o email em AUTH_ALLOWED_EMAILS e" +
        "\n   faz Redeploy na Vercel depois de qualquer alteração às variáveis."
    );
  } else {
    console.log("\n❌ A password NÃO corresponde a este hash.");
    console.log("   Gera um hash novo com: node scripts/auth-hash.mjs");
  }
  rl.close();
  process.exit(corresponde ? 0 : 1);
}

if (modo && modo !== "--gerar") {
  console.log(
    "Uso:\n  node scripts/auth-hash.mjs               gera um hash novo\n  node scripts/auth-hash.mjs --verificar   testa uma password contra um hash"
  );
  rl.close();
  process.exit(modo === "--help" || modo === "-h" ? 0 : 1);
}

const password = await perguntar("Nova password do painel: ", { oculto: true });
if (!password) {
  console.error("Password vazia — cancelado.");
  rl.close();
  process.exit(1);
}
if (password !== password.trim()) {
  console.warn(
    "⚠️  A password tem espaços no início/fim — vão contar como parte da password."
  );
}
if (password.length < 12) {
  console.warn(
    "⚠️  Menos de 12 caracteres — considera uma frase-passe mais longa."
  );
}
const confirmacao = await perguntar("Repete a password: ", { oculto: true });
if (password !== confirmacao) {
  console.error("As passwords não coincidem — cancelado.");
  rl.close();
  process.exit(1);
}

const hash = await bcrypt.hash(password, CUSTO);
// Autoverificação: garante que o hash impresso valida mesmo esta password.
if (!(await bcrypt.compare(password, hash))) {
  console.error("Autoverificação do hash falhou — corre o script de novo.");
  rl.close();
  process.exit(1);
}

console.log(`\nHash bcrypt (60 caracteres, autoverificado):\n\n${hash}\n`);
console.log(
  `Como aplicar na Vercel:
1. vercel.com → projeto reddune-solutions → Settings → Environment Variables
2. Edita/cria AUTH_PASSWORD_HASH e COLA o valor acima no dashboard
   (nunca via terminal — a shell interpreta os "$" e corta o hash).
3. Se existir AUTH_PASSWORD, apaga-a: o hash tem precedência e mudar
   AUTH_PASSWORD deixa de ter efeito.
4. Deployments → menu "⋯" do deploy mais recente → Redeploy.
   Sem redeploy, a variável nova NÃO entra em vigor.
5. No login usa um email presente em AUTH_ALLOWED_EMAILS.`
);
rl.close();
