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

function readOverrideBusinessType(data: TenantConfigDoc): BusinessNiche | undefined {
  const raw = data["business"];
  if (!raw || typeof raw !== "object") return undefined;
  const t = (raw as { type?: unknown }).type;
  if (typeof t !== "string") return undefined;
  return t as BusinessNiche;
}

/** Keys safe to merge from Firestore when `business.type` is missing or mismatched (avoids barber dump clobbering tattoo preset). */
const SAFE_FIRESTORE_TOP_LEVEL = [
  "features",
  "payment",
  "notifications",
  "adminEmail",
  "splash",
] as const;

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

  try {
    const [clientSnap, configSnap] = await Promise.all([
      getDoc(doc(db, "clients", clientId)),
      getDoc(doc(db, "config", clientId)),
    ]);

    const clientData = (clientSnap.exists() ? (clientSnap.data() as ClientDoc) : {}) ?? {};
    const status = (clientData.status ?? "active") as ClientStatus;

    if (configSnap.exists()) {
      const data = configSnap.data() as TenantConfigDoc;
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
    }

    return {
      clientId,
      status,
      suspended: status === "suspended" || status === "archived",
    };
  } catch (error) {
    console.error("[Tenant] Failed to load tenant config. Falling back to base preset.", error);
    return { clientId, status: "active", suspended: false };
  }
}
