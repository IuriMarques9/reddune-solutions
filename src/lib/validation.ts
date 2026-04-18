const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ContactInput = {
  name: string;
  email: string;
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

export function validateContact(input: unknown): ValidationResult {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Invalid payload" };
  }

  const { name, email, message } = input as Record<string, unknown>;

  if (typeof name !== "string" || typeof email !== "string" || typeof message !== "string") {
    return { ok: false, error: "Missing required fields" };
  }

  const n = name.trim();
  const e = email.trim();
  const m = message.trim();

  if (n.length < CONTACT_LIMITS.nameMin || n.length > CONTACT_LIMITS.nameMax) {
    return { ok: false, error: "Invalid name length" };
  }
  if (e.length > CONTACT_LIMITS.emailMax || !EMAIL_REGEX.test(e)) {
    return { ok: false, error: "Invalid email format" };
  }
  if (m.length < CONTACT_LIMITS.messageMin || m.length > CONTACT_LIMITS.messageMax) {
    return { ok: false, error: "Invalid message length" };
  }

  return { ok: true, data: { name: n, email: e, message: m } };
}
