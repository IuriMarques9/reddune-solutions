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
import { comIva, cents } from "@/lib/iva";
import type { Mensalidade } from "@/types/mensalidade";
import { PERIODO_SUFIXO } from "@/types/mensalidade";
import { cobrancasDe, proximaCobranca, resumoMensalidade } from "@/lib/mensalidades";
import { todayLisbonYmd } from "@/lib/dates";

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
  // Legenda escrita por nós no painel ("Orçamento sem a placa gráfica"). É
  // texto DELIBERADAMENTE público — o painel avisa disso no campo.
  descricao: string | null;
};
export type PortalLinkDTO = { id: string; label: string; url: string };
export type PortalValoresDTO = {
  /** Total a pagar — JÁ com IVA quando o projecto o leva. É o número grande. */
  orcado: number;
  /** Base s/ IVA. Igual a `orcado` quando o projecto não leva IVA. */
  orcadoBase: number;
  /** Parcela de IVA do orçamento (0 quando não leva). */
  iva: number;
  comIva: boolean;
  /** Bruto recebido — o que o cliente entregou. */
  pago: number;
  emFalta: number;
  /** Subtotais por categoria: sempre BASE s/ IVA (as linhas nunca levam IVA). */
  categorias: { label: string; total: number }[];
  // Planos de pagamento em prestações, quando existem. O cliente vê O PLANO e o
  // que falta — nunca as notas internas, o histórico de atrasos, nem se o plano
  // conta dentro do valor do projecto (isso é contabilidade nossa).
  planos: PortalPlanoDTO[];
};

export type PortalPlanoDTO = {
  titulo: string;
  /** Valor de cada cobrança JÁ com IVA quando o plano o leva — é o que o cliente paga. */
  valor: number;
  periodoSufixo: string;
  total: number;
  pagas: number;
  /** yyyy-mm-dd da próxima por liquidar; null se estiver tudo pago. */
  proximaData: string | null;
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

export function toPortalProjeto(
  projeto: Projeto,
  pagamentos: Pagamento[],
  mensalidades: Mensalidade[] = []
): PortalProjetoDTO {
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
    // Sem orçamento fechado o "total" é o que já foi pago — e esse valor já
    // vem bruto, por isso não se lhe acrescenta IVA nenhum.
    const base = orcado ?? pago;
    const levaIva = orcado != null && (projeto.comIva ?? false);
    const total = comIva(base, levaIva);
    // Subtotais por categoria de linha (ver LINHA_CATEGORIA) — sem quantidades,
    // preços unitários nem descrições (as linhas revelam margens). Construído a
    // partir das linhas do projecto, por isso acompanha categorias novas.
    const porCategoria = new Map<LinhaCategoria, number>();
    for (const l of linhas) {
      porCategoria.set(l.categoria, (porCategoria.get(l.categoria) ?? 0) + l.quantidade * l.precoUnit);
    }
    // Planos activos deste projecto, do ponto de vista do cliente: o que
    // combinámos e onde vamos. Os fechados/desligados não interessam.
    const hoje = todayLisbonYmd();
    const planos: PortalPlanoDTO[] = mensalidades
      .filter((m) => m.projetoId === projeto.id && m.ativo && !m.fechadoEm)
      .map((m) => {
        const cobrancas = cobrancasDe(m, pagamentos, hoje);
        const resumo = resumoMensalidade(m, cobrancas);
        return {
          titulo: m.titulo,
          // `Cobranca.valor` já vem bruto (ver cobrancasDe) — o cliente vê o que
          // vai pagar, coerente com o "orcado" ao lado, que também é bruto.
          valor: cobrancas[0]?.valor ?? m.valor,
          periodoSufixo: PERIODO_SUFIXO[m.periodo],
          total: m.numeroCobrancas,
          pagas: resumo.pagas,
          proximaData: proximaCobranca(cobrancas)?.dataPrevista ?? null,
        };
      });

    valores = {
      orcado: total,
      orcadoBase: base,
      iva: cents(total - base),
      comIva: levaIva,
      pago,
      emFalta: Math.max(0, cents(total - pago)),
      categorias: [...porCategoria.entries()].map(([c, total]) => ({
        label: LINHA_CATEGORIA_LABEL[c] ?? c,
        total,
      })),
      planos,
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
  const nomeAtual = normalizaNome(atual?.nome);

  return arquivos
    .filter(
      (a) =>
        !(a.categoria === "orcamento" && a.origem !== "cliente" && a.id !== atual?.id)
    )
    // Cópias NÃO marcadas do mesmo documento (upload repetido do mesmo ficheiro,
    // ou versão anterior que ficou por marcar) também saem: senão o cliente via
    // o orçamento no cartão destacado E outra vez como documento normal.
    .filter(
      (a) =>
        !(
          nomeAtual !== null &&
          a.id !== atual?.id &&
          a.origem !== "cliente" &&
          normalizaNome(a.nome) === nomeAtual
        )
    )
    .map((a) => ({
      id: a.id,
      nome: a.nome,
      tipo: a.tipo,
      tamanho: a.tamanho,
      data: a.dataUpload ?? null,
      origem: a.origem === "cliente" ? ("cliente" as const) : ("nos" as const),
      orcamento: atual !== null && a.id === atual.id,
      descricao: a.descricao?.trim() || null,
    }));
}

/** Nome comparável (case/acentos/espaços à parte) — null se não houver nome. */
function normalizaNome(nome: string | undefined | null): string | null {
  if (!nome) return null;
  return nome.trim().toLocaleLowerCase("pt-PT").normalize("NFC");
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
