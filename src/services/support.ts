import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
  doc,
  Timestamp,
  type DocumentData,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "../lib/firebase";
import type { ProviderMessage, ProviderMessageStatus } from "../types";
import { env } from "../config/env";

const COLLECTION = "provider_messages";
const CLIENT_ID = env.clientId;

function docToMessage(id: string, data: DocumentData): ProviderMessage {
  return {
    ...data,
    id,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
  } as ProviderMessage;
}

export const supportService = {
  subscribe(callback: (messages: ProviderMessage[]) => void): () => void {
    if (!isFirebaseConfigured || !CLIENT_ID) {
      console.warn("[supportService] Firebase not configured — subscription skipped.");
      return () => {};
    }

    const q = query(
      collection(db, COLLECTION),
      where("clientId", "==", CLIENT_ID),
      orderBy("createdAt", "asc"),
    );

    return onSnapshot(q, (snap) => {
      callback(snap.docs.map((d) => docToMessage(d.id, d.data())));
    }, (err) => {
      console.error("[supportService] subscribe error:", err);
    });
  },

  async listMessages(): Promise<ProviderMessage[]> {
    if (!isFirebaseConfigured || !CLIENT_ID) return [];
    try {
      const q = query(
        collection(db, COLLECTION),
        where("clientId", "==", CLIENT_ID),
        orderBy("createdAt", "asc"),
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => docToMessage(d.id, d.data()));
    } catch (err) {
      console.error("[supportService] listMessages:", err);
      return [];
    }
  },

  async sendMessage(message: string): Promise<string> {
    if (!CLIENT_ID) return "";
    try {
      const res = await fetch("/api/support/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      if (!res.ok) return "";
      const data = await res.json();
      return data.id ?? "";
    } catch (err) {
      console.error("[supportService] sendMessage:", err);
      return "";
    }
  },

  async markAsRead(id: string): Promise<void> {
    if (!isFirebaseConfigured) return;
    try {
      await updateDoc(doc(db, COLLECTION, id), { status: "read" });
    } catch (err) {
      console.error("[supportService] markAsRead:", err);
    }
  },
};
