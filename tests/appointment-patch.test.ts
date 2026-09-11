import { test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import type { AddressInfo } from "node:net";
import type { Request, Response } from "express";
import type { Firestore } from "firebase-admin/firestore";
import { createCrmAppointmentsHandlers } from "../src/lib/api/crm-appointments-handler.js";

// N06 T3 · PATCH /api/crm/appointments/:id por HTTP real; Firestore simulado en memoria con
// transacciones que sólo aplican al commit (una escritura directa se ve de inmediato: así se
// distingue "dentro de la transacción" de "fuera").
const CLIENT = "control-local";
const MANIFEST = (staff: string, date: string) => `${CLIENT}_${staff}_${date}`;

type Doc = Record<string, unknown>;
function store(seed: Record<string, Record<string, Doc>>) {
  const docs = new Map<string, Doc>();
  for (const [collection, rows] of Object.entries(seed)) for (const [id, data] of Object.entries(rows)) docs.set(`${collection}/${id}`, structuredClone(data));
  const key = (ref: { collection: string; id: string }) => `${ref.collection}/${ref.id}`;
  const snap = (ref: { collection: string; id: string }) => { const d = docs.get(key(ref)); return { exists: !!d, data: () => (d ? structuredClone(d) : undefined) }; };
  let transactions = 0;
  const db = {
    collection(collection: string) {
      return {
        doc(id: string) {
          const ref = { collection, id };
          return { ...ref, async get() { return snap(ref); }, async update(data: Doc) { docs.set(key(ref), { ...(docs.get(key(ref)) ?? {}), ...data }); } };
        },
      };
    },
    async runTransaction(callback: (tx: unknown) => Promise<unknown>) {
      transactions++;
      const pending: Array<() => void> = [];
      const result = await callback({
        async get(ref: { collection: string; id: string }) { return snap(ref); },
        update(ref: { collection: string; id: string }, data: Doc) { pending.push(() => docs.set(key(ref), { ...(docs.get(key(ref)) ?? {}), ...data })); },
        set(ref: { collection: string; id: string }, data: Doc) { pending.push(() => docs.set(key(ref), structuredClone(data))); },
      });
      for (const apply of pending) apply();
      return result;
    },
  };
  return { db: db as unknown as Firestore, read: (collection: string, id: string) => docs.get(`${collection}/${id}`), transactions: () => transactions };
}

async function patch(seed: Record<string, Record<string, Doc>>, id: string, body: unknown) {
  const s = store(seed);
  const handlers = createCrmAppointmentsHandlers({
    clientId: CLIENT, loadDb: async () => s.db,
    authenticate: async (_req: Request, _res: Response) => ({ uid: "owner" } as never),
  });
  const app = express(); app.use(express.json()); app.patch("/api/crm/appointments/:id", handlers.patch);
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve, reject) => { server.once("listening", resolve); server.once("error", reject); });
  try {
    const response = await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/api/crm/appointments/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    return { status: response.status, json: await response.json(), store: s };
  } finally { server.closeAllConnections(); await new Promise<void>((resolve, reject) => server.close(e => e ? reject(e) : resolve())); }
}

const appt = (over: Doc = {}): Doc => ({ clientId: CLIENT, staffId: "alex", date: "2026-09-14", time: "10:00", duration: 30, manifestEnd: "10:30", status: "confirmed", ...over });
const intervals = (m: Doc | undefined) => ((m?.intervals ?? []) as Array<{ start: string; end: string }>).map(i => `${i.start}-${i.end}`);

// ── Dos citas distintas del mismo día (10:00 y 11:00) ────────────────────────────────────────────
const twoSlots = () => ({
  appointments: { a1: appt(), a2: appt({ customerName: "segunda", time: "11:00", manifestEnd: "11:30" }) },
  daily_manifests: { [MANIFEST("alex", "2026-09-14")]: { clientId: CLIENT, intervals: [{ start: "10:00", end: "10:30" }, { start: "11:00", end: "11:30" }] } },
});
// ── Sobrecupo: dos citas idénticas en el mismo hueco (lo que N05 dejó en madre el 14) ─────────────
const overbooked = () => ({
  appointments: { a1: appt(), a2: appt({ customerName: "segunda" }) },
  daily_manifests: { [MANIFEST("alex", "2026-09-14")]: { clientId: CLIENT, intervals: [{ start: "10:00", end: "10:30" }, { start: "10:00", end: "10:30" }] } },
});

test("cancelar con sobrecupo libera exactamente UN intervalo", async () => {
  const r = await patch(overbooked(), "a1", { status: "cancelled" });
  assert.equal(r.status, 200);
  assert.equal(r.store.read("appointments", "a1")!.status, "cancelled");
  assert.deepEqual(intervals(r.store.read("daily_manifests", MANIFEST("alex", "2026-09-14"))), ["10:00-10:30"]);
});

test("cancelar una cita ya cancelada no toca el manifiesto", async () => {
  const seed = overbooked(); (seed.appointments.a1 as Doc).status = "cancelled";
  const r = await patch(seed, "a1", { status: "cancelled" });
  assert.equal(r.status, 200);
  assert.deepEqual(intervals(r.store.read("daily_manifests", MANIFEST("alex", "2026-09-14"))), ["10:00-10:30", "10:00-10:30"]);
});

test("mover (mismo día) libera el intervalo viejo y reclama el nuevo con la misma longitud; la cita cambia date/time/manifestEnd", async () => {
  const r = await patch(twoSlots(), "a1", { date: "2026-09-14", time: "12:00" });
  assert.equal(r.status, 200);
  const a1 = r.store.read("appointments", "a1")!;
  assert.equal(a1.time, "12:00"); assert.equal(a1.date, "2026-09-14"); assert.equal(a1.manifestEnd, "12:30");
  assert.deepEqual(intervals(r.store.read("daily_manifests", MANIFEST("alex", "2026-09-14"))), ["11:00-11:30", "12:00-12:30"]);
});

test("mover a otro día: quita del manifiesto viejo y crea el nuevo sólo con clientId e intervals", async () => {
  const r = await patch(twoSlots(), "a1", { date: "2026-09-16", time: "09:00" });
  assert.equal(r.status, 200);
  assert.deepEqual(intervals(r.store.read("daily_manifests", MANIFEST("alex", "2026-09-14"))), ["11:00-11:30"]);
  const created = r.store.read("daily_manifests", MANIFEST("alex", "2026-09-16"))!;
  assert.deepEqual(Object.keys(created).sort(), ["clientId", "intervals"]);
  assert.equal(created.clientId, CLIENT);
  assert.deepEqual(intervals(created), ["09:00-09:30"]);
  assert.equal(r.store.read("appointments", "a1")!.manifestEnd, "09:30");
});

test("mover a un hueco ocupado → 409 y NADA cambia (cita y manifiestos intactos: atomicidad)", async () => {
  const seed = overbooked();
  seed.daily_manifests[MANIFEST("alex", "2026-09-14")] = { clientId: CLIENT, intervals: [{ start: "10:00", end: "10:30" }, { start: "12:00", end: "13:00" }] };
  delete seed.appointments.a2;
  const r = await patch(seed, "a1", { date: "2026-09-14", time: "12:30" });
  assert.equal(r.status, 409);
  const a1 = r.store.read("appointments", "a1")!;
  assert.equal(a1.time, "10:00"); assert.equal(a1.manifestEnd, "10:30");
  assert.deepEqual(intervals(r.store.read("daily_manifests", MANIFEST("alex", "2026-09-14"))), ["10:00-10:30", "12:00-13:00"]);
});

test("mover al hueco que la propia cita deja libre no es conflicto", async () => {
  const seed = overbooked(); delete seed.appointments.a2;
  seed.daily_manifests[MANIFEST("alex", "2026-09-14")] = { clientId: CLIENT, intervals: [{ start: "10:00", end: "10:30" }] };
  const r = await patch(seed, "a1", { date: "2026-09-14", time: "10:15" });
  assert.equal(r.status, 200);
  assert.deepEqual(intervals(r.store.read("daily_manifests", MANIFEST("alex", "2026-09-14"))), ["10:15-10:45"]);
});

test("G3.5 cita sin manifestEnd (importada, staffId vacío): cancelar y mover sólo tocan la cita", async () => {
  const seed = { appointments: { csv: { clientId: CLIENT, staffId: "", date: "2026-09-21", time: "11:00", duration: 30, status: "confirmed" } }, daily_manifests: {} };
  const c = await patch(seed, "csv", { status: "cancelled" });
  assert.equal(c.status, 200); assert.equal(c.store.read("appointments", "csv")!.status, "cancelled");
  const m = await patch(seed, "csv", { date: "2026-09-22", time: "12:00" });
  assert.equal(m.status, 200);
  const moved = m.store.read("appointments", "csv")!;
  assert.equal(moved.date, "2026-09-22"); assert.equal(moved.time, "12:00"); assert.ok(!("manifestEnd" in moved));
  assert.equal(m.store.read("daily_manifests", MANIFEST("", "2026-09-22")), undefined);
});

test("cita de otro tenant o inexistente → 404 sin escribir", async () => {
  const seed = overbooked(); (seed.appointments.a1 as Doc).clientId = "otro";
  const r = await patch(seed, "a1", { status: "cancelled" });
  assert.equal(r.status, 404); assert.equal(r.store.read("appointments", "a1")!.status, "confirmed");
  const missing = await patch(overbooked(), "nope", { status: "cancelled" });
  assert.equal(missing.status, 404);
});

test("patch inválido (otras claves, hora fuera de rango) → 400", async () => {
  assert.equal((await patch(overbooked(), "a1", { status: "cancelled", time: "11:00" })).status, 400);
  assert.equal((await patch(overbooked(), "a1", { date: "2026-09-14", time: "25:00" })).status, 400);
  assert.equal((await patch(overbooked(), "a1", { staffId: "otro" })).status, 400);
});

// ── Cuerpo compartido con puertos propios (lo que db.ts adapta al SDK web) ───────────────────────
import { applyAppointmentPatchInTransaction, removeOneInterval, shiftInterval, BookingConflictError } from "../src/lib/api/booking-validation.js";

test("helpers: removeOneInterval quita una sola ocurrencia; shiftInterval conserva la longitud", () => {
  const twice = [{ start: "10:00", end: "10:30" }, { start: "10:00", end: "10:30" }, { start: "11:00", end: "11:40" }];
  assert.deepEqual(removeOneInterval(twice, "10:00", "10:30").intervals, [{ start: "10:00", end: "10:30" }, { start: "11:00", end: "11:40" }]);
  assert.equal(removeOneInterval(twice, "09:00", "09:30").removed, false);
  assert.equal(shiftInterval("10:00", "10:40", "15:20"), "16:00");
  assert.equal(shiftInterval("23:00", "23:30", "23:45"), "00:15");
});

test("puertos web: decorate añade el saneo de importadas a la cita y el conflicto no escribe nada", async () => {
  const docs = new Map<string, Doc>([["appointments/x", appt({ customerEmail: null })], ["daily_manifests/m", { clientId: CLIENT, intervals: [{ start: "10:00", end: "10:30" }, { start: "12:00", end: "13:00" }] }]]);
  const writes: Array<[string, Doc]> = [];
  const ports = {
    clientId: CLIENT, appointmentRef: "appointments/x", manifestRef: () => "daily_manifests/m",
    read: async (ref: unknown) => { const d = docs.get(ref as string); return { exists: !!d, data: d }; },
    update: (ref: unknown, data: Doc) => { writes.push([ref as string, data]); },
    set: (ref: unknown, data: Doc) => { writes.push([ref as string, data]); },
    decorate: (_before: Doc, fields: Doc) => ({ ...fields, customerEmail: "import_x@noemail.local" }),
  };
  await assert.rejects(applyAppointmentPatchInTransaction(ports, { date: "2026-09-14", time: "12:30" }), BookingConflictError);
  assert.equal(writes.length, 0);
  assert.equal(await applyAppointmentPatchInTransaction(ports, { status: "cancelled" }), "ok");
  assert.deepEqual(writes, [["daily_manifests/m", { intervals: [{ start: "12:00", end: "13:00" }] }], ["appointments/x", { status: "cancelled", customerEmail: "import_x@noemail.local" }]]);
});
