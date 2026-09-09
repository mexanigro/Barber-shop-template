import type { Request, Response, RequestHandler } from "express";
import type { Firestore, Timestamp, DocumentData } from "firebase-admin/firestore";
import type { StockItemRow, StockMatchResult } from "../ai/stock-tools.js";

type StockDependencies = {
  clientId: string;
  authenticate: (req: Request, res: Response) => Promise<{ email: string } | null>;
  loadDb: () => Promise<Firestore | null>;
};
type StockAddDependencies = StockDependencies & {
  loadTimestamp: () => Promise<typeof Timestamp>;
};
type StockItemsDependencies = StockDependencies & {
  listItems: (db: Firestore, clientId: string) => Promise<StockItemRow[]>;
  matchItems: (items: StockItemRow[], search: string) => StockMatchResult;
};

/** Añade stock y auditoría; publica cada éxito sólo después del commit. */
export function createStockAddHandler(deps: StockAddDependencies): RequestHandler {
  return async (req, res) => {
    const auth = await deps.authenticate(req, res);
    if (!auth) return;
    if (!deps.clientId) return res.status(400).json({ error: "CLIENT_ID is not configured." });

    const raw = req.body?.items;
    if (!Array.isArray(raw) || raw.length === 0) {
      return res.status(400).json({ error: "items[] is required" });
    }
    if (raw.length > 50) {
      return res.status(413).json({ error: "max 50 items per request" });
    }

    type AddItem = { itemId: string; quantity: number; reason?: string };
    const items: AddItem[] = [];
    for (const it of raw) {
      const itemId = typeof it?.itemId === "string" ? it.itemId.trim() : "";
      const quantity = Number(it?.quantity);
      if (!itemId || !Number.isFinite(quantity) || quantity <= 0) {
        return res.status(400).json({ error: "each item needs { itemId: string, quantity: number > 0 }" });
      }
      items.push({ itemId, quantity, reason: typeof it?.reason === "string" ? it.reason.slice(0, 200) : undefined });
    }

    try {
      const db = await deps.loadDb();
      if (!db) return res.status(503).json({ error: "Database not available" });
      const Timestamp = await deps.loadTimestamp();

      const results: Array<{ itemId: string; ok: boolean; previousQuantity?: number; newQuantity?: number; error?: string }> = [];
      for (const item of items) {
        const flatRef = db.collection("stock_items").doc(item.itemId);
        const legacyRef = db.collection("stock").doc(deps.clientId).collection("items").doc(item.itemId);
        try {
          const committedResult = await db.runTransaction(async (tx) => {
            const flatSnap = await tx.get(flatRef);
            let targetRef = flatRef;
            let layout: "flat" | "legacy" = "flat";
            let data: DocumentData | undefined = flatSnap.exists ? flatSnap.data() : undefined;
            if (!flatSnap.exists) {
              const legacySnap = await tx.get(legacyRef);
              if (!legacySnap.exists) throw new Error("not_found");
              targetRef = legacyRef;
              layout = "legacy";
              data = legacySnap.data();
            }
            if (!data) throw new Error("not_found");
            if (layout === "flat" && data.clientId !== deps.clientId) throw new Error("forbidden");
            const previousQuantity = Number(data.quantity ?? 0);
            const newQuantity = previousQuantity + item.quantity;
            tx.update(targetRef, { quantity: newQuantity, updatedAt: Timestamp.now() });
            const movCol = layout === "flat"
              ? db.collection("stock_movements")
              : db.collection("stock").doc(deps.clientId).collection("movements");
            const movRef = movCol.doc();
            const movPayload: DocumentData = {
              itemId: item.itemId,
              type: "add",
              quantity: item.quantity,
              previousQuantity,
              reason: item.reason ?? "manual add",
              performedBy: auth.email,
              createdAt: Timestamp.now(),
            };
            if (layout === "flat") movPayload.clientId = deps.clientId;
            tx.set(movRef, movPayload);
            return { itemId: item.itemId, ok: true, previousQuantity, newQuantity };
          });
          results.push(committedResult);
        } catch (err) {
          results.push({ itemId: item.itemId, ok: false, error: err instanceof Error ? err.message : "unknown" });
        }
      }

      const anyFailed = results.some((r) => !r.ok);
      console.log(`[Stock Add] client=${deps.clientId} requested=${items.length} ok=${results.filter(r => r.ok).length} by=${auth.email}`);
      return res.status(anyFailed ? 207 : 200).json({ ok: !anyFailed, results });
    } catch (err) {
      console.error("[Stock Add] error:", err);
      return res.status(500).json({ error: err instanceof Error ? err.message : "add_failed" });
    }
  };
}

/** Consulta stock flat del tenant usando los criterios de búsqueda existentes. */
export function createStockItemsHandler(deps: StockItemsDependencies): RequestHandler {
  return async (req, res) => {
    const auth = await deps.authenticate(req, res);
    if (!auth) return;
    if (!deps.clientId) return res.status(400).json({ error: "CLIENT_ID is not configured." });
    try {
      const db = await deps.loadDb();
      if (!db) return res.status(503).json({ error: "Database not available" });
      const all = await deps.listItems(db, deps.clientId);
      const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
      if (!search) {
        return res.json({ items: all.slice(0, 50), total: all.length });
      }
      const match = deps.matchItems(all, search);
      if (match.kind === "none") return res.json({ items: [], total: 0 });
      if (match.kind === "single") return res.json({ items: [match.item], total: 1 });
      return res.json({ items: match.items.slice(0, 50), total: match.items.length });
    } catch (err) {
      console.error("[Stock Items Search] error:", err);
      return res.status(500).json({ error: err instanceof Error ? err.message : "search_failed" });
    }
  };
}
