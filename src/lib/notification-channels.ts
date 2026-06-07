/**
 * Configurable notification channel routing.
 *
 * Each notification event maps to a channel: "whatsapp" | "email" | "both".
 * Defaults are hardcoded below. Clients can override per-event via Firestore
 * `config/{clientId}.notifications.channels` (written from nichos-hub).
 *
 * Used by server.ts (Express dev) and api/index.ts (Vercel serverless).
 * KEEP THE INLINE COPY IN api/index.ts IN SYNC — the Vercel bundler can't
 * cross-import from src/.
 */

export type NotificationChannel = "whatsapp" | "email" | "both";

export type NotificationEvent =
  | "booking_confirmation_customer"
  | "reminder_24h_customer"
  | "cancellation_customer"
  | "reschedule_customer"
  | "new_lead_owner"
  | "new_booking_owner"
  | "new_booking_staff"
  | "review_request_customer";

export type NotificationChannelConfig = Record<NotificationEvent, NotificationChannel>;

export const DEFAULT_CHANNEL_CONFIG: NotificationChannelConfig = {
  // High urgency → customer must see it → WhatsApp
  booking_confirmation_customer: "whatsapp",
  reminder_24h_customer: "whatsapp",
  cancellation_customer: "whatsapp",
  reschedule_customer: "whatsapp",

  // Owner/staff already in the system → email (Resend)
  new_lead_owner: "email",
  new_booking_owner: "email",
  new_booking_staff: "email",

  // Post-service follow-up → email
  review_request_customer: "email",
};

/**
 * Deep-merge Firestore overrides onto defaults.
 * Only valid event keys with valid channel values are accepted.
 */
export function resolveChannelConfig(
  firestoreOverrides?: Partial<Record<string, unknown>>,
): NotificationChannelConfig {
  if (!firestoreOverrides || typeof firestoreOverrides !== "object") {
    return { ...DEFAULT_CHANNEL_CONFIG };
  }

  const validChannels = new Set<string>(["whatsapp", "email", "both"]);
  const validEvents = new Set<string>(Object.keys(DEFAULT_CHANNEL_CONFIG));
  const merged = { ...DEFAULT_CHANNEL_CONFIG };

  for (const [key, value] of Object.entries(firestoreOverrides)) {
    if (validEvents.has(key) && typeof value === "string" && validChannels.has(value)) {
      merged[key as NotificationEvent] = value as NotificationChannel;
    }
  }

  return merged;
}

/** Check if a given event should use a specific channel. */
export function shouldUseChannel(
  config: NotificationChannelConfig,
  event: NotificationEvent,
  channel: "whatsapp" | "email",
): boolean {
  const setting = config[event];
  return setting === channel || setting === "both";
}
