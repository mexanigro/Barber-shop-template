import {
  collection,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
  serverTimestamp,
  Timestamp,
  type DocumentData,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "../lib/firebase";
import { ContactInboxItem, InboxStatus } from "../types";
import { env } from "../config/env";

const INBOX_COLLECTION = "contact_inbox";
const CLIENT_ID = env.clientId;

function docToInboxItem(id: string, data: DocumentData): ContactInboxItem {
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

  // M-10 FIX: createItem removed — all inbox writes go through /api/contact
  // to enforce server-side rate limiting and validation.
};
