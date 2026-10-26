import type { Request, Response, RequestHandler } from "express";
import type { DocumentReference, Firestore } from "firebase-admin/firestore";
import type { AdminAuthResult } from "./admin-auth.js";
import { isValidBookingDate, isValidBookingTime, BookingConflictError, applyAppointmentPatchInTransaction } from "./booking-validation.js";
import { randomUUID } from "node:crypto";
import { cobrosDe, netoDe, resumenDeCobros, type RegistroCobro } from "../cobros.js";

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
    const quien = await authenticate(req, res);
    if (!quien) return;
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
    // CRM-03 (D-307) y CRM-04 (D-344): el cobro de un turno manda el monto que entra ahora (`montoCents`), el método y, sólo como
    // respaldo, el precio que ve el panel; el servidor lo suma a lo guardado en una transacción y decide el estado. La fecha la pone él.
    const centavos = (v: unknown, min: number) => Number.isInteger(v) && (v as number) >= min && (v as number) <= 100_000_000;
    // CRM-05 (D-363): cada cobro lleva su id (el del diálogo; sin id, el cuerpo de CRM-04, lo pone el servidor) y queda en la lista
    // `cobros` del turno. Una reversión es un cobro negativo con `revierte` (el id que corrige) y `motivo`; nada se borra.
    const texto = (v: unknown, max: number) => typeof v === "string" && v.trim().length > 0 && v.length <= max;
    const reversion = Number.isInteger(body.montoCents) && body.montoCents < 0;
    const paymentOnly = keys.includes("montoCents") && keys.includes("paymentMethod") &&
      keys.every((k) => ["id", "montoCents", "paymentMethod", "precioCents", "revierte", "motivo"].includes(k)) &&
      (body.id === undefined || texto(body.id, 100)) &&
      (reversion ? centavos(-body.montoCents, 1) && texto(body.revierte, 100) && texto(body.motivo, 300)
        : centavos(body.montoCents, 1) && body.revierte === undefined && body.motivo === undefined) &&
      (body.precioCents === undefined || centavos(body.precioCents, 0)) &&
      ["cash", "card", "transfer", "other"].includes(body.paymentMethod);
    if (!statusOnly && !moveOnly && !paymentOnly) return res.status(400).json({ error: "Invalid appointment patch." });
    // CRM-05 (D-362, L4): la empleada cobra; corregir un cobro es de la dueña y la gerente.
    if (paymentOnly && reversion && quien.role === "staff") return res.status(403).json({ error: "Only the owner or a manager can reverse a payment." });
    try {
      const db = await loadDb();
      if (!db) return res.status(503).json({ error: "Database not available." });
      if (paymentOnly) {
        // El cobro no toca el manifiesto: sólo el turno de este cliente.
        const ref = db.collection("appointments").doc(id);
        const servicios = (await db.doc(`config/${clientId}`).get().catch((): null => null))?.data()?.services;
        const outcome = await db.runTransaction(async (transaction) => {
          const snap = await transaction.get(ref);
          const turno = snap.data();
          if (!snap.exists || turno?.clientId !== clientId) return "not-found" as const;
          const lista = cobrosDe(turno);
          if (body.id !== undefined && lista.some((c) => c.id === body.id)) return "ok" as const; // el reintento del mismo cobro
          if (turno.status === "cancelled") return "cancelled" as const;
          if (reversion) {
            const original = lista.find((c) => c.id === body.revierte && c.montoCents > 0);
            if (!original || -body.montoCents > netoDe(lista, original.id)) return "excede" as const;
          }
          const delCatalogo = Array.isArray(servicios) ? servicios.find((s: { id?: unknown }) => s?.id === turno.serviceId) : undefined;
          const precio = Number.isFinite(Number(delCatalogo?.price)) && delCatalogo?.price !== undefined ? Number(delCatalogo.price) : (body.precioCents ?? 0) / 100;
          const nuevo: RegistroCobro = {
            id: body.id ?? randomUUID(), montoCents: body.montoCents, metodo: body.paymentMethod, at: new Date(),
            ...(quien.email ? { por: quien.email } : {}), ...(reversion ? { revierte: body.revierte, motivo: body.motivo.trim() } : {}),
          };
          const cobros = [...lista, nuevo];
          transaction.update(ref, { cobros, ...resumenDeCobros(cobros, Math.round(precio * 100)) });
          return "ok" as const;
        });
        if (outcome === "not-found") return res.status(404).json({ error: "Appointment not found." });
        if (outcome === "cancelled") return res.status(409).json({ error: "The appointment is cancelled." });
        if (outcome === "excede") return res.status(409).json({ error: "The reversal exceeds what was paid." });
        return res.json({ success: true });
      }
      // N06 T3: estado/fecha y manifiesto en la MISMA transacción (cancelar libera una ocurrencia;
      // mover libera el viejo y reclama el nuevo). Conflicto → 409 sin escribir.
      const patch = statusOnly ? { status: body.status as string } : { date: body.date as string, time: body.time as string };
      const outcome = await db.runTransaction(async transaction => applyAppointmentPatchInTransaction({
        clientId,
        appointmentRef: db.collection("appointments").doc(id),
        manifestRef: (staffId, date) => db.collection("daily_manifests").doc(`${clientId}_${staffId}_${date}`),
        read: async ref => { const snap = await transaction.get(ref as DocumentReference); return { exists: snap.exists, data: snap.data() as Record<string, unknown> | undefined }; },
        update: (ref, data) => { transaction.update(ref as DocumentReference, data); },
        set: (ref, data) => { transaction.set(ref as DocumentReference, data); },
      }, patch));
      if (outcome === "not-found") return res.status(404).json({ error: "Appointment not found." });
      return res.json({ success: true });
    } catch (error) {
      if (error instanceof BookingConflictError) return res.status(409).json({ error: "This time slot is no longer available." });
      return res.status(503).json({ error: "Appointment update failed." });
    }
  };
  return { list, patch };
}

