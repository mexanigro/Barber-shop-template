import type { Request, Response, RequestHandler } from "express";
import type { Firestore } from "firebase-admin/firestore";
import type { AdminAuthResult } from "./admin-auth.js";
import { isValidBookingDate, isValidBookingTime, BOOKING_BUFFER_MINUTES } from "./booking-validation.js";

type Dependencies = {
  clientId: string;
  loadDb: () => Promise<Firestore | null>;
  authenticate: (req: Request, res: Response) => Promise<AdminAuthResult | null>;
};

/** Agenda del mismo contexto que /api/book; nunca selecciona tenant desde la petición. */
export function createCrmAppointmentsHandlers({ clientId, loadDb, authenticate }: Dependencies) {
  const list: RequestHandler = async (req, res) => {
    if (!await authenticate(req, res)) return;
    try {
      const db = await loadDb();
      if (!db) return res.status(503).json({ error: "Database not available." });
      const snapshot = await db.collection("appointments").where("clientId", "==", clientId)
        .orderBy("createdAt", "desc").limit(500).get();
      return res.json({
        source: { project: (db as Firestore & { readonly projectId: string }).projectId, database: db.databaseId, collection: "appointments" },
        appointments: snapshot.docs.map(doc => {
          const data = doc.data();
          return { ...data, id: doc.id, staffId: data.staffId ?? data.barberId ?? "",
            createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null };
        }),
      });
    } catch {
      return res.status(503).json({ error: "Appointment source unavailable." });
    }
  };

  const patch: RequestHandler = async (req, res) => {
    if (!await authenticate(req, res)) return;
    const id = req.params.id;
    const body = req.body;
    if (typeof id !== "string" || !id || id.includes("/") || !body || typeof body !== "object" || Array.isArray(body)) {
      return res.status(400).json({ error: "Invalid appointment patch." });
    }
    const keys = Object.keys(body);
    const statusOnly = keys.length === 1 && keys[0] === "status" &&
      ["confirmed", "pending", "cancelled", "completed", "expired"].includes(body.status);
    const moveOnly = keys.length === 2 && keys.includes("date") && keys.includes("time") &&
      typeof body.date === "string" && typeof body.time === "string" &&
      isValidBookingDate(body.date) && isValidBookingTime(body.time) &&
      Number(body.time.slice(0, 2)) < 24 && Number(body.time.slice(3)) < 60;
    if (!statusOnly && !moveOnly) return res.status(400).json({ error: "Invalid appointment patch." });
    try {
      const db = await loadDb();
      if (!db) return res.status(503).json({ error: "Database not available." });
      const ref = db.collection("appointments").doc(id);
      const snap = await ref.get();
      const before = snap.data();
      if (!snap.exists || before?.clientId !== clientId) return res.status(404).json({ error: "Appointment not found." });
      await ref.update(statusOnly ? { status: body.status } : { date: body.date, time: body.time });
      // Conserva la limpieza best-effort de cancelación, dentro del MISMO origen.
      if (body.status === "cancelled" && before.status !== "cancelled") {
        try {
          const staffId = before.staffId ?? before.barberId;
          if (!staffId || !before.date || !before.time) return res.json({ success: true });
          const manifest = db.collection("daily_manifests").doc(`${clientId}_${staffId}_${before.date}`);
          await db.runTransaction(async transaction => {
            const manifestSnap = await transaction.get(manifest);
            if (!manifestSnap.exists) return;
            const [hour, minute] = String(before.time).split(":").map(Number);
            const endMinutes = hour * 60 + minute + (before.duration || 30) + BOOKING_BUFFER_MINUTES;
            const end = before.manifestEnd ?? `${String(Math.floor(endMinutes / 60) % 24).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`;
            const intervals: { start: string; end: string }[] = manifestSnap.data()?.intervals ?? [];
            const kept = intervals.filter(interval => !(interval.start === before.time && interval.end === end));
            if (kept.length !== intervals.length) transaction.update(manifest, { intervals: kept });
          });
        } catch {
          console.warn("[CRM] Manifest cleanup failed (non-fatal).");
        }
      }
      return res.json({ success: true });
    } catch {
      return res.status(503).json({ error: "Appointment update failed." });
    }
  };
  return { list, patch };
}

