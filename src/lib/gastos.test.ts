import { describe, it, expect } from "vitest";
import { collectGastos, gastoEmpresaDoProjeto, splitRepassadoEmpresa } from "@/lib/gastos";
import type { Projeto, ProjetoLinha } from "@/types/projeto";
import type { Despesa } from "@/types/despesa";

function linha(p: Partial<ProjetoLinha> & { id: string }): ProjetoLinha {
  return {
    descricao: "linha",
    categoria: "peca",
    quantidade: 1,
    precoUnit: 0,
    ...p,
  };
}

function projeto(p: Partial<Projeto> & { id: string }): Projeto {
  return {
    titulo: "Projecto",
    status: "em-curso",
    dataCriado: "2026-05-10",
    ...p,
  } as Projeto;
}

function despesa(p: Partial<Despesa> & { id: string }): Despesa {
  return {
    descricao: "despesa",
    categoria: "dominios",
    valor: 0,
    data: "2026-07-01",
    projetoId: null,
    notas: null,
    criadoEm: "2026-07-01T00:00:00.000Z",
    ...p,
  };
}

/** Total que os relatórios imputam a um projecto (soma de todos os meses). */
function totalRelatoriosDoProjeto(p: Projeto, despesas: Despesa[]): number {
  return collectGastos([p], despesas)
    .filter((e) => e.projetoId === p.id)
    .reduce((s, e) => s + e.valor, 0);
}

describe("gastoEmpresaDoProjeto", () => {
  it("conta só as linhas marcadas como gasto da empresa", () => {
    const p = projeto({
      id: "p1",
      linhas: [
        linha({ id: "l1", precoUnit: 100, gastoEmpresa: true }),
        linha({ id: "l2", precoUnit: 50 }), // não marcada — é margem, não gasto
        linha({ id: "l3", precoUnit: 20, quantidade: 3, gastoEmpresa: true }),
      ],
    });
    expect(gastoEmpresaDoProjeto(p, [])).toBe(160);
  });

  it("soma as despesas manuais ligadas ao projecto", () => {
    const p = projeto({
      id: "p1",
      linhas: [linha({ id: "l1", precoUnit: 100, gastoEmpresa: true })],
    });
    const ds = [despesa({ id: "d1", valor: 15, projetoId: "p1" })];
    expect(gastoEmpresaDoProjeto(p, ds)).toBe(115);
  });

  it("dá o mesmo total que os relatórios imputam ao projecto", () => {
    // A invariante que interessa: a ficha e os relatórios não podem dar
    // respostas diferentes a "quanto gastei neste projecto".
    const p = projeto({
      id: "p1",
      dataCriado: "2026-05-10",
      linhas: [
        linha({ id: "l1", precoUnit: 1895, gastoEmpresa: true }),
        linha({ id: "l2", precoUnit: 150 }),
        linha({ id: "l3", precoUnit: 30, gastoEmpresa: true, data: "2026-06-02" }),
      ],
    });
    const ds = [
      despesa({ id: "d1", valor: 15, projetoId: "p1" }),
      despesa({ id: "d2", valor: 99, projetoId: "outro" }), // de outro projecto
    ];
    const daFicha = gastoEmpresaDoProjeto(p, ds.filter((d) => d.projetoId === p.id));
    expect(daFicha).toBe(1940);
    expect(daFicha).toBe(totalRelatoriosDoProjeto(p, ds));
  });

  it("projecto sem linhas nem despesas gasta zero", () => {
    expect(gastoEmpresaDoProjeto(projeto({ id: "p1", linhas: null }), [])).toBe(0);
  });

  it("pagamento a colaborador é custo da empresa, não repassado ao cliente", () => {
    // Está ligado ao projecto (é lá que se regista), mas o cliente não devolve
    // a comissão do Jaime — sai da margem.
    const ds = [
      despesa({ id: "d1", valor: 200, projetoId: "p1", categoria: "pecas" }),
      despesa({
        id: "d2",
        valor: 150,
        projetoId: "p1",
        categoria: "colaboradores",
        colaboradorId: "co-jaime",
      }),
    ];
    const events = collectGastos([], ds);
    expect(splitRepassadoEmpresa(events)).toEqual({ repassado: 200, empresa: 150 });
  });

  it("conta a linha sem data possível, que os relatórios deixam cair", () => {
    // Sem data na linha e sem dataCriado/dataFechado, collectGastos não a
    // consegue pôr num mês e ignora-a. O dinheiro saiu na mesma — a ficha conta.
    const p = projeto({
      id: "p1",
      dataCriado: null,
      dataFechado: null,
      linhas: [linha({ id: "l1", precoUnit: 80, gastoEmpresa: true })],
    });
    expect(gastoEmpresaDoProjeto(p, [])).toBe(80);
    expect(totalRelatoriosDoProjeto(p, [])).toBe(0);
  });
});
