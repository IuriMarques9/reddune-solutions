import { describe, it, expect } from "vitest";
import { projetoInputSchema } from "./validation-projeto";

/**
 * Contrato do upsert parcial (/api/projetos/upsert): campo AUSENTE no payload
 * tem de sair do parse como `undefined` (a rota preserva o valor existente);
 * `null`/"" explícitos apagam. O bug: transforms/preprocess no schema
 * convertiam ausente→null, e um "Guardar custos" (payload só com
 * id/titulo/status/linhas) apagava cliente, tipo, categoria, próxima acção
 * e local do projecto.
 */
describe("projetoInputSchema — merge parcial", () => {
  const parcialCustos = {
    id: "p1",
    titulo: "Projecto X",
    status: "proximo",
    linhas: [],
    valorEstimado: 0,
  };

  it("campos ausentes ficam undefined (preservados pela rota)", () => {
    const parsed = projetoInputSchema.parse(parcialCustos);
    expect(parsed.clienteId).toBeUndefined();
    expect(parsed.clienteNome).toBeUndefined();
    expect(parsed.categoria).toBeUndefined();
    expect(parsed.tipo).toBeUndefined();
    expect(parsed.proximaAccao).toBeUndefined();
    expect(parsed.local).toBeUndefined();
  });

  it("null explícito continua a apagar", () => {
    const parsed = projetoInputSchema.parse({
      ...parcialCustos,
      clienteId: null,
    });
    expect(parsed.clienteId).toBeNull();
  });

  it('"" nos selects (categoria/tipo/local) limpa para null', () => {
    const parsed = projetoInputSchema.parse({
      ...parcialCustos,
      categoria: "",
      tipo: "",
      local: "",
    });
    expect(parsed.categoria).toBeNull();
    expect(parsed.tipo).toBeNull();
    expect(parsed.local).toBeNull();
  });

  it("valores presentes passam intactos", () => {
    const parsed = projetoInputSchema.parse({
      ...parcialCustos,
      clienteId: "c9",
      clienteNome: "Bruna",
    });
    expect(parsed.clienteId).toBe("c9");
    expect(parsed.clienteNome).toBe("Bruna");
  });

  it("ficha de hardware aceita componentes e rejeita tipos inventados", () => {
    const comHardware = {
      ...parcialCustos,
      hardware: {
        marca: "Custom",
        componentes: [
          { id: "hw1", tipo: "cpu", descricao: "Ryzen 5 5600", serial: "ABC123" },
          { id: "hw2", tipo: "ram", descricao: "2x8GB DDR4", serial: null, nosso: true },
        ],
      },
    };
    const parsed = projetoInputSchema.parse(comHardware);
    expect(parsed.hardware?.componentes).toHaveLength(2);
    expect(parsed.hardware?.componentes?.[1]).toMatchObject({ tipo: "ram", nosso: true });

    const invalido = {
      ...parcialCustos,
      hardware: { componentes: [{ id: "x", tipo: "teletransporte", descricao: "?" }] },
    };
    expect(projetoInputSchema.safeParse(invalido).success).toBe(false);
  });
});
