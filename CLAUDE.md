# reddune-solutions — notas para o Claude

Site Next.js (App Router) na Vercel + MongoDB. Login NextAuth (credenciais, utilizador único).
Área de admin em `/painel`. Deploy = push para `main` (Vercel auto).

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
