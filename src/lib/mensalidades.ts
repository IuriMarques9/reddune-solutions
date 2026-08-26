// Lógica dos planos de pagamento recorrente. Funções PURAS sobre dados já
// carregados (sem DB), tal como src/lib/gastos.ts faz para os gastos — é isto
// que garante que a ficha do projecto, as dívidas, os relatórios, o calendário
// e o portal dão todos a mesma resposta.
//
// As cobranças NUNCA são guardadas: derivam da Mensalidade (valor, período,
// data da primeira, quantas) e dos pagamentos que lhe apontam. Ver a nota de
// arquitectura em src/types/mensalidade.ts.
import {
  PERIODO_MESES,
  type Cobranca,
  type CobrancaEstado,
  type Mensalidade,
} from "@/types/mensalidade";
import type { Pagamento } from "@/types/pagamento";
import { comIva } from "@/lib/iva";

/** Antecedência com que uma cobrança por pagar passa a "a-vencer". */
export const A_VENCER_DIAS = 7;

// Tolerância de meio cêntimo nas comparações de dinheiro: 366.67 × 12 não dá
// exactamente 4400 em vírgula flutuante, e uma cobrança paga ao cêntimo não
// pode ficar eternamente "parcial" por causa disso.
const CENT = 0.005;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function parseYmd(ymd: string): [number, number, number] {
  const [y, m, d] = ymd.slice(0, 10).split("-").map(Number);
  return [y, m, d];
}

/**
 * Soma `n` meses a uma data yyyy-mm-dd, limitando o dia ao último do mês de
 * destino: 31 de Janeiro + 1 mês = 28 (ou 29) de Fevereiro. Sem isto, um plano
 * começado a dia 31 saltava para o mês seguinte de dois em dois meses.
 */
export function addMeses(ymd: string, n: number): string {
  const [y, m, d] = parseYmd(ymd);
  const total = y * 12 + (m - 1) + n;
  const ny = Math.floor(total / 12);
  const nm = ((total % 12) + 12) % 12; // 0..11, correcto também para n negativo
  // Dia 0 do mês seguinte = último dia deste. UTC para não apanhar horário de verão.
  const maxDia = new Date(Date.UTC(ny, nm + 1, 0)).getUTCDate();
  return `${ny}-${pad(nm + 1)}-${pad(Math.min(d, maxDia))}`;
}

/** Dias inteiros entre duas datas yyyy-mm-dd (negativo se `para` for anterior). */
export function diffDias(de: string, para: string): number {
  const [ay, am, ad] = parseYmd(de);
  const [by, bm, bd] = parseYmd(para);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000);
}

function estadoDe(
  valor: number,
  pago: number,
  dataPrevista: string,
  hoje: string
): CobrancaEstado {
  if (pago + CENT >= valor) return "paga";
  if (pago > 0) return "parcial";
  if (dataPrevista < hoje) return "vencida";
  // Vencer HOJE ainda não é estar em atraso — cai em "a-vencer" (diff 0).
  if (diffDias(hoje, dataPrevista) <= A_VENCER_DIAS) return "a-vencer";
  return "futura";
}

/**
 * Cobranças de UM plano. `pagamentos` pode ser a lista toda — só entram os que
 * apontam a esta mensalidade.
 *
 * Plano desligado (`ativo: false`): pára de gerar cobranças FUTURAS, mas as que
 * já venceram por pagar mantêm-se. Uma dívida não desaparece por se desligar o
 * plano; desligar só quer dizer "não cobres mais a partir daqui".
 */
export function cobrancasDe(
  m: Mensalidade,
  pagamentos: Pagamento[],
  hoje: string
): Cobranca[] {
  const porNumero = new Map<number, { pago: number; dataPaga: string | null }>();
  for (const p of pagamentos) {
    if (p.mensalidadeId !== m.id) continue;
    const n = p.cobrancaNumero;
    if (n == null || !Number.isFinite(n)) continue;
    const slot = porNumero.get(n) ?? { pago: 0, dataPaga: null };
    slot.pago += p.valor;
    // A data REAL: o dia em que o dinheiro entrou, que pode não ser o previsto.
    // Com pagamentos parciais fica o mais recente (a cobrança fechou aí).
    const d = p.data ? p.data.slice(0, 10) : null;
    if (d && (!slot.dataPaga || d > slot.dataPaga)) slot.dataPaga = d;
    porNumero.set(n, slot);
  }

  const passo = PERIODO_MESES[m.periodo];
  // BRUTO: `m.valor` é a base s/ IVA (como o valorEstimado e as linhas), mas o
  // que se compara com os pagamentos é o que o cliente entrega. Sem isto, numa
  // prestação de 366,67 € base o cliente pagava 451,00 € e a cobrança ficava
  // eternamente "parcial" — o pago passava o valor e nunca fechava certo.
  const valorBruto = comIva(m.valor, m.comIva);
  const out: Cobranca[] = [];
  for (let numero = 1; numero <= m.numeroCobrancas; numero++) {
    const dataPrevista = addMeses(m.primeiraCobranca, (numero - 1) * passo);
    const slot = porNumero.get(numero);
    const pago = slot?.pago ?? 0;
    const dataPaga = slot?.dataPaga ?? null;
    if (!m.ativo && pago <= 0 && dataPrevista > hoje) continue;
    out.push({
      mensalidadeId: m.id,
      projetoId: m.projetoId,
      clienteId: m.clienteId,
      numero,
      dataPrevista,
      valor: valorBruto,
      pago,
      dataPaga,
      desvioDias: dataPaga ? diffDias(dataPrevista, dataPaga) : null,
      estado: estadoDe(valorBruto, pago, dataPrevista, hoje),
    });
  }
  return out;
}

/** Cobranças de vários planos, achatadas e ordenadas por data prevista. */
export function todasCobrancas(
  mensalidades: Mensalidade[],
  pagamentos: Pagamento[],
  hoje: string
): Cobranca[] {
  return mensalidades
    .flatMap((m) => cobrancasDe(m, pagamentos, hoje))
    .sort((a, b) => a.dataPrevista.localeCompare(b.dataPrevista) || a.numero - b.numero);
}

export type ResumoMensalidade = {
  /** Cobranças geradas (pode ser menos que numeroCobrancas se o plano está desligado). */
  geradas: number;
  /** Quantas estão totalmente pagas. */
  pagas: number;
  /** Total BRUTO do plano se corresse até ao fim. */
  valorTotal: number;
  /** Dinheiro já recebido através deste plano. */
  recebido: number;
  /** O que falta receber (inclui parciais e futuras). */
  porCobrar: number;
  /** Cobranças vencidas ou pagas a meio. */
  vencidas: number;
  /** Todas as cobranças do plano estão pagas — é aqui que se pergunta renovar ou fechar. */
  terminada: boolean;
};

export function resumoMensalidade(m: Mensalidade, cobrancas: Cobranca[]): ResumoMensalidade {
  const minhas = cobrancas.filter((c) => c.mensalidadeId === m.id);
  const pagas = minhas.filter((c) => c.estado === "paga").length;
  const recebido = minhas.reduce((s, c) => s + c.pago, 0);
  const porCobrar = minhas.reduce((s, c) => s + Math.max(0, c.valor - c.pago), 0);
  return {
    geradas: minhas.length,
    pagas,
    valorTotal: comIva(m.valor, m.comIva) * m.numeroCobrancas,
    recebido,
    porCobrar,
    vencidas: minhas.filter((c) => c.estado === "vencida" || c.estado === "parcial").length,
    // Conta contra o número TOTAL do plano, não contra as geradas: um plano
    // desligado a meio não é um plano terminado.
    terminada: pagas >= m.numeroCobrancas,
  };
}

/** A próxima cobrança por liquidar (a mais antiga não paga). */
export function proximaCobranca(cobrancas: Cobranca[]): Cobranca | null {
  const abertas = cobrancas
    .filter((c) => c.estado !== "paga")
    .sort((a, b) => a.dataPrevista.localeCompare(b.dataPrevista));
  return abertas[0] ?? null;
}

/** Cobranças que já deviam estar pagas (vencidas ou pagas só em parte). */
export function cobrancasVencidas(cobrancas: Cobranca[]): Cobranca[] {
  return cobrancas
    .filter((c) => c.estado === "vencida" || c.estado === "parcial")
    .sort((a, b) => a.dataPrevista.localeCompare(b.dataPrevista));
}

/** Cobranças a vencer nos próximos `dias` (inclui hoje). */
export function cobrancasAVencer(cobrancas: Cobranca[], hoje: string, dias: number): Cobranca[] {
  return cobrancas.filter((c) => {
    if (c.estado === "paga") return false;
    const d = diffDias(hoje, c.dataPrevista);
    return d >= 0 && d <= dias;
  });
}

/** Cobranças previstas num mês (chave yyyy-mm) — pagas ou não. */
export function cobrancasNoMes(cobrancas: Cobranca[], mes: string): Cobranca[] {
  return cobrancas.filter((c) => c.dataPrevista.slice(0, 7) === mes);
}

/** Soma do que está por receber num conjunto de cobranças. */
export function somaPorCobrar(cobrancas: Cobranca[]): number {
  return cobrancas.reduce((s, c) => s + Math.max(0, c.valor - c.pago), 0);
}

export type ReceitaRecorrente = {
  // Receita mensal recorrente: anuidades entram a dividir por 12. SEM IVA de
  // propósito — o IVA é do Estado, não é receita nossa (mesma regra do lucro
  // na ficha do projecto). O `comprometido` abaixo é bruto, porque é dinheiro
  // por cobrar ao cliente.
  mrr: number;
  planosAtivos: number;
  /** Tudo o que está combinado e ainda não entrou. */
  comprometido: number;
};

/**
 * Um plano só conta para o MRR enquanto tiver cobranças por liquidar: um plano
 * de 12 meses já todo pago não é receita recorrente, é história.
 */
export function receitaRecorrente(
  mensalidades: Mensalidade[],
  cobrancas: Cobranca[]
): ReceitaRecorrente {
  let mrr = 0;
  let planosAtivos = 0;
  for (const m of mensalidades) {
    if (!m.ativo || m.fechadoEm) continue;
    const abertas = cobrancas.filter((c) => c.mensalidadeId === m.id && c.estado !== "paga");
    if (abertas.length === 0) continue;
    planosAtivos += 1;
    mrr += m.valor / PERIODO_MESES[m.periodo];
  }
  return { mrr, planosAtivos, comprometido: somaPorCobrar(cobrancas) };
}

export type Pontualidade = {
  adiantadas: number;
  emDia: number;
  atrasadas: number;
  /** Média do desvio em dias sobre TODAS as cobranças pagas (0 se não houver). */
  mediaDias: number;
  total: number;
};

/**
 * O corte que o Iuri pediu: o cliente pode pagar a anuidade num dia que não é o
 * do início do plano. Isto mede essa diferença sobre o histórico todo.
 */
export function pontualidade(cobrancas: Cobranca[]): Pontualidade {
  const pagas = cobrancas.filter((c) => c.desvioDias != null);
  const soma = pagas.reduce((s, c) => s + (c.desvioDias ?? 0), 0);
  return {
    adiantadas: pagas.filter((c) => (c.desvioDias ?? 0) < 0).length,
    emDia: pagas.filter((c) => (c.desvioDias ?? 0) === 0).length,
    atrasadas: pagas.filter((c) => (c.desvioDias ?? 0) > 0).length,
    mediaDias: pagas.length > 0 ? soma / pagas.length : 0,
    total: pagas.length,
  };
}

/**
 * Cobrança com o contexto que os ecrãs precisam para a mostrar sem irem buscar
 * o plano e o projecto outra vez (calendário, sino, resumos). Construída uma
 * vez no servidor e passada aos componentes já pronta.
 */
export type CobrancaCalendario = Cobranca & {
  planoTitulo: string;
  totalCobrancas: number;
  projetoTitulo: string;
  clienteNome: string | null;
};

export function cobrancasParaCalendario(
  cobrancas: Cobranca[],
  mensalidades: Mensalidade[],
  projetos: { id: string; titulo: string; clienteNome: string | null }[]
): CobrancaCalendario[] {
  const planos = new Map(mensalidades.map((m) => [m.id, m]));
  const proj = new Map(projetos.map((p) => [p.id, p]));
  return cobrancas.map((c) => {
    const m = planos.get(c.mensalidadeId);
    const p = proj.get(c.projetoId);
    return {
      ...c,
      planoTitulo: m?.titulo ?? "Cobrança",
      totalCobrancas: m?.numeroCobrancas ?? c.numero,
      projetoTitulo: p?.titulo ?? "Projecto",
      clienteNome: p?.clienteNome ?? null,
    };
  });
}

/**
 * Parte do `valorEstimado` de um projecto que está a ser cobrada por planos
 * marcados "faz parte do valor do projecto" e ainda não entrou.
 *
 * É isto que impede a página Dívidas de contar o mesmo dinheiro duas vezes: sem
 * este desconto, o Trakinas aparecia com 5.400 € (valor do projecto) + 4.400 €
 * (as 12 mensalidades que SÃO esses 4.400 €) = 9.800 € por cobrar.
 */
export function porCobrarDentroDoValor(
  mensalidades: Mensalidade[],
  cobrancas: Cobranca[],
  projetoId: string
): number {
  const ids = new Set(
    mensalidades.filter((m) => m.projetoId === projetoId && m.dentroDoValor).map((m) => m.id)
  );
  if (ids.size === 0) return 0;
  return somaPorCobrar(cobrancas.filter((c) => ids.has(c.mensalidadeId)));
}
