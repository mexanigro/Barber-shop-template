import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "../lib/firebase";
import { NotificationLog } from "../types";
import { env } from "../config/env";

const COLLECTION = "notification_logs";
const CLIENT_ID = env.clientId;

function docToLog(id: string, data: Record<string, unknown>): NotificationLog {
  const createdAt =
    data.createdAt instanceof Timestamp ? data.createdAt.toDate()
    // CRM-03 diseño: un aviso guardado con su fecha como texto (o número) muestra su hora, no la de ahora.
    : typeof data.createdAt === "string" || typeof data.createdAt === "number" ? (Number.isNaN(new Date(data.createdAt).getTime()) ? new Date() : new Date(data.createdAt))
    : new Date();
  return {
    id,
    clientId: String(data.clientId ?? ""),
    channel: (data.channel as NotificationLog["channel"]) ?? "email",
    recipient: String(data.recipient ?? ""),
    subject: typeof data.subject === "string" ? data.subject : undefined,
    type: (data.type as NotificationLog["type"]) ?? "contact",
    status: (data.status as NotificationLog["status"]) ?? "queued",
    refId: typeof data.refId === "string" ? data.refId : undefined,
    providerMessageId: typeof data.providerMessageId === "string" ? data.providerMessageId : undefined,
    error: typeof data.error === "string" ? data.error : undefined,
    createdAt,
  };
}

export const notificationLogsService = {
  subscribe: (
    callback: (items: NotificationLog[]) => void,
    onError?: (err: Error) => void,
  ): (() => void) => {
    if (!isFirebaseConfigured) {
      console.warn("[notificationLogs] Firebase not configured — subscription skipped.");
      return () => {};
    }
    const q = query(
      collection(db, COLLECTION),
      where("clientId", "==", CLIENT_ID),
      orderBy("createdAt", "desc")
    );
    return onSnapshot(
      q,
      (snap) => {
        callback(snap.docs.map((d) => docToLog(d.id, d.data())));
      },
      (err) => {
        console.error("[notificationLogs] subscribe error:", err);
        onError?.(err);
      },
    );
  },
};
