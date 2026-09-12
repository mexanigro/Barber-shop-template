// N07 — contrato C-2 de POST /api/notify-booking, ejecutado sobre el handler efectivo de CADA runtime.
// Filas 1–5: contrato C-2 vigente (el que envía el wizard). Filas 6–9: obligaciones de T2 (H-4 orden, H-5 nombres, D-5 idempotencia).
// Run: npx tsx --test tests/notify-booking-handler.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { invokeNotify, fixtureBase, type Runtime } from "./helpers/notify-booking-harness.js";

const RUNTIMES: Runtime[] = ["api/index.ts", "server.ts"];

for (const runtime of RUNTIMES) {
  test(`[${runtime}] 1 · sin appointmentId → 400`, async () => {
    const r = await invokeNotify(runtime, {}, fixtureBase);
    assert.equal(r.status, 400);
    assert.equal(r.sent.length, 0);
  });

  test(`[${runtime}] 2 · {appointmentId} de cita existente → 200, un email al dueño y uno al cliente (al email del documento)`, async () => {
    const r = await invokeNotify(runtime, { appointmentId: "n07-ok" }, fixtureBase);
    assert.equal(r.status, 200, JSON.stringify(r.json));
    assert.deepEqual(r.sent.filter(s => s.kind === "owner").map(s => s.to), ["owner@test.local"]);
    assert.deepEqual(r.sent.filter(s => s.kind === "customer").map(s => s.to), ["ana@test.local"]);
    assert.equal(r.sent.filter(s => s.kind === "whatsapp").length, 0);
  });

  test(`[${runtime}] 3 · appointmentId inexistente → 404, cero envíos`, async () => {
    const r = await invokeNotify(runtime, { appointmentId: "n07-no-existe" }, fixtureBase);
    assert.equal(r.status, 404, JSON.stringify(r.json));
    assert.equal(r.sent.length, 0);
  });

  test(`[${runtime}] 4 · cita de otro tenant → 404, cero envíos`, async () => {
    const r = await invokeNotify(runtime, { appointmentId: "n07-ajena" }, fixtureBase);
    assert.equal(r.status, 404, JSON.stringify(r.json));
    assert.equal(r.sent.length, 0);
  });

  test(`[${runtime}] 5 · anti-spoof: details.* del body se ignoran; el email va al del documento`, async () => {
    const body = { appointmentId: "n07-ok", details: { customerName: "Evil", customerEmail: "evil@attacker.local", customerPhone: "0500000099", staff: "X", staffId: "x", service: "Y", date: "2026-09-21", time: "10:00" } };
    const r = await invokeNotify(runtime, body, fixtureBase);
    assert.equal(r.status, 200, JSON.stringify(r.json));
    const customer = r.sent.filter(s => s.kind === "customer");
    assert.deepEqual(customer.map(s => s.to), ["ana@test.local"]);
  });

  test(`[${runtime}] 6 · H-4: la respuesta sale después de que el envío al cliente resolvió`, async () => {
    const r = await invokeNotify(runtime, { appointmentId: "n07-ok" }, fixtureBase);
    assert.equal(r.status, 200, JSON.stringify(r.json));
    const customer = r.sent.find(s => s.kind === "customer");
    assert.ok(customer, "sin envío al cliente");
    assert.equal(customer.resolvedBeforeResponse, true, "el handler respondió antes de terminar el envío al cliente");
  });

  test(`[${runtime}] 7 · H-5: el asunto usa el nombre del servicio desde config, no el serviceId`, async () => {
    const r = await invokeNotify(runtime, { appointmentId: "n07-ok" }, fixtureBase);
    const customer = r.sent.find(s => s.kind === "customer");
    assert.ok(customer, "sin envío al cliente");
    assert.match(customer.subject ?? "", /Classic Haircut/);
    assert.doesNotMatch(customer.subject ?? "", /\bhaircut\b/);
  });

  test(`[${runtime}] 8 · D-5: cita cancelada → 200 sin envíos`, async () => {
    const r = await invokeNotify(runtime, { appointmentId: "n07-cancelada" }, fixtureBase);
    assert.equal(r.status, 200, JSON.stringify(r.json));
    assert.equal(r.sent.length, 0);
  });

  test(`[${runtime}] 9 · D-5: notify repetido con log «sent» del mismo id+tipo → 200 sin reenvío`, async () => {
    const withLog = { ...fixtureBase, notificationLogs: [{ clientId: "control-local", appointmentId: "n07-ok", event: "booking_confirmation_customer", type: "booking", recipient: "ana@test.local", status: "sent" }] };
    const r = await invokeNotify(runtime, { appointmentId: "n07-ok" }, withLog);
    assert.equal(r.status, 200, JSON.stringify(r.json));
    assert.equal(r.sent.filter(s => s.kind === "customer").length, 0, "reenvió al cliente");
  });
}
