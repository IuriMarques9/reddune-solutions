import { describe, expect, it } from "vitest";
import {
  interpolaPrecoTokens,
  labelTokenSugerido,
  tokenSugerido,
} from "./preco-tokens";
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

  it("linha do grupo extras alimenta o token", () => {
    const urgencia = servico({
      slug: "extras",
      titulo: "Taxa de urgência (<48h)",
      precoBase: 25,
    });
    expect(interpolaPrecoTokens("{{preco:urgência|99€}}", [urgencia], "pt")).toBe(
      "25€",
    );
  });

  it("linha da categoria ganha ao extra com o mesmo nome", () => {
    // A página monta as fontes por prioridade: linhas do slug, extras a seguir.
    const daCategoria = servico({ titulo: "Taxa de urgência", precoBase: 40 });
    const oExtra = servico({
      slug: "extras",
      titulo: "Taxa de urgência (<48h)",
      precoBase: 25,
    });
    expect(
      interpolaPrecoTokens("{{preco:urgência|99€}}", [daCategoria, oExtra], "pt"),
    ).toBe("40€");
  });
});

describe("labelTokenSugerido", () => {
  it("escolhe a palavra mais distintiva do título", () => {
    expect(labelTokenSugerido("Taxa de urgência (<48h)")).toBe("urgência");
    expect(labelTokenSugerido("Deslocação ao domicílio")).toBe("Deslocação");
  });

  it("estica o label quando outra linha tem a mesma palavra", () => {
    expect(
      labelTokenSugerido("Taxa de urgência web", ["Taxa de urgência (<48h)"]),
    ).toBe("urgência web");
  });

  it("sem colisão fica só a palavra", () => {
    expect(
      labelTokenSugerido("Taxa de urgência web", ["Deslocação ao domicílio"]),
    ).toBe("urgência");
  });

  it("título vazio não rebenta", () => {
    expect(labelTokenSugerido("   ")).toBe("");
  });
});

describe("percentagem (precoTipo)", () => {
  const URGENCIA_WEB = servico({
    slug: "extras",
    titulo: "Taxa de urgência web",
    precoBase: 25,
    precoTipo: "percent",
  });

  it("token de linha percent renderiza % em vez de €", () => {
    expect(
      interpolaPrecoTokens("{{preco:urgência web|20%}}", [URGENCIA_WEB], "pt"),
    ).toBe("25%");
  });

  it("as duas urgências convivem: € para assistência, % para web", () => {
    const urgencia48 = servico({
      slug: "extras",
      titulo: "Taxa de urgência (<48h)",
      precoBase: 25,
      ordem: 0,
    });
    const fontes = [urgencia48, { ...URGENCIA_WEB, ordem: 2 }];
    expect(interpolaPrecoTokens("{{preco:urgência|x}}", fontes, "pt")).toBe("25€");
    expect(interpolaPrecoTokens("{{preco:urgência web|x}}", fontes, "pt")).toBe("25%");
  });

  it("tokenSugerido com percent escreve o fallback em %", () => {
    expect(
      tokenSugerido("Taxa de urgência web", 25, "pt", "percent", [
        "Taxa de urgência (<48h)",
      ]),
    ).toBe("{{preco:urgência web|25%}}");
  });
});

describe("tokenSugerido", () => {
  it("volta a resolver para o mesmo preço que o gerou", () => {
    const token = tokenSugerido("Taxa de urgência (<48h)", 25, "pt");
    expect(token).toBe("{{preco:urgência|25€}}");
    const linha = servico({
      slug: "extras",
      titulo: "Taxa de urgência (<48h)",
      precoBase: 25,
    });
    expect(interpolaPrecoTokens(token, [linha], "pt")).toBe("25€");
  });

  it("decimais seguem o locale", () => {
    expect(tokenSugerido("Deslocação ao domicílio", 0.8, "pt")).toBe(
      "{{preco:Deslocação|0,80€}}",
    );
    expect(tokenSugerido("Deslocação ao domicílio", 0.8, "en")).toBe(
      "{{preco:Deslocação|0.80€}}",
    );
  });

  it("sem preço fica um travessão à espera do valor", () => {
    expect(tokenSugerido("Extra novo", null, "pt")).toBe("{{preco:Extra|—}}");
  });
});
