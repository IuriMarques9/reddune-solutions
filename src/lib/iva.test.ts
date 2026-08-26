import { describe, it, expect } from "vitest";
import {
  IVA_TAXA,
  cents,
  comIva,
  semIva,
  parcelaIva,
  totalACobrar,
  orcamentoBasePortal,
  eurCompacto,
} from "./iva";

describe("iva", () => {
  it("taxa fixa a 23% (continente/Algarve)", () => {
    expect(IVA_TAXA).toBe(0.23);
  });

  it("comIva acrescenta a taxa à base; sem flag devolve a base", () => {
    expect(comIva(1000, true)).toBe(1230);
    expect(comIva(1000, false)).toBe(1000);
    expect(comIva(1000, undefined)).toBe(1000);
  });

  it("caso AppTrakinas: 366,67 s/ IVA = 451,00 c/ IVA", () => {
    expect(comIva(366.67, true)).toBe(451);
  });

  it("semIva desfaz comIva (ida e volta arredondada a cêntimos)", () => {
    expect(semIva(451, true)).toBe(366.67);
    expect(semIva(451, false)).toBe(451);
    expect(comIva(semIva(1230, true), true)).toBe(1230);
  });

  it("parcelaIva é 0 quando o valor não leva IVA", () => {
    expect(parcelaIva(1230, true)).toBe(230);
    expect(parcelaIva(1230, false)).toBe(0);
  });

  it("cents arredonda ruído de floats", () => {
    expect(cents(0.1 + 0.2)).toBe(0.3);
    expect(cents(366.67 * 1.23)).toBe(451);
  });

  it("totalACobrar sai do valorEstimado e IGNORA as linhas", () => {
    const linhas = [{ id: "l1", descricao: "x", categoria: "peca" as const, quantidade: 1, precoUnit: 999 }];
    expect(totalACobrar({ valorEstimado: 100, comIva: true, linhas })).toBe(123);
    expect(totalACobrar({ valorEstimado: 100, comIva: false, linhas })).toBe(100);
    expect(totalACobrar({ valorEstimado: null, comIva: true })).toBeNull();
  });

  it("orcamentoBasePortal prefere a soma das linhas (regra do portal)", () => {
    const linhas = [
      { id: "l1", descricao: "x", categoria: "peca" as const, quantidade: 2, precoUnit: 100 },
      { id: "l2", descricao: "y", categoria: "mao-obra" as const, quantidade: 1, precoUnit: 150 },
    ];
    expect(orcamentoBasePortal({ valorEstimado: 999, linhas })).toBe(350);
    expect(orcamentoBasePortal({ valorEstimado: 999, linhas: [] })).toBe(999);
    expect(orcamentoBasePortal({ valorEstimado: null, linhas: null })).toBeNull();
  });

  // Rede de segurança do 2026-08-26: TODOS os projectos existentes foram feitos
  // sem IVA e nenhum tem o campo `comIva` gravado. Estas asserções garantem que
  // o código novo é a IDENTIDADE para esses dados — nenhum número muda.
  it("dados antigos (sem campo comIva) passam intactos", () => {
    const legado = { valorEstimado: 366.67 } as { valorEstimado: number; comIva?: boolean };
    expect(legado.comIva).toBeUndefined();
    expect(totalACobrar(legado)).toBe(366.67);
    expect(comIva(366.67, legado.comIva)).toBe(366.67);
    expect(semIva(366.67, legado.comIva)).toBe(366.67);
    expect(parcelaIva(366.67, legado.comIva)).toBe(0);
  });

  it("com o flag a false o resultado é igual ao de não existir", () => {
    for (const v of [0, 1, 99.99, 366.67, 1234.5, 45000]) {
      expect(comIva(v, false)).toBe(comIva(v, undefined));
      expect(semIva(v, false)).toBe(semIva(v, undefined));
      expect(parcelaIva(v, false)).toBe(parcelaIva(v, undefined));
      // E, mais importante: não mexe no valor.
      expect(comIva(v, false)).toBe(v);
      expect(semIva(v, false)).toBe(v);
    }
  });
  // 1670 x 1,23 = 2054,10 -> "2054,1" lia-se como numero truncado.
  it("eurCompacto: inteiros sem casas, cêntimos sempre com duas", () => {
    expect(eurCompacto(1670)).toBe("1670");
    expect(eurCompacto(2054.1)).toBe("2054,10");
    expect(eurCompacto(-1233.92)).toBe("-1233,92");
    expect(eurCompacto(0)).toBe("0");
  });
});
