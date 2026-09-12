// N07 T0 — arnés del contrato C-2 de POST /api/notify-booking.
// Ejecuta la declaración app.post efectiva de cada runtime (api/index.ts o server.ts),
// extraída por AST y transpilada, con dependencias falsas que registran los envíos.
// Ningún proveedor real, ningún Firestore real, ningún email.
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import express from "express";
import type { AddressInfo } from "node:net";
import { createNotifyBookingHandler } from "../../src/lib/api/notify-booking-handler.js";

const root = new URL("../../", import.meta.url);

export type Runtime = "api/index.ts" | "server.ts";

export type Sent = { kind: "owner" | "customer" | "whatsapp"; to?: string; subject?: string; resolvedBeforeResponse?: boolean };

export type Fixture = {
  clientId?: string;
  appointments?: Record<string, Record<string, unknown>>;
  config?: Record<string, unknown>;
  notificationLogs?: Array<Record<string, unknown>>;
  ownerEmail?: string;
};

function registration(relative: Runtime): string {
  const text = readFileSync(new URL(relative, root), "utf8");
  const source = ts.createSourceFile(relative, text, ts.ScriptTarget.Latest, true);
  const found: string[] = [];
  function visit(node: ts.Node): void {
    if (ts.isCallExpression(node) && node.expression.getText(source) === "app.post" && ts.isStringLiteral(node.arguments[0]) && node.arguments[0].text === "/api/notify-booking") found.push(node.getText(source));
    ts.forEachChild(node, visit);
  }
  visit(source);
  if (found.length !== 1) throw new Error(`${relative}: registro único de /api/notify-booking requerido (hay ${found.length})`);
  return ts.transpileModule(found[0], { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
}

export async function invokeNotify(runtime: Runtime, body: unknown, fixture: Fixture = {}) {
  const CLIENT_ID = fixture.clientId ?? "control-local";
  const appointments = fixture.appointments ?? {};
  const sent: Sent[] = [];
  let responded = false;
  const logs = [...(fixture.notificationLogs ?? [])];

  // Firestore Admin falso: appointments/config por id; notification_logs con where/limit/get y add.
  const query = (filters: Array<[string, unknown]>, max?: number): Record<string, unknown> => ({
    where: (field: string, _op: string, value: unknown) => query([...filters, [field, value]], max),
    limit: (n: number) => query(filters, n),
    get: async () => {
      const docs = logs.filter((l) => filters.every(([k, v]) => l[k] === v)).slice(0, max ?? logs.length);
      return { empty: docs.length === 0, docs };
    },
  });
  const db = {
    collection: (name: string) => ({
      doc: (id: string) => ({
        get: async () => {
          const data = name === "appointments" ? appointments[id] : name === "config" && id === CLIENT_ID ? fixture.config : undefined;
          return { exists: data !== undefined, data: () => data, id };
        },
      }),
      where: (field: string, _op: string, value: unknown) => query([[field, value]]),
      add: async (doc: Record<string, unknown>) => { if (name === "notification_logs") logs.push(doc); return { id: `log-${logs.length}` }; },
    }),
  };

  const deps = {
    CLIENT_ID,
    sanitizeText: (input: unknown, maxLen: number) => (typeof input !== "string" ? "" : input.trim().replace(/\s+/g, " ").slice(0, maxLen)),
    isValidEmail: (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
    isLikelyPhone: (v: string) => /^[+\d()\-\s]{6,20}$/.test(v),
    getAdminDb: async () => db,
    loadAdminFirestore: async () => ({ db }),
    getChannelConfig: async () => ({ booking_confirmation_customer: "email", new_booking_owner: "email", new_booking_staff: "email", reminder_24h_customer: "whatsapp", cancellation_customer: "email", reschedule_customer: "email", new_lead_owner: "email", review_request_customer: "email" }),
    shouldUseChannel: (cfg: Record<string, string>, event: string, channel: string) => cfg[event] === channel || cfg[event] === "both",
    getNotificationRecipients: () => ({ adminPhones: [] as string[], staffPhones: [] as string[] }),
    // Registro nuevo (T2): el runtime delega en el handler compartido con estos puertos.
    createNotifyBookingHandler,
    process: { env: { BUSINESS_OWNER_EMAIL: fixture.ownerEmail ?? "" } },
    deliverEmail: (message: { to: string; subject: string }) => {
      const entry: Sent = { kind: message.to === fixture.ownerEmail ? "owner" : "customer", to: message.to, subject: message.subject };
      sent.push(entry);
      return new Promise<{ status: "sent" }>((resolve) => setTimeout(() => { entry.resolvedBeforeResponse = !responded; resolve({ status: "sent" }); }, 30));
    },
    notifyAgentAppointmentBooked: async () => { sent.push({ kind: "whatsapp" }); return false; },
    sendNotification: async (subject: string) => {
      if (!fixture.ownerEmail) return { status: "error", error: "No recipient email" };
      sent.push({ kind: "owner", to: fixture.ownerEmail, subject });
      return { status: "sent" };
    },
    sendEmailToCustomer: (params: { to: string; subject: string }) => {
      const entry: Sent = { kind: "customer", to: params.to, subject: params.subject };
      sent.push(entry);
      return new Promise<void>((resolve) => setTimeout(() => { entry.resolvedBeforeResponse = !responded; resolve(); }, 30));
    },
    buildCustomerBookingEmailHtml: (p: Record<string, unknown>) => JSON.stringify(p),
    reportBookingToHub: () => {},
    writeNotificationLog: async (p: { type: string; recipient: string; status: string }) => { logs.push(p); },
    console: { error: () => {}, warn: () => {}, log: () => {} },
    setTimeout, clearTimeout,
  };

  const app = express(); app.use(express.json());
  runInNewContext(registration(runtime), { app, ...deps });
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve, reject) => { server.once("listening", resolve); server.once("error", reject); });
  try {
    const response = await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/api/notify-booking`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    responded = true;
    const json = await response.json().catch(() => ({}));
    await new Promise((r) => setTimeout(r, 60)); // deja terminar los envíos fire-and-forget para observarlos
    return { status: response.status, json, sent, logs };
  } finally { server.closeAllConnections(); await new Promise<void>((resolve, reject) => server.close(e => e ? reject(e) : resolve())); }
}

export const fixtureBase: Fixture = {
  clientId: "control-local",
  ownerEmail: "owner@test.local",
  config: {
    services: [{ id: "haircut", name: "Classic Haircut", duration: 30, price: 45 }],
    staff: [{ id: "alex", name: "Alex" }],
    businessRules: { autoConfirm: false, bufferMinutes: 0 },
  },
  appointments: {
    "n07-ok": { clientId: "control-local", customerName: "Ana Perez", customerEmail: "ana@test.local", customerPhone: "0500000001", serviceId: "haircut", staffId: "alex", date: "2026-09-21", time: "10:00", duration: 30, status: "pending", manifestEnd: "10:30" },
    "n07-ajena": { clientId: "OTRO", customerName: "Bob", customerEmail: "bob@test.local", customerPhone: "0500000002", serviceId: "haircut", staffId: "alex", date: "2026-09-21", time: "11:00", duration: 30, status: "pending" },
    "n07-cancelada": { clientId: "control-local", customerName: "Cal", customerEmail: "cal@test.local", customerPhone: "0500000003", serviceId: "haircut", staffId: "alex", date: "2026-09-21", time: "12:00", duration: 30, status: "cancelled" },
  },
};
