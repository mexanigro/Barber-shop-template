/**
 * Functional tests for src/lib/ai/stock-tools.ts.
 *
 * Run with: npx tsx --test src/lib/ai/stock-tools.test.ts
 *
 * The Firestore dependency is replaced with the same in-memory fake used by
 * admin-tools.test.ts (kept inline to avoid a shared test fixture file).
 * Each test seeds documents directly and asserts on the resulting stock_items
 * / stock_movements collections.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  AdminActionError,
} from "./admin-tools.ts";
import {
  STOCK_TOOL_DECLARATIONS,
  dispatchStockAction,
  fuzzyMatchStock,
  formatStockResult,
  getDemoStockItems,
  type StockActionResult,
  type StockItemRow,
} from "./stock-tools.ts";

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
      this.collection.docs.set(this.id, { ...existing, ...expandFieldValues(data) });
    } else {
      this.collection.docs.set(this.id, expandFieldValues(data));
    }
  }
  async update(data: DocData) {
    const existing = this.collection.docs.get(this.id);
    if (!existing) throw new Error(`update on non-existent doc ${this.id}`);
    this.collection.docs.set(this.id, { ...existing, ...expandFieldValues(data) });
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
      const ok = this.filters.every(([f, op, v]) => (op === "==" ? data[f] === v : false));
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
  async runTransaction<T>(fn: (tx: any) => Promise<T>): Promise<T> {
    const tx = {
      get: (ref: FakeDocRef) => ref.get(),
      set: (ref: FakeDocRef, data: DocData, opts?: { merge?: boolean }) => ref.set(data, opts),
      update: (ref: FakeDocRef, data: DocData) => ref.update(data),
    };
    return fn(tx);
  }
}

const FAKE_FIELD_VALUE = {
  serverTimestamp: () => ({ __op: "serverTimestamp" }),
  increment: (n: number) => ({ __op: "increment", n }),
};

function expandFieldValues(data: DocData): DocData {
  const out: DocData = {};
  for (const [k, v] of Object.entries(data)) {
    if (v && typeof v === "object" && (v as any).__op === "serverTimestamp") {
      out[k] = new Date("2026-05-28T00:00:00Z");
    } else {
      out[k] = v;
    }
  }
  return out;
}

function makeCtx(clientId = "tenant_a", actorEmail = "admin@tenant.a") {
  const db = new FakeDb();
  return { db: db as any, FieldValue: FAKE_FIELD_VALUE as any, clientId, actorEmail };
}

function seedItem(db: FakeDb, clientId: string, id: string, patch: Partial<DocData>): void {
  db.collection("stock_items").docs.set(id, {
    clientId,
    name: patch.name ?? id,
    quantity: patch.quantity ?? 0,
    unit: patch.unit ?? "unidades",
    minStock: patch.minStock ?? 0,
    ...patch,
  });
}

// ─── Schema sanity ──────────────────────────────────────────────────────────

describe("STOCK_TOOL_DECLARATIONS", () => {
  test("declares three stock tools", () => {
    const names = STOCK_TOOL_DECLARATIONS.map((d) => d.name).sort();
    assert.deepEqual(names, ["add_stock", "consume_stock", "query_stock"]);
  });
});

// ─── fuzzyMatchStock ────────────────────────────────────────────────────────

describe("fuzzyMatchStock", () => {
  const items: StockItemRow[] = [
    { id: "i1", name: "Desinfectante 5L", currentStock: 3, unit: "botellas", minStock: 2 },
    { id: "i2", name: "Desinfectante manos 250ml", currentStock: 4, unit: "botellas", minStock: 2 },
    { id: "i3", name: "Shampoo profesional", currentStock: 8, unit: "botellas", minStock: 3 },
  ];

  test("exact normalised match → single", () => {
    const r = fuzzyMatchStock(items, "shampoo profesional");
    assert.equal(r.kind, "single");
    if (r.kind === "single") assert.equal(r.item.id, "i3");
  });

  test("accent-insensitive substring match → single when one hit", () => {
    const r = fuzzyMatchStock(items, "shámpoo");
    assert.equal(r.kind, "single");
  });

  test("substring matches multiple items → multiple", () => {
    const r = fuzzyMatchStock(items, "desinfectante");
    assert.equal(r.kind, "multiple");
    if (r.kind === "multiple") assert.equal(r.items.length, 2);
  });

  test("token fallback narrows multi-word query", () => {
    const r = fuzzyMatchStock(items, "desinfectante 250");
    assert.equal(r.kind, "single");
    if (r.kind === "single") assert.equal(r.item.id, "i2");
  });

  test("no match → none", () => {
    const r = fuzzyMatchStock(items, "completely-fake-item");
    assert.equal(r.kind, "none");
  });
});

// ─── query_stock ────────────────────────────────────────────────────────────

describe("query_stock", () => {
  test("direct itemId lookup returns the single item", async () => {
    const ctx = makeCtx();
    seedItem(ctx.db, "tenant_a", "i1", { name: "Cera", quantity: 5, unit: "unidades", minStock: 2 });
    const r = (await dispatchStockAction(ctx, "query_stock", { itemId: "i1" })) as StockActionResult;
    assert.equal(r.success, true);
    if (r.success && r.kind === "single") {
      assert.equal(r.item.id, "i1");
      assert.equal(r.item.currentStock, 5);
    } else {
      assert.fail("expected single");
    }
  });

  test("name with unique match returns single", async () => {
    const ctx = makeCtx();
    seedItem(ctx.db, "tenant_a", "i1", { name: "Shampoo profesional", quantity: 8 });
    seedItem(ctx.db, "tenant_a", "i2", { name: "Cera barba", quantity: 3 });
    const r = (await dispatchStockAction(ctx, "query_stock", { itemName: "shampoo" })) as StockActionResult;
    assert.equal(r.success, true);
    if (r.success && r.kind === "single") {
      assert.equal(r.item.id, "i1");
    } else {
      assert.fail("expected single");
    }
  });

  test("name with multiple matches returns multiple + ambiguous flag", async () => {
    const ctx = makeCtx();
    seedItem(ctx.db, "tenant_a", "i1", { name: "Desinfectante 5L", quantity: 3 });
    seedItem(ctx.db, "tenant_a", "i2", { name: "Desinfectante manos 250ml", quantity: 4 });
    const r = (await dispatchStockAction(ctx, "query_stock", { itemName: "desinfectante" })) as StockActionResult;
    assert.equal(r.success, true);
    if (r.success && r.kind === "multiple") {
      assert.equal((r as any).ambiguous, true);
      assert.equal(r.items.length, 2);
    } else {
      assert.fail("expected multiple");
    }
  });

  test("name with no match returns not_found", async () => {
    const ctx = makeCtx();
    seedItem(ctx.db, "tenant_a", "i1", { name: "Shampoo", quantity: 1 });
    const r = (await dispatchStockAction(ctx, "query_stock", { itemName: "papel termico" })) as StockActionResult;
    assert.equal(r.success, false);
    if (!r.success) assert.equal(r.kind, "not_found");
  });

  test("cross-tenant itemId throws 403", async () => {
    const ctx = makeCtx("tenant_a");
    seedItem(ctx.db, "tenant_b", "i_foreign", { name: "Tinta", quantity: 9 });
    await assert.rejects(
      () => dispatchStockAction(ctx, "query_stock", { itemId: "i_foreign" }),
      (err: any) => err instanceof AdminActionError && err.status === 403,
    );
  });
});

// ─── consume_stock ──────────────────────────────────────────────────────────

describe("consume_stock", () => {
  test("decrements quantity and writes a movement", async () => {
    const ctx = makeCtx("tenant_a", "owner@x.com");
    seedItem(ctx.db, "tenant_a", "i1", { name: "Alcohol", quantity: 10, unit: "litros" });
    const r = (await dispatchStockAction(ctx, "consume_stock", { itemId: "i1", count: 3, reason: "limpieza" })) as StockActionResult;
    assert.equal(r.success, true);
    if (r.success && r.kind === "consumed") {
      assert.equal(r.item.prevStock, 10);
      assert.equal(r.item.newStock, 7);
      assert.equal(r.wentNegative, false);
    } else {
      assert.fail("expected consumed");
    }
    // Item updated
    const itemDoc = await ctx.db.collection("stock_items").doc("i1").get();
    assert.equal(itemDoc.data()!.quantity, 7);
    // Movement created with audit fields
    const movs = ctx.db.collection("stock_movements").docs;
    assert.equal(movs.size, 1);
    const [mov] = [...movs.values()];
    assert.equal(mov.type, "deduct");
    assert.equal(mov.quantity, 3);
    assert.equal(mov.previousQuantity, 10);
    assert.equal(mov.itemId, "i1");
    assert.equal(mov.clientId, "tenant_a");
    assert.equal(mov.performedBy, "owner@x.com");
    assert.equal(mov.reason, "limpieza");
  });

  test("cap exceeded → newStock goes negative + wentNegative flag", async () => {
    const ctx = makeCtx();
    seedItem(ctx.db, "tenant_a", "i1", { name: "Tinta", quantity: 2 });
    const r = (await dispatchStockAction(ctx, "consume_stock", { itemId: "i1", count: 5 })) as StockActionResult;
    assert.equal(r.success, true);
    if (r.success && r.kind === "consumed") {
      assert.equal(r.item.newStock, -3);
      assert.equal(r.wentNegative, true);
    } else {
      assert.fail("expected consumed");
    }
  });

  test("cross-tenant itemId throws 403 (does not consume)", async () => {
    const ctx = makeCtx("tenant_a");
    seedItem(ctx.db, "tenant_b", "i_foreign", { name: "Tinta", quantity: 5 });
    await assert.rejects(
      () => dispatchStockAction(ctx, "consume_stock", { itemId: "i_foreign", count: 1 }),
      (err: any) => err instanceof AdminActionError && err.status === 403,
    );
    // No movement created
    assert.equal(ctx.db.collection("stock_movements").docs.size, 0);
  });

  test("non-positive count rejected", async () => {
    const ctx = makeCtx();
    await assert.rejects(
      () => dispatchStockAction(ctx, "consume_stock", { itemName: "x", count: 0 }),
      (err: any) => err instanceof AdminActionError && err.status === 400,
    );
  });
});

// ─── add_stock ──────────────────────────────────────────────────────────────

describe("add_stock", () => {
  test("existing item → increments quantity and writes add movement", async () => {
    const ctx = makeCtx("tenant_a", "owner@x.com");
    seedItem(ctx.db, "tenant_a", "i1", { name: "Toallas", quantity: 5, unit: "unidades" });
    const r = (await dispatchStockAction(ctx, "add_stock", { itemId: "i1", count: 10 })) as StockActionResult;
    assert.equal(r.success, true);
    if (r.success && r.kind === "added") {
      assert.equal(r.item.prevStock, 5);
      assert.equal(r.item.newStock, 15);
      assert.equal(r.created, undefined);
    } else {
      assert.fail("expected added");
    }
    const movs = [...ctx.db.collection("stock_movements").docs.values()];
    assert.equal(movs.length, 1);
    assert.equal(movs[0].type, "add");
    assert.equal(movs[0].previousQuantity, 5);
  });

  test("non-existent item without createIfMissing → suggest_create", async () => {
    const ctx = makeCtx();
    const r = (await dispatchStockAction(ctx, "add_stock", { itemName: "Cera natural", count: 3, unit: "botellas" })) as StockActionResult;
    assert.equal(r.success, false);
    if (!r.success && r.kind === "suggest_create") {
      assert.equal(r.itemName, "Cera natural");
      assert.equal(r.count, 3);
      assert.equal(r.unit, "botellas");
    } else {
      assert.fail("expected suggest_create");
    }
    // No item written
    assert.equal(ctx.db.collection("stock_items").docs.size, 0);
  });

  test("non-existent item with createIfMissing → creates item + movement", async () => {
    const ctx = makeCtx("tenant_a", "owner@x.com");
    const r = (await dispatchStockAction(ctx, "add_stock", {
      itemName: "Cera natural",
      count: 3,
      unit: "botellas",
      minStock: 1,
      createIfMissing: true,
    })) as StockActionResult;
    assert.equal(r.success, true);
    if (r.success && r.kind === "added") {
      assert.equal(r.created, true);
      assert.equal(r.item.newStock, 3);
      assert.equal(r.item.name, "Cera natural");
    } else {
      assert.fail("expected added/created");
    }
    // Item was written with clientId set
    const items = [...ctx.db.collection("stock_items").docs.values()];
    assert.equal(items.length, 1);
    assert.equal(items[0].clientId, "tenant_a");
    assert.equal(items[0].quantity, 3);
    assert.equal(items[0].unit, "botellas");
    assert.equal(items[0].minStock, 1);
    // Movement audit log
    const movs = [...ctx.db.collection("stock_movements").docs.values()];
    assert.equal(movs.length, 1);
    assert.equal(movs[0].type, "add");
    assert.equal(movs[0].previousQuantity, 0);
    assert.equal(movs[0].performedBy, "owner@x.com");
  });

  test("multiple matches → returns ambiguous, no write", async () => {
    const ctx = makeCtx();
    seedItem(ctx.db, "tenant_a", "i1", { name: "Cera natural", quantity: 1 });
    seedItem(ctx.db, "tenant_a", "i2", { name: "Cera abeja natural", quantity: 2 });
    const r = (await dispatchStockAction(ctx, "add_stock", { itemName: "natural", count: 3 })) as StockActionResult;
    if (r.success && r.kind === "multiple") {
      assert.ok(r.items.length >= 2);
    } else {
      assert.fail("expected multiple");
    }
    assert.equal(ctx.db.collection("stock_movements").docs.size, 0);
  });
});

// ─── Demo mode ──────────────────────────────────────────────────────────────

describe("demo mode", () => {
  test("getDemoStockItems returns niche-specific list", () => {
    const barberia = getDemoStockItems("barberia");
    const tattoo = getDemoStockItems("tattoo");
    assert.ok(barberia.length >= 5);
    assert.ok(tattoo.length >= 5);
    assert.notEqual(barberia[0].name, tattoo[0].name);
  });

  test("getDemoStockItems falls back when niche unknown", () => {
    const fallback = getDemoStockItems("unknown-niche");
    const barberia = getDemoStockItems("barberia");
    assert.deepEqual(fallback, barberia);
  });

  test("query_stock in demo mode does NOT touch Firestore", async () => {
    const ctx = { db: null as any, FieldValue: null as any, clientId: "demo", demoMode: true, niche: "barberia" };
    const r = (await dispatchStockAction(ctx as any, "query_stock", { itemName: "shampoo" })) as StockActionResult;
    assert.equal(r.success, true);
  });

  test("consume_stock in demo mode returns success without persistence", async () => {
    const ctx = { db: null as any, FieldValue: null as any, clientId: "demo", demoMode: true, niche: "barberia" };
    const r = (await dispatchStockAction(ctx as any, "consume_stock", { itemName: "shampoo", count: 2 })) as StockActionResult;
    assert.equal(r.success, true);
    if (r.success && r.kind === "consumed") {
      assert.equal(r.item.newStock, r.item.prevStock - 2);
    } else {
      assert.fail("expected consumed");
    }
  });
});

// ─── i18n formatter ─────────────────────────────────────────────────────────

describe("formatStockResult i18n", () => {
  test("not_found localised across 4 languages", () => {
    const result: StockActionResult = { success: false, kind: "not_found", query: "alcohol" };
    const en = formatStockResult("query_stock", result, "en");
    const he = formatStockResult("query_stock", result, "he");
    const ru = formatStockResult("query_stock", result, "ru");
    const ar = formatStockResult("query_stock", result, "ar");
    assert.match(en, /alcohol/);
    assert.notEqual(en, he);
    assert.notEqual(en, ru);
    assert.notEqual(en, ar);
    assert.match(he, /אלכוהול|alcohol/);
    assert.match(ru, /alcohol/);
    assert.match(ar, /alcohol/);
  });

  test("single below-min flagged in confirmation", () => {
    const result: StockActionResult = {
      success: true,
      kind: "single",
      item: { id: "x", name: "Cera", currentStock: 1, unit: "unidades", minStock: 3 },
    };
    const en = formatStockResult("query_stock", result, "en");
    assert.match(en, /below/);
  });

  test("consumed-negative includes negative number", () => {
    const result: StockActionResult = {
      success: true,
      kind: "consumed",
      item: { id: "x", name: "Tinta", prevStock: 2, newStock: -3, unit: "ml" },
      movementId: "m1",
      wentNegative: true,
    };
    const en = formatStockResult("consume_stock", result, "en");
    assert.match(en, /-3/);
    assert.match(en, /negative/);
  });

  test("suggest_create prompts the admin for unit/min", () => {
    const result: StockActionResult = {
      success: false,
      kind: "suggest_create",
      itemName: "Aceite argan",
      count: 4,
      unit: "botellas",
    };
    const en = formatStockResult("add_stock", result, "en");
    assert.match(en, /Aceite argan/);
    assert.match(en, /4 botellas/);
    assert.match(en, /unit|minimum/i);
  });
});
