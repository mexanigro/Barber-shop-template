/**
 * Notify the WhatsApp agentkit instance about events that happen in the
 * master-template (web lead, booking, cancellation, reschedule, walk-in).
 *
 * The agentkit lives in a separate Railway service. We POST to its internal
 * endpoints with `x-agent-secret` auth. All calls are fire-and-forget: a
 * failure to reach the agent must NEVER block the user-facing flow (booking
 * confirmation, contact form submit, etc.).
 *
 * Used directly by `server.ts`. `api/index.ts` keeps an inline copy because
 * the Vercel `@vercel/node` bundler does not cross-import from `src/` (see
 * docs/ARCHITECTURE.md). KEEP THE TWO COPIES IN SYNC.
 */

// Reasonable upper bound. The agent does the actual WhatsApp send async, so
// it should respond fast. If it's slow, we don't want to block our caller.
const AGENTKIT_TIMEOUT_MS = 4000;

export type AgentkitConfig = {
  url: string;
  secret: string;
  clientId: string;
};

/** Read the agentkit config from env. Returns null if not configured. */
export function getAgentkitConfig(): AgentkitConfig | null {
  const url = (process.env.WHATSAPP_AGENT_URL || "").trim().replace(/\/+$/, "");
  const secret = (process.env.AGENT_API_SECRET || "").trim();
  const clientId = (process.env.CLIENT_ID || process.env.VITE_CLIENT_ID || "").trim();
  if (!url || !secret || !clientId) return null;
  return { url, secret, clientId };
}

/**
 * Resolve recipient phones from env.
 * BUSINESS_OWNER_PHONE: the owner of THIS client (gets all notifications).
 * STAFF_PHONES: comma-separated staff phones for now (until we surface staff
 *   phones from Firestore config). Both must be in E.164 (e.g. +972...).
 */
export function getNotificationRecipients(): { adminPhones: string[]; staffPhones: string[] } {
  const owner = (process.env.BUSINESS_OWNER_PHONE || "").trim();
  const adminPhones = owner ? [owner] : [];
  const staffPhones = (process.env.STAFF_PHONES || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return { adminPhones, staffPhones };
}

/** POST to the agentkit. Logs but never throws. Returns true if 2xx. */
async function postToAgent(path: string, body: unknown): Promise<boolean> {
  const cfg = getAgentkitConfig();
  if (!cfg) {
    // Silent in production — agent integration is optional per client.
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[Agentkit ${path}] skipped — WHATSAPP_AGENT_URL/AGENT_API_SECRET/CLIENT_ID not configured`);
    }
    return false;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AGENTKIT_TIMEOUT_MS);

  try {
    const res = await fetch(`${cfg.url}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-agent-secret": cfg.secret,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.warn(`[Agentkit ${path}] non-2xx ${res.status}: ${text.slice(0, 300)}`);
      return false;
    }
    return true;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[Agentkit ${path}] failed: ${msg}`);
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

/** Lead entered through web form / quick inquiry. */
export async function notifyAgentLeadCreated(params: {
  nombre: string;
  telefono?: string;
  email?: string;
  mensaje?: string;
  fuente?: string;
  adminPhones: string[];
}): Promise<boolean> {
  const cfg = getAgentkitConfig();
  if (!cfg) return false;
  return postToAgent("/webhook/lead", {
    clientId: cfg.clientId,
    nombre: params.nombre,
    telefono: params.telefono || null,
    email: params.email || null,
    mensaje: params.mensaje || null,
    fuente: params.fuente || "web",
    adminPhones: params.adminPhones,
  });
}

export type AppointmentPayload = {
  date: string;       // YYYY-MM-DD in business TZ
  time: string;       // HH:mm in business TZ
  serviceName?: string;
  staffName?: string;
  staffId?: string;
  customerName?: string;
  customerPhone?: string;
  businessName?: string;
  appointmentId?: string;
  duration?: number;
  reviewLink?: string;
};

/** Appointment created (web/admin/walk-in). Notifies admin, optionally staff +
 * customer, and triggers the agent to schedule reminder 24h + review post-service. */
export async function notifyAgentAppointmentBooked(params: {
  appointment: AppointmentPayload;
  adminPhones: string[];
  staffPhones?: string[];
  customerPhone?: string;
  customerMessage?: string;
  adminMessage?: string;
  staffMessage?: string;
}): Promise<boolean> {
  const cfg = getAgentkitConfig();
  if (!cfg) return false;

  const appt = params.appointment;
  const adminMsg = params.adminMessage ?? buildAdminBookingMessage(appt);
  const staffMsg = params.staffMessage ?? buildStaffBookingMessage(appt);
  const customerMsg = params.customerMessage ?? buildCustomerConfirmationMessage(appt);

  return postToAgent("/notify", {
    clientId: cfg.clientId,
    type: "appointment_booked",
    adminPhones: params.adminPhones,
    staffPhones: params.staffPhones || [],
    customerPhone: params.customerPhone || appt.customerPhone || null,
    message: adminMsg,
    staffMessage: staffMsg,
    customerMessage: customerMsg,
    appointment: appt,
    variables: {
      "1": appt.serviceName ?? "",
      "2": appt.date,
      "3": appt.time,
      "4": appt.staffName ?? appt.businessName ?? "",
    },
  });
}

/** Appointment cancelled. Cancels the pending follow-ups in the agent and notifies
 * everyone involved. */
export async function notifyAgentAppointmentCancelled(params: {
  appointment: AppointmentPayload;
  adminPhones: string[];
  staffPhones?: string[];
  customerPhone?: string;
  reason?: string;
}): Promise<boolean> {
  const cfg = getAgentkitConfig();
  if (!cfg) return false;

  const appt = params.appointment;
  const reasonSuffix = params.reason ? ` (${params.reason})` : "";
  const adminMsg = `Turno cancelado: ${appt.customerName ?? "cliente"} - ${appt.serviceName ?? "servicio"} el ${appt.date} ${appt.time}${reasonSuffix}`;
  const customerMsg = `Tu turno de ${appt.serviceName ?? "servicio"} del ${appt.date} a las ${appt.time} fue cancelado${reasonSuffix}.`;
  const staffMsg = `Turno cancelado: ${appt.customerName ?? "cliente"} el ${appt.date} ${appt.time}`;

  return postToAgent("/notify", {
    clientId: cfg.clientId,
    type: "appointment_cancelled",
    adminPhones: params.adminPhones,
    staffPhones: params.staffPhones || [],
    customerPhone: params.customerPhone || appt.customerPhone || null,
    message: adminMsg,
    staffMessage: staffMsg,
    customerMessage: customerMsg,
    appointment: appt,
  });
}

/** Reschedule = cancel old + book new. We model it as two notify calls so the
 * agent's follow-up scheduler stays consistent. */
export async function notifyAgentAppointmentRescheduled(params: {
  oldAppointment: AppointmentPayload;
  newAppointment: AppointmentPayload;
  adminPhones: string[];
  staffPhones?: string[];
  customerPhone?: string;
}): Promise<boolean> {
  await notifyAgentAppointmentCancelled({
    appointment: params.oldAppointment,
    adminPhones: params.adminPhones,
    staffPhones: params.staffPhones,
    customerPhone: params.customerPhone,
    reason: "reprogramado",
  });
  return notifyAgentAppointmentBooked({
    appointment: params.newAppointment,
    adminPhones: params.adminPhones,
    staffPhones: params.staffPhones,
    customerPhone: params.customerPhone,
    adminMessage:
      `Turno reprogramado: ${params.newAppointment.customerName ?? "cliente"} - ` +
      `${params.newAppointment.serviceName ?? "servicio"} ahora el ${params.newAppointment.date} ${params.newAppointment.time}`,
    customerMessage:
      `Tu turno fue reprogramado: ${params.newAppointment.serviceName ?? "servicio"} ` +
      `ahora el ${params.newAppointment.date} a las ${params.newAppointment.time}.`,
  });
}

// --- Default message builders ---

function buildAdminBookingMessage(a: AppointmentPayload): string {
  const parts = [
    `Nuevo turno: ${a.customerName ?? "cliente"} (${a.customerPhone ?? "sin tel"})`,
    `${a.serviceName ?? "servicio"} el ${a.date} a las ${a.time}`,
  ];
  if (a.staffName) parts.push(`con ${a.staffName}`);
  return parts.join("\n");
}

function buildStaffBookingMessage(a: AppointmentPayload): string {
  return (
    `Turno asignado\n` +
    `Cliente: ${a.customerName ?? "cliente"} (${a.customerPhone ?? "sin tel"})\n` +
    `Servicio: ${a.serviceName ?? "servicio"}\n` +
    `Cuando: ${a.date} ${a.time}`
  );
}

function buildCustomerConfirmationMessage(a: AppointmentPayload): string {
  const negocio = a.businessName ? ` en ${a.businessName}` : "";
  const conStaff = a.staffName ? ` con ${a.staffName}` : "";
  return (
    `Turno confirmado${negocio}: ${a.serviceName ?? "servicio"} el ${a.date} ` +
    `a las ${a.time}${conStaff}.`
  );
}
