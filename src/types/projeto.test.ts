import { describe, it, expect } from "vitest";
import { firstBaseTipo, hardwareTemDados } from "@/types/projeto";
import { projetoInputSchema } from "@/lib/validation-projeto";

/**
 * REGRESSÃO: criar um tipo personalizado nas Definições e escolhê-lo sozinho
 * num projecto dava 400 "Invalid payload" — o form mandava `tipo: tipos[0]`,
 * que caía no z.enum(PROJETO_TIPO) do schema. `tipo` só leva slugs base;
 * o slug personalizado vive em `tipos`.
 */
describe("firstBaseTipo", () => {
  it("ignora slugs personalizados", () => {
    expect(firstBaseTipo(["instalacao-de-so"])).toBeNull();
    expect(firstBaseTipo(["instalacao-de-so", "reparacao"])).toBe("reparacao");
  });

  it("devolve o primeiro base pela ordem da selecção", () => {
    expect(firstBaseTipo(["web", "app"])).toBe("web");
  });

  it("aceita tipos base sem categoria (intermediacao/outro)", () => {
    expect(firstBaseTipo(["outro"])).toBe("outro");
  });

  it("vazio/null → null", () => {
    expect(firstBaseTipo([])).toBeNull();
    expect(firstBaseTipo(null)).toBeNull();
    expect(firstBaseTipo(undefined)).toBeNull();
  });

  it("não confunde chaves do Object.prototype com tipos base", () => {
    expect(firstBaseTipo(["constructor"])).toBeNull();
    expect(firstBaseTipo(["toString"])).toBeNull();
  });
});

/**
 * `hardwareTemDados` decide se a ficha de hardware conta como preenchida —
 * abre a secção no projecto e mete o projecto na vista "Equipamentos" do
 * cliente. Docs antigos podem trazer strings vazias/whitespace.
 */
describe("hardwareTemDados", () => {
  it("null/undefined/objecto vazio → false", () => {
    expect(hardwareTemDados(null)).toBe(false);
    expect(hardwareTemDados(undefined)).toBe(false);
    expect(hardwareTemDados({})).toBe(false);
  });

  it("whitespace não conta como dado", () => {
    expect(hardwareTemDados({ marca: "  ", modelo: "\t", serial: "" })).toBe(false);
  });

  it("qualquer campo de topo conta", () => {
    expect(hardwareTemDados({ marca: "Asus" })).toBe(true);
    expect(hardwareTemDados({ serial: "SN123" })).toBe(true);
    expect(hardwareTemDados({ acessoriosEntregues: "carregador" })).toBe(true);
  });

  it("componentes contam mesmo sem campos de topo", () => {
    expect(
      hardwareTemDados({ componentes: [{ id: "hw_1", tipo: "cpu", descricao: "Ryzen 5 5600" }] })
    ).toBe(true);
  });
});

describe("payload do ProjetoForm com tipo personalizado", () => {
  it("passa no schema do upsert quando `tipo` vem de firstBaseTipo", () => {
    const tipos = ["instalacao-de-so"];
    const parsed = projetoInputSchema.safeParse({
      titulo: "Instalação de SO — Cliente X",
      status: "proximo",
      tipo: firstBaseTipo(tipos),
      tipos,
    });
    expect(parsed.success).toBe(true);
  });

  it("o slug personalizado em `tipo` é que rebentava (comportamento antigo)", () => {
    const parsed = projetoInputSchema.safeParse({
      titulo: "Instalação de SO — Cliente X",
      status: "proximo",
      tipo: "instalacao-de-so",
      tipos: ["instalacao-de-so"],
    });
    expect(parsed.success).toBe(false);
  });
});
