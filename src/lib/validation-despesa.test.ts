import { describe, it, expect } from "vitest";
import { despesaInputSchema } from "./validation-despesa";

/**
 * Contrato do upsert de despesas (/api/despesas/upsert). O par
 * `mensalidadeId`+`cobrancaNumero` é a ligação da despesa à cobrança do plano
 * que ela fecha — carga estrutural, não campo de utilizador. AUSENTE tem de sair
 * do parse como `undefined` (a rota preserva o que está na BD); só `null`
 * explícito apaga. Um `.transform((v) => v ?? null)` nestes dois campos torna as
 * duas intenções indistinguíveis e uma edição que não os reenviasse reabria a
 * prestação na ficha do projecto, no calendário, no cron e no sino. É o mesmo
 * bug que validation-projeto.test.ts já blinda nos projectos.
 */
describe("despesaInputSchema — ligação ao plano", () => {
  const manual = {
    descricao: "Domínio reddune.pt",
    categoria: "dominios",
    valor: 14.9,
    data: "2026-09-01",
  };

  it("editar sem reenviar o par do plano não o apaga — sai undefined, a rota herda", () => {
    const parsed = despesaInputSchema.parse({ ...manual, id: "d1" });
    expect(parsed.mensalidadeId).toBeUndefined();
    expect(parsed.cobrancaNumero).toBeUndefined();
    // A rota decide por `=== undefined`: as chaves nem podem chegar ao objecto.
    expect("mensalidadeId" in parsed).toBe(false);
    expect("cobrancaNumero" in parsed).toBe(false);
  });

  it("null explícito desliga mesmo a despesa da cobrança", () => {
    const parsed = despesaInputSchema.parse({
      ...manual,
      mensalidadeId: null,
      cobrancaNumero: null,
    });
    expect(parsed.mensalidadeId).toBeNull();
    expect(parsed.cobrancaNumero).toBeNull();
  });

  it("o par que o form transporta chega intacto ao servidor", () => {
    const parsed = despesaInputSchema.parse({
      ...manual,
      mensalidadeId: "m7",
      cobrancaNumero: 3,
    });
    expect(parsed.mensalidadeId).toBe("m7");
    expect(parsed.cobrancaNumero).toBe(3);
  });

  it("não existe cobrança 0 nem 121 — nenhum plano as gera", () => {
    expect(despesaInputSchema.safeParse({ ...manual, cobrancaNumero: 0 }).success).toBe(false);
    expect(despesaInputSchema.safeParse({ ...manual, cobrancaNumero: 121 }).success).toBe(false);
    expect(despesaInputSchema.safeParse({ ...manual, cobrancaNumero: 1 }).success).toBe(true);
    expect(despesaInputSchema.safeParse({ ...manual, cobrancaNumero: 120 }).success).toBe(true);
  });

  it("projetoId/colaboradorId/notas ausentes ficam null — o form envia-os sempre", () => {
    const parsed = despesaInputSchema.parse(manual);
    expect(parsed.projetoId).toBeNull();
    expect(parsed.colaboradorId).toBeNull();
    expect(parsed.notas).toBeNull();
  });

  it("sem id a rota cria; com id edita a despesa daquele id", () => {
    expect(despesaInputSchema.parse(manual).id).toBeUndefined();
    expect(despesaInputSchema.parse({ ...manual, id: "d1" }).id).toBe("d1");
  });

  it("criadoEm não vem do form — nasce no servidor, ou herda-se do existente", () => {
    expect(despesaInputSchema.parse(manual).criadoEm).toBeUndefined();
    expect(
      despesaInputSchema.parse({ ...manual, criadoEm: "2026-08-30T10:00:00.000Z" }).criadoEm,
    ).toBe("2026-08-30T10:00:00.000Z");
  });

  it("uma despesa sem descrição, categoria, valor ou data não entra — não há PATCH parcial", () => {
    for (const campo of ["descricao", "categoria", "valor", "data"] as const) {
      const semCampo = { ...manual };
      delete semCampo[campo as keyof typeof semCampo];
      expect(despesaInputSchema.safeParse(semCampo).success).toBe(false);
    }
    expect(despesaInputSchema.safeParse({ ...manual, descricao: "" }).success).toBe(false);
  });

  it("categoria inventada não entra — os relatórios agrupam pelo enum", () => {
    expect(despesaInputSchema.safeParse({ ...manual, categoria: "gasolina" }).success).toBe(false);
    expect(despesaInputSchema.safeParse({ ...manual, categoria: "colaboradores" }).success).toBe(true);
  });
});
