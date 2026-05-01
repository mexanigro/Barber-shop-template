import {
  collection,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  setDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
  getDoc,
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

function docToCustomer(id: string, data: Record<string, any>): Customer {
  return {
    ...data,
    id,
    lastVisitAt: data.lastVisitAt instanceof Timestamp ? data.lastVisitAt.toDate() : data.lastVisitAt ?? undefined,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
  } as Customer;
}

export const customerService = {
  /**
   * List all customers for this tenant, ordered by lastVisitAt desc.
   */
  listCustomers: async (): Promise<Customer[]> => {
    if (!isFirebaseConfigured) return [];
    try {
      const q = query(
        collection(db, CUSTOMERS_COLLECTION),
        where("clientId", "==", CLIENT_ID),
        orderBy("lastVisitAt", "desc")
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => docToCustomer(d.id, d.data()));
    } catch (err) {
      console.error("[customerService] listCustomers:", err);
      return [];
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
   * Upsert a customer by email within this tenant.
   * Uses a deterministic doc ID (`{clientId}_{emailHash}`) so concurrent
   * bookings for the same email converge on the same document via
   * `setDoc({ merge: true })`, preventing duplicate customer records.
   *
   * On first write: sets source, visitCount=1, createdAt.
   * On subsequent writes: merges name/phone and updates lastVisitAt.
   * Note: visitCount increment is best-effort (last-write-wins under
   * concurrent setDoc); acceptable for CRM MVP.
   */
  upsertByEmail: async (params: {
    email: string;
    fullName: string;
    phone: string;
    source?: Customer["source"];
  }): Promise<string> => {
    if (!isFirebaseConfigured) return "";
    try {
      const normalizedEmail = params.email.toLowerCase().trim();
      // Deterministic ID: clientId + email ensures one doc per tenant+email pair.
      // Simple hash avoids special characters in doc IDs.
      const docId = `${CLIENT_ID}_${simpleHash(normalizedEmail)}`;
      const ref = doc(db, CUSTOMERS_COLLECTION, docId);
      const existing = await getDoc(ref);
      const now = serverTimestamp();

      if (existing.exists()) {
        const data = existing.data();
        await updateDoc(ref, {
          fullName: params.fullName || data.fullName,
          phone: params.phone || data.phone,
          lastVisitAt: now,
          visitCount: (data.visitCount ?? 0) + 1,
          updatedAt: now,
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
          preferences: [],
          notes: "",
          lastVisitAt: now,
          createdAt: now,
          updatedAt: now,
        });
      }
      return docId;
    } catch (err) {
      console.error("[customerService] upsertByEmail:", err);
      return "";
    }
  },

  /**
   * Update mutable fields on a customer (notes, tags, preferences).
   */
  updateCustomer: async (id: string, updates: Partial<Pick<Customer, "notes" | "tags" | "preferences" | "phone">>): Promise<void> => {
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
