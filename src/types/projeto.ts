export const PROJETO_STATUS = [
  "ideia-interna",
  "ideia-cliente",
  "proximo",
  "em-curso",
  "aguardando",
  "terminado",
  "fechado",
] as const;

export type ProjetoStatus = (typeof PROJETO_STATUS)[number];

export const STATUS_LABELS: Record<ProjetoStatus, string> = {
  "ideia-interna": "Ideia (interna)",
  "ideia-cliente": "Ideia (cliente)",
  proximo: "Próximos",
  "em-curso": "Em curso",
  aguardando: "A aguardar",
  terminado: "Finalizado",
  fechado: "Fechado",
};

// Estados do FLUXO de trabalho — os que aparecem no dropdown de estado do form.
// As Ideias (ideia-*) não estão aqui: são marcadas por checkbox, que desliga o
// dropdown (ver ProjetoForm). São mutuamente exclusivas — um projecto tem UM
// status.
export const PROJETO_STATUS_FLUXO: ProjetoStatus[] = [
  "proximo",
  "em-curso",
  "aguardando",
  "terminado",
  "fechado",
];

// Lembretes são visíveis para projectos em QUALQUER estado — um lembrete nunca
// desaparece por o projecto fechar (follow-ups, garantias, ideias). O selector
// do NovoLembreteGlobalButton oferece o mesmo conjunto que a página mostra.
export const LEMBRETES_VISIVEIS_STATUSES: ProjetoStatus[] = [...PROJETO_STATUS];

// Fonte ÚNICA de "projecto activo" — usada pelo badge da sidebar/bottomnav E
// pelo título de /painel/projetos, para os números baterem certo (antes o badge
// contava em-curso/proximo e o título contava tudo menos fechado).
export const PROJETO_ATIVO_STATUSES: ProjetoStatus[] = ["em-curso", "proximo"];
export function isProjetoAtivo(status: ProjetoStatus): boolean {
  return PROJETO_ATIVO_STATUSES.includes(status);
}

/** true = o projecto é uma ideia (interna ou de cliente), não está no fluxo. */
export function isProjetoIdeia(status: ProjetoStatus): boolean {
  return status === "ideia-interna" || status === "ideia-cliente";
}

export const STATUS_GROUPS = {
  ativo: ["em-curso"] as ProjetoStatus[],
  proximo: ["proximo"] as ProjetoStatus[],
  aguarda: ["aguardando"] as ProjetoStatus[],
  pronto: ["terminado"] as ProjetoStatus[],
  arquivo: ["fechado"] as ProjetoStatus[],
  comprometido: ["em-curso", "aguardando", "terminado"] as ProjetoStatus[],
  ideias: ["ideia-interna", "ideia-cliente"] as ProjetoStatus[],
  ideiasInternas: ["ideia-interna"] as ProjetoStatus[],
  ideiasCliente: ["ideia-cliente"] as ProjetoStatus[],
};

import type { ServicoSlug } from "@/types/servico";

export const PROJETO_TIPO = [
  // assistencia-tecnica
  "diagnostico",
  "montagem",
  "reparacao",
  "troca-pecas",
  "acessorios",
  // web-digital
  "web",
  "app",
  "automacao",
  "marketing",
  "redes-sociais",
  "consultoria",
  "formacao",
  // software-recuperacao
  "recuperacao-dados",
  "formatacao",
  // sem categoria
  "intermediacao",
  "outro",
] as const;

export type ProjetoTipo = (typeof PROJETO_TIPO)[number];

export const PROJETO_TIPO_LABEL: Record<ProjetoTipo, string> = {
  diagnostico: "Diagnóstico",
  montagem: "Montagem",
  reparacao: "Reparação",
  "troca-pecas": "Troca de peças",
  acessorios: "Acessórios",
  web: "Web",
  app: "App",
  automacao: "Automação",
  marketing: "Marketing",
  "redes-sociais": "Redes sociais",
  consultoria: "Consultoria",
  formacao: "Formação",
  "recuperacao-dados": "Recuperação de dados",
  formatacao: "Formatação",
  intermediacao: "Intermediação",
  outro: "Outro",
};

export const TIPO_TO_CATEGORIA: Record<ProjetoTipo, ServicoSlug | null> = {
  diagnostico: "assistencia-tecnica",
  montagem: "assistencia-tecnica",
  reparacao: "assistencia-tecnica",
  "troca-pecas": "assistencia-tecnica",
  acessorios: "assistencia-tecnica",
  web: "web-digital",
  app: "web-digital",
  automacao: "web-digital",
  marketing: "web-digital",
  "redes-sociais": "web-digital",
  consultoria: "web-digital",
  formacao: "web-digital",
  "recuperacao-dados": "software-recuperacao",
  formatacao: "software-recuperacao",
  intermediacao: null,
  outro: null,
};

/**
 * Primeiro tipo BASE de uma selecção — ignora os tipos personalizados
 * (Definições → tipos custom), cujos slugs não existem em PROJETO_TIPO.
 *
 * O campo legado `projeto.tipo` é `z.enum(PROJETO_TIPO)` no schema do upsert:
 * mandar-lhe um slug personalizado devolvia 400 "Invalid payload" e o projecto
 * não guardava. `projeto.tipos` é que aceita base + custom.
 */
export function firstBaseTipo(
  tipos: readonly string[] | null | undefined
): ProjetoTipo | null {
  if (!tipos) return null;
  const base: readonly string[] = PROJETO_TIPO;
  return (tipos.find((t) => base.includes(t)) as ProjetoTipo | undefined) ?? null;
}

export const CATEGORIA_TIPOS: Record<ServicoSlug, ProjetoTipo[]> = {
  "assistencia-tecnica": ["diagnostico", "montagem", "reparacao", "troca-pecas", "acessorios"],
  "web-digital": ["web", "app", "automacao", "marketing", "redes-sociais", "consultoria", "formacao"],
  "software-recuperacao": ["recuperacao-dados", "formatacao"],
};

export const PROJETO_LOCAL = ["oficina", "casa-cliente", "remoto"] as const;
export type ProjetoLocal = (typeof PROJETO_LOCAL)[number];

// Categorias das linhas de custo. ATENÇÃO: isto é VISÍVEL PARA O CLIENTE — o
// portal /p/[token] mostra o desdobramento por categoria (ver portal-dto.ts).
// Por isso só entram aqui coisas que se cobram a um cliente; os custos internos
// (ferramentas, stock, marketing) vivem nas categorias de despesa, que o cliente
// não vê. `mao-obra` não tem equivalente nas despesas de propósito: o tempo do
// Iuri não é dinheiro que saiu do bolso.
export const LINHA_CATEGORIA = [
  "peca",
  "mao-obra",
  "portes",
  "deslocacao",
  "software",
  "outro",
] as const;
export type LinhaCategoria = (typeof LINHA_CATEGORIA)[number];

export const LINHA_CATEGORIA_LABEL: Record<LinhaCategoria, string> = {
  peca: "Peça",
  "mao-obra": "Mão-de-obra",
  portes: "Portes & envios",
  deslocacao: "Deslocação",
  software: "Software & licenças",
  outro: "Outro",
};

export interface ProjetoLinha {
  id: string;
  descricao: string;
  categoria: LinhaCategoria;
  quantidade: number;
  precoUnit: number;
  // true = esta linha foi um gasto real da empresa (peça/serviço que o Iuri
  // comprou/pagou do bolso), não só o preço que o cliente paga. Alimenta os
  // relatórios de gastos. Default false (undefined trata-se como false).
  gastoEmpresa?: boolean;
  // Data (yyyy-mm-dd) em que o gasto aconteceu — regime de caixa. Opcional:
  // vazio/null cai no comportamento antigo (mês do dataCriado do projecto).
  data?: string | null;
}

/** Total de gasto da empresa nas linhas de um projecto (só linhas marcadas). */
export function computeGastoEmpresa(linhas: ProjetoLinha[] | null | undefined): number {
  if (!linhas) return 0;
  return linhas.reduce(
    (sum, l) => (l.gastoEmpresa ? sum + l.quantidade * l.precoUnit : sum),
    0
  );
}

// Componentes de uma máquina na ficha de assistência técnica. Uma torre não se
// descreve com marca/modelo (foi montada por alguém), e mesmo num portátil pode
// ser preciso registar o disco ou o pente de RAM que lá está — com número de
// série próprio, para garantias e para provar o que entrou e o que saiu.
export const HW_COMPONENTE_TIPO = [
  "cpu",
  "motherboard",
  "ram",
  "armazenamento",
  "gpu",
  "fonte",
  "cooler",
  "caixa",
  "ecra",
  "bateria",
  "rede",
  "periferico",
  "outro",
] as const;

export type HardwareComponenteTipo = (typeof HW_COMPONENTE_TIPO)[number];

export const HW_COMPONENTE_LABEL: Record<HardwareComponenteTipo, string> = {
  cpu: "Processador",
  motherboard: "Motherboard",
  ram: "Memória RAM",
  armazenamento: "Disco / SSD",
  gpu: "Placa gráfica",
  fonte: "Fonte",
  cooler: "Cooler / ventoinhas",
  caixa: "Caixa",
  ecra: "Ecrã",
  bateria: "Bateria",
  rede: "Rede / Wi-Fi",
  periferico: "Periférico",
  outro: "Outro",
};

/** Peças que uma montagem/torre leva por norma — botão de preenchimento rápido. */
export const HW_COMPONENTES_PC_TIPICO: HardwareComponenteTipo[] = [
  "cpu",
  "cooler",
  "motherboard",
  "ram",
  "armazenamento",
  "gpu",
  "fonte",
  "caixa",
];

export interface HardwareComponente {
  id: string;
  tipo: HardwareComponenteTipo;
  /** O que é, por palavras nossas: "Ryzen 5 5600", "Kingston Fury 2x8GB 3200". */
  descricao: string;
  /** Nº de série / part number da peça (garantias, provar o que entrou). */
  serial?: string | null;
  /** true = peça que NÓS fornecemos; false/ausente = já vinha na máquina. */
  nosso?: boolean;
}

export interface ProjetoHardware {
  marca?: string;
  modelo?: string;
  serial?: string;
  acessoriosEntregues?: string;
  // Ficha de componentes (ver HW_COMPONENTE_TIPO). Uso INTERNO: o portal do
  // cliente continua a mostrar só marca/modelo (ver portal-dto).
  componentes?: HardwareComponente[];
}

export interface ProjetoArquivo {
  id: string; // uuid
  pathname: string; // path no blob store: projetos/<projetoId>/<uuid>.<ext>
  blobUrl?: string; // URL cru do Vercel Blob — APENAS server-side, nunca enviado ao cliente
  url: string; // URL do proxy autenticado servido ao cliente
  nome: string; // nome original do ficheiro
  tamanho: number; // bytes
  tipo: string; // MIME
  dataUpload: string; // ISO
  // Quem carregou. Ausente/null = nós (entregável). "cliente" = enviado pelo
  // próprio cliente no portal — no portal aparece em "Os seus ficheiros", não
  // como entregável, e no painel leva o chip "cliente".
  origem?: "cliente" | null;
  // Marcação manual no painel. "orcamento" ganha cartão destacado no portal
  // (o total fica só no cartão "Valores") — feedback de cliente que não
  // encontrava o orçamento no meio dos entregáveis (2026-08). Só para
  // ficheiros nossos.
  categoria?: "orcamento" | null;
  // Descrição curta escrita no painel ("Orçamento revisto sem a placa gráfica").
  // É TEXTO VISÍVEL AO CLIENTE no portal, por baixo do nome — nunca meter aqui
  // notas internas. Vazio/null = sem descrição.
  descricao?: string | null;
}

/** Tecto da descrição de um ficheiro (validado na API e no painel). */
export const ARQUIVO_DESCRICAO_MAX = 200;

/** Remove campos server-only antes de enviar arquivos ao cliente. */
export function sanitizeArquivo(a: ProjetoArquivo): ProjetoArquivo {
  const { blobUrl: _blobUrl, ...rest } = a;
  void _blobUrl;
  return rest;
}

export interface ProjetoLink {
  id: string;
  label: string;
  url: string; // https:// (validado na API)
}

export interface ProjetoPortal {
  tokenHash: string; // SHA-256 hex do token — é ele que resolve o /p/[token]
  // Token CIFRADO (AES-256-GCM, chave em PORTAL_TOKEN_KEY) para o painel poder
  // voltar a mostrar o link sempre que for preciso. Uma fuga da BD sozinha não
  // abre portais — sem a chave de env o campo é inútil. null/ausente = portal
  // gerado antes desta funcionalidade (só recuperável regenerando).
  tokenEnc?: string | null;
  criadoEm: string; // ISO
  revogadoEm: string | null;
}

export interface Projeto {
  id: string;
  titulo: string;
  // Código de referência estável por categoria (ex.: AT-0043). Gerado no
  // servidor ao criar; nunca muda depois. Ver refPrefixForCategoria.
  ref: string | null;
  clienteId: string | null;
  clienteNome: string | null;
  proximaAccao: string | null;
  status: ProjetoStatus;
  categoria: ServicoSlug | null;
  tipo: ProjetoTipo | null;
  tipos: string[] | null; // base ProjetoTipo + custom slugs
  prazo: string | null;
  dataCriado: string | null;
  dataFechado: string | null;
  valorEstimado: number | null;
  valorPago: number | null;
  metodoPagamento: string | null;
  local: ProjetoLocal | null;
  notasResumo: string | null;
  bodyMd: string | null;
  linhas: ProjetoLinha[] | null;
  garantiaAte: string | null;
  hardware: ProjetoHardware | null;
  arquivos: ProjetoArquivo[] | null;
  links: ProjetoLink[] | null;
  portal: ProjetoPortal | null;
}

/** Prefixo do código de referência por categoria (AT/WD/SR/GEN). */
export function refPrefixForCategoria(categoria: ServicoSlug | null): string {
  switch (categoria) {
    case "assistencia-tecnica":
      return "AT";
    case "web-digital":
      return "WD";
    case "software-recuperacao":
      return "SR";
    default:
      return "GEN";
  }
}

export function deriveCategoriasFromTipos(tipos: ProjetoTipo[] | null): ServicoSlug[] {
  if (!tipos || tipos.length === 0) return [];
  return [
    ...new Set(
      tipos.map((t) => TIPO_TO_CATEGORIA[t]).filter((c): c is ServicoSlug => c != null)
    ),
  ];
}
