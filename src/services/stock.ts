import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  query, orderBy, onSnapshot, Timestamp, runTransaction,
  where, limit as firestoreLimit, getDocs,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { env } from "../config/env";
import { siteConfig } from "../config/site";

export type StockUnit = "unidades" | "ml" | "gr" | "oz" | "kg" | "litros";

export interface StockItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: StockUnit;
  minStock: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface StockMovement {
  id: string;
  itemId: string;
  type: "add" | "deduct";
  quantity: number;
  previousQuantity: number;
  reason?: string;
  performedBy: string;
  createdAt: Date;
}

const CLIENT_ID = env.clientId;

// Flat collection (CLAUDE.md rule): root-level docs with clientId field.
const STOCK_ITEMS = "stock_items";
const STOCK_MOVEMENTS = "stock_movements";

// Legacy nested layout kept as fallback until the per-tenant migration runs.
function legacyItemsRef() {
  return collection(db, "stock", CLIENT_ID, "items");
}
function legacyMovementsRef() {
  return collection(db, "stock", CLIENT_ID, "movements");
}

function flatItemsRef() {
  return collection(db, STOCK_ITEMS);
}
function flatMovementsRef() {
  return collection(db, STOCK_MOVEMENTS);
}

let legacyFallback = false;

function rowToItem(d: { id: string; data: () => any }): StockItem {
  const data = d.data();
  return {
    id: d.id,
    name: data.name,
    category: data.category || "",
    quantity: data.quantity ?? 0,
    unit: data.unit || "unidades",
    minStock: data.minStock ?? 0,
    notes: data.notes || "",
    createdAt: data.createdAt?.toDate?.() ?? new Date(),
    updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
  };
}

export function subscribeItems(callback: (items: StockItem[]) => void) {
  const flatQ = query(
    flatItemsRef(),
    where("clientId", "==", CLIENT_ID),
    orderBy("name", "asc"),
  );
  let legacyUnsub: (() => void) | undefined;
  const flatUnsub = onSnapshot(flatQ, (snap) => {
    if (snap.empty && !legacyUnsub) {
      // Fallback to legacy nested collection one time per session.
      if (import.meta.env.DEV) {
        console.warn("[stock] flat collection empty — falling back to legacy stock/{clientId}/items. Run /api/stock/migrate to upgrade.");
      }
      legacyFallback = true;
      const legacyQ = query(legacyItemsRef(), orderBy("name", "asc"));
      legacyUnsub = onSnapshot(legacyQ, (lsnap) => {
        callback(lsnap.docs.map(rowToItem));
      });
      return;
    }
    if (!snap.empty) {
      legacyFallback = false;
      callback(snap.docs.map(rowToItem));
    }
  });
  return () => {
    flatUnsub();
    if (legacyUnsub) legacyUnsub();
  };
}

function itemDocRef(itemId: string) {
  return legacyFallback ? doc(legacyItemsRef(), itemId) : doc(flatItemsRef(), itemId);
}
function movementsTargetRef() {
  return legacyFallback ? legacyMovementsRef() : flatMovementsRef();
}

export async function addItem(
  item: Omit<StockItem, "id" | "createdAt" | "updatedAt">,
  initialReason: string,
): Promise<string> {
  const now = Timestamp.now();
  const target = legacyFallback ? legacyItemsRef() : flatItemsRef();
  const payload: Record<string, unknown> = {
    ...item,
    createdAt: now,
    updatedAt: now,
  };
  if (!legacyFallback) payload.clientId = CLIENT_ID;
  const ref = await addDoc(target, payload);
  if (item.quantity > 0) {
    const movPayload: Record<string, unknown> = {
      itemId: ref.id,
      type: "add",
      quantity: item.quantity,
      previousQuantity: 0,
      reason: initialReason,
      performedBy: siteConfig.adminEmail || "admin",
      createdAt: now,
    };
    if (!legacyFallback) movPayload.clientId = CLIENT_ID;
    await addDoc(movementsTargetRef(), movPayload);
  }
  return ref.id;
}

export async function updateItem(itemId: string, patch: Partial<Pick<StockItem, "name" | "category" | "unit" | "minStock" | "notes">>) {
  await updateDoc(itemDocRef(itemId), { ...patch, updatedAt: Timestamp.now() });
}

export async function adjustQuantity(
  itemId: string,
  delta: number,
  reason: string,
  performedBy: string,
) {
  const itemRef = itemDocRef(itemId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(itemRef);
    if (!snap.exists()) throw new Error("Item not found");
    const current = snap.data().quantity ?? 0;
    const newQty = Math.max(0, current + delta);
    tx.update(itemRef, { quantity: newQty, updatedAt: Timestamp.now() });
    const movRef = doc(movementsTargetRef());
    const movPayload: Record<string, unknown> = {
      itemId,
      type: delta > 0 ? "add" : "deduct",
      quantity: Math.abs(delta),
      previousQuantity: current,
      reason: reason || undefined,
      performedBy,
      createdAt: Timestamp.now(),
    };
    if (!legacyFallback) movPayload.clientId = CLIENT_ID;
    tx.set(movRef, movPayload);
  });
}

export function subscribeMovements(
  itemId: string,
  callback: (movements: StockMovement[]) => void,
  max = 20,
) {
  // We can't query both layouts with the same listener; pick the active one.
  // If the flat layout is in use we filter by clientId + itemId, otherwise the
  // legacy nested collection already scopes per-tenant by path.
  const ref = legacyFallback ? legacyMovementsRef() : flatMovementsRef();
  const constraints = legacyFallback
    ? [where("itemId", "==", itemId), orderBy("createdAt", "desc"), firestoreLimit(max)]
    : [where("clientId", "==", CLIENT_ID), where("itemId", "==", itemId), orderBy("createdAt", "desc"), firestoreLimit(max)];
  const q = query(ref, ...constraints);
  return onSnapshot(q, (snap) => {
    const movements: StockMovement[] = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        itemId: data.itemId,
        type: data.type,
        quantity: data.quantity,
        previousQuantity: data.previousQuantity ?? 0,
        reason: data.reason || "",
        performedBy: data.performedBy || "",
        createdAt: data.createdAt?.toDate?.() ?? new Date(),
      };
    });
    callback(movements);
  });
}

export async function deleteItem(itemId: string) {
  await deleteDoc(itemDocRef(itemId));
}

/**
 * One-shot probe for callers (debug surfaces, hub) that need to know which
 * layout is currently feeding the UI. Returns `"legacy"` if the flat
 * collection was empty and we fell back, `"flat"` once the migration has run.
 */
export async function detectStockLayout(): Promise<"flat" | "legacy" | "empty"> {
  const flatSnap = await getDocs(
    query(flatItemsRef(), where("clientId", "==", CLIENT_ID), firestoreLimit(1)),
  );
  if (!flatSnap.empty) return "flat";
  const legacySnap = await getDocs(query(legacyItemsRef(), firestoreLimit(1)));
  return legacySnap.empty ? "empty" : "legacy";
}
