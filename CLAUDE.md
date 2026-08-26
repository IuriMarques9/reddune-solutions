# reddune-solutions — notas para o Claude

Site Next.js (App Router) na Vercel + MongoDB. Login NextAuth (credenciais, utilizador único).
Área de admin em `/painel`. Deploy = push para `main` (Vercel auto).

## Regras de coerência do site (auditoria 2026-08-09)
- NUNCA escrever preços/prazos fixos em `content/{pt,en}/servicos/*.json` (FAQs,
  notas, leads) nem em `messages/*` — a tabela de preços vem da DB (painel).
  As STATS com € derivam da DB no render (`[slug]/page.tsx`: match do label da
  stat ao título do serviço); sem match fica o valor do ficheiro.
  Preços em texto corrido (note/FAQs/stats.sub) usam tokens
  `{{preco:label|fallback}}` (`src/lib/preco-tokens.ts`, 2026-08-24): resolvem
  contra TODAS as linhas do slug na DB (incluindo `ativo:false`) **e a seguir
  contra o grupo "Extras"** — primeiro match ganha, sem match fica o fallback do
  ficheiro. Prazos ("2-3 semanas") não têm fonte na DB — ficam fixos por decisão
  do Iuri.
- Contactos: fonte única = `src/lib/constants.ts` (config/contact.ts importa de lá;
  políticas interpolam {email}/{phone}). Settings de empresa no painel NÃO
  alimentam o site público (nota no próprio form).
- Sem promessas absolutas ("sempre", "nunca", "orçamento em 24h") — o Iuri
  rejeitou-as; padrão aceite: "respondemos rápido, normalmente no próprio dia" /
  "resposta no próprio dia útil". Excepções deliberadas (USP): "sem dados, sem
  custo" (labs parceiros orçados à parte) e garantia "30 dias mão-de-obra".
- Loja: só novos (3 anos) e recondicionados (18 meses, DL 84/2021); "segunda mão"
  removida do copy público (chave i18n `conditions.segunda-mao` fica p/ painel).
- Horário Seg–Sex 09h–18h é REAL: visível no ContactInfo + JSON-LD.
- Preços do site são s/ IVA: sufixo "+ IVA" na loja, nota no card escuro dos
  serviços, JSON-LD `valueAddedTaxIncluded: false`.

## IVA no painel (sessão 2026-08-26)
- `IVA_TAXA = 0.23` em `src/lib/iva.ts` — **fixa**, decisão do Iuri (continente/
  Algarve, sem campo no form). Mudá-la muda retroactivamente projectos antigos.
- **Linhas e `valorEstimado` são SEMPRE a BASE s/ IVA.** O IVA nunca é gravado
  lá dentro — deriva-se no render. Mantém a regra da casa (loja "+ IVA",
  JSON-LD `valueAddedTaxIncluded: false`).
- Dois flags, de propósito:
  - `Projeto.comIva` — o orçamento deste cliente leva IVA por cima. Edita-se no
    checkbox "Acrescentar IVA (23%)" do cartão Custos (`CustosCard`), não no
    `ProjetoForm` (que não mexe em dinheiro).
  - `Pagamento.comIva` — aquele recibo levou IVA. Herda o default do projecto ao
    registar mas PODE divergir: o mesmo projecto pode ter parte passada sem IVA.
- **`Pagamento.valor` é sempre BRUTO** (o que o cliente entregou). Por isso a
  dívida compara bruto contra bruto — `totalACobrar(projeto) − Σ pagamentos` —
  e fecha mesmo com pagamentos mistos. Nunca guardar a base num pagamento.
- `totalACobrar()` sai do `valorEstimado` e **ignora as linhas** de propósito
  (não muda números de projectos com `valorEstimado` dessincronizado). Só o
  portal usa `orcamentoBasePortal()`, que prefere a soma das linhas — era já o
  comportamento dele antes do IVA.
- **Receita/lucro são sempre líquidos de IVA** (`semIva`): o IVA recebido é do
  Estado. Vale no hero da ficha de projecto e nos Relatórios (receita mensal,
  receita por cliente, `rec` por tipo). `porReceber` e a dívida ficam brutos.
- Sítios que já sabem de IVA: ficha de projecto (hero, badges, aside,
  pagamentos, custos), /painel/dividas, /painel/clientes(+ficha), /painel,
  badge da sidebar, /painel/relatorios, kanban/cards e o portal do cliente.
- Planos recorrentes: `Mensalidade.comIva` segue a MESMA regra do
  `Pagamento.comIva` — herda `Projeto.comIva` ao criar, mas pode divergir. Ver
  a secção "Mensalidades e anuidades" abaixo.

## Mensalidades e anuidades (sessão 2026-08-26)
- Planos de pagamento recorrente ligados a um projecto: colecção `mensalidades`,
  tipos em `src/types/mensalidade.ts`, lógica pura em `src/lib/mensalidades.ts`.
- **As cobranças são DERIVADAS, nunca guardadas.** A BD guarda só o plano (uma
  linha); as N prestações calculam-se no render. Sem cron a gerar linhas, sem
  duplicados, sem drift — mudar o valor ou a data recalcula tudo. Não criar
  colecção de cobranças.
- `primeiraCobranca` é a ÚNICA âncora de datas. NÃO acrescentar `diaVencimento`:
  dois campos que podem discordar são uma classe inteira de bugs. Cobrança N =
  primeira + (N−1) meses (ou anos), com o dia limitado ao último do mês.
- O dinheiro continua a ser um `Pagamento` normal, com `mensalidadeId` +
  `cobrancaNumero` (ambos opcionais — os avulso de sempre não precisam de
  migração). É essa ligação que marca uma prestação como paga.
- **Duas datas por cobrança**: a prevista (combinada) e a real (`pagamento.data`).
  O desvio (`desvioDias`) alimenta o card "Pontualidade" dos Relatórios. O
  cliente pode pagar a anuidade num dia que não é o do início do plano.
- **`Cobranca.valor` é BRUTO** (`comIva(m.valor, m.comIva)`): `Mensalidade.valor`
  é a base, mas o que se compara com os pagamentos é o que o cliente entrega.
  Já o `mrr` de `receitaRecorrente()` fica na BASE — o IVA é do Estado.
- `dentroDoValor` evita contar o mesmo dinheiro duas vezes: ligado, as cobranças
  SÃO o `valorEstimado` partido em prestações. `/painel/dividas` e `/painel`
  descontam-no com `porCobrarDentroDoValor()` — mexer num, mexer no outro.
- Desligar (`ativo: false`) pára de gerar cobranças FUTURAS; as vencidas por
  pagar mantêm-se. Apagar o plano NÃO apaga dinheiro: os pagamentos ligados
  voltam a ser avulso (`desligarPagamentosDaMensalidade`).
- Portal do cliente vê o plano e o que falta. NUNCA atrasos, notas internas nem
  `dentroDoValor`.
- **TODO plano de receita é dono da sua linha nos Custos** (decisão do Iuri,
  2026-08-26 — o checkbox "faz parte do valor do projecto" foi REMOVIDO do
  formulário; `dentroDoValor` fica no tipo e é sempre true em receita, false em
  despesa). `sincronizarLinhaDoPlano()` cria/actualiza a linha marcada com
  `ProjetoLinha.mensalidadeId`.
  - A linha vale o **plano todo**: `quantidade = numeroCobrancas`. 12 × 366,67 €
    = os 4.400 € em falta. Com quantidade 1 a soma das linhas nunca dava o valor
    do projecto. Numa anuidade que possa não renovar: criar com **1 cobrança** e
    usar o botão Renovar — o orçamento nunca promete anos não contratados.
  - Nasce com `gastoEmpresa: false` (é dinheiro a receber) e `valorEstimado`
    passa a ser a soma das linhas — a mesma conta do CustosCard.
  - Como o valor do plano fica NAS LINHAS, `porCobrarDentroDoValor()` desconta-o
    do restante do projecto em TODOS os planos de receita — senão contava duas
    vezes: uma na linha, outra nas cobranças por liquidar.
  - Linhas escritas à mão nunca são tocadas; apagar o plano deixa a linha e só
    tira a marca. **Migração do Trakinas:** apagar a linha "3 fases da app 5400"
    e deixar "Entrada 1.000" + a linha do plano (12 × 366,67 = 4.400).
- **IVA por linha** (2026-08-26): `ProjetoLinha.ivaProprio` — só as linhas
  criadas por planos o têm, e vale o IVA do PLANO. O checkbox "Acrescentar IVA"
  do projecto passa a mandar **só nas linhas escritas à mão**; sem isto contava
  IVA por cima de um valor que já o levava. Quando alguma linha tem
  `ivaProprio`, `totalACobrar()` soma **linha a linha** (`totalACobrarLinhas`);
  sem nenhuma, mantém EXACTAMENTE a conta antiga sobre `valorEstimado` — para
  não mexer nos números de projectos com valorEstimado dessincronizado.
  `valorEstimado` continua a ser a BASE. Cartão de Custos e portal mostram
  "Base · IVA · Total a cobrar"; a linha leva o chip `c/ IVA` / `s/ IVA`.
- **Custo e margem no plano** (2026-08-26): `Mensalidade.custo` + `custoComIva`.
  `margemDoPlano()` devolve receita/custo/margem/pct, tudo em BASE s/ IVA — o
  IVA pago é dedutível, por isso desconta-se antes de comparar (137,40 € de
  factura = 111,71 € de custo real; margem 378,29 € e não 352,60 €).
  **INTERNO**: o portal nunca vê custo nem margem, só o que o cliente paga.
  Confirmar um recebimento grava o Pagamento E a Despesa do custo (editável no
  momento — a Vercel muda de preço). O tempo do Iuri NÃO se regista: trabalho é
  lucro, não é gasto.
- **Planos de DESPESA** (2026-08-26): `Mensalidade.tipo: "receita" | "despesa"`
  (ausente = receita). Um plano de despesa é o que NÓS pagamos por causa do
  projecto — alojamento, base de dados, domínio. Nasceu da constatação de que a
  manutenção de 490 €/ano da Márcia é receita, mas só uma parte sai do banco.
  - **`valor` é OPCIONAL** só neste tipo: serve de lembrete da renovação até a
    factura chegar. Com `valor: 0` a previsão NUNCA está paga sem confirmação —
    um `pago >= valor` ingénuo dava tudo por pago à nascença (ver `estadoDe`).
  - Confirmar (botão **Paguei**) grava uma `Despesa` ligada ao projecto, com
    `mensalidadeId`/`cobrancaNumero` — o mesmo gesto das cobranças, outro
    destino. Entra logo nos gastos e baixa o Lucro do projecto.
  - NUNCA: linha nos Custos, dívida do cliente, receita recorrente, IVA, nem
    aparecer no portal. `planosReceita()`/`planosDespesa()` filtram os ecrãs de
    dinheiro-a-receber (dívidas, visão geral, relatórios, portal).
  - **O tempo do Iuri não se regista aqui** — regra dele: trabalho é lucro, não
    é gasto. Só entra o que sai mesmo do banco.
  - `todasCobrancas` aceita pagamentos E despesas na mesma lista: apontam ao
    plano pelo mesmo campo e nunca se cruzam.
- Push diário: `/api/cron/mensalidades` (Vercel Cron 08:00 UTC em `vercel.json`)
  precisa da env **`CRON_SECRET`** — sem ela devolve 401 a tudo, inclusive ao
  próprio cron. Hobby permite crons (1×/dia, ±59 min). Dedup em
  `mensalidade_avisos` (TTL 400 dias), senão repetia o aviso todos os dias.

## Extras — taxas gerais (sessão 2026-08-24)
- Taxas que valem para as três categorias (urgência, deslocação) vivem em
  `slug: "extras"` na colecção `servicos` — `SERVICO_EXTRAS` / `SERVICO_GRUPO`
  em `src/types/servico.ts`. **Não** é categoria pública: fica fora de
  `SERVICO_SLUG`, logo não gera `/servicos/extras`, não aparece nos filtros do
  portfólio nem nos tipos de projeto (ambos validam contra `SERVICO_SLUG`).
- Editam-se no painel (/painel/precos) numa secção "Extras" no fim da lista,
  sempre visível mesmo vazia, com botões-preset. O card do extra mostra o token
  `{{preco:label|fallback}}` pronto a copiar (`tokenSugerido`, label = palavra
  mais longa do título) e não tem imagem nem toggle Activo — nunca é público,
  por isso `ativo` fica sempre `true`.
- `getServicosExtras()` traz todas as linhas; `[slug]/page.tsx` monta as fontes
  dos tokens por prioridade: linhas do slug primeiro, extras a seguir. Uma
  categoria pode assim ter a sua própria taxa com o mesmo nome de um extra.
- `precoTipo: "eur" | "percent"` (2026-08-24): a urgência dos websites é
  DIFERENTE da assistência — percentagem sobre o orçamento, não valor fixo.
  Linha "Taxa de urgência web" 25% (decisão do Iuri); o token renderiza "25%"
  em vez de "25€". No painel o selector €/% só aparece nos extras; percent
  esconde máx/desde. Labels colidem por `includes` ("urgência" apanha as duas)
  → `labelTokenSugerido` estica para "urgência web" e a nota do web-digital usa
  `{{preco:urgência web|25%}}`; o `{{preco:urgência|25€}}` da assistência
  continua a apanhar a <48h por ordem (ordem 0).
- Linhas criadas a 2026-08-24 por `scripts/seed-extras.mjs` (idempotente,
  `--apply` para escrever): Taxa de urgência (<48h) 25€, Taxa de urgência web
  25% e Deslocação ao domicílio 0,80€/km. As duas primeiras eram os fallbacks
  dos content JSON, por isso o site não mudou; mudou só quem manda no número.
- A stat "Urgência" de assistência-tecnica lia `{{preco:diagnóstico}}` (token
  errado) — passou a ler `{{preco:urgência}}`.

## Landing — cards de serviços (sessão 2026-08-24)
- Cards extraídos para `src/components/sections/ServiceCard.tsx` (2026-08-24),
  PARTILHADO entre a landing e o hub /servicos — editar lá, nunca duplicar. O
  hub passa `footerLeft` com o "desde X€" da DB (rodapé justify-between); a
  landing não passa nada (justify-end, sem preços). Hover de levantar vive em
  globals.css: `.svc-card:hover:not(:has(.svc-cta:hover))` — com o rato no
  botão "Ver exemplo" o card NÃO levanta nem roda a seta (decisão do Iuri).
- Ordem fixa em `SERVICES` (`src/components/sections/Services.tsx`): **Web & Digital
  primeiro**, depois Assistência Técnica e Software & Recuperação. A ordem é do
  array, não da DB.
- Cada card tem 2 destinos: o **título** é *stretched link* (`after:absolute
  after:inset-0`) para `/servicos/<slug>` — o card todo clicável — e o botão
  **"Ver exemplo"** (`portfolioHref`) leva a `/portfolio?categoria=<slug>`, que a
  página já lê via `searchParams.categoria` → `PortfolioGrid initialFilter`.
  O botão precisa de `relative z-10` para ficar por cima do stretched link; nunca
  voltar a envolver o card inteiro num `<a>` (daria `<a>` aninhados).
- Estilo do "Ver exemplo" combina com o círculo da seta ao lado: h-38px,
  `bg-ink`/`text-cream`, `hover:bg-ember`. Ambos alinhados à direita no rodapé.
- Chave i18n: `HomePage.ServicesSection.exampleCta` (pt/en).
- Os cards da landing **não mostram preços** (nunca mostraram). Se um dia se
  quiser, os valores têm de vir da DB no render — nunca escritos no código
  (ver regra das STATS acima).
- Editar `messages/*.json` à mão (Edit/insert de linha). Um `json.load/dump` em
  Python reformata o ficheiro todo (espaços antes dos `:`) e suja o diff.

## Estado de segurança (feito)
- Proteção de força bruta no login: 10/min em `/api/auth/callback/credentials` (`src/proxy.ts`,
  ex-`middleware.ts` — renomeado 2026-08-24 p/ convenção nova do Next 16; era só isso que
  punha o "Proxy: status unknown" no dashboard da Vercel, DNS nunca teve problema).
- Rate limit global de `/api` (200/min). `rateLimitDistributed` (Upstash opcional -> MongoDB
  coleção `rate_limits` -> memória). O middleware Edge usa Upstash-ou-memória (o driver Mongo não corre no Edge).
- Formulário de contacto: honeypot + rate limit + Turnstile (adormecido, sem chaves).
  `src/app/api/sendEmail/route.ts` verifica o Turnstile quando configurado.
- Headers de segurança já existiam em `next.config.ts`.

## Login do painel (sessão 2026-08-02 — lockout resolvido)
- Password do painel: `AUTH_PASSWORD` (texto simples) OU `AUTH_PASSWORD_HASH` (bcrypt).
  O hash TEM PRECEDÊNCIA — nunca pôr a passe em claro dentro da `_HASH` (foi a causa
  do lockout: a passe estava na variável errada e o bcrypt rejeitava sempre).
- `authorize()` (src/lib/auth.ts) escreve o motivo de cada rejeição nos runtime logs
  da Vercel (`[auth] …`): password errada, allowlist, rate-limit, hash malformado,
  ambas as vars definidas. Os envs levam trim(). Auditoria completa continua no
  Mongo (`auth_audit`).
- `scripts/auth-hash.mjs` gera/verifica o hash (interativo; `--verificar`, `--mostrar`).
  Colar hashes SEMPRE pelo dashboard (a shell come os `$`). Mudar env ⇒ Redeploy.
- `/entrar` tem botão mostrar/ocultar password.

## Portal do cliente (sessão 2026-08-02 — orçamento em destaque)
- `ProjetoArquivo.categoria: "orcamento" | null`, marcado no painel com o botão €
  no chip do ficheiro (PATCH `/api/projetos/arquivo/[id]`, bloqueado p/ ficheiros
  do cliente). Pode haver várias versões marcadas: o portal SÓ mostra a mais
  recente (dataUpload) — regra em `toPortalArquivos()` no portal-dto; as antigas
  são histórico do painel (pill "Orç. antigo"), invisíveis ao cliente.
- Cartão destacado no topo de "Documentos e pré-visualizações" (ex-"Entregáveis"):
  pill ORÇAMENTO, Total ao lado, "Enviado a <data>", âncora `#orcamento` ligada
  ao cartão escuro Valores.
- "Os seus ficheiros" e "Observações gerais" usam `cardDiscretoCls` (sem sombra,
  p-5) — não competem com os documentos. PortalTabs: altura = tab ativa (`hidden`,
  não `invisible`), o cartão principal já não herda a altura do formulário.

## Opcional / pendente
- Chaves Turnstile só se aparecer spam. Chaves Upstash opcionais (usa MongoDB por defeito).
- O `.env.example` foi removido a pedido do utilizador (não recriar).
- Se um dia quiserem hash em vez de `AUTH_PASSWORD` em claro: `node scripts/auth-hash.mjs`.

## Conclusão
CAPTCHA NÃO é prioritário nesta fase — honeypot + rate limit já cobrem o abuso real.
Alternativas se um dia quiserem: hCaptcha (encaixa no Supabase Auth), Vercel Firewall/BotID.
