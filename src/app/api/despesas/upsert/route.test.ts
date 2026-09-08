import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { auth } from "@/lib/auth";
import { getDespesaById, upsertDespesa } from "@/lib/mongodb/despesas";
import { logMutation } from "@/lib/mongodb/mutation-audit";
import type { Despesa } from "@/types/despesa";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/mongodb/despesas", () => ({ getDespesaById: vi.fn(), upsertDespesa: vi.fn() }));
vi.mock("@/lib/mongodb/mutation-audit", () => ({ logMutation: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

// A `auth` do NextAuth tem assinaturas sobrepostas; estreitá-la aqui evita
// castes em cada teste.
const sessao = vi.mocked(auth as unknown as () => Promise<{ user: { email: string } } | null>);

/** Despesa do CUSTO de um plano: é ela que fecha a cobrança 3 da mensalidade. */
function existente(p: Partial<Despesa> = {}): Despesa {
  return {
    id: "d-1",
    descricao: "Vercel Pro",
    categoria: "dominios",
    valor: 137.4,
    data: "2026-06-27",
    projetoId: "proj-1",
    colaboradorId: null,
    notas: "renovação",
    mensalidadeId: "m-1",
    cobrancaNumero: 3,
    criadoEm: "2026-06-27T09:00:00.000Z",
    ...p,
  };
}

/** O que o DespesaFormSheet envia a editar — sem o par do plano, de propósito. */
function edicao(p: Record<string, unknown> = {}) {
  return {
    id: "d-1",
    descricao: "Vercel Pro",
    categoria: "dominios",
    valor: 149,
    data: "2026-06-27",
    projetoId: "proj-1",
    colaboradorId: null,
    notas: "renovação",
    ...p,
  };
}

function pedido(body: unknown) {
  return new Request("http://test/api/despesas/upsert", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** Documento efectivamente gravado na colecção. */
function gravado(): Despesa {
  return vi.mocked(upsertDespesa).mock.calls[0][0];
}

describe("POST /api/despesas/upsert", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessao.mockResolvedValue({ user: { email: "iuri@reddune.test" } });
    vi.mocked(getDespesaById).mockResolvedValue(null);
  });

  it("recusa sem sessão", async () => {
    sessao.mockResolvedValue(null);

    const res = await POST(pedido(edicao()));

    expect(res.status).toBe(401);
    expect(upsertDespesa).not.toHaveBeenCalled();
  });

  it("com id existente grava por cima da mesma despesa e audita como update", async () => {
    const antes = existente();
    vi.mocked(getDespesaById).mockResolvedValue(antes);

    const res = await POST(pedido(edicao()));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, id: "d-1" });
    expect(gravado().id).toBe("d-1");
    expect(logMutation).toHaveBeenCalledWith(
      expect.objectContaining({ collection: "despesas", entityId: "d-1", op: "update", before: antes })
    );
  });

  // A regressão que a feature toda existe para evitar: sem preservação, a
  // prestação reabria na ficha do projecto, no calendário, no cron e no sino.
  it("editar sem reenviar o par do plano preserva a ligação à cobrança", async () => {
    vi.mocked(getDespesaById).mockResolvedValue(existente());

    await POST(pedido(edicao({ valor: 149 })));

    expect(gravado().mensalidadeId).toBe("m-1");
    expect(gravado().cobrancaNumero).toBe(3);
    expect(gravado().valor).toBe(149);
  });

  it("o par enviado explicitamente passa intacto", async () => {
    vi.mocked(getDespesaById).mockResolvedValue(existente());

    await POST(pedido(edicao({ mensalidadeId: "m-1", cobrancaNumero: 3 })));

    expect(gravado().mensalidadeId).toBe("m-1");
    expect(gravado().cobrancaNumero).toBe(3);
  });

  it("null explícito desliga a despesa do plano", async () => {
    vi.mocked(getDespesaById).mockResolvedValue(existente());

    await POST(pedido(edicao({ mensalidadeId: null, cobrancaNumero: null })));

    expect(gravado().mensalidadeId).toBeNull();
    expect(gravado().cobrancaNumero).toBeNull();
  });

  // O $setOnInsert já ignorava o valor no update, mas o snapshot do audit
  // mentia: dizia que a despesa nasceu no momento da edição.
  it("mantém o criadoEm do existente, no documento e no audit", async () => {
    vi.mocked(getDespesaById).mockResolvedValue(existente());

    await POST(pedido(edicao()));

    expect(gravado().criadoEm).toBe("2026-06-27T09:00:00.000Z");
    expect(logMutation).toHaveBeenCalledWith(
      expect.objectContaining({
        after: expect.objectContaining({ criadoEm: "2026-06-27T09:00:00.000Z" }),
      })
    );
  });

  // Gravar uma folha aberta sobre uma despesa entretanto apagada
  // ressuscitava-a, com criadoEm de agora e um audit a dizer "update".
  it("devolve 404 quando o id já não existe e não grava nada", async () => {
    vi.mocked(getDespesaById).mockResolvedValue(null);

    const res = await POST(pedido(edicao({ id: "d-apagada" })));

    expect(res.status).toBe(404);
    expect(upsertDespesa).not.toHaveBeenCalled();
    expect(logMutation).not.toHaveBeenCalled();
  });

  it("sem id gera uma despesa nova e audita como create", async () => {
    const res = await POST(
      pedido({ descricao: "Cabos HDMI", categoria: "pecas", valor: 24.9, data: "2026-09-01" })
    );

    expect(res.status).toBe(200);
    const { id } = (await res.json()) as { id: string };
    expect(id).toBeTruthy();
    expect(getDespesaById).not.toHaveBeenCalled();
    expect(gravado().id).toBe(id);
    expect(logMutation).toHaveBeenCalledWith(
      expect.objectContaining({ entityId: id, op: "create", before: null })
    );
  });

  // Deliberado (route.ts): fora da categoria "colaboradores" a referência à
  // pessoa fica pendurada e os totais dela contariam um gasto que já não é dela.
  it("mudar a categoria para fora de colaboradores limpa o colaboradorId", async () => {
    vi.mocked(getDespesaById).mockResolvedValue(
      existente({ categoria: "colaboradores", colaboradorId: "col-jaime", mensalidadeId: null, cobrancaNumero: null })
    );

    await POST(pedido(edicao({ categoria: "pecas", colaboradorId: "col-jaime" })));

    expect(gravado().colaboradorId).toBeNull();
  });
});
