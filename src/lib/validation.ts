const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const CONTACT_SUBJECTS = ["support", "quote", "shop", "other"] as const;
export type ContactSubject = (typeof CONTACT_SUBJECTS)[number];

export const SUBJECT_LABELS: Record<ContactSubject, string> = {
  support: "Suporte Técnico",
  quote: "Orçamento",
  shop: "Dúvida sobre produto da Loja",
  other: "Outro",
};

export type ContactInput = {
  name: string;
  email: string;
  subject: ContactSubject;
  message: string;
};

export type ValidationResult =
  | { ok: true; data: ContactInput }
  | { ok: false; error: string };

export const CONTACT_LIMITS = {
  nameMin: 2,
  nameMax: 100,
  emailMax: 254,
  messageMin: 10,
  messageMax: 5000,
} as const;

const isSubject = (value: unknown): value is ContactSubject =>
  typeof value === "string" && CONTACT_SUBJECTS.includes(value as ContactSubject);

export function validateContact(input: unknown): ValidationResult {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Invalid payload" };
  }

  const { name, email, message, subject } = input as Record<string, unknown>;

  if (typeof name !== "string" || typeof email !== "string" || typeof message !== "string") {
    return { ok: false, error: "Missing required fields" };
  }

  const n = name.trim();
  const e = email.trim();
  const m = message.trim();
  const s: ContactSubject = isSubject(subject) ? subject : "other";

  if (n.length < CONTACT_LIMITS.nameMin || n.length > CONTACT_LIMITS.nameMax) {
    return { ok: false, error: "Invalid name length" };
  }
  if (e.length > CONTACT_LIMITS.emailMax || !EMAIL_REGEX.test(e)) {
    return { ok: false, error: "Invalid email format" };
  }
  if (m.length < CONTACT_LIMITS.messageMin || m.length > CONTACT_LIMITS.messageMax) {
    return { ok: false, error: "Invalid message length" };
  }

  return { ok: true, data: { name: n, email: e, subject: s, message: m } };
}
