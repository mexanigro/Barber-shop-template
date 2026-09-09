import { auth } from "./firebase";
/** Avisos del CRM al backend: canales base y agente opcional. No bloquean la UI. */

export type AppointmentNotifyPayload = {
  appointmentId?: string;
  date: string;
  time: string;
  serviceName?: string;
  staffName?: string;
  staffId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  businessName?: string;
  duration?: number;
};

async function postNotify(body: unknown): Promise<void> {
  try {
    const token = await auth.currentUser?.getIdToken();
    if (!token) return;
    const res = await fetch("/api/appointment/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.warn(`[Appointment Notify] non-2xx ${res.status}: ${text.slice(0, 200)}`);
    }
  } catch (err) {
    console.warn("[Appointment Notify] fetch failed:", err);
  }
}

export function notifyAppointmentBooked(appointment: AppointmentNotifyPayload): void {
  void postNotify({ action: "booked", appointment });
}

export function notifyAppointmentCancelled(
  appointment: AppointmentNotifyPayload,
  reason?: string,
): void {
  void postNotify({ action: "cancelled", appointment, reason });
}

export function notifyAppointmentRescheduled(
  oldAppointment: AppointmentNotifyPayload,
  newAppointment: AppointmentNotifyPayload,
): void {
  void postNotify({ action: "rescheduled", appointment: newAppointment, oldAppointment });
}
