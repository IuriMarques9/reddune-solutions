import { describe, it, expect } from "vitest";
import { firstBaseTipo } from "@/types/projeto";
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
