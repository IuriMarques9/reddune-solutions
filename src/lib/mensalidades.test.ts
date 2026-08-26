import { describe, it, expect } from "vitest";
import {
  addMeses,
  diffDias,
  cobrancasDe,
  todasCobrancas,
  resumoMensalidade,
  proximaCobranca,
  cobrancasVencidas,
  cobrancasAVencer,
  cobrancasNoMes,
  receitaRecorrente,
  pontualidade,
  porCobrarDentroDoValor,
  sincronizarLinhaDoPlano,
  descricaoLinhaDoPlano,
  isPlanoDespesa,
  isPlanoPorArrancar,
  fimDaCobertura,
  margemDoPlano,
  planosReceita,
  planosDespesa,
} from "@/lib/mensalidades";
import type { Mensalidade } from "@/types/mensalidade";
import type { Pagamento } from "@/types/pagamento";
import type { ProjetoLinha } from "@/types/projeto";

// Caso real do Atelier dos Trakinas: 4.400 € em 12 mensalidades de 366,67 €,
// mais 490 €/ano de manutenção. Serve de base a quase todos os testes.
function plano(p: Partial<Mensalidade> & { id: string }): Mensalidade {
  return {
    projetoId: "proj-trakinas",
    clienteId: "cli-marcia",
    titulo: "Mensalidade 12x",
    valor: 366.67,
    periodo: "mensal",
    primeiraCobranca: "2026-09-01",
    numeroCobrancas: 12,
    ativo: true,
    dentroDoValor: true,
    notas: null,
    criadoEm: "2026-08-18T00:00:00.000Z",
    fechadoEm: null,
    ...p,
  };
}

function pagamento(p: Partial<Pagamento> & { id: string }): Pagamento {
  return {
    projetoId: "proj-trakinas",
    clienteId: "cli-marcia",
    valor: 366.67,
    data: "2026-09-01",
    metodo: "transferencia",
    notas: null,
    criadoEm: "2026-09-01T00:00:00.000Z",
    ...p,
  };
}

describe("addMeses", () => {
  it("soma meses sem surpresas", () => {
    expect(addMeses("2026-09-01", 0)).toBe("2026-09-01");
    expect(addMeses("2026-09-01", 1)).toBe("2026-10-01");
    expect(addMeses("2026-09-15", 4)).toBe("2027-01-15");
  });

  it("limita o dia ao último do mês de destino", () => {
    // Sem clamp, 31 Jan + 1 mês saltava para 3 de Março.
    expect(addMeses("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMeses("2026-01-31", 3)).toBe("2026-04-30");
    // Ano bissexto: 2028 tem 29 de Fevereiro.
    expect(addMeses("2028-01-31", 1)).toBe("2028-02-29");
  });

  it("não perde o dia original nos meses seguintes", () => {
    // O clamp é por cobrança, calculado sempre a partir da primeira: depois de
    // Fevereiro o dia 31 volta, não fica preso em 28.
    expect(addMeses("2026-01-31", 2)).toBe("2026-03-31");
  });

  it("faz anos com passo de 12 meses", () => {
    expect(addMeses("2026-09-01", 12)).toBe("2027-09-01");
    expect(addMeses("2026-09-01", 24)).toBe("2028-09-01");
  });
});

describe("diffDias", () => {
  it("conta dias inteiros nos dois sentidos", () => {
    expect(diffDias("2026-09-01", "2026-09-05")).toBe(4);
    expect(diffDias("2026-09-05", "2026-09-01")).toBe(-4);
    expect(diffDias("2026-09-01", "2026-09-01")).toBe(0);
  });

  it("atravessa a mudança de hora sem se enganar num dia", () => {
    // Último domingo de Outubro: o relógio recua em Lisboa.
    expect(diffDias("2026-10-24", "2026-10-26")).toBe(2);
  });
});

describe("cobrancasDe", () => {
  it("gera uma cobrança por prestação, com as datas certas", () => {
    const cs = cobrancasDe(plano({ id: "m1" }), [], "2026-09-01");
    expect(cs).toHaveLength(12);
    expect(cs[0].dataPrevista).toBe("2026-09-01");
    expect(cs[11].dataPrevista).toBe("2027-08-01");
    expect(cs[0].numero).toBe(1);
  });

  it("marca paga a cobrança que tem pagamento ligado", () => {
    const cs = cobrancasDe(
      plano({ id: "m1" }),
      [pagamento({ id: "pg1", mensalidadeId: "m1", cobrancaNumero: 1 })],
      "2026-09-10"
    );
    expect(cs[0].estado).toBe("paga");
    expect(cs[0].pago).toBeCloseTo(366.67, 2);
  });

  it("guarda a data REAL do pagamento e o desvio face à prevista", () => {
    // O pedido do Iuri: pagou, mas não no dia em que a mensalidade começou.
    const cs = cobrancasDe(
      plano({ id: "m1" }),
      [pagamento({ id: "pg1", mensalidadeId: "m1", cobrancaNumero: 1, data: "2026-09-05" })],
      "2026-09-10"
    );
    expect(cs[0].dataPrevista).toBe("2026-09-01");
    expect(cs[0].dataPaga).toBe("2026-09-05");
    expect(cs[0].desvioDias).toBe(4);
  });

  it("dá desvio negativo a quem paga adiantado", () => {
    const cs = cobrancasDe(
      plano({ id: "m1", primeiraCobranca: "2026-09-10" }),
      [pagamento({ id: "pg1", mensalidadeId: "m1", cobrancaNumero: 1, data: "2026-09-03" })],
      "2026-09-15"
    );
    expect(cs[0].desvioDias).toBe(-7);
  });

  it("ignora pagamentos avulso e de outros planos", () => {
    const cs = cobrancasDe(
      plano({ id: "m1" }),
      [
        pagamento({ id: "pg-avulso", valor: 1000 }), // a entrada, sem plano
        pagamento({ id: "pg-outro", mensalidadeId: "m2", cobrancaNumero: 1, valor: 490 }),
      ],
      "2026-09-10"
    );
    expect(cs.every((c) => c.pago === 0)).toBe(true);
  });

  it("classifica os estados a partir de hoje", () => {
    const cs = cobrancasDe(plano({ id: "m1" }), [], "2026-10-15");
    expect(cs[0].estado).toBe("vencida"); // 1 Set
    expect(cs[1].estado).toBe("vencida"); // 1 Out
    expect(cs[2].estado).toBe("futura"); // 1 Nov ainda está a 17 dias
  });

  it("trata vencer hoje como a-vencer, não como atraso", () => {
    const cs = cobrancasDe(plano({ id: "m1" }), [], "2026-09-01");
    expect(cs[0].estado).toBe("a-vencer");
  });

  it("só chama futura ao que está a mais de 7 dias", () => {
    const cs = cobrancasDe(plano({ id: "m1" }), [], "2026-08-20");
    expect(cs[0].estado).toBe("futura"); // 1 Set está a 12 dias
    const perto = cobrancasDe(plano({ id: "m1" }), [], "2026-08-26");
    expect(perto[0].estado).toBe("a-vencer"); // 1 Set está a 6 dias
  });

  it("chama parcial a quem pagou só uma parte", () => {
    const cs = cobrancasDe(
      plano({ id: "m1" }),
      [pagamento({ id: "pg1", mensalidadeId: "m1", cobrancaNumero: 1, valor: 100 })],
      "2026-09-10"
    );
    expect(cs[0].estado).toBe("parcial");
    expect(cs[0].pago).toBe(100);
  });

  it("soma pagamentos parciais até fechar a cobrança", () => {
    const cs = cobrancasDe(
      plano({ id: "m1" }),
      [
        pagamento({ id: "pg1", mensalidadeId: "m1", cobrancaNumero: 1, valor: 200, data: "2026-09-02" }),
        pagamento({ id: "pg2", mensalidadeId: "m1", cobrancaNumero: 1, valor: 166.67, data: "2026-09-09" }),
      ],
      "2026-09-10"
    );
    expect(cs[0].estado).toBe("paga");
    // A data que conta é a do último pagamento — foi aí que a cobrança fechou.
    expect(cs[0].dataPaga).toBe("2026-09-09");
    expect(cs[0].desvioDias).toBe(8);
  });

  it("não deixa arredondamentos travarem uma cobrança em parcial", () => {
    const cs = cobrancasDe(
      plano({ id: "m1", valor: 366.67 }),
      [pagamento({ id: "pg1", mensalidadeId: "m1", cobrancaNumero: 1, valor: 366.669 })],
      "2026-09-10"
    );
    expect(cs[0].estado).toBe("paga");
  });

  describe("plano desligado", () => {
    const desligado = plano({ id: "m1", ativo: false });

    it("pára de gerar cobranças futuras", () => {
      const cs = cobrancasDe(desligado, [], "2026-11-15");
      // Só Setembro, Outubro e Novembro (todas já vencidas a 15 de Novembro).
      // Dezembro em diante desaparece.
      expect(cs).toHaveLength(3);
      expect(cs.every((c) => c.estado === "vencida")).toBe(true);
    });

    it("mantém as dívidas que já venceram", () => {
      // Desligar não perdoa dinheiro: as vencidas continuam lá.
      const cs = cobrancasDe(desligado, [], "2026-11-15");
      expect(cs[0].dataPrevista).toBe("2026-09-01");
    });

    it("mantém as cobranças já pagas, mesmo futuras", () => {
      const cs = cobrancasDe(
        desligado,
        [pagamento({ id: "pg1", mensalidadeId: "m1", cobrancaNumero: 12, data: "2026-10-01" })],
        "2026-11-15"
      );
      expect(cs.map((c) => c.numero)).toContain(12);
    });
  });
});

describe("todasCobrancas", () => {
  it("junta vários planos por ordem de data prevista", () => {
    const mensal = plano({ id: "m1" });
    const anual = plano({
      id: "m2",
      titulo: "Manutenção anual",
      valor: 490,
      periodo: "anual",
      numeroCobrancas: 3,
      primeiraCobranca: "2026-10-01",
      dentroDoValor: false,
    });
    const cs = todasCobrancas([mensal, anual], [], "2026-09-01");
    expect(cs).toHaveLength(15);
    expect(cs[0].dataPrevista).toBe("2026-09-01");
    // A anuidade de Outubro entra entre as mensalidades, não no fim.
    expect(cs[1].dataPrevista).toBe("2026-10-01");
    expect(cs.at(-1)?.dataPrevista).toBe("2028-10-01");
  });
});

describe("resumoMensalidade", () => {
  it("conta pagas, recebido e o que falta", () => {
    const m = plano({ id: "m1" });
    const pagos = [1, 2, 3].map((n) =>
      pagamento({ id: `pg${n}`, mensalidadeId: "m1", cobrancaNumero: n })
    );
    const r = resumoMensalidade(m, cobrancasDe(m, pagos, "2026-12-01"));
    expect(r.pagas).toBe(3);
    expect(r.geradas).toBe(12);
    expect(r.recebido).toBeCloseTo(1100.01, 2);
    expect(r.porCobrar).toBeCloseTo(3300.03, 2);
    expect(r.valorTotal).toBeCloseTo(4400.04, 2);
    expect(r.terminada).toBe(false);
  });

  it("marca terminada só quando todas as prestações estão pagas", () => {
    const m = plano({ id: "m1", numeroCobrancas: 2 });
    const pagos = [1, 2].map((n) =>
      pagamento({ id: `pg${n}`, mensalidadeId: "m1", cobrancaNumero: n })
    );
    expect(resumoMensalidade(m, cobrancasDe(m, pagos, "2026-12-01")).terminada).toBe(true);
  });

  it("não chama terminado a um plano desligado a meio", () => {
    // As futuras deixam de ser geradas, mas o plano não está cumprido.
    const m = plano({ id: "m1", ativo: false });
    const pagos = [pagamento({ id: "pg1", mensalidadeId: "m1", cobrancaNumero: 1 })];
    expect(resumoMensalidade(m, cobrancasDe(m, pagos, "2026-09-20")).terminada).toBe(false);
  });

  it("conta vencidas e parciais como por cobrar", () => {
    const m = plano({ id: "m1" });
    const r = resumoMensalidade(m, cobrancasDe(m, [], "2026-11-15"));
    expect(r.vencidas).toBe(3); // Set, Out, Nov
  });
});

describe("proximaCobranca", () => {
  it("devolve a mais antiga por liquidar", () => {
    const m = plano({ id: "m1" });
    const cs = cobrancasDe(
      m,
      [pagamento({ id: "pg1", mensalidadeId: "m1", cobrancaNumero: 1 })],
      "2026-09-15"
    );
    expect(proximaCobranca(cs)?.numero).toBe(2);
  });

  it("devolve null quando está tudo pago", () => {
    const m = plano({ id: "m1", numeroCobrancas: 1 });
    const cs = cobrancasDe(
      m,
      [pagamento({ id: "pg1", mensalidadeId: "m1", cobrancaNumero: 1 })],
      "2026-09-15"
    );
    expect(proximaCobranca(cs)).toBeNull();
  });
});

describe("cobrancasVencidas / cobrancasAVencer / cobrancasNoMes", () => {
  const m = plano({ id: "m1" });

  it("vencidas traz atrasadas e parciais, da mais antiga para a mais recente", () => {
    const cs = cobrancasDe(
      m,
      [pagamento({ id: "pg1", mensalidadeId: "m1", cobrancaNumero: 2, valor: 100 })],
      "2026-11-15"
    );
    const v = cobrancasVencidas(cs);
    expect(v.map((c) => c.numero)).toEqual([1, 2, 3]);
    expect(v[1].estado).toBe("parcial");
  });

  it("a-vencer é uma janela para a frente, sem apanhar atrasos", () => {
    const cs = cobrancasDe(m, [], "2026-10-28");
    const a = cobrancasAVencer(cs, "2026-10-28", 7);
    // Só a nº 3 (1 de Novembro, a 4 dias). As de Setembro e Outubro já
    // venceram e ficam de fora — a janela é para a frente.
    expect(a.map((c) => c.numero)).toEqual([3]);
  });

  it("no mês filtra pela data prevista", () => {
    const cs = cobrancasDe(m, [], "2026-09-01");
    expect(cobrancasNoMes(cs, "2026-10")).toHaveLength(1);
    expect(cobrancasNoMes(cs, "2026-08")).toHaveLength(0);
  });
});

describe("receitaRecorrente", () => {
  const mensal = plano({ id: "m1" });
  const anual = plano({
    id: "m2",
    valor: 490,
    periodo: "anual",
    numeroCobrancas: 3,
    primeiraCobranca: "2026-10-01",
    dentroDoValor: false,
  });

  it("normaliza as anuidades a doze avos", () => {
    const cs = todasCobrancas([mensal, anual], [], "2026-09-01");
    const r = receitaRecorrente([mensal, anual], cs);
    expect(r.planosAtivos).toBe(2);
    expect(r.mrr).toBeCloseTo(366.67 + 490 / 12, 2);
  });

  it("não conta planos desligados nem fechados", () => {
    const fechado = plano({ id: "m3", fechadoEm: "2026-09-30T00:00:00.000Z" });
    const cs = todasCobrancas([mensal, fechado], [], "2026-09-01");
    expect(receitaRecorrente([mensal, fechado], cs).planosAtivos).toBe(1);
  });

  it("deixa de contar um plano já todo pago", () => {
    const curto = plano({ id: "m4", numeroCobrancas: 1 });
    const pagos = [pagamento({ id: "pg1", mensalidadeId: "m4", cobrancaNumero: 1 })];
    const cs = cobrancasDe(curto, pagos, "2026-09-15");
    const r = receitaRecorrente([curto], cs);
    expect(r.planosAtivos).toBe(0);
    expect(r.mrr).toBe(0);
  });

  it("soma o comprometido por cobrar", () => {
    const cs = todasCobrancas([mensal, anual], [], "2026-09-01");
    expect(receitaRecorrente([mensal, anual], cs).comprometido).toBeCloseTo(4400.04 + 1470, 2);
  });
});

describe("pontualidade", () => {
  it("reparte as pagas entre adiantadas, em dia e atrasadas", () => {
    const m = plano({ id: "m1" });
    const cs = cobrancasDe(
      m,
      [
        pagamento({ id: "pg1", mensalidadeId: "m1", cobrancaNumero: 1, data: "2026-09-01" }), // em dia
        pagamento({ id: "pg2", mensalidadeId: "m1", cobrancaNumero: 2, data: "2026-10-06" }), // +5
        pagamento({ id: "pg3", mensalidadeId: "m1", cobrancaNumero: 3, data: "2026-10-30" }), // −2
      ],
      "2026-12-01"
    );
    const p = pontualidade(cs);
    expect(p.total).toBe(3);
    expect(p.emDia).toBe(1);
    expect(p.atrasadas).toBe(1);
    expect(p.adiantadas).toBe(1);
    expect(p.mediaDias).toBeCloseTo((0 + 5 - 2) / 3, 5);
  });

  it("devolve zeros quando ainda não há pagamentos", () => {
    const cs = cobrancasDe(plano({ id: "m1" }), [], "2026-09-01");
    expect(pontualidade(cs)).toMatchObject({ total: 0, mediaDias: 0 });
  });
});

  describe("IVA", () => {
    it("cobra o valor BRUTO quando o plano leva IVA", () => {
      // `Mensalidade.valor` é a base (como o valorEstimado e as linhas); o que
      // se mostra e se compara com os pagamentos é o que o cliente entrega.
      const cs = cobrancasDe(plano({ id: "m1", valor: 366.67, comIva: true }), [], "2026-09-01");
      expect(cs[0].valor).toBe(451.0);
    });

    it("fecha a prestação com o pagamento bruto, não com a base", () => {
      // Sem isto, o cliente pagava 451 € numa prestação de 366,67 € e a
      // cobrança ficava eternamente aberta (ou o troco aparecia como excesso).
      const m = plano({ id: "m1", valor: 366.67, comIva: true });
      const cs = cobrancasDe(
        m,
        [pagamento({ id: "pg1", mensalidadeId: "m1", cobrancaNumero: 1, valor: 451.0 })],
        "2026-09-10"
      );
      expect(cs[0].estado).toBe("paga");
      expect(resumoMensalidade(m, cs).porCobrar).toBeCloseTo(451.0 * 11, 2);
    });

    it("um pagamento pela base deixa a prestação em parcial", () => {
      const cs = cobrancasDe(
        plano({ id: "m1", valor: 366.67, comIva: true }),
        [pagamento({ id: "pg1", mensalidadeId: "m1", cobrancaNumero: 1, valor: 366.67 })],
        "2026-09-10"
      );
      expect(cs[0].estado).toBe("parcial");
    });

    it("o total do plano também é bruto", () => {
      const m = plano({ id: "m1", valor: 366.67, comIva: true, numeroCobrancas: 12 });
      expect(resumoMensalidade(m, cobrancasDe(m, [], "2026-09-01")).valorTotal).toBeCloseTo(
        451.0 * 12,
        2
      );
    });

    it("o MRR fica na BASE — o IVA é do Estado, não é receita nossa", () => {
      const m = plano({ id: "m1", valor: 366.67, comIva: true });
      const cs = cobrancasDe(m, [], "2026-09-01");
      expect(receitaRecorrente([m], cs).mrr).toBeCloseTo(366.67, 2);
      // Já o comprometido é bruto: é dinheiro por cobrar ao cliente.
      expect(receitaRecorrente([m], cs).comprometido).toBeCloseTo(451.0 * 12, 2);
    });

    it("sem o flag nada muda (planos antigos continuam na base)", () => {
      const cs = cobrancasDe(plano({ id: "m1", valor: 366.67 }), [], "2026-09-01");
      expect(cs[0].valor).toBeCloseTo(366.67, 2);
    });
  });

describe("sincronizarLinhaDoPlano", () => {
  let n = 0;
  const novoId = () => `linha-${++n}`;
  const maoObra: ProjetoLinha = {
    id: "l-existente",
    descricao: "Desenvolvimento da app",
    categoria: "mao-obra",
    quantidade: 1,
    precoUnit: 5400,
  };
  const anual = plano({
    id: "m-anual",
    titulo: "Manutenção anual",
    valor: 490,
    periodo: "anual",
    numeroCobrancas: 3,
    dentroDoValor: false,
  });

  it("TODO plano de receita cria a sua linha — mesmo o de prestações", () => {
    // Regra do Iuri (2026-08-26): o plano é dono de uma fatia do orçamento.
    // As 12 × 366,67 € SÃO os 4.400 € — a linha antiga de 5.400 é que sai,
    // ficando "Entrada 1.000" + a linha do plano.
    const entrada: ProjetoLinha = {
      id: "l-entrada",
      descricao: "Entrada",
      categoria: "mao-obra",
      quantidade: 1,
      precoUnit: 1000,
    };
    const r = sincronizarLinhaDoPlano([entrada], 1000, plano({ id: "m1" }), novoId)!;
    expect(r.linhas).toHaveLength(2);
    expect(r.linhas[1].quantidade).toBe(12);
    expect(r.linhas[1].precoUnit).toBe(366.67);
    expect(r.valorEstimado).toBeCloseTo(5400.04, 2);
  });

  it("a linha vale o plano TODO, não um período", () => {
    const r = sincronizarLinhaDoPlano([maoObra], 5400, anual, novoId)!;
    expect(r.linhas).toHaveLength(2);
    const nova = r.linhas[1];
    expect(nova.descricao).toBe("Manutenção anual (ano)");
    expect(nova.quantidade).toBe(3);
    expect(nova.precoUnit).toBe(490);
    expect(nova.mensalidadeId).toBe("m-anual");
    // 5.400 + 3 × 490 = 6.870
    expect(r.valorEstimado).toBe(6870);
  });

  it("anuidade que pode não renovar: 1 cobrança e usar Renovar", () => {
    // Assim o orçamento nunca promete anos que ainda não estão contratados.
    const umAno = { ...anual, numeroCobrancas: 1 };
    const r = sincronizarLinhaDoPlano([maoObra], 5400, umAno, novoId)!;
    expect(r.valorEstimado).toBe(5890);
  });

  it("não conta como gasto da RedDune", () => {
    // É dinheiro a receber; enquanto não for pago não desconta nada a ninguém.
    const r = sincronizarLinhaDoPlano([maoObra], 5400, anual, novoId)!;
    expect(r.linhas[1].gastoEmpresa).toBe(false);
  });

  it("respeita a categoria escolhida", () => {
    const r = sincronizarLinhaDoPlano(
      [maoObra], 5400, { ...anual, categoriaCusto: "outro" }, novoId
    )!;
    expect(r.linhas[1].categoria).toBe("outro");
  });

  it("actualiza a linha em vez de criar outra quando o plano muda", () => {
    const inicial = sincronizarLinhaDoPlano([maoObra], 5400, anual, novoId)!;
    const idLinha = inicial.linhas[1].id;
    const subiu = sincronizarLinhaDoPlano(
      inicial.linhas, inicial.valorEstimado, { ...anual, valor: 550 }, novoId
    )!;
    expect(subiu.linhas).toHaveLength(2);
    expect(subiu.linhas[1].id).toBe(idLinha);
    expect(subiu.linhas[1].precoUnit).toBe(550);
    // 5.400 + 3 × 550 = 7.050
    expect(subiu.valorEstimado).toBe(7050);
  });

  it("não grava nada quando nada mudou", () => {
    const inicial = sincronizarLinhaDoPlano([maoObra], 5400, anual, novoId)!;
    expect(sincronizarLinhaDoPlano(inicial.linhas, inicial.valorEstimado, anual, novoId)).toBeNull();
  });

  it("remove a linha se o plano passar a ser de despesa", () => {
    // Só os planos de despesa deixam de ter linha — as linhas são o que o
    // cliente paga.
    const inicial = sincronizarLinhaDoPlano([maoObra], 5400, anual, novoId)!;
    const r = sincronizarLinhaDoPlano(
      inicial.linhas, inicial.valorEstimado, { ...anual, tipo: "despesa" as const }, novoId
    )!;
    expect(r.linhas).toHaveLength(1);
    expect(r.valorEstimado).toBe(5400);
  });

  it("nunca toca em linhas escritas à mão", () => {
    const r = sincronizarLinhaDoPlano([maoObra], 5400, anual, novoId)!;
    expect(r.linhas[0]).toEqual(maoObra);
  });

  it("preserva o orçamento de um projecto que ainda não tinha linhas", () => {
    // Sem isto, a soma das linhas passava a ser só o plano e o projecto
    // encolhia de 5.400 € para 490 €.
    const r = sincronizarLinhaDoPlano(null, 5400, { ...anual, numeroCobrancas: 1 }, novoId)!;
    expect(r.linhas).toHaveLength(2);
    expect(r.linhas[0]).toMatchObject({ descricao: "Valor orçado", precoUnit: 5400 });
    expect(r.valorEstimado).toBe(5890);
  });

  it("projecto sem linhas e sem orçamento fica só com a linha do plano", () => {
    const r = sincronizarLinhaDoPlano(null, null, { ...anual, numeroCobrancas: 1 }, novoId)!;
    expect(r.linhas).toHaveLength(1);
    expect(r.valorEstimado).toBe(490);
  });

  it("descrição diz o período", () => {
    expect(descricaoLinhaDoPlano(anual)).toBe("Manutenção anual (ano)");
    expect(descricaoLinhaDoPlano(plano({ id: "x" }))).toBe("Mensalidade 12x (mês)");
  });
});

describe("planos de despesa (o que NÓS pagamos)", () => {
  // Caso real: a Márcia paga 490 €/ano de manutenção, mas desses 490 € só sai
  // do banco o alojamento/BD/domínio. O resto é margem — e o tempo do Iuri
  // nunca é custo (regra dele: trabalho é lucro).
  const dominio = plano({
    id: "d1",
    tipo: "despesa",
    titulo: "Alojamento e domínio",
    valor: 0, // ainda não sabe quanto vai ser
    periodo: "anual",
    numeroCobrancas: 3,
    primeiraCobranca: "2026-09-01",
    dentroDoValor: false,
  });

  function despesa(p: Partial<Pagamento> & { id: string }): Pagamento {
    return pagamento(p); // mesma forma: valor, data e a ligação ao plano
  }

  it("distingue os dois sentidos", () => {
    const receita = plano({ id: "r1" });
    expect(isPlanoDespesa(dominio)).toBe(true);
    expect(isPlanoDespesa(receita)).toBe(false);
    expect(planosReceita([receita, dominio]).map((m) => m.id)).toEqual(["r1"]);
    expect(planosDespesa([receita, dominio]).map((m) => m.id)).toEqual(["d1"]);
  });

  it("um plano sem valor é um LEMBRETE, não algo já pago", () => {
    // A armadilha: com valor 0, um `pago >= valor` ingénuo dava tudo por pago
    // logo à nascença e o aviso nunca aparecia.
    const cs = cobrancasDe(dominio, [], "2026-09-01");
    expect(cs[0].valor).toBe(0);
    expect(cs[0].estado).toBe("a-vencer");
    expect(cobrancasDe(dominio, [], "2026-10-15")[0].estado).toBe("vencida");
  });

  it("qualquer valor confirmado fecha uma previsão sem valor", () => {
    const cs = cobrancasDe(
      dominio,
      [despesa({ id: "dp1", mensalidadeId: "d1", cobrancaNumero: 1, valor: 137.4, data: "2026-09-03" })],
      "2026-09-10"
    );
    expect(cs[0].estado).toBe("paga");
    expect(cs[0].pago).toBe(137.4);
    expect(cs[0].desvioDias).toBe(2);
  });

  it("com previsão de valor comporta-se como qualquer outro plano", () => {
    const comValor = { ...dominio, valor: 120 };
    const cs = cobrancasDe(
      comValor,
      [despesa({ id: "dp1", mensalidadeId: "d1", cobrancaNumero: 1, valor: 60 })],
      "2026-09-10"
    );
    expect(cs[0].estado).toBe("parcial");
  });

  it("NUNCA leva IVA — a despesa regista o que saiu do banco", () => {
    const cs = cobrancasDe({ ...dominio, valor: 100, comIva: true }, [], "2026-09-01");
    expect(cs[0].valor).toBe(100);
  });

  it("não conta como receita recorrente", () => {
    const receita = plano({ id: "r1" });
    const cs = todasCobrancas([receita, dominio], [], "2026-09-01");
    const rr = receitaRecorrente([receita, dominio], cs);
    expect(rr.planosAtivos).toBe(1);
    expect(rr.mrr).toBeCloseTo(366.67, 2);
  });

  it("nunca é dívida do cliente", () => {
    const dentro = { ...dominio, dentroDoValor: true, valor: 490 };
    const cs = cobrancasDe(dentro, [], "2026-09-01");
    // Mesmo marcado dentroDoValor (não devia acontecer, mas defende-se),
    // um plano de despesa não desconta nada ao que o cliente deve.
    expect(porCobrarDentroDoValor([dentro], cs, "proj-trakinas")).toBe(0);
  });

  it("nunca cria linha nos Custos", () => {
    // As linhas são o que o CLIENTE paga. O gasto vive nas despesas.
    expect(sincronizarLinhaDoPlano([], null, dominio, () => "x")).toBeNull();
    expect(sincronizarLinhaDoPlano([], 5400, { ...dominio, valor: 490 }, () => "x")).toBeNull();
  });
});

describe("plano por arrancar (sem data de início)", () => {
  // Regra do Iuri: o preço fecha-se quando se combina, mas a data só existe
  // quando o cliente paga a primeira. Até lá não há calendário nenhum.
  const combinado = plano({ id: "m1", primeiraCobranca: null });

  it("reconhece o estado", () => {
    expect(isPlanoPorArrancar(combinado)).toBe(true);
    expect(isPlanoPorArrancar(plano({ id: "m2" }))).toBe(false);
  });

  it("não gera cobrança nenhuma — nada vence, nada avisa", () => {
    expect(cobrancasDe(combinado, [], "2026-09-01")).toEqual([]);
    expect(todasCobrancas([combinado], [], "2026-12-31")).toEqual([]);
    expect(cobrancasVencidas(todasCobrancas([combinado], [], "2027-12-31"))).toEqual([]);
  });

  it("não é dado como terminado só por não ter cobranças", () => {
    // `pagas >= numeroCobrancas` com 0 e 12 continua false — mas era aqui que
    // um plano de 0 cobranças podia passar por cumprido.
    const r = resumoMensalidade(combinado, []);
    expect(r.geradas).toBe(0);
    expect(r.terminada).toBe(false);
    expect(r.porCobrar).toBe(0);
  });

  it("não conta como receita recorrente enquanto não arrancar", () => {
    // Sem cobranças abertas não há MRR: ainda não está a render nada.
    expect(receitaRecorrente([combinado], []).planosAtivos).toBe(0);
  });

  it("MAS a linha nos Custos é criada na mesma — o preço está fechado", () => {
    const r = sincronizarLinhaDoPlano([], null, combinado, () => "l1")!;
    expect(r.linhas).toHaveLength(1);
    expect(r.linhas[0].quantidade).toBe(12);
    expect(r.valorEstimado).toBeCloseTo(4400.04, 2);
  });

  it("ao arrancar, o calendário nasce a partir da data do primeiro pagamento", () => {
    const arrancou = { ...combinado, primeiraCobranca: "2026-11-15" };
    const cs = cobrancasDe(arrancou, [], "2026-11-15");
    expect(cs).toHaveLength(12);
    expect(cs[0].dataPrevista).toBe("2026-11-15");
    expect(cs[1].dataPrevista).toBe("2026-12-15");
  });
});

describe("fimDaCobertura", () => {
  // O defeito que o Iuri apanhou: a anuidade dos Amigos do Bairro foi paga a
  // 27/06/2026 e o painel dizia que "acabava" nesse mesmo dia. Cobre até 2027.
  it("uma anuidade paga cobre até um ano depois", () => {
    const anual = plano({
      id: "m1",
      periodo: "anual",
      numeroCobrancas: 1,
      primeiraCobranca: "2026-06-27",
    });
    expect(fimDaCobertura(anual)).toBe("2027-06-27");
  });

  it("três anuidades cobrem até três anos depois da primeira", () => {
    const tres = plano({
      id: "m1",
      periodo: "anual",
      numeroCobrancas: 3,
      primeiraCobranca: "2026-09-01",
    });
    expect(fimDaCobertura(tres)).toBe("2029-09-01");
  });

  it("12 mensalidades cobrem os 12 meses a contar da primeira", () => {
    expect(fimDaCobertura(plano({ id: "m1" }))).toBe("2027-09-01");
  });

  it("nunca é o dia da última cobrança", () => {
    const m = plano({ id: "m1" });
    const ultima = cobrancasDe(m, [], "2026-09-01").at(-1)!;
    expect(fimDaCobertura(m)).not.toBe(ultima.dataPrevista);
  });

  it("é null enquanto o plano não arrancar", () => {
    expect(fimDaCobertura(plano({ id: "m1", primeiraCobranca: null }))).toBeNull();
  });
});

describe("margemDoPlano", () => {
  it("é null sem custo — o painel não mostra bloco nenhum", () => {
    expect(margemDoPlano(plano({ id: "m1", valor: 490 }))).toBeNull();
    expect(margemDoPlano(plano({ id: "m1", valor: 490, custo: 0 }))).toBeNull();
  });

  it("desconta o IVA do custo antes de comparar (o IVA pago é dedutível)", () => {
    // A factura da Vercel diz 137,40 €; a base são 111,71 €. Sem descontar, a
    // margem aparecia 23% mais baixa do que a real.
    const m = plano({ id: "m1", valor: 490, custo: 137.4, custoComIva: true });
    const r = margemDoPlano(m)!;
    expect(r.custo).toBeCloseTo(111.71, 2);
    expect(r.margem).toBeCloseTo(378.29, 2);
    expect(r.pct).toBe(77);
  });

  it("com custo já em base não mexe no número", () => {
    const r = margemDoPlano(plano({ id: "m1", valor: 490, custo: 137.4, custoComIva: false }))!;
    expect(r.custo).toBeCloseTo(137.4, 2);
    expect(r.margem).toBeCloseTo(352.6, 2);
  });

  it("margem negativa quando o custo passa o preço", () => {
    const r = margemDoPlano(plano({ id: "m1", valor: 100, custo: 150, custoComIva: false }))!;
    expect(r.margem).toBeCloseTo(-50, 2);
  });
});

describe("porCobrarDentroDoValor", () => {
  it("desconta TODOS os planos de receita do projecto", () => {
    // Cada plano de receita é dono de uma linha, logo o seu valor já está no
    // valorEstimado. Sem descontar, as Dívidas contavam-no duas vezes: uma na
    // linha, outra nas cobranças por liquidar.
    const mensal = plano({ id: "m1" }); // 12 × 366,67
    const manutencao = plano({ id: "m2", valor: 490, periodo: "anual", numeroCobrancas: 1 });
    const cs = todasCobrancas([mensal, manutencao], [], "2026-09-01");
    expect(porCobrarDentroDoValor([mensal, manutencao], cs, "proj-trakinas")).toBeCloseTo(
      4400.04 + 490,
      2
    );
  });

  it("desconta o que já foi pago", () => {
    const dentro = plano({ id: "m1", numeroCobrancas: 2 });
    const cs = cobrancasDe(
      dentro,
      [pagamento({ id: "pg1", mensalidadeId: "m1", cobrancaNumero: 1 })],
      "2026-09-15"
    );
    expect(porCobrarDentroDoValor([dentro], cs, "proj-trakinas")).toBeCloseTo(366.67, 2);
  });

  it("é zero para um projecto sem planos dentro do valor", () => {
    // Agora TODO plano de receita é dono de linha, logo desconta sempre.
    const outro = plano({ id: "m2", projetoId: "outro" });
    const cs = cobrancasDe(outro, [], "2026-09-01");
    expect(porCobrarDentroDoValor([outro], cs, "proj-trakinas")).toBe(0);
  });
});
