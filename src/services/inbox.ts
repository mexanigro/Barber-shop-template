import {
  collection,
  doc,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "../lib/firebase";
import { ContactInboxItem, InboxStatus } from "../types";
import { env } from "../config/env";

const INBOX_COLLECTION = "contact_inbox";
const CLIENT_ID = env.clientId;

function docToInboxItem(id: string, data: Record<string, any>): ContactInboxItem {
  return {
    ...data,
    id,
    repliedAt: data.repliedAt instanceof Timestamp ? data.repliedAt.toDate() : undefined,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
  } as ContactInboxItem;
}

export const inboxService = {
  /**
   * Real-time subscription to all inbox items for this tenant, newest first.
   */
  subscribe: (callback: (items: ContactInboxItem[]) => void): (() => void) => {
    if (!isFirebaseConfigured) {
      console.warn("[inboxService] Firebase not configured — inbox subscription skipped.");
      return () => {};
    }
    const q = query(
      collection(db, INBOX_COLLECTION),
      where("clientId", "==", CLIENT_ID),
      orderBy("createdAt", "desc")
    );
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map((d) => docToInboxItem(d.id, d.data())));
    }, (err) => {
      console.error("[inboxService] subscribe error:", err);
    });
  },

  /**
   * One-shot list (for components that don't need real-time updates).
   */
  listItems: async (): Promise<ContactInboxItem[]> => {
    if (!isFirebaseConfigured) return [];
    try {
      const q = query(
        collection(db, INBOX_COLLECTION),
        where("clientId", "==", CLIENT_ID),
        orderBy("createdAt", "desc")
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => docToInboxItem(d.id, d.data()));
    } catch (err) {
      console.error("[inboxService] listItems:", err);
      return [];
    }
  },

  /**
   * Update the status of a single inbox item.
   */
  updateStatus: async (id: string, status: InboxStatus): Promise<void> => {
    if (!isFirebaseConfigured) return;
    try {
      const updates: Record<string, unknown> = { status };
      if (status === "replied") updates.repliedAt = serverTimestamp();
      await updateDoc(doc(db, INBOX_COLLECTION, id), updates);
    } catch (err) {
      console.error("[inboxService] updateStatus:", err);
      throw err;
    }
  },

  /**
   * Create an inbox item directly from the client (fallback if server write fails).
   * Normal path is server.ts writing via Admin SDK equivalent (Firebase client SDK on server).
   */
  createItem: async (item: Omit<ContactInboxItem, "id" | "createdAt" | "clientId">): Promise<string> => {
    if (!isFirebaseConfigured) return "";
    try {
      const ref = await addDoc(collection(db, INBOX_COLLECTION), {
        ...item,
        clientId: CLIENT_ID,
        status: item.status ?? "new",
        createdAt: serverTimestamp(),
      });
      return ref.id;
    } catch (err) {
      console.error("[inboxService] createItem:", err);
      return "";
    }
  },
};
