import { Router, type Express, type RequestHandler, type Response } from "express";

interface HealthDatabase {
  collection(name: string): {
    doc(id: string): { get(): Promise<{ exists: boolean; data(): { status?: unknown } | undefined }> };
  };
}

/** Salud local: bootstrap y lectura del tenant por Admin SDK; no certifica escrituras. */
export function installRuntimeHealth(app: Express, clientId: string, loadDb: () => Promise<HealthDatabase | null>, rateLimit: RequestHandler) {
  const signals = Router();
  let state: "initializing" | "ready" | "failed" = "initializing";
  let pending: Promise<boolean> | null = null;

  function respond(res: Response, ready: boolean): void {
    res.removeHeader("X-Powered-By");
    res.setHeader("Cache-Control", "no-store");
    res.status(ready ? 200 : 503).json({ status: ready ? "ok" : "unavailable" });
  }

  function probe(): Promise<boolean> {
    if (!pending) {
      pending = (async () => {
        const db = await loadDb();
        if (!db) return false;
        const snapshot = await db.collection("clients").doc(clientId).get();
        return snapshot.exists && ["active", "trial", "maintenance"].includes(String(snapshot.data()?.status));
      })().catch(() => false);
      const current = pending;
      void current.then(() => { if (pending === current) pending = null; });
    }
    return pending;
  }

  // Liveness sin cuota ni acceso a DB; sigue disponible durante el bootstrap.
  signals.get("/live", (_req, res) => respond(res, true));
  signals.get("/health", (_req, res, next) => {
    res.removeHeader("X-Powered-By");
    res.setHeader("Cache-Control", "no-store");
    next();
  }, rateLimit, async (_req, res) => {
    if (state !== "ready" || !clientId) return respond(res, false);
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      // El plazo limita la respuesta; una operación SDK pendiente sigue compartida.
      const ready = await Promise.race([
        probe(),
        new Promise<boolean>(resolve => { timer = setTimeout(() => resolve(false), 1500); }),
      ]);
      respond(res, ready);
    } finally {
      if (timer) clearTimeout(timer);
    }
  });
  // Conserva req.path del limitador original montado bajo /api.
  app.use("/api", signals);
  app.use((_req, res, next) => {
    if (state === "ready") return next();
    respond(res, false);
  });

  return {
    complete(): void { state = "ready"; },
    fail(): void { state = "failed"; },
  };
}
