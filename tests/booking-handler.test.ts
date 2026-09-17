import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import express from "express";
import type { AddressInfo } from "node:net";
import { createBookingHandler, type BookingContext } from "../src/lib/api/booking-handler.js";

const root = new URL("../", import.meta.url);
const valid = { customerName: "  Ana  Perez ", customerEmail: "ANA@example.com", customerPhone: "123456789", serviceId: "cut", staffId: "staff", date: "2026-10-10", time: "10:00", duration: 30, status: "confirmed", paymentStatus: "pending" };

// Handler y createBookingWithManifest reales; proveedor y transacción Firestore simulados.
// config/{clientId} del mismo backend (precio-conexión, N03): sin `payment` la rama online no aplica.
const schedule = Object.fromEntries(['sunday','monday','tuesday','wednesday','thursday','friday','saturday'].map(day => [day, {isOpen:true,hours:{start:'09:00',end:'18:00'},breaks:[] as Array<{start:string;end:string}>}]));
const config: Record<string, unknown> = { services:[{id:'cut',duration:30,price:45}],staff:[{id:'staff',schedule}] };

function persistence(mode = "ok", cfg: Record<string, unknown> = config, coreReady = false) {
  const committed: Array<{ collection: string; data: Record<string, unknown> }> = [];
  let reads = 0, upserts = 0, contextLoads = 0;
  const db = {
    collection(collection: string) {
      return {
        doc(id = "appointment-test") {
          // El handler lee config/{clientId} por doc().get() antes de la transacción; no es el upsert de customers.
          if (collection === "config") return { collection, id, async get() { return { exists: true, data: () => cfg }; } };
          if (collection === "crm_operations" && id === "control_control-local") return { collection, id, async get() { return { exists: coreReady, data: () => coreReady ? { clientId: "control-local", state: "ready", schemaVersion: 2 } : undefined }; } };
          return { collection, id };
        },
        where() { return this; }, limit() { return this; },
        async get() { upserts++; if (mode === "customer") throw Error("customer failure"); return { empty: true }; },
        async add(data: Record<string, unknown>) { committed.push({ collection, data }); },
      };
    },
    async runTransaction(callback: (tx: unknown) => Promise<string>) {
      const pending: typeof committed = [];
      const transaction = {
        async get(ref: { collection: string }) { reads++; if (mode === "read") throw Error("read failure"); if (ref.collection === "config") return { exists: true, data: () => cfg }; return { exists: ref.collection === "daily_manifests" && mode === "conflict", data: () => ({ clientId: "control-local", intervals: [{ start: "10:00", end: "11:00" }] }) }; },
        set(ref: { collection: string }, data: Record<string, unknown>) { pending.push({ collection: ref.collection, data }); },
      };
      let result = await callback(transaction);
      if (mode === "retry-close" || mode === "retry-buffer") {
        pending.length = 0; // Firestore descarta el intento antes de repetir el callback.
        cfg = structuredClone(cfg);
        if (mode === "retry-close") {
          const staff = cfg.staff as Array<{schedule:Record<string,{isOpen:boolean}>}>;
          for (const day of Object.values(staff[0].schedule)) day.isOpen = false;
        } else cfg.businessRules = {bufferMinutes:30};
        result = await callback(transaction);
      }
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

async function invoke(body: unknown, mode = "ok", cfg?: Record<string, unknown>, legacyAllowed = true) {
  const store = persistence(mode, cfg, !legacyAllowed);
  const app = express(); app.use(express.json());
  // Ejecuta la declaración app.post efectiva de api/index.ts; no un registro duplicado en el test.
  runInNewContext(registration("api/index.ts"), {
    app,
    createBookingHandler,
    CLIENT_ID: "control-local",
    loadAdminFirestore: store.load,
    contactRuntime: (): undefined => undefined,
  });
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve, reject) => { server.once("listening", resolve); server.once("error", reject); });
  try {
    const response = await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/api/book`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    return { status: response.status, json: await response.json(), store };
  } finally { server.closeAllConnections(); await new Promise<void>((resolve, reject) => server.close(e => e ? reject(e) : resolve())); }
}

test("partición Core sin runtime atribuido falla cerrada antes de citas, manifiestos o contactos", async () => {
  const r = await invoke(valid, "ok", undefined, false);
  assert.equal(r.status, 503);
  assert.deepEqual(r.json, { error: "contact_runtime_unavailable" });
  assert.deepEqual(r.store.committed, []);
});

test("BookingWizard recibe éxito sólo tras persistir; identidad no viene del body", async () => {
  const r = await invoke(valid);
  assert.equal(r.status, 200); assert.deepEqual(r.json, { success: true, appointmentId: "appointment-test" });
  const appointment = r.store.committed.find(x => x.collection === "appointments")!.data;
  assert.equal(appointment.clientId, "control-local"); assert.equal(appointment.customerName, "Ana Perez"); assert.equal(appointment.customerEmail, "ana@example.com");
  assert.equal(appointment.status, "confirmed"); assert.equal(appointment.paymentStatus, "pending");
  assert.equal(appointment.manifestEnd, "10:40");
  assert.deepEqual(r.store.committed.map(x => x.collection), ["appointments", "daily_manifests", "customers"]);
});

// D-5 (b), N06 T2: el estado lo decide el servidor (autoConfirm, default true); el body no manda. paymentStatus sigue igual.
test("estado del servidor: autoConfirm default true → confirmed aunque el body diga otra cosa; paymentStatus no acepta valores ajenos", async () => {
  const r = await invoke({ ...valid, status: "other", paymentStatus: "paid" });
  assert.equal(r.status, 200); const a = r.store.committed[0].data;
  assert.equal(a.status, "confirmed"); assert.ok(!("paymentStatus" in a));
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

// ─── N06 T2 · D-5 (b): el servidor valida contra lo que config declara ───────────────────────────
const catalog = { services: [{ id: "cut", name: "Cut", duration: 30, price: 45 }, { id: "beard", name: "Beard", duration: 25, price: 35 }], staff: [{ id: "staff", schedule }, { id: "alex", schedule }], businessRules: { autoConfirm: false } };

test("T2 staff: staffId fuera de config.staff → 400 sin escribir", async () => {
  const r = await invoke({ ...valid, staffId: "nadie" }, "ok", catalog);
  assert.equal(r.status, 400); assert.equal(r.store.committed.length, 0);
});
test("T2 servicio: serviceId fuera de config.services → 400 sin escribir", async () => {
  const r = await invoke({ ...valid, serviceId: "nope" }, "ok", catalog);
  assert.equal(r.status, 400); assert.equal(r.store.committed.length, 0);
});
test("T2 servicio: fuera de visibleServices → 400 sin escribir", async () => {
  const r = await invoke(valid, "ok", { ...catalog, visibleServices: ["beard"] });
  assert.equal(r.status, 400); assert.equal(r.store.committed.length, 0);
});
test("T2 duración: la impone el servidor desde el servicio, ignora la del body", async () => {
  const r = await invoke({ ...valid, duration: 480 }, "ok", catalog);
  assert.equal(r.status, 200); const a = r.store.committed[0].data;
  assert.equal(a.duration, 30); assert.equal(a.manifestEnd, "10:40");
});
test("T2 estado: autoConfirm false → pending aunque el body diga confirmed", async () => {
  const r = await invoke({ ...valid, status: "confirmed" }, "ok", catalog);
  assert.equal(r.status, 200); assert.equal(r.store.committed[0].data.status, "pending");
});
for (const [label, rules, end] of [["0", { bufferMinutes: 0 }, "10:30"], ["25", { bufferMinutes: 25 }, "10:55"], ["500→clamp 120", { bufferMinutes: 500 }, "12:30"], ["ausente→10", {}, "10:40"]] as const) {
  test(`T2 buffer ${label}: manifestEnd = time + duración + buffer de businessRules`, async () => {
    const r = await invoke(valid, "ok", { ...catalog, businessRules: rules });
    assert.equal(r.status, 200); const a = r.store.committed[0].data;
    assert.equal(a.manifestEnd, end); assert.equal((r.store.committed[1].data.intervals as Array<{ end: string }>)[0].end, end);
  });
}
test("P17 sustituye hueco D-5: catálogo ausente rechaza sin escribir", async () => {
  const r = await invoke({ ...valid, serviceId: "loquesea", duration: 45 }, "ok", { staff: catalog.staff });
  assert.equal(r.status, 503); assert.equal(r.store.committed.length, 0);
});
test("P17 sustituye hueco D-5: roster vacío rechaza sin escribir", async () => {
  const r = await invoke({ ...valid, staffId: "nadie" }, "ok", { ...catalog, staff: [] });
  assert.equal(r.status, 400); assert.equal(r.store.committed.length, 0);
});
test("T2 rama online intacta: precio del catálogo persiste; servicio desconocido sigue 503", async () => {
  const online = { ...catalog, payment: { enabled: true, mode: "deposit", provider: "cardcom" } };
  const ok = await invoke({ ...valid, serviceId: "cut" }, "ok", online);
  assert.equal(ok.status, 200); assert.equal(ok.store.committed[0].data.priceCents, 4500);
  const bad = await invoke({ ...valid, serviceId: "nope" }, "ok", online);
  assert.equal(bad.status, 503); assert.equal(bad.store.committed.length, 0);
});

test("P17 tenant ajeno explícito rechaza antes de cargar persistencia", async () => { const r = await invoke({...valid,clientId:"AJENO"}); assert.equal(r.status,403); assert.deepEqual(r.store.stats(),{reads:0,upserts:0,contextLoads:0}); assert.equal(r.store.committed.length,0); });

for (const mode of ["retry-close", "retry-buffer"]) test(`P17 ${mode}: callback repetido relee fuente y no conserva escrituras descartadas`, async () => { const r=await invoke(valid,mode); assert.equal(r.status,409); assert.equal(r.store.committed.length,0); assert.equal(r.store.stats().upserts,0); assert.equal(r.store.stats().contextLoads,1); assert.ok(r.store.stats().reads>=5); if(mode==="retry-buffer") assert.equal(r.json.error,"availability_changed"); });
