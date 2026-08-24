import { describe, expect, it } from "vitest";
import { interpolaPrecoTokens } from "./preco-tokens";
import type { Servico } from "@/types/servico";

function servico(partial: Partial<Servico>): Servico {
  return {
    id: "x",
    slug: "assistencia-tecnica",
    titulo: "Serviço",
    descricao: null,
    precoBase: null,
    precoMax: null,
    precoDesde: false,
    variantes: null,
    precoTexto: null,
    nota: null,
    imageUrl: null,
    ordem: 0,
    ativo: true,
    criadoEm: "",
    atualizadoEm: "",
    ...partial,
  };
}

const DIAGNOSTICO = servico({ titulo: "Diagnóstico de Avaria", precoBase: 25 });
const DESLOCACAO = servico({
  titulo: "Deslocação ao domicílio",
  precoBase: 0.8,
  ativo: false,
});

describe("interpolaPrecoTokens", () => {
  it("substitui o token pelo preço mínimo da DB", () => {
    expect(
      interpolaPrecoTokens(
        "O diagnóstico ({{preco:diagnóstico|99€}}) é abatido.",
        [DIAGNOSTICO],
        "pt",
      ),
    ).toBe("O diagnóstico (25€) é abatido.");
  });

  it("match insensível a acentos, nos dois sentidos do i18n", () => {
    expect(
      interpolaPrecoTokens("{{preco:diagnostico|99€}}", [DIAGNOSTICO], "pt"),
    ).toBe("25€");
  });

  it("linha inactiva alimenta tokens na mesma", () => {
    expect(
      interpolaPrecoTokens("{{preco:deslocação|9€}}/km", [DESLOCACAO], "pt"),
    ).toBe("0,80€/km");
  });

  it("decimais: vírgula em pt, ponto em en", () => {
    expect(interpolaPrecoTokens("{{preco:deslocação|x}}", [DESLOCACAO], "en")).toBe(
      "0.80€",
    );
  });

  it("sem match fica o fallback do ficheiro", () => {
    expect(
      interpolaPrecoTokens("Taxa de {{preco:urgência|25€}}.", [DIAGNOSTICO], "pt"),
    ).toBe("Taxa de 25€.");
  });

  it("match sem preço nenhum fica o fallback", () => {
    const semPreco = servico({ titulo: "Recuperação de dados" });
    expect(
      interpolaPrecoTokens("{{preco:recuperação|sob consulta}}", [semPreco], "pt"),
    ).toBe("sob consulta");
  });

  it("usa o mínimo entre precoBase e variantes", () => {
    const s = servico({
      titulo: "Limpeza",
      precoBase: 35,
      variantes: [
        { label: "Desktop", preco: 20 },
        { label: "Portátil", preco: 25 },
      ],
    });
    expect(interpolaPrecoTokens("{{preco:limpeza|x}}", [s], "pt")).toBe("20€");
  });

  it("vários tokens na mesma string; texto sem tokens fica intacto", () => {
    expect(
      interpolaPrecoTokens(
        "A: {{preco:diagnóstico|9€}} · B: {{preco:deslocação|9€}}/km",
        [DIAGNOSTICO, DESLOCACAO],
        "pt",
      ),
    ).toBe("A: 25€ · B: 0,80€/km");
    expect(interpolaPrecoTokens("Sem tokens.", [DIAGNOSTICO], "pt")).toBe(
      "Sem tokens.",
    );
  });

  it("match pelo título EN quando existe tituloI18n", () => {
    const s = servico({
      titulo: "Deslocação ao domicílio",
      tituloI18n: { pt: "Deslocação ao domicílio", en: "On-site call-out" },
      precoBase: 0.8,
    });
    expect(interpolaPrecoTokens("{{preco:call-out|x}}", [s], "en")).toBe("0.80€");
  });
});
