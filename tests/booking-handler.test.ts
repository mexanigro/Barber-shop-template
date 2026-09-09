import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import express from "express";
import type { AddressInfo } from "node:net";
import { createBookingHandler, type BookingContext } from "../src/lib/api/booking-handler.js";

const root = new URL("../", import.meta.url);
const valid = { customerName: "  Ana  Perez ", customerEmail: "ANA@example.com", customerPhone: "123456789", serviceId: "cut", staffId: "staff", date: "2026-10-10", time: "10:00", duration: 30, status: "confirmed", paymentStatus: "pending", clientId: "AJENO" };

// Handler y createBookingWithManifest reales; proveedor y transacción Firestore simulados.
function persistence(mode = "ok") {
  const committed: Array<{ collection: string; data: Record<string, unknown> }> = [];
  let reads = 0, upserts = 0, contextLoads = 0;
  const db = {
    collection(collection: string) {
      return {
        doc(id = "appointment-test") { return { collection, id }; },
        where() { return this; }, limit() { return this; },
        async get() { upserts++; if (mode === "customer") throw Error("customer failure"); return { empty: true }; },
        async add(data: Record<string, unknown>) { committed.push({ collection, data }); },
      };
    },
    async runTransaction(callback: (tx: unknown) => Promise<string>) {
      const pending: typeof committed = [];
      const result = await callback({
        async get() { reads++; if (mode === "read") throw Error("read failure"); return { exists: mode === "conflict", data: () => ({ intervals: [{ start: "10:00", end: "11:00" }] }) }; },
        set(ref: { collection: string }, data: Record<string, unknown>) { pending.push({ collection: ref.collection, data }); },
      });
      if (mode === "commit") throw Error("commit failure");
      committed.push(...pending);
      return result;
    },
  };
  return { committed, stats: () => ({ reads, upserts, contextLoads }), async load() { contextLoads++; if (mode === "no-db") return null; return { db, FieldValue: { serverTimestamp: () => "TIMESTAMP_TEST" } } as unknown as BookingContext; } };
}

function registration(relative: string): string {
  const text = readFileSync(new URL(relative, root), "utf8");
  const source = ts.createSourceFile(relative, text, ts.ScriptTarget.Latest, true);
  const found: string[] = [];
  function visit(node: ts.Node): void {
    if (ts.isCallExpression(node) && node.expression.getText(source) === "app.post" && ts.isStringLiteral(node.arguments[0]) && node.arguments[0].text === "/api/book") found.push(node.getText(source));
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.equal(found.length, 1, `${relative}: registro único requerido`);
  assert.match(found[0], /createBookingHandler/);
  return found[0];
}

test("ambos runtimes registran el handler compartido sin excepción de paridad", () => {
  for (const file of ["api/index.ts", "server.ts"]) registration(file);
  assert.doesNotMatch(readFileSync(new URL("tests/api-parity.test.ts", root), "utf8"), /"POST \/api\/book",/);
  const wizard = readFileSync(new URL("src/components/booking/BookingWizard.tsx", root), "utf8");
  assert.match(wizard, /fetch\("\/api\/book"/);
  assert.match(wizard, /appointmentId: id/);
});

async function invoke(body: unknown, mode = "ok") {
  const store = persistence(mode);
  const app = express(); app.use(express.json());
  // Ejecuta la declaración app.post efectiva de api/index.ts; no un registro duplicado en el test.
  runInNewContext(registration("api/index.ts"), { app, createBookingHandler, CLIENT_ID: "control-local", loadAdminFirestore: store.load });
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve, reject) => { server.once("listening", resolve); server.once("error", reject); });
  try {
    const response = await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/api/book`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    return { status: response.status, json: await response.json(), store };
  } finally { server.closeAllConnections(); await new Promise<void>((resolve, reject) => server.close(e => e ? reject(e) : resolve())); }
}

test("BookingWizard recibe éxito sólo tras persistir; identidad no viene del body", async () => {
  const r = await invoke(valid);
  assert.equal(r.status, 200); assert.deepEqual(r.json, { success: true, appointmentId: "appointment-test" });
  const appointment = r.store.committed.find(x => x.collection === "appointments")!.data;
  assert.equal(appointment.clientId, "control-local"); assert.equal(appointment.customerName, "Ana Perez"); assert.equal(appointment.customerEmail, "ana@example.com");
  assert.equal(appointment.status, "confirmed"); assert.equal(appointment.paymentStatus, "pending");
  assert.equal(appointment.manifestEnd, "10:40");
  assert.deepEqual(r.store.committed.map(x => x.collection), ["appointments", "daily_manifests", "customers"]);
});

test("defaults de estado y paymentStatus conservados", async () => {
  const r = await invoke({ ...valid, status: "other", paymentStatus: "paid" });
  assert.equal(r.status, 200); const a = r.store.committed[0].data;
  assert.equal(a.status, "pending"); assert.ok(!("paymentStatus" in a));
});

for (const [name, patch] of Object.entries({ nombre: { customerName: "" }, email: { customerEmail: "bad" }, fecha: { date: "bad" }, hora: { time: "bad" }, duracion: { duration: 481 }, fraccion: { duration: 5.5 }, staff: { staffId: "" } })) {
  test(`inválido ${name}:400 sin cargar persistencia`, async () => {
    const r = await invoke({ ...valid, ...patch }); assert.equal(r.status, 400); assert.ok(r.json.error);
    assert.deepEqual(r.store.stats(), { reads: 0, upserts: 0, contextLoads: 0 }); assert.equal(r.store.committed.length, 0);
  });
}
for (const [mode, status] of [["no-db", 503], ["conflict", 409], ["read", 500], ["commit", 500]] as const) {
  test(`${mode}: nunca éxito ni upsert posterior`, async () => {
    const r = await invoke(valid, mode); assert.equal(r.status, status); assert.ok(r.json.error); assert.ok(!r.json.appointmentId);
    assert.equal(r.store.committed.length, 0); assert.equal(r.store.stats().upserts, 0);
  });
}
test("fallo del upsert no revierte éxito de reserva confirmada", async () => {
  const r = await invoke(valid, "customer"); assert.equal(r.status, 200); assert.equal(r.json.appointmentId, "appointment-test");
  assert.deepEqual(r.store.committed.map(x => x.collection), ["appointments", "daily_manifests"]);
});
