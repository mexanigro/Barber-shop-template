/**
 * Functional tests for src/lib/ai/admin-tools.ts.
 *
 * Run with: npx tsx --test src/lib/ai/admin-tools.test.ts
 *
 * The Firestore dependency is replaced with a tiny in-memory fake that mimics
 * the firebase-admin shapes we use (collection, doc, get, set, update, batch,
 * runTransaction). The fake records every write so each test can assert on
 * the resulting documents.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  ADMIN_TOOL_DECLARATIONS,
  AdminActionError,
  AdminToolValidationError,
  BULK_UPDATE_STATUS_CAP,
  dispatchAdminAction,
  validateActionArgs,
} from "./admin-tools.ts";

// ─── In-memory Firestore fake ────────────────────────────────────────────────

type DocData = Record<string, any>;

class FakeDocRef {
  collection: FakeCollection;
  id: string;
  constructor(collection: FakeCollection, id: string) {
    this.collection = collection;
    this.id = id;
  }
  async get() {
    const exists = this.collection.docs.has(this.id);
    const data = this.collection.docs.get(this.id);
    return {
      exists,
      id: this.id,
      data: () => (exists ? { ...data } : undefined),
    };
  }
  async set(data: DocData, opts?: { merge?: boolean }) {
    const existing = this.collection.docs.get(this.id);
    if (opts?.merge && existing) {
      this.collection.docs.set(this.id, mergeIncrement(existing, data));
    } else {
      this.collection.docs.set(this.id, expandFieldValues(data, existing));
    }
  }
  async update(data: DocData) {
    const existing = this.collection.docs.get(this.id);
    if (!existing) throw new Error(`update on non-existent doc ${this.id}`);
    this.collection.docs.set(this.id, mergeIncrement(existing, data));
  }
}

class FakeQuery {
  constructor(public collection: FakeCollection, public filters: Array<[string, string, any]>) {}
  where(field: string, op: string, value: any): FakeQuery {
    return new FakeQuery(this.collection, [...this.filters, [field, op, value]]);
  }
  async get() {
    const results: Array<{ id: string; data: () => DocData }> = [];
    for (const [id, data] of this.collection.docs.entries()) {
      const ok = this.filters.every(([f, op, v]) => {
        if (op === "==") return data[f] === v;
        return false;
      });
      if (ok) results.push({ id, data: () => ({ ...data }) });
    }
    return {
      empty: results.length === 0,
      size: results.length,
      docs: results,
      forEach: (cb: (doc: { id: string; data: () => DocData }) => void) => results.forEach(cb),
    };
  }
}

class FakeCollection {
  docs = new Map<string, DocData>();
  nextAutoId = 1;
  constructor(public name: string) {}
  doc(id?: string): FakeDocRef {
    const docId = id ?? `auto_${this.name}_${this.nextAutoId++}`;
    return new FakeDocRef(this, docId);
  }
  where(field: string, op: string, value: any): FakeQuery {
    return new FakeQuery(this, [[field, op, value]]);
  }
}

class FakeBatch {
  private writes: Array<() => void> = [];
  constructor(private db: FakeDb) {}
  update(ref: FakeDocRef, data: DocData) {
    this.writes.push(() => ref.update(data));
  }
  set(ref: FakeDocRef, data: DocData) {
    this.writes.push(() => ref.set(data));
  }
  async commit() {
    for (const w of this.writes) await w();
  }
}

class FakeDb {
  collections = new Map<string, FakeCollection>();
  collection(name: string): FakeCollection {
    let c = this.collections.get(name);
    if (!c) {
      c = new FakeCollection(name);
      this.collections.set(name, c);
    }
    return c;
  }
  batch() {
    return new FakeBatch(this);
  }
  async runTransaction<T>(fn: (tx: any) => Promise<T>): Promise<T> {
    // Tiny TX shim — no isolation, just inline reads/writes.
    const tx = {
      get: (ref: FakeDocRef) => ref.get(),
      set: (ref: FakeDocRef, data: DocData, opts?: { merge?: boolean }) => ref.set(data, opts),
    };
    return fn(tx);
  }
}

// FieldValue sentinels — recognised by mergeIncrement/expandFieldValues.
const FAKE_FIELD_VALUE = {
  increment: (n: number) => ({ __op: "increment", n }),
  serverTimestamp: () => ({ __op: "serverTimestamp" }),
  arrayUnion: (...items: unknown[]) => ({ __op: "arrayUnion", items }),
};

function expandFieldValues(data: DocData, existing?: DocData): DocData {
  const out: DocData = {};
  for (const [k, v] of Object.entries(data)) {
    out[k] = resolveOp(v, existing?.[k]);
  }
  return out;
}
function mergeIncrement(existing: DocData, patch: DocData): DocData {
  const out = { ...existing };
  for (const [k, v] of Object.entries(patch)) {
    out[k] = resolveOp(v, existing[k]);
  }
  return out;
}
function resolveOp(v: any, existing: any): any {
  if (v && typeof v === "object" && v.__op === "increment") {
    return (typeof existing === "number" ? existing : 0) + v.n;
  }
  if (v && typeof v === "object" && v.__op === "serverTimestamp") {
    return new Date("2026-05-27T00:00:00Z");
  }
  if (v && typeof v === "object" && v.__op === "arrayUnion") {
    const base = Array.isArray(existing) ? existing : [];
    const out = [...base];
    for (const item of v.items) if (!out.includes(item)) out.push(item);
    return out;
  }
  return v;
}

function makeCtx(clientId = "tenant_a") {
  const db = new FakeDb();
  return { db: db as any, FieldValue: FAKE_FIELD_VALUE as any, clientId };
}

// ─── Schema / validator ──────────────────────────────────────────────────────

describe("ADMIN_TOOL_DECLARATIONS", () => {
  test("declares the original 8 CRM tools (plus Bloque I/J extensions)", () => {
    const names = new Set(ADMIN_TOOL_DECLARATIONS.map((d) => d.name));
    // Original CRM 8 must always be present.
    const required = [
      "add_walkin_count",
      "book_appointment",
      "bulk_update_status",
      "mark_paid",
      "support_request",
      "update_appointment",
      "update_customer",
      "walk_in",
    ];
    for (const n of required) {
      assert.ok(names.has(n), `expected declaration for ${n}`);
    }
    // Bloque I — stock tools appended via stock-tools.ts side-effect import.
    assert.ok(names.has("query_stock"), "expected query_stock declaration");
    assert.ok(names.has("consume_stock"), "expected consume_stock declaration");
    assert.ok(names.has("add_stock"), "expected add_stock declaration");
    // Bloque J — tasks tools are real dispatch targets, not prompt-only stubs.
    assert.ok(names.has("create_task"), "expected create_task declaration");
    assert.ok(names.has("list_tasks"), "expected list_tasks declaration");
    assert.ok(names.has("complete_task"), "expected complete_task declaration");
  });
  test("each tool has a description and parameters object", () => {
    for (const d of ADMIN_TOOL_DECLARATIONS) {
      assert.ok(d.description.length > 10, `${d.name} description too short`);
      assert.ok(d.parameters, `${d.name} missing parameters`);
      assert.equal(d.parameters?.type, "OBJECT");
    }
  });
});

describe("validateActionArgs", () => {
  test("rejects unknown tool", () => {
    assert.throws(() => validateActionArgs("nope", {}), AdminToolValidationError);
  });
  test("rejects missing required field", () => {
    try {
      validateActionArgs("mark_paid", { appointmentId: "x" });
      assert.fail("should have thrown");
    } catch (err: any) {
      assert.ok(err instanceof AdminToolValidationError);
      assert.match(err.message, /amountCents/);
    }
  });
  test("rejects wrong type", () => {
    try {
      validateActionArgs("mark_paid", { appointmentId: "x", amountCents: "fifty" });
      assert.fail("should have thrown");
    } catch (err: any) {
      assert.ok(err instanceof AdminToolValidationError);
      assert.match(err.message, /amountCents/);
    }
  });
  test("accepts valid args", () => {
    const ok = validateActionArgs("mark_paid", { appointmentId: "x", amountCents: 5000 });
    assert.equal((ok as any).appointmentId, "x");
  });
  test("rejects status enum violation in update_appointment", () => {
    try {
      validateActionArgs("update_appointment", { appointmentId: "x", updates: { status: "weird" } });
      assert.fail("should have thrown");
    } catch (err: any) {
      assert.ok(err instanceof AdminToolValidationError);
    }
  });
});

// ─── mark_paid ───────────────────────────────────────────────────────────────

describe("mark_paid", () => {
  test("updates amountPaidCents + paymentStatus on the appointment", async () => {
    const ctx = makeCtx("tenant_a");
    // Seed an appointment
    const appts = ctx.db.collection("appointments");
    const apptRef = appts.doc("appt_1");
    await apptRef.set({
      clientId: "tenant_a",
      customerName: "Juan",
      date: "2026-05-27",
      time: "15:00",
      status: "confirmed",
    });
    const result = await dispatchAdminAction(ctx, "mark_paid", {
      appointmentId: "appt_1",
      amountCents: 5000,
      paymentMethod: "cash",
    });
    assert.equal(result.success, true);
    const updated = (await apptRef.get()).data();
    assert.equal(updated!.amountPaidCents, 5000);
    assert.equal(updated!.paymentStatus, "paid");
    assert.equal(updated!.paymentMethod, "cash");
    assert.ok(updated!.paidAt instanceof Date);
  });

  test("403 on cross-tenant appointment", async () => {
    const ctx = makeCtx("tenant_a");
    const appts = ctx.db.collection("appointments");
    await appts.doc("foreign").set({ clientId: "tenant_b", customerName: "x" });
    await assert.rejects(
      () => dispatchAdminAction(ctx, "mark_paid", { appointmentId: "foreign", amountCents: 100 }),
      (err: any) => err instanceof AdminActionError && err.status === 403,
    );
  });

  test("404 when appointment missing", async () => {
    const ctx = makeCtx("tenant_a");
    await assert.rejects(
      () => dispatchAdminAction(ctx, "mark_paid", { appointmentId: "ghost", amountCents: 100 }),
      (err: any) => err instanceof AdminActionError && err.status === 404,
    );
  });

  test("rejects negative amount", async () => {
    const ctx = makeCtx("tenant_a");
    const apptRef = ctx.db.collection("appointments").doc("a");
    await apptRef.set({ clientId: "tenant_a" });
    await assert.rejects(
      () => dispatchAdminAction(ctx, "mark_paid", { appointmentId: "a", amountCents: -1 }),
      (err: any) => err instanceof AdminActionError && err.status === 400,
    );
  });
});

// ─── update_customer ─────────────────────────────────────────────────────────

describe("update_customer", () => {
  test("appends notes (does not replace)", async () => {
    const ctx = makeCtx("tenant_a");
    const ref = ctx.db.collection("customers").doc("cust_1");
    await ref.set({ clientId: "tenant_a", fullName: "Ana", notes: "first note" });
    await dispatchAdminAction(ctx, "update_customer", {
      customerId: "cust_1",
      notes: "second note",
    });
    const data = (await ref.get()).data();
    assert.equal(data!.notes, "first note\nsecond note");
  });

  test("creates notes when none existed", async () => {
    const ctx = makeCtx("tenant_a");
    const ref = ctx.db.collection("customers").doc("cust_x");
    await ref.set({ clientId: "tenant_a", fullName: "Beto" });
    await dispatchAdminAction(ctx, "update_customer", {
      customerId: "cust_x",
      notes: "only note",
    });
    const data = (await ref.get()).data();
    assert.equal(data!.notes, "only note");
  });

  test("adds tags via arrayUnion (no duplicates)", async () => {
    const ctx = makeCtx("tenant_a");
    const ref = ctx.db.collection("customers").doc("cust_2");
    await ref.set({ clientId: "tenant_a", tags: ["VIP"] });
    await dispatchAdminAction(ctx, "update_customer", {
      customerId: "cust_2",
      tags: ["VIP", "frequent"],
    });
    const data = (await ref.get()).data();
    assert.deepEqual(data!.tags, ["VIP", "frequent"]);
  });

  test("403 on cross-tenant customer", async () => {
    const ctx = makeCtx("tenant_a");
    const ref = ctx.db.collection("customers").doc("c_foreign");
    await ref.set({ clientId: "tenant_b" });
    await assert.rejects(
      () => dispatchAdminAction(ctx, "update_customer", { customerId: "c_foreign", notes: "x" }),
      (err: any) => err instanceof AdminActionError && err.status === 403,
    );
  });

  test("rejects when no fields to update", async () => {
    const ctx = makeCtx("tenant_a");
    const ref = ctx.db.collection("customers").doc("c_empty");
    await ref.set({ clientId: "tenant_a" });
    await assert.rejects(
      () => dispatchAdminAction(ctx, "update_customer", { customerId: "c_empty" }),
      (err: any) => err instanceof AdminActionError && err.status === 400,
    );
  });
});

// ─── add_walkin_count ────────────────────────────────────────────────────────

describe("add_walkin_count", () => {
  test("creates counter doc on first call", async () => {
    const ctx = makeCtx("tenant_a");
    const result = await dispatchAdminAction(ctx, "add_walkin_count", {
      count: 3,
      date: "2026-05-27",
    });
    assert.equal(result.success, true);
    const doc = await ctx.db.collection("walk_in_stats").doc("tenant_a_2026-05-27").get();
    assert.equal(doc.exists, true);
    assert.equal(doc.data()!.count, 3);
    assert.equal(doc.data()!.clientId, "tenant_a");
  });

  test("increments existing counter", async () => {
    const ctx = makeCtx("tenant_a");
    const ref = ctx.db.collection("walk_in_stats").doc("tenant_a_2026-05-27");
    await ref.set({ clientId: "tenant_a", date: "2026-05-27", count: 5 });
    await dispatchAdminAction(ctx, "add_walkin_count", { count: 2, date: "2026-05-27" });
    assert.equal((await ref.get()).data()!.count, 7);
  });

  test("rejects non-positive count", async () => {
    const ctx = makeCtx("tenant_a");
    await assert.rejects(
      () => dispatchAdminAction(ctx, "add_walkin_count", { count: 0 }),
      (err: any) => err instanceof AdminActionError && err.status === 400,
    );
  });

  test("rejects count above cap (500)", async () => {
    const ctx = makeCtx("tenant_a");
    await assert.rejects(
      () => dispatchAdminAction(ctx, "add_walkin_count", { count: 501 }),
      (err: any) => err instanceof AdminActionError && err.status === 400,
    );
  });
});

// ─── bulk_update_status ──────────────────────────────────────────────────────

describe("bulk_update_status", () => {
  test("updates all appointments for the date", async () => {
    const ctx = makeCtx("tenant_a");
    const appts = ctx.db.collection("appointments");
    await appts.doc("a1").set({ clientId: "tenant_a", date: "2026-05-27", status: "confirmed" });
    await appts.doc("a2").set({ clientId: "tenant_a", date: "2026-05-27", status: "confirmed" });
    await appts.doc("a3").set({ clientId: "tenant_a", date: "2026-05-28", status: "confirmed" });
    const result = await dispatchAdminAction(ctx, "bulk_update_status", {
      status: "completed",
      date: "2026-05-27",
    });
    assert.equal(result.success, true);
    assert.equal((result as any).updated, 2);
    assert.equal((await appts.doc("a1").get()).data()!.status, "completed");
    assert.equal((await appts.doc("a2").get()).data()!.status, "completed");
    // Different date, untouched
    assert.equal((await appts.doc("a3").get()).data()!.status, "confirmed");
  });

  test("skips appointments belonging to another tenant when explicit IDs are passed", async () => {
    const ctx = makeCtx("tenant_a");
    const appts = ctx.db.collection("appointments");
    await appts.doc("mine").set({ clientId: "tenant_a", date: "2026-05-27", status: "confirmed" });
    await appts.doc("theirs").set({ clientId: "tenant_b", date: "2026-05-27", status: "confirmed" });
    const result = await dispatchAdminAction(ctx, "bulk_update_status", {
      status: "cancelled",
      appointmentIds: ["mine", "theirs"],
    });
    assert.equal((result as any).updated, 1);
    assert.equal((result as any).skipped, 1);
    assert.equal((await appts.doc("theirs").get()).data()!.status, "confirmed");
    assert.equal((await appts.doc("mine").get()).data()!.status, "cancelled");
  });

  test("rejects when target set exceeds cap", async () => {
    const ctx = makeCtx("tenant_a");
    const ids = Array.from({ length: BULK_UPDATE_STATUS_CAP + 1 }, (_, i) => `id_${i}`);
    await assert.rejects(
      () => dispatchAdminAction(ctx, "bulk_update_status", {
        status: "completed",
        appointmentIds: ids,
      }),
      (err: any) => err instanceof AdminActionError && err.status === 400 && /cap/.test(err.message),
    );
  });

  test("rejects invalid status enum", async () => {
    const ctx = makeCtx("tenant_a");
    await assert.rejects(
      () => dispatchAdminAction(ctx, "bulk_update_status", { status: "weird" }),
      (err: any) => err instanceof AdminToolValidationError,
    );
  });

  test("returns updated=0 for an empty day", async () => {
    const ctx = makeCtx("tenant_a");
    const result = await dispatchAdminAction(ctx, "bulk_update_status", {
      status: "completed",
      date: "2026-12-31",
    });
    assert.equal((result as any).updated, 0);
  });
});

// ─── tasks ───────────────────────────────────────────────────────────────────

describe("tasks", () => {
  test("complete_task accepts deterministic titleOrFragment args", async () => {
    const ctx = {
      ...makeCtx("tenant_a"),
      actorEmail: "owner@example.com",
      actorRole: "owner" as const,
    };
    await ctx.db.collection("tasks").doc("task_1").set({
      clientId: "tenant_a",
      title: "Limpiar local",
      status: "pending",
      priority: "medium",
      createdBy: "owner@example.com",
      shared: false,
      createdAt: new Date("2026-05-27T00:00:00Z"),
      updatedAt: new Date("2026-05-27T00:00:00Z"),
    });

    const result = await dispatchAdminAction(ctx, "complete_task", {
      titleOrFragment: "limpiar local",
    });

    assert.equal((result as any).success, true);
    assert.equal((result as any).kind, "completed");
    assert.equal(ctx.db.collection("tasks").docs.get("task_1").status, "done");
  });
});

// ─── Smoke: validator still gates the legacy 4 actions ───────────────────────

describe("legacy action validation", () => {
  test("walk_in needs name + phone", () => {
    assert.throws(
      () => validateActionArgs("walk_in", { name: "Solo" }),
      (err: any) => err instanceof AdminToolValidationError && /phone/.test(err.message),
    );
    const ok = validateActionArgs("walk_in", { name: "Solo", phone: "050" });
    assert.equal((ok as any).name, "Solo");
  });

  test("book_appointment needs customerName + date + time", () => {
    assert.throws(
      () => validateActionArgs("book_appointment", { customerName: "x" }),
      (err: any) => err instanceof AdminToolValidationError,
    );
  });
});
