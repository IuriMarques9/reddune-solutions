/**
 * preco-tokens — interpolação de preços da DB em texto de conteúdo.
 *
 * Sintaxe nos content JSON: `{{preco:<label>|<fallback>}}`. O label liga ao
 * serviço da DB cujo título o contenha (mesma regra de match das stats em
 * /servicos/[slug]) e o token é substituído pelo mínimo real ("25€", "0,80€").
 * Sem match — linha apagada no painel, DB em baixo — fica o fallback do
 * ficheiro, nunca um token cru no site.
 *
 * As linhas `ativo:false` CONTAM para os tokens: é assim que um extra
 * (urgência, deslocação) alimenta o texto sem aparecer na tabela pública.
 */

import type { Locale, Servico } from "@/types/servico";
import { servicoTitulo } from "@/types/servico";

const TOKEN_RE = /\{\{preco:([^|{}]+)\|([^{}]+)\}\}/g;

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

function fmtPreco(n: number, locale: Locale): string {
  if (Number.isInteger(n)) return `${n}€`;
  const dec = n.toFixed(2);
  return `${locale === "pt" ? dec.replace(".", ",") : dec}€`;
}

export function interpolaPrecoTokens(
  text: string,
  servicos: Servico[],
  locale: Locale,
): string {
  return text.replace(TOKEN_RE, (_m, label: string, fallback: string) => {
    const alvo = norm(label.trim());
    const match = servicos.find(
      (s) =>
        norm(servicoTitulo(s, "pt")).includes(alvo) ||
        norm(servicoTitulo(s, "en")).includes(alvo),
    );
    if (!match) return fallback;
    const precos = [
      ...(typeof match.precoBase === "number" ? [match.precoBase] : []),
      ...(match.variantes ?? [])
        .map((v) => v.preco)
        .filter((p): p is number => typeof p === "number"),
    ];
    if (precos.length === 0) return fallback;
    return fmtPreco(Math.min(...precos), locale);
  });
}
