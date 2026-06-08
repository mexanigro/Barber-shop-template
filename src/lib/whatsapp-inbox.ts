/**
 * WhatsApp inbox shared helpers.
 *
 * Used directly by `server.ts`. `api/index.ts` keeps an inline copy because
 * the Vercel `@vercel/node` bundler does not cross-import from `src/`
 * (see docs/ARCHITECTURE.md). Keep the two copies in sync.
 *
 * Pure helpers only — no Firebase. Storage I/O lives in each runtime
 * (Admin SDK in server.ts, REST in api/index.ts).
 */

import { createHash } from "crypto";

/**
 * Normalize a phone to E.164-ish form (digits + optional leading `+`).
 * Mirrors the agent's normalization so the resulting conversation doc id
 * matches what the WhatsApp agent writes.
 */
export function normalizePhone(input: string): string {
  if (typeof input !== "string") return "";
  const trimmed = input.trim();
  if (!trimmed) return "";
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/[^\d]/g, "");
  if (!digits) return "";
  return (hasPlus ? "+" : "") + digits;
}

/**
 * Validate a phone string. Looser than international E.164 — accepts 7-16
 * digits with optional leading `+` — matches the agent's accepted shape.
 */
export function isValidPhone(value: string): boolean {
  return /^\+?\d{7,16}$/.test(value);
}

/**
 * Build the conversation document id used by the WhatsApp agent:
 *   `${clientId}_${md5(normalizedPhone)}`
 *
 * Both sides of the bridge must agree on this format, otherwise the inbox
 * will read empty even though messages exist.
 */
export function conversationDocId(clientId: string, phone: string): string {
  const normalized = normalizePhone(phone);
  const hash = createHash("sha256").update(normalized).digest("hex");
  return `${clientId}_${hash}`;
}

/** Outbox message body limits — same shape as `contact_inbox.message`. */
export const OUTBOX_MESSAGE_MAX_LEN = 3_000;

/** Validate a queued message payload before persistence. */
export function validateQueueMessageInput(input: {
  phone: unknown;
  message: unknown;
}): { ok: true; phone: string; message: string } | { ok: false; error: string } {
  const phoneRaw = typeof input.phone === "string" ? input.phone : "";
  const phone = normalizePhone(phoneRaw);
  if (!phone) return { ok: false, error: "phone is required" };
  if (!isValidPhone(phone)) return { ok: false, error: "phone is invalid" };

  const messageRaw = typeof input.message === "string" ? input.message.trim() : "";
  if (!messageRaw) return { ok: false, error: "message is required" };
  if (messageRaw.length > OUTBOX_MESSAGE_MAX_LEN) {
    return { ok: false, error: `message exceeds ${OUTBOX_MESSAGE_MAX_LEN} characters` };
  }

  return { ok: true, phone, message: messageRaw };
}

export type WhatsAppMessageRole = "user" | "assistant" | "system";

export type WhatsAppMessage = {
  role: WhatsAppMessageRole;
  text: string;
  timestamp: string;
};

export type WhatsAppConversation = {
  phone: string;
  clientId: string;
  messages: WhatsAppMessage[];
  lastMessageAt?: string;
};
