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
  contra TODAS as linhas do slug na DB, **incluindo `ativo:false`** — é assim
  que extras (urgência, deslocação) alimentam o texto sem linha pública na
  tabela; sem match fica o fallback do ficheiro. Prazos ("2-3 semanas") não têm
  fonte na DB — ficam fixos por decisão do Iuri.
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

## Landing — cards de serviços (sessão 2026-08-24)
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
- Proteção de força bruta no login: 10/min em `/api/auth/callback/credentials` (`middleware.ts`).
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
