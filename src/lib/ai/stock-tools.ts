/**
 * Stock AI tools — Gemini function declarations + Firestore executors for
 * query_stock / consume_stock / add_stock with fuzzy lookup and multi-match
 * disambiguation. SDK-agnostic so tests can inject a mocked db.
 *
 * Storage layout: flat `stock_items` / `stock_movements` collections with a
 * `clientId` field (CLAUDE.md rule). The legacy nested layout has a one-shot
 * migration via /api/stock/migrate; new AI-triggered writes always land on
 * the flat layout.
 *
 * Used directly by `server.ts`. `api/index.ts` keeps an inline copy (Vercel
 * bundler does not cross-import from src/).
 */

import type { GeminiFunctionDeclaration, AdminDb, AdminFieldValue } from "./admin-tools";
import { AdminActionError } from "./admin-tools";

// ── Public types ─────────────────────────────────────────────────────────────

export type StockItemRow = {
  id: string;
  name: string;
  currentStock: number;
  unit: string;
  minStock: number;
};

export type StockMatchResult =
  | { kind: "single"; item: StockItemRow }
  | { kind: "multiple"; items: StockItemRow[] }
  | { kind: "none" };

export type StockActionCtx = {
  db: AdminDb;
  FieldValue: AdminFieldValue;
  clientId: string;
  /** Used as the performedBy field in audit movements. */
  actorEmail?: string;
  /** When true, lookup/consume/add return mock results without touching Firestore. */
  demoMode?: boolean;
  /** Optional niche hint for demo mode seeding. */
  niche?: string;
};

// ── Tool declarations ────────────────────────────────────────────────────────

export const STOCK_TOOL_DECLARATIONS: GeminiFunctionDeclaration[] = [
  {
    name: "query_stock",
    description:
      "Look up an inventory item by name or id. Use when the admin asks how much of something is left, e.g. 'how much shampoo do I have', 'queda alcohol'. If the lookup is ambiguous you'll get a list of candidates and should ask the admin which one they meant.",
    parameters: {
      type: "OBJECT",
      properties: {
        itemName: { type: "STRING", description: "Free-text item name (fuzzy / accent-insensitive)." },
        itemId: { type: "STRING", description: "Exact item id from a previous tool response." },
      },
    },
  },
  {
    name: "consume_stock",
    description:
      "Decrement an inventory item. Use when the admin says they used / consumed / spent a quantity of something. The count must be a positive integer. If lookup is ambiguous you get candidates back and must ask the admin which one.",
    parameters: {
      type: "OBJECT",
      properties: {
        itemName: { type: "STRING", description: "Free-text item name (fuzzy)." },
        itemId: { type: "STRING", description: "Exact item id from a previous tool response." },
        count: { type: "INTEGER", description: "Positive integer quantity to deduct." },
        reason: { type: "STRING", description: "Optional short reason ('manicure cliente Juana')." },
      },
      required: ["count"],
    },
  },
  {
    name: "add_stock",
    description:
      "Increment an inventory item. Use when the admin says they received / bought / restocked a quantity. If the item does not exist you'll get back a 'not found, suggest create' response — ask the admin if they want it created and call again with createIfMissing=true.",
    parameters: {
      type: "OBJECT",
      properties: {
        itemName: { type: "STRING", description: "Free-text item name (fuzzy)." },
        itemId: { type: "STRING", description: "Exact item id from a previous tool response." },
        count: { type: "INTEGER", description: "Positive integer quantity to add." },
        reason: { type: "STRING", description: "Optional short reason ('compra mensual')." },
        unit: {
          type: "STRING",
          description: "Optional unit when creating a new item (botellas, ml, kg, unidades, etc.).",
        },
        minStock: { type: "INTEGER", description: "Optional minimum stock when creating a new item." },
        createIfMissing: {
          type: "BOOLEAN",
          description:
            "Pass true only after the admin has confirmed they want a new item created (from a previous 'not found, suggest create' response).",
        },
      },
      required: ["count"],
    },
  },
];

export const STOCK_TOOL_NAMES = ["query_stock", "consume_stock", "add_stock"] as const;
export type StockToolName = (typeof STOCK_TOOL_NAMES)[number];

export function isStockAction(name: string): name is StockToolName {
  return (STOCK_TOOL_NAMES as readonly string[]).includes(name);
}

// ── Normalisation + fuzzy search ─────────────────────────────────────────────

export function normaliseItemName(s: string): string {
  return String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[¿¡?!.,;:"']+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function rowFromDoc(id: string, data: Record<string, unknown>): StockItemRow {
  return {
    id,
    name: typeof data.name === "string" ? data.name : "",
    currentStock: Number(data.quantity ?? 0),
    unit: typeof data.unit === "string" ? data.unit : "unidades",
    minStock: Number(data.minStock ?? 0),
  };
}

/**
 * Fetch all stock_items for this tenant. Kept simple — we filter in memory
 * because Firestore can't do case-insensitive / accent-insensitive substring
 * queries server-side. Most tenants have well under 100 items, so this is fine.
 */
export async function listStockItemsByClient(
  db: AdminDb,
  clientId: string,
): Promise<StockItemRow[]> {
  const snap = await db
    .collection("stock_items")
    .where("clientId", "==", clientId)
    .get();
  const out: StockItemRow[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  snap.forEach((doc: any) => out.push(rowFromDoc(doc.id, doc.data() ?? {})));
  return out;
}

export function fuzzyMatchStock(items: StockItemRow[], search: string): StockMatchResult {
  const q = normaliseItemName(search);
  if (!q) return items.length === 0 ? { kind: "none" } : { kind: "multiple", items };

  const exact = items.filter((i) => normaliseItemName(i.name) === q);
  if (exact.length === 1) return { kind: "single", item: exact[0] };
  if (exact.length > 1) return { kind: "multiple", items: exact };

  const contains = items.filter((i) => normaliseItemName(i.name).includes(q));
  if (contains.length === 1) return { kind: "single", item: contains[0] };
  if (contains.length > 1) return { kind: "multiple", items: contains };

  // Word-token fallback: every search word must appear in the item name.
  const tokens = q.split(/\s+/).filter(Boolean);
  if (tokens.length > 1) {
    const tokenHits = items.filter((i) => {
      const n = normaliseItemName(i.name);
      return tokens.every((t) => n.includes(t));
    });
    if (tokenHits.length === 1) return { kind: "single", item: tokenHits[0] };
    if (tokenHits.length > 1) return { kind: "multiple", items: tokenHits };
  }
  return { kind: "none" };
}

// ── Lookup helper used by executors and the GET /api/stock/items endpoint ───

export async function findStockItem(
  ctx: StockActionCtx,
  args: { itemId?: unknown; itemName?: unknown },
): Promise<StockMatchResult> {
  if (ctx.demoMode) {
    const items = getDemoStockItems(ctx.niche);
    if (typeof args.itemId === "string" && args.itemId.trim()) {
      const found = items.find((i) => i.id === args.itemId);
      return found ? { kind: "single", item: found } : { kind: "none" };
    }
    if (typeof args.itemName === "string" && args.itemName.trim()) {
      return fuzzyMatchStock(items, args.itemName);
    }
    return { kind: "multiple", items };
  }

  // Direct id lookup → single read.
  if (typeof args.itemId === "string" && args.itemId.trim()) {
    const ref = ctx.db.collection("stock_items").doc(args.itemId.trim());
    const snap = await ref.get();
    if (!snap.exists) return { kind: "none" };
    const data = snap.data() ?? {};
    if (data.clientId && data.clientId !== ctx.clientId) {
      throw new AdminActionError(403, "Not authorized");
    }
    return { kind: "single", item: rowFromDoc(snap.id, data) };
  }

  const all = await listStockItemsByClient(ctx.db, ctx.clientId);
  if (typeof args.itemName === "string" && args.itemName.trim()) {
    return fuzzyMatchStock(all, args.itemName);
  }
  return all.length === 0 ? { kind: "none" } : { kind: "multiple", items: all };
}

// ── Executors ────────────────────────────────────────────────────────────────

export type StockActionResult =
  | { success: true; kind: "single"; item: StockItemRow }
  | { success: true; kind: "multiple"; items: StockItemRow[]; ambiguous: true }
  | { success: false; kind: "not_found"; query: string }
  | {
      success: true;
      kind: "consumed";
      item: { id: string; name: string; prevStock: number; newStock: number; unit: string };
      movementId: string;
      wentNegative?: boolean;
    }
  | {
      success: true;
      kind: "added";
      item: { id: string; name: string; prevStock: number; newStock: number; unit: string };
      movementId: string;
      created?: boolean;
    }
  | {
      success: false;
      kind: "suggest_create";
      itemName: string;
      count: number;
      unit?: string;
      minStock?: number;
    };

function validateCount(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) {
    throw new AdminActionError(400, "count must be a positive integer");
  }
  if (n > 100_000) {
    throw new AdminActionError(400, "count too large (max 100000)");
  }
  return n;
}

export async function executeQueryStock(
  ctx: StockActionCtx,
  args: Record<string, unknown>,
): Promise<StockActionResult> {
  const queryText =
    typeof args.itemName === "string"
      ? args.itemName
      : typeof args.itemId === "string"
        ? args.itemId
        : "";
  const match = await findStockItem(ctx, args);
  if (match.kind === "single") return { success: true, kind: "single", item: match.item };
  if (match.kind === "multiple") {
    return { success: true, kind: "multiple", items: match.items, ambiguous: true };
  }
  return { success: false, kind: "not_found", query: queryText };
}

export async function executeConsumeStock(
  ctx: StockActionCtx,
  args: Record<string, unknown>,
): Promise<StockActionResult> {
  const count = validateCount(args.count);
  const reason =
    typeof args.reason === "string" ? args.reason.slice(0, 200) : "ai consume";

  const match = await findStockItem(ctx, args);
  if (match.kind === "none") {
    return {
      success: false,
      kind: "not_found",
      query:
        typeof args.itemName === "string"
          ? args.itemName
          : typeof args.itemId === "string"
            ? args.itemId
            : "",
    };
  }
  if (match.kind === "multiple") {
    return { success: true, kind: "multiple", items: match.items, ambiguous: true };
  }

  const item = match.item;

  if (ctx.demoMode) {
    const newStock = item.currentStock - count;
    return {
      success: true,
      kind: "consumed",
      item: {
        id: item.id,
        name: item.name,
        prevStock: item.currentStock,
        newStock,
        unit: item.unit,
      },
      movementId: `demo_mov_${Date.now()}`,
      wentNegative: newStock < 0,
    };
  }

  const { db, FieldValue, clientId } = ctx;
  const itemRef = db.collection("stock_items").doc(item.id);
  const movRef = db.collection("stock_movements").doc();

  const { prevStock, newStock } = await db.runTransaction(async (tx: unknown) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const t = tx as any;
    const snap = await t.get(itemRef);
    if (!snap.exists) throw new AdminActionError(404, "Item not found");
    const data = snap.data() ?? {};
    if (data.clientId !== clientId) throw new AdminActionError(403, "Not authorized");
    const prev = Number(data.quantity ?? 0);
    const next = prev - count; // allow negative per AI flow
    t.set(itemRef, { quantity: next, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    t.set(movRef, {
      clientId,
      itemId: item.id,
      type: "deduct",
      quantity: count,
      previousQuantity: prev,
      reason,
      performedBy: ctx.actorEmail ?? "ai",
      createdAt: FieldValue.serverTimestamp(),
    });
    return { prevStock: prev, newStock: next };
  });

  return {
    success: true,
    kind: "consumed",
    item: { id: item.id, name: item.name, prevStock, newStock, unit: item.unit },
    movementId: movRef.id,
    wentNegative: newStock < 0,
  };
}

export async function executeAddStock(
  ctx: StockActionCtx,
  args: Record<string, unknown>,
): Promise<StockActionResult> {
  const count = validateCount(args.count);
  const reason =
    typeof args.reason === "string" ? args.reason.slice(0, 200) : "ai restock";
  const createIfMissing = args.createIfMissing === true;
  const requestedName =
    typeof args.itemName === "string" ? args.itemName.trim() : "";
  const unit =
    typeof args.unit === "string" && args.unit.trim() ? args.unit.trim().slice(0, 20) : "unidades";
  const minStock = Number.isFinite(Number(args.minStock)) ? Math.max(0, Math.trunc(Number(args.minStock))) : 0;

  const match = await findStockItem(ctx, args);

  if (match.kind === "none") {
    if (!createIfMissing) {
      return {
        success: false,
        kind: "suggest_create",
        itemName: requestedName,
        count,
        unit,
        minStock,
      };
    }
    if (!requestedName) {
      throw new AdminActionError(400, "itemName required when creating a new item");
    }

    if (ctx.demoMode) {
      return {
        success: true,
        kind: "added",
        item: {
          id: `demo_new_${Date.now()}`,
          name: requestedName,
          prevStock: 0,
          newStock: count,
          unit,
        },
        movementId: `demo_mov_${Date.now()}`,
        created: true,
      };
    }

    const { db, FieldValue, clientId } = ctx;
    const itemRef = db.collection("stock_items").doc();
    const movRef = db.collection("stock_movements").doc();
    await db.runTransaction(async (tx: unknown) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const t = tx as any;
      t.set(itemRef, {
        clientId,
        name: requestedName,
        category: "",
        quantity: count,
        unit,
        minStock,
        notes: "",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      t.set(movRef, {
        clientId,
        itemId: itemRef.id,
        type: "add",
        quantity: count,
        previousQuantity: 0,
        reason: reason || "initial stock via AI",
        performedBy: ctx.actorEmail ?? "ai",
        createdAt: FieldValue.serverTimestamp(),
      });
    });
    return {
      success: true,
      kind: "added",
      item: { id: itemRef.id, name: requestedName, prevStock: 0, newStock: count, unit },
      movementId: movRef.id,
      created: true,
    };
  }

  if (match.kind === "multiple") {
    return { success: true, kind: "multiple", items: match.items, ambiguous: true };
  }

  const item = match.item;

  if (ctx.demoMode) {
    return {
      success: true,
      kind: "added",
      item: {
        id: item.id,
        name: item.name,
        prevStock: item.currentStock,
        newStock: item.currentStock + count,
        unit: item.unit,
      },
      movementId: `demo_mov_${Date.now()}`,
    };
  }

  const { db, FieldValue, clientId } = ctx;
  const itemRef = db.collection("stock_items").doc(item.id);
  const movRef = db.collection("stock_movements").doc();
  const { prevStock, newStock } = await db.runTransaction(async (tx: unknown) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const t = tx as any;
    const snap = await t.get(itemRef);
    if (!snap.exists) throw new AdminActionError(404, "Item not found");
    const data = snap.data() ?? {};
    if (data.clientId !== clientId) throw new AdminActionError(403, "Not authorized");
    const prev = Number(data.quantity ?? 0);
    const next = prev + count;
    t.set(itemRef, { quantity: next, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    t.set(movRef, {
      clientId,
      itemId: item.id,
      type: "add",
      quantity: count,
      previousQuantity: prev,
      reason,
      performedBy: ctx.actorEmail ?? "ai",
      createdAt: FieldValue.serverTimestamp(),
    });
    return { prevStock: prev, newStock: next };
  });

  return {
    success: true,
    kind: "added",
    item: { id: item.id, name: item.name, prevStock, newStock, unit: item.unit },
    movementId: movRef.id,
  };
}

export const STOCK_ACTION_EXECUTORS = {
  query_stock: executeQueryStock,
  consume_stock: executeConsumeStock,
  add_stock: executeAddStock,
} as const;

export async function dispatchStockAction(
  ctx: StockActionCtx,
  toolName: string,
  args: Record<string, unknown>,
): Promise<StockActionResult> {
  if (!isStockAction(toolName)) {
    throw new AdminActionError(400, `unknown stock tool: ${toolName}`);
  }
  return STOCK_ACTION_EXECUTORS[toolName](ctx, args);
}

// ── Demo-mode mock data ──────────────────────────────────────────────────────

const DEMO_ITEMS_BY_NICHE: Record<string, StockItemRow[]> = {
  barberia: [
    { id: "demo_shampoo", name: "Shampoo profesional", currentStock: 8, unit: "botellas", minStock: 3 },
    { id: "demo_cera", name: "Cera para barba", currentStock: 12, unit: "unidades", minStock: 4 },
    { id: "demo_alcohol", name: "Alcohol desinfectante 1L", currentStock: 2, unit: "litros", minStock: 3 },
    { id: "demo_toallas", name: "Toallas descartables", currentStock: 120, unit: "unidades", minStock: 50 },
    { id: "demo_tijeras", name: "Tijeras profesionales", currentStock: 4, unit: "unidades", minStock: 2 },
    { id: "demo_navaja", name: "Hojas para navaja", currentStock: 35, unit: "unidades", minStock: 20 },
  ],
  tattoo: [
    { id: "demo_tinta_negra", name: "Tinta negra Eternal", currentStock: 5, unit: "ml", minStock: 2 },
    { id: "demo_tinta_roja", name: "Tinta roja Eternal", currentStock: 3, unit: "ml", minStock: 2 },
    { id: "demo_agujas", name: "Cartuchos de agujas 1009RL", currentStock: 40, unit: "unidades", minStock: 20 },
    { id: "demo_film", name: "Film transparente saniderm", currentStock: 1, unit: "rollos", minStock: 2 },
    { id: "demo_guantes", name: "Guantes nitrilo talle M", currentStock: 300, unit: "unidades", minStock: 100 },
    { id: "demo_vaselina", name: "Vaselina aposán", currentStock: 6, unit: "unidades", minStock: 3 },
  ],
  nails: [
    { id: "demo_esmalte", name: "Esmalte semipermanente nude", currentStock: 14, unit: "unidades", minStock: 5 },
    { id: "demo_top", name: "Top coat", currentStock: 3, unit: "unidades", minStock: 2 },
    { id: "demo_base", name: "Base coat", currentStock: 2, unit: "unidades", minStock: 2 },
    { id: "demo_limas", name: "Limas descartables", currentStock: 50, unit: "unidades", minStock: 20 },
    { id: "demo_acetona", name: "Acetona 500ml", currentStock: 4, unit: "botellas", minStock: 2 },
    { id: "demo_algodon", name: "Algodón", currentStock: 1, unit: "kg", minStock: 1 },
  ],
  estetica: [
    { id: "demo_cera_dep", name: "Cera depilatoria", currentStock: 6, unit: "kg", minStock: 3 },
    { id: "demo_tnt", name: "Bandas TNT", currentStock: 200, unit: "unidades", minStock: 100 },
    { id: "demo_aceite", name: "Aceite post-depilación", currentStock: 4, unit: "unidades", minStock: 2 },
    { id: "demo_guantes_e", name: "Guantes nitrilo talle S", currentStock: 250, unit: "unidades", minStock: 100 },
    { id: "demo_alcohol_e", name: "Alcohol etílico 1L", currentStock: 3, unit: "litros", minStock: 2 },
    { id: "demo_camillas", name: "Sábanas descartables camilla", currentStock: 80, unit: "unidades", minStock: 30 },
  ],
  cafeteria: [
    { id: "demo_cafe", name: "Café en grano premium", currentStock: 12, unit: "kg", minStock: 5 },
    { id: "demo_leche", name: "Leche entera", currentStock: 20, unit: "litros", minStock: 10 },
    { id: "demo_vasos", name: "Vasos descartables 8oz", currentStock: 250, unit: "unidades", minStock: 100 },
    { id: "demo_azucar", name: "Azúcar sobres", currentStock: 400, unit: "unidades", minStock: 200 },
    { id: "demo_servilletas", name: "Servilletas", currentStock: 80, unit: "paquetes", minStock: 30 },
    { id: "demo_chocolate", name: "Chocolate en polvo", currentStock: 2, unit: "kg", minStock: 1 },
  ],
  remodelaciones: [
    { id: "demo_pintura", name: "Pintura látex blanca", currentStock: 8, unit: "litros", minStock: 4 },
    { id: "demo_yeso", name: "Yeso bolsa 25kg", currentStock: 6, unit: "bolsas", minStock: 3 },
    { id: "demo_tornillos", name: "Tornillos drywall", currentStock: 400, unit: "unidades", minStock: 200 },
    { id: "demo_silicona", name: "Silicona neutra", currentStock: 5, unit: "unidades", minStock: 3 },
    { id: "demo_guantes_r", name: "Guantes trabajo", currentStock: 20, unit: "pares", minStock: 10 },
    { id: "demo_lija", name: "Lija grano 120", currentStock: 30, unit: "unidades", minStock: 15 },
  ],
};

const DEMO_DEFAULT: StockItemRow[] = DEMO_ITEMS_BY_NICHE.barberia;

export function getDemoStockItems(niche?: string): StockItemRow[] {
  const key = (niche ?? "").trim().toLowerCase();
  return DEMO_ITEMS_BY_NICHE[key] ?? DEMO_DEFAULT;
}

// ── Tool-line fragments for the scoped tools system prompt ───────────────────

export const STOCK_TOOL_LINES: Record<StockToolName, string> = {
  query_stock:
    "- query_stock: look up how much of an item is in stock (fuzzy item name OK).",
  consume_stock:
    "- consume_stock: deduct a quantity from stock when the admin says they used something.",
  add_stock:
    "- add_stock: increment stock when the admin received / bought more. Pass createIfMissing=true ONLY after the admin confirms creating a new item.",
};

// ── Deterministic response formatter (i18n: en / he / ru / ar) ───────────────

export type StockLang = "en" | "he" | "ru" | "ar";

function pickLang(raw?: string): StockLang {
  const l = (raw ?? "en").toLowerCase();
  if (l === "he" || l === "ru" || l === "ar") return l;
  return "en";
}

/**
 * Format the executor result into a user-facing string. Used by the
 * deterministic chat short-circuit (zero model tokens) and as a fallback
 * when the model fails to generate a confirmation in turn 2.
 */
export function formatStockResult(
  action: StockToolName,
  result: StockActionResult,
  langRaw?: string,
): string {
  const lang = pickLang(langRaw);

  const labels = {
    en: {
      none: (q: string) => `I couldn't find any inventory item matching "${q}".`,
      multiHeader: (n: number) => `I found ${n} matches — which one did you mean?`,
      multiLine: (i: StockItemRow) => `• ${i.name} — ${i.currentStock} ${i.unit} (id:${i.id})`,
      queryOne: (i: StockItemRow) =>
        i.minStock > 0 && i.currentStock <= i.minStock
          ? `${i.name}: ${i.currentStock} ${i.unit} left — below the minimum of ${i.minStock}.`
          : `${i.name}: ${i.currentStock} ${i.unit} left.`,
      consumed: (item: { name: string; prevStock: number; newStock: number; unit: string }, count: number) =>
        `Deducted ${count} ${item.unit} of ${item.name}. Stock now: ${item.newStock} (was ${item.prevStock}).`,
      consumedNeg: (item: { name: string; prevStock: number; newStock: number; unit: string }, count: number) =>
        `Deducted ${count} ${item.unit} of ${item.name}, but stock went negative: ${item.newStock} (was ${item.prevStock}). Please restock soon.`,
      added: (item: { name: string; prevStock: number; newStock: number; unit: string }, count: number) =>
        `Added ${count} ${item.unit} of ${item.name}. Stock now: ${item.newStock} (was ${item.prevStock}).`,
      addedNew: (item: { name: string; newStock: number; unit: string }, count: number) =>
        `Created ${item.name} with ${count} ${item.unit}.`,
      suggestCreate: (name: string, count: number, unit: string) =>
        `I don't have "${name}" in your inventory. Should I add it with ${count} ${unit}? If so, tell me the unit (botella, kg, unidad…) and minimum stock you want.`,
    },
    he: {
      none: (q: string) => `לא מצאתי פריט מלאי שתואם ל"${q}".`,
      multiHeader: (n: number) => `מצאתי ${n} פריטים — לאיזה התכוונת?`,
      multiLine: (i: StockItemRow) => `• ${i.name} — ${i.currentStock} ${i.unit} (id:${i.id})`,
      queryOne: (i: StockItemRow) =>
        i.minStock > 0 && i.currentStock <= i.minStock
          ? `${i.name}: נותרו ${i.currentStock} ${i.unit} — מתחת למינימום (${i.minStock}).`
          : `${i.name}: נותרו ${i.currentStock} ${i.unit}.`,
      consumed: (item: { name: string; prevStock: number; newStock: number; unit: string }, count: number) =>
        `הופחתו ${count} ${item.unit} של ${item.name}. מלאי כעת: ${item.newStock} (היה ${item.prevStock}).`,
      consumedNeg: (item: { name: string; prevStock: number; newStock: number; unit: string }, count: number) =>
        `הופחתו ${count} ${item.unit} של ${item.name}, אך המלאי ירד מתחת לאפס: ${item.newStock} (היה ${item.prevStock}). מומלץ להזמין בקרוב.`,
      added: (item: { name: string; prevStock: number; newStock: number; unit: string }, count: number) =>
        `נוספו ${count} ${item.unit} של ${item.name}. מלאי כעת: ${item.newStock} (היה ${item.prevStock}).`,
      addedNew: (item: { name: string; newStock: number; unit: string }, count: number) =>
        `נוצר הפריט ${item.name} עם ${count} ${item.unit}.`,
      suggestCreate: (name: string, count: number, unit: string) =>
        `אין לי "${name}" במלאי. להוסיף עם ${count} ${unit}? ספר לי גם את היחידה (בקבוק, ק"ג, יחידה…) ואת המלאי המינימלי הרצוי.`,
    },
    ru: {
      none: (q: string) => `Не нашёл позицию инвентаря, совпадающую с «${q}».`,
      multiHeader: (n: number) => `Нашёл ${n} совпадений — какое вы имели в виду?`,
      multiLine: (i: StockItemRow) => `• ${i.name} — ${i.currentStock} ${i.unit} (id:${i.id})`,
      queryOne: (i: StockItemRow) =>
        i.minStock > 0 && i.currentStock <= i.minStock
          ? `${i.name}: осталось ${i.currentStock} ${i.unit} — ниже минимума (${i.minStock}).`
          : `${i.name}: осталось ${i.currentStock} ${i.unit}.`,
      consumed: (item: { name: string; prevStock: number; newStock: number; unit: string }, count: number) =>
        `Списано ${count} ${item.unit} «${item.name}». Остаток: ${item.newStock} (было ${item.prevStock}).`,
      consumedNeg: (item: { name: string; prevStock: number; newStock: number; unit: string }, count: number) =>
        `Списано ${count} ${item.unit} «${item.name}», но остаток ушёл в минус: ${item.newStock} (было ${item.prevStock}). Срочно пополните.`,
      added: (item: { name: string; prevStock: number; newStock: number; unit: string }, count: number) =>
        `Добавлено ${count} ${item.unit} «${item.name}». Остаток: ${item.newStock} (было ${item.prevStock}).`,
      addedNew: (item: { name: string; newStock: number; unit: string }, count: number) =>
        `Создана позиция «${item.name}» с количеством ${count} ${item.unit}.`,
      suggestCreate: (name: string, count: number, unit: string) =>
        `У вас нет «${name}» в инвентаре. Добавить с количеством ${count} ${unit}? Подскажите единицу (бутылка, кг, шт…) и минимальный остаток.`,
    },
    ar: {
      none: (q: string) => `لم أعثر على عنصر مخزون يطابق "${q}".`,
      multiHeader: (n: number) => `وجدت ${n} نتائج — أيها قصدت؟`,
      multiLine: (i: StockItemRow) => `• ${i.name} — ${i.currentStock} ${i.unit} (id:${i.id})`,
      queryOne: (i: StockItemRow) =>
        i.minStock > 0 && i.currentStock <= i.minStock
          ? `${i.name}: متبقي ${i.currentStock} ${i.unit} — أقل من الحد الأدنى (${i.minStock}).`
          : `${i.name}: متبقي ${i.currentStock} ${i.unit}.`,
      consumed: (item: { name: string; prevStock: number; newStock: number; unit: string }, count: number) =>
        `تم خصم ${count} ${item.unit} من ${item.name}. المخزون الآن: ${item.newStock} (كان ${item.prevStock}).`,
      consumedNeg: (item: { name: string; prevStock: number; newStock: number; unit: string }, count: number) =>
        `تم خصم ${count} ${item.unit} من ${item.name}، لكن المخزون أصبح سالباً: ${item.newStock} (كان ${item.prevStock}). يرجى التزود قريباً.`,
      added: (item: { name: string; prevStock: number; newStock: number; unit: string }, count: number) =>
        `تمت إضافة ${count} ${item.unit} إلى ${item.name}. المخزون الآن: ${item.newStock} (كان ${item.prevStock}).`,
      addedNew: (item: { name: string; newStock: number; unit: string }, count: number) =>
        `تم إنشاء العنصر ${item.name} بكمية ${count} ${item.unit}.`,
      suggestCreate: (name: string, count: number, unit: string) =>
        `لا يوجد "${name}" في المخزون. هل أضيفه بـ ${count} ${unit}؟ أخبرني أيضاً بالوحدة (زجاجة، كغ، قطعة…) والحد الأدنى المرغوب.`,
    },
  } as const;

  const L = labels[lang];

  if (result.success === false && result.kind === "not_found") {
    return L.none(result.query || "?");
  }
  if (result.success === false && result.kind === "suggest_create") {
    return L.suggestCreate(result.itemName || "?", result.count, result.unit ?? "unidades");
  }
  if (result.success === true && result.kind === "multiple") {
    const lines = result.items.slice(0, 8).map((i) => L.multiLine(i));
    return `${L.multiHeader(result.items.length)}\n${lines.join("\n")}`;
  }
  if (result.success === true && result.kind === "single") {
    return L.queryOne(result.item);
  }
  if (result.success === true && result.kind === "consumed") {
    if (action !== "consume_stock") {
      // Shouldn't happen but guard anyway.
    }
    // We don't know count from the result directly — derive it.
    const count = result.item.prevStock - result.item.newStock;
    if (result.wentNegative) return L.consumedNeg(result.item, count);
    return L.consumed(result.item, count);
  }
  if (result.success === true && result.kind === "added") {
    const count = result.item.newStock - result.item.prevStock;
    if (result.created) return L.addedNew(result.item, count);
    return L.added(result.item, count);
  }
  return "";
}
