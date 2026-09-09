import type { RequestHandler } from "express";
import type { ClientStatus } from "../../config/tenant";

const VALID_STATUSES: readonly string[] = ["active", "trial", "maintenance", "suspended", "archived"];
const CACHE_TTL_MS = 30_000;
const VERIFICATION_TIMEOUT_MS = 1_500;

/** Acceso por estado comprobado; el lector conserva los selectores de cada runtime. */
export function createTenantAccessGuard(loadStatus: () => Promise<unknown>): RequestHandler {
  let cache: { status: ClientStatus; expiresAt: number } | null = null;
  let pending: Promise<ClientStatus | null> | null = null;

  function readStatus(): Promise<ClientStatus | null> {
    const startedAt = Date.now();
    if (cache && cache.expiresAt > startedAt) return Promise.resolve(cache.status);
    if (pending) return pending;

    let complete!: (status: ClientStatus | null) => void;
    let finished = false;
    const result = new Promise<ClientStatus | null>(resolve => { complete = resolve; });
    pending = result;
    const finish = (status: ClientStatus | null): void => {
      if (finished) return;
      finished = true;
      complete(status);
    };
    const timer = setTimeout(() => finish(null), VERIFICATION_TIMEOUT_MS);

    // El plazo comienza antes de cargar SDK/token. Un timeout no cancela el SDK:
    // las nuevas peticiones comparten el rechazo hasta que la lectura se asiente.
    void Promise.resolve().then(loadStatus).then(raw => {
      if (finished || Date.now() - startedAt >= VERIFICATION_TIMEOUT_MS) {
        finish(null);
        return;
      }
      if (typeof raw !== "string" || !VALID_STATUSES.includes(raw)) {
        finish(null);
        return;
      }
      const status = raw as ClientStatus;
      cache = { status, expiresAt: startedAt + CACHE_TTL_MS };
      finish(status);
    }, () => finish(null)).finally(() => {
      clearTimeout(timer);
      if (pending === result) pending = null;
    });
    return result;
  }

  return async (_req, res, next) => {
    const status = await readStatus();
    if (!status) {
      res.status(503).json({ error: "Tenant state unavailable." });
      return;
    }
    if (status === "suspended" || status === "archived") {
      res.status(423).json({ error: `Tenant is ${status}. Service is blocked.` });
      return;
    }
    res.locals.tenantAccessStatus = status;
    next();
  };
}
