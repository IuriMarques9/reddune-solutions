/**
 * preco-tokens — interpolação de preços da DB em texto de conteúdo.
 *
 * Sintaxe nos content JSON: `{{preco:<label>|<fallback>}}`. O label liga ao
 * serviço da DB cujo título o contenha (mesma regra de match das stats em
 * /servicos/[slug]) e o token é substituído pelo mínimo real ("25€", "0,80€").
 * Sem match — linha apagada no painel, DB em baixo — fica o fallback do
 * ficheiro, nunca um token cru no site.
 *
 * `servicos` chega já ordenado por prioridade (linhas da categoria primeiro,
 * grupo "Extras" a seguir) e o primeiro match ganha: uma categoria pode ter a
 * sua própria taxa com o mesmo nome de um extra geral.
 *
 * As linhas `ativo:false` CONTAM para os tokens: é assim que uma linha alimenta
 * o texto sem aparecer na tabela pública. Os extras nem precisam disso — o
 * grupo "extras" não tem tabela nenhuma.
 */

import type { Locale, PrecoTipo, Servico } from "@/types/servico";
import { servicoTitulo } from "@/types/servico";

const TOKEN_RE = /\{\{preco:([^|{}]+)\|([^{}]+)\}\}/g;

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

function fmtPreco(n: number, locale: Locale, tipo: PrecoTipo = "eur"): string {
  const num = Number.isInteger(n)
    ? String(n)
    : locale === "pt"
      ? n.toFixed(2).replace(".", ",")
      : n.toFixed(2);
  return tipo === "percent" ? `${num}%` : `${num}€`;
}

/**
 * Label sugerido para o token de um título: a palavra mais longa
 * ("Taxa de urgência (<48h)" → "urgência"). O match é `título.includes(label)`,
 * por isso a palavra mais distintiva é a que menos apanha linhas por engano.
 */
export function labelTokenSugerido(
  titulo: string,
  outrosTitulos: string[] = [],
): string {
  const t = titulo.trim();
  const palavras = t.replace(/[()<>]/g, " ").split(/\s+/).filter(Boolean);
  if (palavras.length === 0) return "";
  const base = palavras.reduce((a, b) => (b.length > a.length ? b : a));
  // Se outra linha também contém a palavra ("urgência" apanha a taxa <48h E a
  // web), estende o label até ao fim do título ("urgência web") — continua a
  // ser substring contígua do título, que é o que o match exige.
  const colide = (label: string) =>
    outrosTitulos.some((o) => norm(o).includes(norm(label)));
  if (!colide(base)) return base;
  const i = t.toLowerCase().indexOf(base.toLowerCase());
  if (i < 0) return base;
  const cauda = t.slice(i).trim();
  return cauda && !colide(cauda) ? cauda : base;
}

/**
 * Token pronto a colar num content JSON, com o preço actual já escrito como
 * fallback. Inverso de `interpolaPrecoTokens`: o que sai daqui volta a resolver
 * para o mesmo número enquanto a linha existir na DB.
 */
export function tokenSugerido(
  titulo: string,
  precoMin: number | null,
  locale: Locale,
  tipo: PrecoTipo = "eur",
  outrosTitulos: string[] = [],
): string {
  const label = labelTokenSugerido(titulo.trim(), outrosTitulos) || "titulo";
  const fallback = precoMin == null ? "—" : fmtPreco(precoMin, locale, tipo);
  return `{{preco:${label}|${fallback}}}`;
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
    return fmtPreco(Math.min(...precos), locale, match.precoTipo ?? "eur");
  });
}
