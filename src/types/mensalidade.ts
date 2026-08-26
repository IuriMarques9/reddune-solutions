// Planos de pagamento recorrente ligados a um projecto: mensalidades (partir um
// valor em prestações) e anuidades (manutenção que se cobra todos os anos).
//
// REGRA CENTRAL: a base de dados guarda o PLANO (um documento), nunca as
// cobranças. As cobranças são DERIVADAS no render (ver src/lib/mensalidades.ts).
// Sem geração, sem cron a criar linhas, sem duplicados, sem drift — mudar o
// valor ou a data recalcula tudo.
//
// O dinheiro que entra continua a ser um `Pagamento` normal, com dois campos
// novos a dizer "sou a Nª cobrança do plano X". Por isso tudo o que já contava
// receita (relatórios, dívidas, top clientes, perfil do cliente, portal)
// continua a contar sem alterações.

import type { LinhaCategoria } from "@/types/projeto";

// Um plano é SEMPRE dinheiro a receber do cliente (decisão do Iuri,
// 2026-08-27: o tipo "despesa" foi removido). O que este plano nos custa vive
// no campo `custo` aqui ao lado; gastos sem plano associado são Despesas
// normais, como as ferramentas. Um caminho só para cada coisa.

export const MENSALIDADE_PERIODO = ["mensal", "anual"] as const;

export type MensalidadePeriodo = (typeof MENSALIDADE_PERIODO)[number];

export const PERIODO_LABEL: Record<MensalidadePeriodo, string> = {
  mensal: "Mensal",
  anual: "Anual",
};

/** Sufixo para valores: "366,67 € / mês". */
export const PERIODO_SUFIXO: Record<MensalidadePeriodo, string> = {
  mensal: "mês",
  anual: "ano",
};

/** Quantos meses separam duas cobranças consecutivas. */
export const PERIODO_MESES: Record<MensalidadePeriodo, number> = {
  mensal: 1,
  anual: 12,
};

/** Tecto do número de cobranças de um plano (validado na API e no painel). */
export const MENSALIDADE_MAX_COBRANCAS = 120;

export interface Mensalidade {
  id: string;
  projetoId: string;
  // Desnormalizado a partir do projecto no upsert, tal como em Pagamento — os
  // ecrãs de cliente não têm de ir buscar o projecto para saber de quem é.
  clienteId: string | null;
  /** "Mensalidade 12x", "Manutenção anual". Livre. */
  titulo: string;
  /** Valor BASE de CADA cobrança, s/ IVA (coerente com o resto do site). */
  valor: number;
  // Este plano leva IVA por cima? Herda `Projeto.comIva` ao criar, mas pode
  // divergir (uma manutenção facturada com IVA num projecto sem). Opcional:
  // planos antigos sem o campo = false. `Cobranca.valor` já sai com o IVA
  // aplicado — ver cobrancasDe — para bater com `Pagamento.valor`, que é bruto.
  comIva?: boolean;
  periodo: MensalidadePeriodo;
  // ÚNICA âncora de datas: yyyy-mm-dd da primeira cobrança. Não há campo
  // `diaVencimento` separado de propósito — dois campos que podem discordar são
  // uma classe inteira de bugs. O dia do mês sai desta data.
  //
  // NULL = plano combinado mas POR ARRANCAR: o preço está fechado e a linha já
  // está nos Custos, mas o calendário só nasce quando o cliente pagar (decisão
  // do Iuri). Sem data não há cobranças nenhumas — nem avisos, nem atrasos.
  primeiraCobranca: string | null;
  /** Quantas cobranças o plano tem no total (fixo; renovar = aumentar). */
  numeroCobrancas: number;
  // O interruptor. Desligar PÁRA de gerar cobranças futuras, mas as que já
  // venceram por pagar mantêm-se: uma dívida não desaparece por se desligar o
  // plano (ver cobrancasDe em src/lib/mensalidades.ts).
  ativo: boolean;
  // SEMPRE true (2026-08-26, decisão do Iuri: "o plano cria uma linha
  // automática nos Custos"). O plano é dono de uma fatia do orçamento — a sua
  // linha — e cobra-a em prestações. As Dívidas descontam-na do restante do
  // projecto, senão o mesmo dinheiro contava duas vezes: uma na linha, outra
  // nas cobranças por liquidar. Mantido no tipo pelos documentos já gravados.
  dentroDoValor: boolean;
  // Categoria da linha que o plano cria nos Custos quando `dentroDoValor` é
  // false. Ignorada no caso contrário. Default "software" — o caso comum
  // (manutenção, alojamento, licenças).
  categoriaCusto?: LinhaCategoria;
  // O que ESTE plano nos custa por período (alojamento, base de dados, domínio).
  // A margem é `valor − custo`, ambos em BASE s/ IVA. INTERNO: o cliente vê só
  // o que paga — nunca o custo nem a margem (ver portal-dto).
  // Ausente/0 = ainda não sabemos, ou não há custo (trabalho nosso é lucro).
  custo?: number;
  // O `custo` acima já vem com IVA (o que a factura da Vercel diz)? O IVA que
  // pagamos é dedutível, por isso a margem calcula-se sobre as BASES — senão o
  // custo aparecia inflacionado em 23% e a margem mentia para baixo.
  custoComIva?: boolean;
  /** Notas INTERNAS — nunca vão ao portal do cliente. */
  notas: string | null;
  criadoEm: string;
  /** ISO de quando o plano foi fechado (decisão no fim das cobranças). */
  fechadoEm: string | null;
}

export type CobrancaEstado = "paga" | "parcial" | "vencida" | "a-vencer" | "futura";

export const COBRANCA_ESTADO_LABEL: Record<CobrancaEstado, string> = {
  paga: "Paga",
  parcial: "Parcial",
  vencida: "Vencida",
  "a-vencer": "A vencer",
  futura: "Futura",
};

/**
 * Uma prestação do plano. NUNCA guardada na base de dados — calculada a partir
 * da Mensalidade + dos pagamentos que lhe apontam.
 */
export interface Cobranca {
  mensalidadeId: string;
  projetoId: string;
  clienteId: string | null;
  /** 1..numeroCobrancas. */
  numero: number;
  /** yyyy-mm-dd — o dia COMBINADO. */
  dataPrevista: string;
  /** BRUTO — o que o cliente paga por esta prestação, IVA incluído se o plano o leva. */
  valor: number;
  /** Soma dos pagamentos ligados a esta cobrança (também bruta). */
  pago: number;
  /** yyyy-mm-dd do último pagamento ligado — o dia REAL em que entrou. */
  dataPaga: string | null;
  // dataPaga − dataPrevista em dias. Negativo = pagou adiantado, 0 = em dia,
  // positivo = atrasado. É esta a diferença que os relatórios mostram: o
  // cliente pode pagar a anuidade num dia que não é o do início do plano.
  desvioDias: number | null;
  estado: CobrancaEstado;
}
