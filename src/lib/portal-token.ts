import { randomBytes, createHash, createCipheriv, createDecipheriv } from "node:crypto";

// Token do portal: bearer secret que abre /p/[token]. Na BD ficam DUAS formas:
//   • tokenHash — SHA-256, é o que resolve o pedido (comparação, nunca reversão);
//   • tokenEnc  — AES-256-GCM com a chave de env PORTAL_TOKEN_KEY, para o painel
//     poder voltar a mostrar o link ao Iuri sempre que precisar.
// Sem a chave de env, um dump da BD não abre portal nenhum.
export function generatePortalToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashPortalToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Mesma forma dos tokens gerados (32B base64url) — sanidade pós-decifra. */
const TOKEN_RE = /^[A-Za-z0-9_-]{20,128}$/;

function getKey(): Buffer | null {
  const raw = process.env.PORTAL_TOKEN_KEY;
  if (!raw) return null;
  const key = Buffer.from(raw.trim(), "base64");
  // AES-256 = 32 bytes exactos. Chave malformada trata-se como "não configurada"
  // (fail-soft: o portal continua a funcionar, só não se mostra o link outra vez).
  return key.length === 32 ? key : null;
}

/** true quando PORTAL_TOKEN_KEY está presente e válida. */
export function portalCryptoConfigurado(): boolean {
  return getKey() !== null;
}

/** Cifra o token para guardar na BD. null = sem chave configurada. */
export function encryptPortalToken(token: string): string | null {
  const key = getKey();
  if (!key) return null;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return [
    "v1",
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    ct.toString("base64url"),
  ].join(".");
}

/**
 * Decifra o token guardado. null em qualquer falha (sem chave, formato errado,
 * chave trocada, valor adulterado) — quem chama trata como "link não recuperável".
 */
export function decryptPortalToken(enc: string | null | undefined): string | null {
  if (typeof enc !== "string" || enc.length === 0) return null;
  const key = getKey();
  if (!key) return null;

  const [versao, ivB64, tagB64, ctB64] = enc.split(".");
  if (versao !== "v1" || !ivB64 || !tagB64 || !ctB64) return null;

  try {
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64url"));
    decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
    const out = Buffer.concat([
      decipher.update(Buffer.from(ctB64, "base64url")),
      decipher.final(),
    ]);
    const token = out.toString("utf8");
    return TOKEN_RE.test(token) ? token : null;
  } catch {
    return null;
  }
}
