import { doc, getDoc } from "firebase/firestore";
import { env } from "../config/env";
import { applyTenantConfigOverride, siteConfig } from "../config/site";
import type { BusinessNiche } from "../types";
import type { ClientStatus } from "../config/tenant";
import { db, isFirebaseConfigured } from "../lib/firebase";

type ClientDoc = {
  status?: ClientStatus;
  legalName?: string;
  timezone?: string;
  allowedPaymentProviders?: string[];
};

type TenantConfigDoc = Record<string, unknown>;

const KNOWN_NICHES = ["barberia", "estetica", "abogado", "tattoo", "nails"] as const satisfies readonly BusinessNiche[];

/**
 * Maps Firestore `business.type` to the same literals as `VITE_ACTIVE_NICHE` / presets.
 * Accepts legacy English shorthand `barber` as `barberia`.
 */
function parseFirestoreBusinessType(raw: string): BusinessNiche | undefined {
  const n = raw.trim().toLowerCase();
  const normalized = n === "barber" ? "barberia" : n;
  if ((KNOWN_NICHES as readonly string[]).includes(normalized)) {
    return normalized as BusinessNiche;
  }
  return undefined;
}

function readOverrideBusinessType(data: TenantConfigDoc): BusinessNiche | undefined {
  const raw = data["business"];
  if (!raw || typeof raw !== "object") return undefined;
  const t = (raw as { type?: unknown }).type;
  if (typeof t !== "string") return undefined;
  return parseFirestoreBusinessType(t);
}

/** Keys safe to merge from Firestore when `business.type` is missing or mismatched (avoids barber dump clobbering tattoo preset). */
const SAFE_FIRESTORE_TOP_LEVEL = [
  "features",
  "payment",
  "notifications",
  "adminEmail",
  "splash",
] as const;

function isPermissionDenied(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  return (error as { code?: unknown }).code === "permission-denied";
}

function pickSafeFirestoreOverlay(data: TenantConfigDoc): TenantConfigDoc {
  const out: TenantConfigDoc = {};
  for (const k of SAFE_FIRESTORE_TOP_LEVEL) {
    if (data[k] !== undefined) out[k] = data[k];
  }
  return out;
}

export type TenantBootstrapResult = {
  clientId: string;
  status: ClientStatus;
  suspended: boolean;
};

export async function bootstrapTenantConfig(): Promise<TenantBootstrapResult> {
  const clientId = env.clientId;

  if (!isFirebaseConfigured) {
    console.warn("[Tenant] Firebase not configured. Using static template config.");
    return { clientId, status: "active", suspended: false };
  }

  const [clientResult, configResult] = await Promise.allSettled([
    getDoc(doc(db, "clients", clientId)),
    getDoc(doc(db, "config", clientId)),
  ]);

  let status: ClientStatus = "active";
  if (clientResult.status === "fulfilled") {
    const clientData = (clientResult.value.exists() ? (clientResult.value.data() as ClientDoc) : {}) ?? {};
    status = (clientData.status ?? "active") as ClientStatus;
  } else if (!isPermissionDenied(clientResult.reason)) {
    console.error("[Tenant] Failed to read clients status doc.", clientResult.reason);
  }

  if (configResult.status === "fulfilled" && configResult.value.exists()) {
    const data = configResult.value.data() as TenantConfigDoc;
    const disable =
      import.meta.env.VITE_DISABLE_FIRESTORE_SITE_OVERRIDE === "true" ||
      import.meta.env.VITE_DISABLE_FIRESTORE_SITE_OVERRIDE === "1";
    const overrideType = readOverrideBusinessType(data);
    const builtType = siteConfig.business.type;

    if (disable) {
      console.warn(
        "[Tenant] Skipping Firestore config overlay (VITE_DISABLE_FIRESTORE_SITE_OVERRIDE). Using built-in preset only.",
      );
    } else {
      let toMerge: TenantConfigDoc;
      if (overrideType === builtType) {
        toMerge = data;
      } else {
        if (overrideType) {
          console.warn(
            `[Tenant] Firestore config/${clientId} has business.type "${overrideType}" but this build uses "${builtType}". Merging only infrastructure keys (${SAFE_FIRESTORE_TOP_LEVEL.join(", ")}).`,
          );
        } else {
          console.warn(
            `[Tenant] Firestore config/${clientId} has no business.type. Merging only infrastructure keys (${SAFE_FIRESTORE_TOP_LEVEL.join(", ")}). Set business.type to "${builtType}" to allow full marketing/site overrides from Firebase.`,
          );
        }
        toMerge = pickSafeFirestoreOverlay(data);
      }

      if (Object.keys(toMerge).length > 0) {
        applyTenantConfigOverride(toMerge);
      }
    }
  } else if (configResult.status === "rejected") {
    if (isPermissionDenied(configResult.reason)) {
      console.error(
        `[Tenant] Unable to read public config/${clientId}. Verify Firestore rules on the active database.`,
      );
    } else {
      console.error("[Tenant] Failed to read config doc.", configResult.reason);
    }
  }

  return {
    clientId,
    status,
    suspended: status === "suspended" || status === "archived",
  };
}
