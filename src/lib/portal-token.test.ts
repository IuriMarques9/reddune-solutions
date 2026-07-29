import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { randomBytes } from "node:crypto";
import {
  generatePortalToken,
  hashPortalToken,
  encryptPortalToken,
  decryptPortalToken,
  portalCryptoConfigurado,
} from "./portal-token";

describe("portal-token", () => {
  it("gera tokens URL-safe com entropia suficiente", () => {
    const t = generatePortalToken();
    expect(t).toMatch(/^[A-Za-z0-9_-]{43}$/); // 32 bytes base64url
    expect(generatePortalToken()).not.toBe(t);
  });

  it("hash determinístico sha256 hex", () => {
    const h = hashPortalToken("abc");
    expect(h).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    expect(hashPortalToken("abc")).toBe(h);
  });
});

describe("portal-token cifra (PORTAL_TOKEN_KEY)", () => {
  const KEY = randomBytes(32).toString("base64");
  const original = process.env.PORTAL_TOKEN_KEY;

  beforeEach(() => {
    process.env.PORTAL_TOKEN_KEY = KEY;
  });
  afterEach(() => {
    if (original === undefined) delete process.env.PORTAL_TOKEN_KEY;
    else process.env.PORTAL_TOKEN_KEY = original;
  });

  it("ida e volta devolve o token original", () => {
    const t = generatePortalToken();
    const enc = encryptPortalToken(t)!;
    expect(enc).toMatch(/^v1\./);
    expect(enc).not.toContain(t); // nunca em claro
    expect(decryptPortalToken(enc)).toBe(t);
  });

  it("cifra duas vezes dá resultados diferentes (IV aleatório)", () => {
    const t = generatePortalToken();
    expect(encryptPortalToken(t)).not.toBe(encryptPortalToken(t));
  });

  it("chave diferente não decifra", () => {
    const enc = encryptPortalToken(generatePortalToken())!;
    process.env.PORTAL_TOKEN_KEY = randomBytes(32).toString("base64");
    expect(decryptPortalToken(enc)).toBeNull();
  });

  it("valor adulterado não decifra (auth tag GCM)", () => {
    const enc = encryptPortalToken(generatePortalToken())!;
    const partes = enc.split(".");
    partes[3] = Buffer.from("outra-coisa").toString("base64url");
    expect(decryptPortalToken(partes.join("."))).toBeNull();
  });

  it("formato inválido devolve null em vez de rebentar", () => {
    for (const v of [null, undefined, "", "lixo", "v2.a.b.c", "v1.a.b"]) {
      expect(decryptPortalToken(v)).toBeNull();
    }
  });

  it("sem chave: não cifra nem decifra, mas não rebenta", () => {
    const enc = encryptPortalToken(generatePortalToken())!;
    delete process.env.PORTAL_TOKEN_KEY;
    expect(portalCryptoConfigurado()).toBe(false);
    expect(encryptPortalToken("abc")).toBeNull();
    expect(decryptPortalToken(enc)).toBeNull();
  });

  it("chave com tamanho errado conta como não configurada", () => {
    process.env.PORTAL_TOKEN_KEY = randomBytes(16).toString("base64");
    expect(portalCryptoConfigurado()).toBe(false);
    expect(encryptPortalToken("abc")).toBeNull();
  });
});
