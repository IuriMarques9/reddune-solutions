import { validateContact, SUBJECT_LABELS } from "@/lib/validation";
import { rateLimitDistributed, getClientIp } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";
import { randomUUID } from "node:crypto";
import { createLead } from "@/lib/mongodb/leads";
import { isIpBlocked } from "@/lib/mongodb/blocked-ips";
import { sendPushToAll } from "@/lib/push";

export const dynamic = "force-dynamic";

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

// Cap global partilhado (todos os IPs juntos), além do limite por-IP: backstop
// contra flood distribuído de leads + push aos devices do admin.
const RATE_LIMIT_GLOBAL_MAX = 300;
const RATE_LIMIT_GLOBAL_WINDOW_MS = 24 * 60 * 60 * 1000;

// Formulário de contacto do site público. Já NÃO envia email — grava a
// submissão como lead em `/painel/leads` e notifica por push. Defesa de spam
// (tudo self-hosted): honeypot + rate-limit + blocklist de IP (+ Turnstile
// opcional). Como o lead é o único canal, falha a gravar devolve erro.
export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rl = await rateLimitDistributed(
    `sendEmail:${ip}`,
    RATE_LIMIT_MAX,
    RATE_LIMIT_WINDOW_MS
  );
  if (!rl.allowed) {
    return Response.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: {
          "Retry-After": Math.ceil((rl.resetAt - Date.now()) / 1000).toString(),
        },
      }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Honeypot — bots fill every visible field. Silent 200 fakes success.
  if (
    body &&
    typeof body === "object" &&
    typeof (body as Record<string, unknown>).website === "string" &&
    (body as Record<string, unknown>).website !== ""
  ) {
    return Response.json({ id: "ok" });
  }

  // IP na blocklist (spam conhecido) → 200 silencioso, sem gravar nem notificar.
  // Fail-open: se a verificação falhar (BD em baixo) NÃO bloqueia o visitante.
  let blocked = false;
  try {
    blocked = await isIpBlocked(ip);
  } catch {
    blocked = false;
  }
  if (blocked) {
    return Response.json({ id: "ok" });
  }

  // CAPTCHA — verified only when Turnstile is configured (otherwise skipped).
  const captchaToken =
    body && typeof body === "object"
      ? (body as Record<string, unknown>).turnstileToken
      : undefined;
  const captchaOk = await verifyTurnstile(
    typeof captchaToken === "string" ? captchaToken : null,
    ip
  );
  if (!captchaOk) {
    return Response.json(
      { error: "Verificação anti-spam falhou. Tenta novamente." },
      { status: 403 }
    );
  }

  const result = validateContact(body);
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 400 });
  }

  const { name, email, subject, message } = result.data;

  // Cap global diário (além do per-IP): trava um flood distribuído de leads +
  // push. Estoirado → mesmo 200 silencioso do honeypot, sem dar sinal a bots.
  const globalRl = await rateLimitDistributed(
    "sendEmail:global:day",
    RATE_LIMIT_GLOBAL_MAX,
    RATE_LIMIT_GLOBAL_WINDOW_MS
  );
  if (!globalRl.allowed) {
    return Response.json({ id: "ok" });
  }

  try {
    const now = new Date().toISOString();
    await createLead({
      id: randomUUID(),
      nome: name,
      email,
      subject,
      mensagem: message,
      origem: "contact-form",
      estado: "novo",
      ip,
      notas: null,
      clienteId: null,
      criadoEm: now,
      atualizadoEm: now,
    });
  } catch (e) {
    console.error("Falha a guardar lead:", e);
    return Response.json(
      { error: "Não foi possível guardar. Tenta novamente." },
      { status: 500 }
    );
  }

  // Notificação push (best-effort, no-op sem chaves VAPID). Não quebra a resposta.
  try {
    await sendPushToAll({
      title: "Novo lead 🌵",
      body: `${name} — ${SUBJECT_LABELS[subject]}`,
      url: "/painel/leads",
    });
  } catch (e) {
    console.error("Falha a notificar push:", e);
  }

  return Response.json({ ok: true });
}
