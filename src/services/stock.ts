import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  query, orderBy, onSnapshot, Timestamp, runTransaction,
  where, limit as firestoreLimit,
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

function itemsRef() {
  return collection(db, "stock", CLIENT_ID, "items");
}

function movementsRef() {
  return collection(db, "stock", CLIENT_ID, "movements");
}

export function subscribeItems(callback: (items: StockItem[]) => void) {
  const q = query(itemsRef(), orderBy("name", "asc"));
  return onSnapshot(q, (snap) => {
    const items: StockItem[] = snap.docs.map((d) => {
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
    });
    callback(items);
  });
}

export async function addItem(item: Omit<StockItem, "id" | "createdAt" | "updatedAt">): Promise<string> {
  const now = Timestamp.now();
  const ref = await addDoc(itemsRef(), {
    ...item,
    createdAt: now,
    updatedAt: now,
  });
  if (item.quantity > 0) {
    await addDoc(movementsRef(), {
      itemId: ref.id,
      type: "add",
      quantity: item.quantity,
      previousQuantity: 0,
      reason: "Stock inicial",
      performedBy: siteConfig.adminEmail || "admin",
      createdAt: now,
    });
  }
  return ref.id;
}

export async function updateItem(itemId: string, patch: Partial<Pick<StockItem, "name" | "category" | "unit" | "minStock" | "notes">>) {
  const ref = doc(itemsRef(), itemId);
  await updateDoc(ref, { ...patch, updatedAt: Timestamp.now() });
}

export async function adjustQuantity(
  itemId: string,
  delta: number,
  reason: string,
  performedBy: string
) {
  const itemRef = doc(itemsRef(), itemId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(itemRef);
    if (!snap.exists()) throw new Error("Item not found");
    const current = snap.data().quantity ?? 0;
    const newQty = Math.max(0, current + delta);
    tx.update(itemRef, { quantity: newQty, updatedAt: Timestamp.now() });
    const movRef = doc(movementsRef());
    tx.set(movRef, {
      itemId,
      type: delta > 0 ? "add" : "deduct",
      quantity: Math.abs(delta),
      previousQuantity: current,
      reason: reason || undefined,
      performedBy,
      createdAt: Timestamp.now(),
    });
  });
}

export function subscribeMovements(
  itemId: string,
  callback: (movements: StockMovement[]) => void,
  max = 20
) {
  const q = query(
    movementsRef(),
    where("itemId", "==", itemId),
    orderBy("createdAt", "desc"),
    firestoreLimit(max)
  );
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
  await deleteDoc(doc(itemsRef(), itemId));
}
