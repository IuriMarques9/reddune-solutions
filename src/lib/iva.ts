/**
 * IVA — a RedDune regista SEMPRE preços base s/ IVA (regra do CLAUDE.md: loja
 * com sufixo "+ IVA", JSON-LD `valueAddedTaxIncluded: false`). As linhas e o
 * `valorEstimado` de um projecto continuam a ser a BASE; o IVA nunca é gravado
 * lá dentro.
 *
 * Dois flags, propositadamente separados:
 *  - `Projeto.comIva`   — o orçamento deste cliente leva IVA por cima.
 *  - `Pagamento.comIva` — aquele recibo em concreto levou IVA. Herda o default
 *    do projecto ao registar, mas pode divergir: o mesmo projecto pode ter
 *    parte passada com IVA e parte sem.
 *
 * `Pagamento.valor` é sempre o BRUTO — o que o cliente entregou de facto. Por
 * isso a dívida compara bruto contra bruto (total a cobrar − soma dos
 * pagamentos) e fecha mesmo com pagamentos mistos.
 *
 * Taxa fixa a 23% (continente/Algarve) por decisão do Iuri: sem campo no form,
 * sem hipótese de enganos. Se a taxa legal mudar, muda-se esta linha — e muda
 * retroactivamente os projectos antigos, que é o trade-off aceite.
 */

import type { ProjetoLinha } from "@/types/projeto";

export const IVA_TAXA = 0.23;
export const IVA_LABEL = `IVA ${Math.round(IVA_TAXA * 100)}%`;

/** Arredonda a cêntimos — evita 1229,9999999 em somas de floats. */
export function cents(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Base s/ IVA -> o que o cliente paga. */
export function comIva(base: number, aplicar: boolean | null | undefined): number {
  return cents(aplicar ? base * (1 + IVA_TAXA) : base);
}

/** Valor bruto -> base s/ IVA. */
export function semIva(bruto: number, temIva: boolean | null | undefined): number {
  return cents(temIva ? bruto / (1 + IVA_TAXA) : bruto);
}

/** Parcela de IVA contida num valor bruto (0 quando não leva). */
export function parcelaIva(bruto: number, temIva: boolean | null | undefined): number {
  return temIva ? cents(bruto - semIva(bruto, true)) : 0;
}

/**
 * Fonte do orçamento aceite em qualquer sítio: o projecto inteiro ou só o
 * resumo leve (`ProjetoResumo`, sem linhas) das listas e badges.
 */
export type ProjetoValores = {
  valorEstimado: number | null;
  comIva?: boolean;
  linhas?: ProjetoLinha[] | null;
};

/**
 * Total a cobrar ao cliente a partir do `valorEstimado` guardado — a fonte que
 * o painel já usava em todo o lado (listas, dívidas, badges). Deliberadamente
 * NÃO olha para as linhas: manter a mesma base evita mudar números de
 * projectos cujo `valorEstimado` esteja dessincronizado das linhas.
 */
export function totalACobrar(projeto: ProjetoValores): number | null {
  return projeto.valorEstimado == null ? null : comIva(projeto.valorEstimado, projeto.comIva);
}

/**
 * Base s/ IVA do orçamento com a regra do PORTAL: com linhas vem da SOMA delas
 * (bate sempre com os subtotais mostrados ao cliente); sem linhas cai no
 * `valorEstimado`. Só o portal usa isto — ver toPortalProjeto.
 */
export function orcamentoBasePortal(projeto: ProjetoValores): number | null {
  const linhas = projeto.linhas ?? [];
  if (linhas.length > 0) {
    return cents(linhas.reduce((s, l) => s + l.quantidade * l.precoUnit, 0));
  }
  return projeto.valorEstimado ?? null;
}

/** "1.234,56 €" — formato usado em todo o painel. */
export function eurIva(n: number): string {
  return n.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Valores redondos ficam inteiros ("1670"), valores com cêntimos levam SEMPRE
 * as duas casas ("2054,10", nunca "2054,1"). Sem IVA quase tudo era inteiro e
 * o `toLocaleString` cru chegava; com IVA os cêntimos passam a ser a norma e
 * uma casa só lê-se como número truncado.
 */
export function eurCompacto(n: number): string {
  return n.toLocaleString("pt-PT", {
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  });
}
