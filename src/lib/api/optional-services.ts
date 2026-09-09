import { DEFAULT_CHANNEL_CONFIG, type NotificationChannelConfig } from "../notification-channels.js";

/** Permisos exclusivos del operador servidor; las credenciales no habilitan servicios. */
export function isOptionalServiceEnabled(service: "ai" | "agent"): boolean {
  return process.env[service === "ai" ? "AI_ENABLED" : "AGENT_ENABLED"] === "true";
}

/** Canales de los avisos base examinados cuando el agente no está habilitado. */
export function baseNotificationChannels(): NotificationChannelConfig {
  return {
    ...DEFAULT_CHANNEL_CONFIG,
    booking_confirmation_customer: "email",
    cancellation_customer: "email",
    reschedule_customer: "email",
    new_lead_owner: "email",
    new_booking_owner: "email",
  };
}
