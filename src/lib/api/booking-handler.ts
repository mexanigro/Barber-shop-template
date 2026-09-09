import type { RequestHandler } from "express";
import type { Firestore, FieldValue as AdminFieldValue } from "firebase-admin/firestore";
import { BookingConflictError, createBookingWithManifest, isValidBookingDate, isValidBookingTime, isValidBookingDuration } from "./booking-validation.js";

export type BookingContext = { db: Firestore; FieldValue: typeof AdminFieldValue };
export type BookingDependencies = { clientId: string; loadContext: () => Promise<BookingContext | null> };

function sanitizeText(input: unknown, maxLen: number): string {
  return typeof input === "string" ? input.trim().replace(/\s+/g, " ").slice(0, maxLen) : "";
}
function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(value);
}

/** Handler de reserva compartido; carga persistencia sólo después de validar. */
export function createBookingHandler({ clientId: CLIENT_ID, loadContext }: BookingDependencies): RequestHandler {
  return async (req, res) => {
    try {
      const body = req.body ?? {};
      const customerName = sanitizeText(body.customerName, 120);
      const customerEmail = sanitizeText(body.customerEmail, 200).toLowerCase();
      const customerPhone = sanitizeText(body.customerPhone, 40);
      const serviceId = sanitizeText(body.serviceId, 120);
      const staffId = sanitizeText(body.staffId, 120);
      const date = sanitizeText(body.date, 20);
      const time = sanitizeText(body.time, 10);
      const duration = typeof body.duration === "number" && Number.isFinite(body.duration) ? body.duration : 0;
      const status = body.status === "confirmed" ? "confirmed" : "pending";
      const paymentStatus = body.paymentStatus === "pending" ? "pending" : undefined;

      if (!customerName || !customerEmail || !serviceId || !staffId || !date || !time || !duration) {
        return res.status(400).json({ error: "Missing required booking fields." });
      }
      if (!isValidBookingDuration(duration)) {
        return res.status(400).json({ error: "duration must be an integer between 5 and 480 minutes." });
      }
      if (!isValidEmail(customerEmail)) {
        return res.status(400).json({ error: "Invalid email." });
      }
      if (!isValidBookingDate(date) || !isValidBookingTime(time)) {
        return res.status(400).json({ error: "Invalid date or time format." });
      }

      const context = await loadContext();
      const db = context?.db;
      if (!db) {
        return res.status(503).json({ error: "Database not available." });
      }

      const { FieldValue } = context!;
      const appointmentFields: Record<string, unknown> = {
        customerName, customerEmail, customerPhone,
        serviceId, status,
      };
      if (paymentStatus) appointmentFields.paymentStatus = paymentStatus;

      const appointmentId = await createBookingWithManifest({
        db, FieldValue,
        clientId: CLIENT_ID,
        staffId, date, time, duration,
        appointmentFields,
      });

      // El alta del cliente se espera; su fallo no invalida la reserva confirmada.
      try {
        const custQuery = await db.collection("customers")
          .where("clientId", "==", CLIENT_ID)
          .where("email", "==", customerEmail)
          .limit(1)
          .get();

        if (custQuery.empty) {
          await db.collection("customers").add({
            clientId: CLIENT_ID,
            email: customerEmail,
            fullName: customerName,
            phone: customerPhone,
            source: "booking",
            createdAt: FieldValue.serverTimestamp(),
          });
        }
      } catch (err) {
        console.warn("[Book] customer upsert failed (non-fatal):", err instanceof Error ? err.message : err);
      }

      res.json({ success: true, appointmentId });
    } catch (error: unknown) {
      if (error instanceof BookingConflictError) {
        return res.status(409).json({ error: "This time slot is no longer available." });
      }
      console.error("[Book] failed:", error);
      res.status(500).json({ error: "Failed to create booking." });
    }
  };
}
