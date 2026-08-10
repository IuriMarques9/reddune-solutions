import { describe, it, expect } from "vitest";
import { toPortalProjeto, toPortalCliente } from "./portal-dto";
import type { Projeto } from "@/types/projeto";
import type { Cliente } from "@/types/cliente";
import type { Pagamento } from "@/types/pagamento";

const POISON = "SEGREDO_INTERNO_NUNCA_MOSTRAR";

function makeProjeto(): Projeto {
  return {
    id: "p1",
    titulo: "Site Restaurante",
    ref: "WD-0007",
    clienteId: "c1",
    clienteNome: "Maria",
    proximaAccao: POISON,
    status: "em-curso",
    categoria: "web-digital",
    tipo: "web",
    tipos: ["web", "consultoria"],
    prazo: "2026-08-01",
    dataCriado: "2026-07-01",
    dataFechado: null,
    valorEstimado: 400,
    valorPago: null,
    metodoPagamento: POISON,
    local: "remoto",
    notasResumo: POISON,
    bodyMd: POISON,
    linhas: [
      { id: "l1", descricao: POISON, categoria: "peca", quantidade: 2, precoUnit: 100 },
      { id: "l2", descricao: POISON, categoria: "mao-obra", quantidade: 1, precoUnit: 150 },
      { id: "l3", descricao: POISON, categoria: "peca", quantidade: 1, precoUnit: 50 },
    ],
    garantiaAte: "2027-01-01",
    hardware: {
      marca: "Asus",
      modelo: "X515",
      serial: POISON,
      // Ficha interna de componentes — nunca deve chegar ao portal.
      componentes: [
        { id: "hw1", tipo: "armazenamento", descricao: POISON, serial: POISON },
      ],
    },
    arquivos: [
      {
        id: "a1",
        pathname: "projetos/p1/a1.pdf",
        blobUrl: POISON,
        url: "/api/projetos/arquivo/a1?projetoId=p1",
        nome: "orcamento.pdf",
        tamanho: 1234,
        tipo: "application/pdf",
        dataUpload: "2026-07-02",
      },
    ],
    links: [{ id: "k1", label: "Protótipo", url: "https://exemplo.vercel.app" }],
    portal: { tokenHash: POISON, criadoEm: "2026-07-03", revogadoEm: null },
  };
}

const pagamentos: Pagamento[] = [
  { id: "g1", projetoId: "p1", clienteId: "c1", valor: 100, data: "2026-07-02", metodo: "mbway", notas: POISON, criadoEm: "2026-07-02" },
  { id: "g2", projetoId: "p1", clienteId: "c1", valor: 50, data: "2026-07-03", metodo: null, notas: null, criadoEm: "2026-07-03" },
];

describe("toPortalProjeto", () => {
  it("nunca inclui campos internos (poison scan)", () => {
    const dto = toPortalProjeto(makeProjeto(), pagamentos);
    expect(JSON.stringify(dto)).not.toContain(POISON);
  });

  it("não expõe chaves proibidas", () => {
    const dto = toPortalProjeto(makeProjeto(), pagamentos) as unknown as Record<string, unknown>;
    for (const k of ["bodyMd", "notasResumo", "proximaAccao", "linhas", "portal", "metodoPagamento", "valorPago", "garantiaAte"]) {
      expect(dto).not.toHaveProperty(k);
    }
  });

  it("agrega valores por categoria sem detalhe", () => {
    const dto = toPortalProjeto(makeProjeto(), pagamentos);
    expect(dto.valores).toEqual({
      orcado: 400,
      pago: 150,
      emFalta: 250,
      categorias: [
        { label: "Peça", total: 250 },
        { label: "Mão-de-obra", total: 150 },
      ],
    });
  });

  it("valores null quando não há orçamento nem pagamentos", () => {
    const p = { ...makeProjeto(), valorEstimado: null, linhas: null };
    expect(toPortalProjeto(p, []).valores).toBeNull();
  });

  it("mostra pago mesmo sem orçamento (sinal registado)", () => {
    const p = { ...makeProjeto(), valorEstimado: null, linhas: null };
    const so1: Pagamento = { id: "s1", projetoId: "p1", clienteId: "c1", valor: 100, data: "2026-07-02", metodo: "mbway", notas: null, criadoEm: "2026-07-02" };
    expect(toPortalProjeto(p, [so1]).valores).toEqual({
      orcado: 100,
      pago: 100,
      emFalta: 0,
      categorias: [],
    });
  });

  it("Total bate com a soma dos subtotais quando há linhas (ignora valorEstimado dessincronizado)", () => {
    const p = { ...makeProjeto(), valorEstimado: 999 }; // linhas somam 400
    const v = toPortalProjeto(p, []).valores!;
    const somaCategorias = v.categorias.reduce((s, c) => s + c.total, 0);
    expect(v.orcado).toBe(somaCategorias);
    expect(v.orcado).toBe(400);
  });

  it("labels de status e tipos amigáveis; tipos custom passam crus", () => {
    const p = { ...makeProjeto(), tipos: ["web", "slug-custom"] };
    const dto = toPortalProjeto(p, []);
    expect(dto.statusLabel).toBe("Em curso");
    expect(dto.tipoLabels).toEqual(["Web", "slug-custom"]);
  });

  it("arquivos só com id/nome/tipo/tamanho/data/origem/orcamento/descricao e hardware sem serial", () => {
    const dto = toPortalProjeto(makeProjeto(), pagamentos);
    expect(dto.arquivos).toEqual([
      { id: "a1", nome: "orcamento.pdf", tipo: "application/pdf", tamanho: 1234, data: "2026-07-02", origem: "nos", orcamento: false, descricao: null },
    ]);
    expect(dto.hardware).toEqual({ marca: "Asus", modelo: "X515" });
  });

  it("descrição do painel passa ao portal (trim; vazio vira null)", () => {
    const p = makeProjeto();
    const base = p.arquivos![0]!;
    p.arquivos = [
      { ...base, id: "com", descricao: "  Orçamento sem a placa gráfica  " },
      { ...base, id: "vazia", descricao: "   " },
      { ...base, id: "sem" },
    ];
    const dto = toPortalProjeto(p, []);
    expect(dto.arquivos.map((a) => a.descricao)).toEqual([
      "Orçamento sem a placa gráfica",
      null,
      null,
    ]);
  });

  it("categoria 'orcamento' vira orcamento:true — mas nunca em ficheiros do cliente", () => {
    const p = makeProjeto();
    const base = p.arquivos![0]!;
    p.arquivos = [
      { ...base, categoria: "orcamento" },
      // Defesa em profundidade: a API bloqueia marcar ficheiros do cliente,
      // mas se um doc antigo/manual tiver a combinação, o portal não destaca.
      { ...base, id: "a2", nome: "foto.jpg", origem: "cliente", categoria: "orcamento" },
      { ...base, id: "a3", nome: "manual.pdf" },
    ];
    const dto = toPortalProjeto(p, pagamentos);
    expect(dto.arquivos.map((a) => a.orcamento)).toEqual([true, false, false]);
  });

  it("com vários orçamentos marcados, só o mais recente sai — antigos ficam fora do DTO (histórico do painel)", () => {
    const p = makeProjeto();
    const base = p.arquivos![0]!;
    p.arquivos = [
      { ...base, id: "v1", nome: "orcamento-v1.pdf", categoria: "orcamento", dataUpload: "2026-07-01" },
      { ...base, id: "doc", nome: "manual.pdf" },
      { ...base, id: "v2", nome: "orcamento-v2.pdf", categoria: "orcamento", dataUpload: "2026-07-10" },
    ];
    const dto = toPortalProjeto(p, []);
    expect(dto.arquivos.map((a) => a.id)).toEqual(["doc", "v2"]);
    expect(dto.arquivos.find((a) => a.id === "v2")!.orcamento).toBe(true);
  });

  it("cópia não marcada do mesmo ficheiro sai (upload duplicado do orçamento)", () => {
    const p = makeProjeto();
    const base = p.arquivos![0]!;
    p.arquivos = [
      { ...base, id: "dup", nome: "Orçamento.html", dataUpload: "2026-08-10T16:55:37Z" },
      { ...base, id: "orc", nome: "orçamento.HTML", categoria: "orcamento", dataUpload: "2026-08-10T16:55:47Z" },
      { ...base, id: "outro", nome: "manual.pdf" },
    ];
    const dto = toPortalProjeto(p, []);
    expect(dto.arquivos.map((a) => a.id)).toEqual(["orc", "outro"]);
  });

  it("ficheiro do cliente com o nome do orçamento continua a aparecer (secção própria)", () => {
    const p = makeProjeto();
    const base = p.arquivos![0]!;
    p.arquivos = [
      { ...base, id: "orc", nome: "Orçamento.html", categoria: "orcamento" },
      { ...base, id: "cli", nome: "Orçamento.html", origem: "cliente" },
    ];
    const dto = toPortalProjeto(p, []);
    expect(dto.arquivos.map((a) => a.id)).toEqual(["orc", "cli"]);
  });

  it("marca como 'cliente' só o que o cliente enviou (pathname/blobUrl nunca saem)", () => {
    const p = makeProjeto();
    const base = p.arquivos![0]!;
    p.arquivos = [
      base,
      { ...base, id: "a2", nome: "foto-avaria.jpg", tipo: "image/jpeg", origem: "cliente" },
    ];
    const dto = toPortalProjeto(p, pagamentos);
    expect(dto.arquivos.map((a) => a.origem)).toEqual(["nos", "cliente"]);
    for (const a of dto.arquivos) {
      expect(a).not.toHaveProperty("pathname");
      expect(a).not.toHaveProperty("blobUrl");
      expect(a).not.toHaveProperty("url");
    }
  });
});

describe("toPortalCliente", () => {
  it("só a whitelist; notas nunca saem", () => {
    const c: Cliente = {
      id: "c1",
      nome: "Maria",
      empresa: POISON,
      email: "m@x.pt",
      telefone: "912",
      nif: null,
      morada: null,
      notas: POISON,
      criadoEm: "2026-01-01",
    };
    const dto = toPortalCliente(c);
    expect(dto).toEqual({ nome: "Maria", email: "m@x.pt", telefone: "912", nif: null, morada: null });
    expect(JSON.stringify(dto)).not.toContain(POISON);
  });
});
