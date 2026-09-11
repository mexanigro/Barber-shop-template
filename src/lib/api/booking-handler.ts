import type { RequestHandler } from "express";
import type { Firestore, FieldValue as AdminFieldValue } from "firebase-admin/firestore";
import { BookingConflictError, BOOKING_BUFFER_MINUTES, createBookingWithManifest, isValidBookingDate, isValidBookingTime, isValidBookingDuration } from "./booking-validation.js";

export type BookingContext = { db: Firestore; FieldValue: typeof AdminFieldValue };
export type BookingDependencies = { clientId: string; loadContext: () => Promise<BookingContext | null> };

function sanitizeText(input: unknown, maxLen: number): string {
  return typeof input === "string" ? input.trim().replace(/\s+/g, " ").slice(0, maxLen) : "";
}
function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function findById(list: unknown, id: string): Record<string, unknown> | undefined {
  return Array.isArray(list) ? list.filter(isRecord).find((item) => item.id === id) : undefined;
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
      const bodyDuration = typeof body.duration === "number" && Number.isFinite(body.duration) ? body.duration : 0;
      const paymentStatus = body.paymentStatus === "pending" ? "pending" : undefined;

      if (!customerName || !customerEmail || !serviceId || !staffId || !date || !time || !bodyDuration) {
        return res.status(400).json({ error: "Missing required booking fields." });
      }
      if (!isValidBookingDuration(bodyDuration)) {
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

      // La configuración del mismo backend autoriza el precio, nunca el visitante.
      const configSnap = await db.collection("config").doc(CLIENT_ID).get();
      if (!configSnap.exists) {
        return res.status(503).json({ error: "Booking configuration not verifiable." });
      }
      const config = configSnap.data()!;
      const payment = config.payment;
      const online = payment?.enabled !== false &&
        (payment?.mode === "deposit" || payment?.mode === "full") &&
        payment?.provider !== "manual" && payment?.provider !== "none";
      let authorizedPriceCents: number | undefined;
      if (online) {
        const matches = Array.isArray(config.services)
          ? config.services.filter((service: unknown) => service !== null && typeof service === "object" &&
              (service as { id?: unknown }).id === serviceId)
          : [];
        if (matches.length !== 1 || (Array.isArray(config.visibleServices) && !config.visibleServices.includes(serviceId))) {
          return res.status(503).json({ error: "Service price not verifiable." });
        }
        const patch = config.serviceOverrides?.[serviceId];
        const price: unknown = patch && Object.prototype.hasOwnProperty.call(patch, "price")
          ? patch.price : matches[0].price;
        const cents = typeof price === "number" ? Math.round(price * 100) : NaN;
        if (typeof price !== "number" || !Number.isFinite(price) ||
            !Number.isSafeInteger(cents) || cents < 50 || cents > 2_000_000 ||
            Math.abs(price * 100 - cents) > 0.000001) {
          return res.status(503).json({ error: "Service price not verifiable." });
        }
        authorizedPriceCents = cents;
      }

      // D-5 (b), N06: el servidor impone lo que config declara; lo que config no declara pasa tal cual.
      // Servicio: si hay catálogo, el id debe existir (y ser visible) y la duración es la del catálogo.
      let duration = bodyDuration;
      if (Array.isArray(config.services)) {
        const service = findById(config.services, serviceId);
        if (!service || (Array.isArray(config.visibleServices) && !config.visibleServices.includes(serviceId))) {
          return res.status(400).json({ error: "Unknown service." });
        }
        if (!isValidBookingDuration(service.duration)) {
          return res.status(503).json({ error: "Service duration not verifiable." });
        }
        duration = service.duration;
      }
      // Personal: si hay roster no vacío, el id debe existir.
      if (Array.isArray(config.staff) && config.staff.some(isRecord) && !findById(config.staff, staffId)) {
        return res.status(400).json({ error: "Unknown staff." });
      }
      // Estado y buffer: siempre del servidor (businessRules), nunca del navegador.
      const rules = isRecord(config.businessRules) ? config.businessRules : {};
      const status = rules.autoConfirm === false ? "pending" : "confirmed";
      const bufferMinutes = typeof rules.bufferMinutes === "number" && Number.isFinite(rules.bufferMinutes)
        ? Math.min(120, Math.max(0, Math.round(rules.bufferMinutes)))
        : BOOKING_BUFFER_MINUTES;

      const { FieldValue } = context!;
      const appointmentFields: Record<string, unknown> = {
        customerName, customerEmail, customerPhone,
        serviceId, status,
      };
      if (authorizedPriceCents !== undefined) appointmentFields.priceCents = authorizedPriceCents;
      if (paymentStatus) appointmentFields.paymentStatus = paymentStatus;

      const appointmentId = await createBookingWithManifest({
        db, FieldValue,
        clientId: CLIENT_ID,
        staffId, date, time, duration,
        appointmentFields,
        bufferMinutes,
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
