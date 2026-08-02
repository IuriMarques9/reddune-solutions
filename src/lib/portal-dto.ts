import {
  STATUS_LABELS,
  LINHA_CATEGORIA_LABEL,
  PROJETO_TIPO_LABEL,
  type Projeto,
  type ProjetoTipo,
  type LinhaCategoria,
} from "@/types/projeto";
import type { Cliente } from "@/types/cliente";
import type { Pagamento } from "@/types/pagamento";

// DTOs do portal do cliente: allowlist EXPLÍCITA. Campo novo no Projeto/Cliente
// nunca chega ao portal sem ser adicionado aqui de propósito. Nunca fazer spread.
// Campos de texto livre (bodyMd, notasResumo, proximaAccao, descricao de linhas,
// notas de cliente/pagamento) ficam SEMPRE fora — podem conter notas internas.

export type PortalArquivoDTO = {
  id: string;
  nome: string;
  tipo: string;
  tamanho: number;
  // Data de upload (ISO) — mostrada no cartão do orçamento ("Enviado a …").
  data: string | null;
  // "cliente" = enviado pelo próprio cliente no portal (secção "Os seus
  // ficheiros"); "nos" = entregável nosso.
  origem: "cliente" | "nos";
  // Marcado no painel como orçamento — ganha o cartão destacado no portal.
  // Só o MAIS RECENTE dos marcados chega ao cliente (os antigos são histórico
  // do painel e ficam fora do DTO). Nunca true para ficheiros do cliente.
  orcamento: boolean;
};
export type PortalLinkDTO = { id: string; label: string; url: string };
export type PortalValoresDTO = {
  orcado: number;
  pago: number;
  emFalta: number;
  categorias: { label: string; total: number }[];
};

export type PortalProjetoDTO = {
  id: string;
  titulo: string;
  statusLabel: string;
  prazo: string | null;
  tipoLabels: string[];
  // garantiaAte fica FORA de propósito: o portal não mostra garantia (redesign 2026-07).
  hardware: { marca: string | null; modelo: string | null } | null;
  arquivos: PortalArquivoDTO[];
  links: PortalLinkDTO[];
  valores: PortalValoresDTO | null;
};

export type PortalClienteDTO = {
  nome: string;
  email: string | null;
  telefone: string | null;
  nif: string | null;
  morada: string | null;
};

export function toPortalProjeto(projeto: Projeto, pagamentos: Pagamento[]): PortalProjetoDTO {
  const linhas = projeto.linhas ?? [];
  const linhasTotal = linhas.reduce((s, l) => s + l.quantidade * l.precoUnit, 0);
  // Com linhas, o Total vem da SOMA das linhas (bate sempre com os subtotais por
  // categoria mostrados — evita "Total 400" vs "subtotais 550"). Sem linhas, cai
  // no valorEstimado guardado.
  const orcado = linhas.length ? linhasTotal : projeto.valorEstimado ?? null;
  const pago = pagamentos.reduce((s, p) => s + p.valor, 0);

  let valores: PortalValoresDTO | null = null;
  // Mostrar valores se há orçamento OU se já houve pagamentos (ex.: sinal pago
  // antes de fechar o orçamento — o cliente deve ver que o sinal foi registado).
  if (orcado != null || pago > 0) {
    const total = orcado ?? pago;
    // Subtotais por categoria de linha (ver LINHA_CATEGORIA) — sem quantidades,
    // preços unitários nem descrições (as linhas revelam margens). Construído a
    // partir das linhas do projecto, por isso acompanha categorias novas.
    const porCategoria = new Map<LinhaCategoria, number>();
    for (const l of linhas) {
      porCategoria.set(l.categoria, (porCategoria.get(l.categoria) ?? 0) + l.quantidade * l.precoUnit);
    }
    valores = {
      orcado: total,
      pago,
      emFalta: Math.max(0, total - pago),
      categorias: [...porCategoria.entries()].map(([c, total]) => ({
        label: LINHA_CATEGORIA_LABEL[c] ?? c,
        total,
      })),
    };
  }

  return {
    id: projeto.id,
    titulo: projeto.titulo,
    statusLabel: STATUS_LABELS[projeto.status] ?? projeto.status,
    prazo: projeto.prazo ?? null,
    tipoLabels: (projeto.tipos ?? (projeto.tipo ? [projeto.tipo] : [])).map(
      (t) => PROJETO_TIPO_LABEL[t as ProjetoTipo] ?? t
    ),
    hardware: projeto.hardware
      ? { marca: projeto.hardware.marca ?? null, modelo: projeto.hardware.modelo ?? null }
      : null,
    arquivos: toPortalArquivos(projeto.arquivos ?? []),
    links: (projeto.links ?? []).map((k) => ({ id: k.id, label: k.label, url: k.url })),
    valores,
  };
}

// Pode haver vários ficheiros marcados como orçamento no painel (histórico de
// versões), mas o cliente só vê O MAIS RECENTE — os antigos nem entram no DTO.
// Empate de datas resolve para o último da lista (= ordem de upload).
function toPortalArquivos(
  arquivos: NonNullable<Projeto["arquivos"]>
): PortalArquivoDTO[] {
  const marcados = arquivos.filter(
    (a) => a.categoria === "orcamento" && a.origem !== "cliente"
  );
  const atual = marcados.reduce<(typeof marcados)[number] | null>(
    (melhor, a) =>
      !melhor || (a.dataUpload ?? "") >= (melhor.dataUpload ?? "") ? a : melhor,
    null
  );

  return arquivos
    .filter(
      (a) =>
        !(a.categoria === "orcamento" && a.origem !== "cliente" && a.id !== atual?.id)
    )
    .map((a) => ({
      id: a.id,
      nome: a.nome,
      tipo: a.tipo,
      tamanho: a.tamanho,
      data: a.dataUpload ?? null,
      origem: a.origem === "cliente" ? ("cliente" as const) : ("nos" as const),
      orcamento: atual !== null && a.id === atual.id,
    }));
}

export function toPortalCliente(c: Cliente): PortalClienteDTO {
  return {
    nome: c.nome,
    email: c.email ?? null,
    telefone: c.telefone ?? null,
    nif: c.nif ?? null,
    morada: c.morada ?? null,
  };
}
