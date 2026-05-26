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

const KNOWN_NICHES = ["barberia", "estetica", "tattoo", "nails", "cafeteria", "remodelaciones"] as const satisfies readonly BusinessNiche[];

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
  "businessRules",
  "activeTheme",
  "theme",
  "hero",
  "gallery",
  "sections",
  "staff",
  "brand",
  "contact",
  "businessMode",
  "hours",
  "visibleServices",
  "serviceOverrides",
  "landingServicesCount",
  "typography",
  "owner",
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

/**
 * Older clients store `gallery` as `[{alt, src}, ...]` (object array) while
 * the template's `SiteConfig.gallery` is `string[]`. Without this coercion,
 * those clients render an empty gallery (or worse: pass an object to <img src>).
 * Accept both shapes and flatten to `string[]`.
 */
function normalizeGalleryShape(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out: string[] = [];
  for (const item of value) {
    if (typeof item === "string") {
      if (item.trim()) out.push(item);
    } else if (item && typeof item === "object") {
      const src = (item as { src?: unknown; url?: unknown }).src ?? (item as { src?: unknown; url?: unknown }).url;
      if (typeof src === "string" && src.trim()) out.push(src);
    }
  }
  return out;
}

function normalizeOverlayInPlace(data: TenantConfigDoc): void {
  const gal = normalizeGalleryShape(data["gallery"]);
  if (gal !== undefined) {
    data["gallery"] = gal;
  }
  // Some clients also nested an `images` field under `sections.gallery`
  // with the same legacy shape. Coerce it too.
  const sections = data["sections"];
  if (sections && typeof sections === "object") {
    const galSection = (sections as Record<string, unknown>)["gallery"];
    if (galSection && typeof galSection === "object") {
      const imgs = normalizeGalleryShape((galSection as Record<string, unknown>)["images"]);
      if (imgs !== undefined) {
        (galSection as Record<string, unknown>)["images"] = imgs;
      }
    }
  }
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
        normalizeOverlayInPlace(toMerge);
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
