import type { RequestHandler } from "express";
import type { Firestore } from "firebase-admin/firestore";
import type { NotificationChannelConfig, NotificationEvent } from "../notification-channels.js";
import { shouldUseChannel } from "../notification-channels.js";

// N07 T2 — handler compartido de POST /api/notify-booking (contrato C-2 en los dos runtimes).
// El body sólo aporta appointmentId (y details.businessName); todo dato del cliente sale del
// documento appointments/{id} del mismo tenant. Los dos envíos se esperan antes de responder y
// cada uno deja su notification_logs con appointmentId + event, que es lo que hace idempotente
// el reenvío (D-5 a): cita cancelada → nada; log «sent» del mismo id+event → no se repite.

export type DeliveryStatus = "sent" | "failed" | "queued" | "skipped";
export type DeliveryResult = { status: Exclude<DeliveryStatus, "skipped">; providerMessageId?: string; error?: string };
export type EmailMessage = { to: string; subject: string; html: string };

export type AgentBookingPayload = {
  appointmentId: string; date: string; time: string; serviceName: string; staffName: string; staffId?: string;
  customerName: string; customerPhone: string; businessName?: string; duration?: number;
};

export type NotifyBookingPorts = {
  clientId: string;
  /** Admin Firestore del runtime: lee appointments/config y lee/escribe notification_logs. */
  loadDb: () => Promise<Firestore | null>;
  channels: () => Promise<NotificationChannelConfig>;
  /** Envío puro al proveedor: sin log (el log lo escribe este handler). Nunca lanza. */
  deliver: (message: EmailMessage) => Promise<DeliveryResult>;
  ownerEmail: () => string | undefined;
  customerHtml: (appt: { serviceName: string; date: string; time: string; staffName?: string; businessName?: string }) => string;
  /** WhatsApp por el agente, sólo si los canales lo piden (AGENT_ENABLED); fuera del alcance certificado. */
  agent?: (payload: AgentBookingPayload, customerPhone: string | undefined) => Promise<unknown>;
  afterSuccess?: () => void;
};

const OWNER_EVENT: NotificationEvent = "new_booking_owner";
const CUSTOMER_EVENT: NotificationEvent = "booking_confirmation_customer";

function sanitizeText(input: unknown, maxLen: number): string {
  return typeof input === "string" ? input.trim().replace(/\s+/g, " ").slice(0, maxLen) : "";
}
function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
function isLikelyPhone(value: string): boolean {
  return /^[+\d()\-\s]{6,20}$/.test(value);
}
function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function str(value: unknown, maxLen: number): string {
  return typeof value === "string" ? value.slice(0, maxLen) : "";
}
/** Nombre visible desde config.services / config.staff por id; si no está, el id. */
export function resolveDisplayName(list: unknown, id: string): string {
  if (!id) return "";
  const item = Array.isArray(list) ? list.filter(isRecord).find((entry) => entry.id === id) : undefined;
  const name = item && typeof item.name === "string" ? item.name.trim() : "";
  return name || id;
}

export function buildOwnerBookingEmailHtml(d: {
  appointmentId: string; staffName: string; serviceName: string; date: string; time: string;
  customerName: string; customerPhone: string; customerEmail: string;
}): string {
  const e = escapeHtml;
  return `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; rounded: 12px;">
        <h2 style="color: #f59e0b; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 24px;">New Booking Request</h2>
        <div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
          <p><strong>Appointment ID:</strong> ${e(d.appointmentId)}</p>
          <p><strong>Staff:</strong> ${e(d.staffName) || "N/A"}</p>
          <p><strong>Service:</strong> ${e(d.serviceName) || "N/A"}</p>
          <p><strong>Date:</strong> ${e(d.date)}</p>
          <p><strong>Time:</strong> ${e(d.time)}</p>
        </div>
        <div style="padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px;">
          <h3 style="font-size: 14px; text-transform: uppercase; margin-bottom: 8px;">Customer Details</h3>
          <p style="margin: 4px 0;"><strong>Name:</strong> ${e(d.customerName)}</p>
          <p style="margin: 4px 0;"><strong>Phone:</strong> ${e(d.customerPhone) || "N/A"}</p>
          <p style="margin: 4px 0;"><strong>Email:</strong> ${e(d.customerEmail)}</p>
        </div>
        <p style="font-size: 12px; color: #6b7280; margin-top: 24px;">This notification was sent automatically from your website template.</p>
      </div>
    `;
}

async function alreadySent(db: Firestore, clientId: string, appointmentId: string, event: NotificationEvent): Promise<boolean> {
  const snap = await db.collection("notification_logs")
    .where("clientId", "==", clientId)
    .where("appointmentId", "==", appointmentId)
    .where("event", "==", event)
    .where("status", "==", "sent")
    .limit(1)
    .get();
  return !snap.empty;
}

async function writeLog(db: Firestore, entry: Record<string, unknown>): Promise<void> {
  try {
    await db.collection("notification_logs").add({ ...entry, channel: "email", type: "booking", createdAt: new Date().toISOString() });
  } catch { /* el log no bloquea la respuesta; la entrega ya ocurrió */ }
}

/** Un envío con su log: idempotente por log «sent» del mismo appointmentId + event. */
async function sendOnce(db: Firestore, ports: NotifyBookingPorts, event: NotificationEvent, appointmentId: string, message: EmailMessage | null): Promise<DeliveryStatus> {
  if (!message) {
    await writeLog(db, { clientId: ports.clientId, appointmentId, event, recipient: "(none)", status: "failed", error: "No recipient email configured." });
    return "failed";
  }
  if (await alreadySent(db, ports.clientId, appointmentId, event)) return "skipped";
  const result = await ports.deliver(message);
  await writeLog(db, {
    clientId: ports.clientId, appointmentId, event, recipient: message.to, subject: message.subject, status: result.status,
    ...(result.providerMessageId ? { providerMessageId: result.providerMessageId } : {}),
    ...(result.error ? { error: result.error } : {}),
  });
  return result.status;
}

export function createNotifyBookingHandler(ports: NotifyBookingPorts): RequestHandler {
  const { clientId: CLIENT_ID } = ports;
  return async (req, res) => {
    try {
      const appointmentId = sanitizeText(req.body?.appointmentId, 120);
      if (!appointmentId) {
        return res.status(400).json({ error: "appointmentId is required." });
      }
      const businessName = sanitizeText(req.body?.details?.businessName, 160);

      const db = await ports.loadDb();
      if (!db) {
        return res.status(503).json({ error: "Database not available." });
      }

      const apptSnap = await db.collection("appointments").doc(appointmentId).get();
      const apptData = apptSnap.exists ? apptSnap.data() : undefined;
      if (!apptData || (apptData.clientId && apptData.clientId !== CLIENT_ID)) {
        return res.status(404).json({ error: "Appointment not found." });
      }

      // D-5 (a): una cita cancelada no confirma nada.
      if (apptData.status === "cancelled") {
        return res.json({ success: true, owner: "skipped", customer: "skipped", reason: "cancelled" });
      }

      const customerName = str(apptData.customerName, 120);
      const customerEmail = str(apptData.customerEmail, 200).toLowerCase();
      const customerPhone = str(apptData.customerPhone, 40);
      const serviceId = str(apptData.serviceId, 120);
      const staffId = str(apptData.staffId, 120);
      const date = str(apptData.date, 20);
      const time = str(apptData.time, 20);
      const duration = typeof apptData.duration === "number" ? apptData.duration : undefined;

      if (!customerName || !customerEmail || !serviceId || !date || !time) {
        return res.status(400).json({ error: "Appointment data is incomplete." });
      }
      if (!isValidEmail(customerEmail)) {
        return res.status(400).json({ error: "Invalid customer email in appointment record." });
      }

      // Nombres visibles: el catálogo del mismo backend, nunca el body.
      const configSnap = await db.collection("config").doc(CLIENT_ID).get();
      const config = configSnap.exists ? (configSnap.data() ?? {}) : {};
      const serviceName = resolveDisplayName(config.services, serviceId);
      const staffName = resolveDisplayName(config.staff, staffId);

      const channels = await ports.channels();

      let owner: DeliveryStatus = "skipped";
      if (shouldUseChannel(channels, OWNER_EVENT, "email")) {
        const to = ports.ownerEmail();
        owner = await sendOnce(db, ports, OWNER_EVENT, appointmentId, to ? {
          to, subject: "New Booking Request",
          html: buildOwnerBookingEmailHtml({ appointmentId, staffName, serviceName, date, time, customerName, customerPhone, customerEmail }),
        } : null);
      }

      let customer: DeliveryStatus = "skipped";
      if (shouldUseChannel(channels, CUSTOMER_EVENT, "email")) {
        customer = await sendOnce(db, ports, CUSTOMER_EVENT, appointmentId, {
          to: customerEmail,
          subject: `Booking Confirmed: ${serviceName} on ${date}`,
          html: ports.customerHtml({ serviceName, date, time, staffName, businessName: businessName || undefined }),
        });
      }

      const waOwner = shouldUseChannel(channels, OWNER_EVENT, "whatsapp");
      const waCustomer = shouldUseChannel(channels, CUSTOMER_EVENT, "whatsapp");
      if (ports.agent && (waOwner || waCustomer)) {
        ports.agent(
          { appointmentId, date, time, serviceName, staffName, staffId: staffId || undefined, customerName, customerPhone, businessName: businessName || undefined, duration },
          waCustomer && isLikelyPhone(customerPhone) ? customerPhone : undefined,
        ).catch(() => {});
      }

      ports.afterSuccess?.();
      return res.json({ success: true, owner, customer });
    } catch {
      return res.status(500).json({ error: "Failed to process notification" });
    }
  };
}
