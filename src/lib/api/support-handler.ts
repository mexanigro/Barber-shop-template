import type { Request, Response, RequestHandler } from "express";
import type { Firestore } from "firebase-admin/firestore";

type SupportDependencies = {
  clientId: string;
  authenticate: (req: Request, res: Response) => Promise<unknown | null>;
  loadDb: () => Promise<Firestore | null>;
  sanitizeText: (input: unknown, maxLen: number) => string;
};

/** Envía soporte autenticado del tenant; no inicializa proveedores al importar. */
export function createSupportHandler(deps: SupportDependencies): RequestHandler {
  return async (req, res) => {
    const auth = await deps.authenticate(req, res);
    if (!auth) return;
    try {
      const message = deps.sanitizeText(req.body?.message, 5000);
      if (!message) return res.status(400).json({ error: "Message is required." });
      const db = await deps.loadDb();
      if (!db) return res.status(503).json({ error: "Database not available." });
      const ref = await db.collection("provider_messages").add({
        clientId: deps.clientId,
        businessName: deps.clientId,
        message,
        sender: "client",
        status: "new",
        createdAt: new Date(),
      });
      return res.json({ success: true, id: ref.id });
    } catch (error) {
      console.error("[Support] message failed:", error);
      return res.status(500).json({ error: "Failed to send message." });
    }
  };
}