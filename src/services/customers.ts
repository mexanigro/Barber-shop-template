import {
  collection,
  doc,
  getDocs,
  query,
  where,
  setDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
  getDoc,
  type DocumentData,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "../lib/firebase";
import { Customer } from "../types";
import { env } from "../config/env";

const CUSTOMERS_COLLECTION = "customers";
const CLIENT_ID = env.clientId;

/** djb2 string hash → hex. Produces a short, stable, URL-safe doc ID suffix. */
function simpleHash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16);
}

function docToCustomer(id: string, data: DocumentData): Customer {
  return {
    ...data,
    id,
    tags: Array.isArray(data.tags) ? data.tags : [],
    lastVisitAt: data.lastVisitAt instanceof Timestamp ? data.lastVisitAt.toDate() : data.lastVisitAt ?? undefined,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
  } as Customer;
}

/** Clave de ordenación únicamente; nunca sustituye ni persiste una fecha de visita. */
function lastVisitTime(value: unknown): number {
  const date = value instanceof Date ? value : typeof value === "string" ? new Date(value) : null;
  const time = date?.getTime();
  return typeof time === "number" && Number.isFinite(time) ? time : Number.NEGATIVE_INFINITY;
}

export const customerService = {
  /**
   * Todos los contactos del tenant, sin exigir campos opcionales ni truncar la población.
   * Orden local: última visita válida descendente, sin fecha al final; empate por ID.
   */
  listCustomers: async (): Promise<Customer[]> => {
    if (!isFirebaseConfigured) throw new Error("Firebase is not configured");
    try {
      const q = query(
        collection(db, CUSTOMERS_COLLECTION),
        where("clientId", "==", CLIENT_ID),
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => docToCustomer(d.id, d.data())).sort((a, b) => {
        const aTime = lastVisitTime(a.lastVisitAt);
        const bTime = lastVisitTime(b.lastVisitAt);
        if (aTime !== bTime) return aTime > bTime ? -1 : 1;
        return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
      });
    } catch (err) {
      console.error("[customerService] listCustomers:", err);
      throw err;
    }
  },

  /**
   * Search customers by name or email prefix (client-side filter over full list).
   * For MVP this is acceptable; a Firestore index on name would be needed for server-side.
   */
  searchCustomers: async (term: string): Promise<Customer[]> => {
    const all = await customerService.listCustomers();
    if (!term.trim()) return all;
    const lower = term.toLowerCase();
    return all.filter(
      (c) =>
        c.fullName.toLowerCase().includes(lower) ||
        c.email.toLowerCase().includes(lower) ||
        c.phone.includes(term)
    );
  },

  /**
   * Get a single customer by Firestore doc ID.
   */
  getCustomer: async (id: string): Promise<Customer | null> => {
    if (!isFirebaseConfigured) return null;
    try {
      const snap = await getDoc(doc(db, CUSTOMERS_COLLECTION, id));
      if (!snap.exists()) return null;
      return docToCustomer(snap.id, snap.data());
    } catch (err) {
      console.error("[customerService] getCustomer:", err);
      return null;
    }
  },

  /**
   * Guarda por el ID determinista del tenant y email normalizado.
   * Rechaza fallos de lectura/escritura; sólo devuelve ID tras confirmación.
   * Conserva el contrato legacy de visitas y valor acumulado. No es una
   * transacción: escrituras concurrentes pueden perder incrementos (DC04).
   */
  upsertByEmail: async (params: {
    email: string;
    fullName: string;
    phone: string;
    source?: Customer["source"];
    lastServiceId?: string;
    amountPaidCents?: number;
    paymentMethod?: Customer["paymentMethod"];
  }): Promise<string> => {
    if (!isFirebaseConfigured) throw new Error("Firebase is not configured");
    try {
      const normalizedEmail = params.email.toLowerCase().trim();
      // Deterministic ID: clientId + email ensures one doc per tenant+email pair.
      // Simple hash avoids special characters in doc IDs.
      const docId = `${CLIENT_ID}_${simpleHash(normalizedEmail)}`;
      const ref = doc(db, CUSTOMERS_COLLECTION, docId);
      // Consultar dentro del tenant permite comprobar también la ausencia: las
      // rules de get necesitan resource.data, que no existe durante el alta.
      // Seleccionar el ID después de consultar conserva el lookup legacy aun
      // si el email almacenado difiere. La lectura queda limitada al tenant.
      const matches = await getDocs(query(
        collection(db, CUSTOMERS_COLLECTION),
        where("clientId", "==", CLIENT_ID),
      ));
      const existing = matches.docs.find((candidate) => candidate.id === docId);
      const now = serverTimestamp();

      if (existing) {
        const data = existing.data();
        await updateDoc(ref, {
          fullName: params.fullName || data.fullName,
          phone: params.phone || data.phone,
          lastVisitAt: now,
          visitCount: (data.visitCount ?? 0) + 1,
          updatedAt: now,
          ...(params.lastServiceId ? { lastServiceId: params.lastServiceId } : {}),
          ...(params.amountPaidCents != null ? {
            amountPaidCents: params.amountPaidCents,
            lifetimeValueCents: (data.lifetimeValueCents ?? 0) + params.amountPaidCents,
          } : {}),
          ...(params.paymentMethod ? { paymentMethod: params.paymentMethod } : {}),
        });
      } else {
        await setDoc(ref, {
          clientId: CLIENT_ID,
          email: normalizedEmail,
          fullName: params.fullName,
          phone: params.phone,
          source: params.source ?? "booking",
          visitCount: 1,
          tags: [],
          notes: "",
          lastVisitAt: now,
          createdAt: now,
          updatedAt: now,
          ...(params.lastServiceId ? { lastServiceId: params.lastServiceId } : {}),
          ...(params.amountPaidCents != null ? {
            amountPaidCents: params.amountPaidCents,
            lifetimeValueCents: params.amountPaidCents,
          } : {}),
          ...(params.paymentMethod ? { paymentMethod: params.paymentMethod } : {}),
        });
      }
      return docId;
    } catch (err) {
      console.error("[customerService] upsertByEmail:", err);
      throw err;
    }
  },

  /**
   * Update mutable fields on a customer (notes, tags, phone).
   */
  updateCustomer: async (id: string, updates: Partial<Pick<Customer, "notes" | "tags" | "phone">>): Promise<void> => {
    if (!isFirebaseConfigured) return;
    try {
      await updateDoc(doc(db, CUSTOMERS_COLLECTION, id), {
        ...updates,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("[customerService] updateCustomer:", err);
      throw err;
    }
  },
};
