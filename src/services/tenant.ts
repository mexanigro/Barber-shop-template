import { doc, getDoc, getDocFromServer } from "firebase/firestore";
import { env } from "../config/env";
import { applyTenantConfigOverride, siteConfig } from "../config/site";
import type { BusinessNiche } from "../types";
import type { ClientStatus } from "../config/tenant";
import { db, isFirebaseConfigured } from "../lib/firebase";

type TenantConfigDoc = Record<string, unknown>;

const KNOWN_NICHES = ["barberia", "estetica", "tattoo", "nails", "cafeteria", "remodelaciones", "peluqueria", "employment"] as const satisfies readonly BusinessNiche[];

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
  "branding",
  "sectionOrder",
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
  access: "allowed" | "blocked";
  status: ClientStatus;
  suspended: boolean;
} | {
  clientId: string;
  access: "unavailable";
};

type TimedRead<T> = PromiseSettledResult<T> | { status: "expired" };

export type TenantAccessDecision =
  | { access: "allowed"; status: ClientStatus }
  | { access: "blocked"; status: ClientStatus }
  | { access: "unavailable" };

/**
 * Decisión del gate a partir de la lectura de clients/{id}.
 * - Un visitante anónimo no puede leer clients/{id} (regla: solo admins del
 *   tenant): ese permission-denied significa "no sos admin", no "el servicio
 *   no está" → se entra como `active`, igual que en 6c07d7a. Un tenant
 *   suspendido no se distingue para anónimos por diseño de clients/{id}; la
 *   suspensión efectiva vive en la API y en las rules.
 * - Red caída, otro error o plazo vencido → `unavailable` (guarda de N03 L05).
 * - Documento leído (identidad admin) → lo que diga el documento; ausente o
 *   con status desconocido → `unavailable`.
 */
function resolveTenantAccess(read: TimedRead<unknown>): TenantAccessDecision {
  if (read.status === "expired") return { access: "unavailable" };
  if (read.status === "rejected") {
    return isPermissionDenied(read.reason) ? { access: "allowed", status: "active" } : { access: "unavailable" };
  }
  const status = read.value;
  if (status === "active" || status === "trial" || status === "maintenance") return { access: "allowed", status };
  if (status === "suspended" || status === "archived") return { access: "blocked", status };
  return { access: "unavailable" };
}

/** Cada lectura tiene su propio plazo; una resolución tardía no modifica la decisión. */
function readWithinDeadline<T>(read: () => Promise<T>): Promise<TimedRead<T>> {
  const started = performance.now();
  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: TimedRead<T>) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(performance.now() - started >= 1500 ? { status: "expired" } : result);
    };
    const timer = setTimeout(() => finish({ status: "expired" }), 1500);
    // También captura fallos síncronos del SDK sin impedir iniciar la otra lectura.
    Promise.resolve().then(read).then(
      (value) => finish({ status: "fulfilled", value }),
      (reason: unknown) => finish({ status: "rejected", reason }),
    );
  });
}

/**
 * Dev local sin Firebase (BLOQUE-04): la web se sirve del preset del nicho y,
 * si `VITE_TENANT_FIXTURE` está definido, de `dev-fixtures/{nombre}.json` como
 * si fuera `config/{id}`. Sólo existe en `import.meta.env.DEV`: un build de
 * producción sin Firebase sigue siendo `unavailable`.
 */
/** Reescribe en el JSON del fixture las rutas `…/hero.(mp4|webm)`, `…/hero-1280.(mp4|webm)`, `…/hero-poster.avif` y, desde GALERIA-01
 * (2026-09-20, el 9:16 es lo que ve el Android), `…/hero-v.(mp4|webm)` y `…/hero-v-poster.avif` a `hero-<clip>[-1280|-poster|-v|-v-poster].*`.
 * Cada candidata lleva sus 7 archivos. Sin clip, devuelve el texto tal cual. */
export function applyHeroClip(fixtureJson: string, clip: string): string {
  const c = clip.trim();
  return c ? fixtureJson.replace(/\/hero(-1280|-poster|-v|-v-poster)?\.(mp4|webm|avif)"/g, `/hero-${c}$1.$2"`) : fixtureJson;
}

async function bootstrapFromDevFixture(clientId: string): Promise<TenantBootstrapResult> {
  const name = ((import.meta.env.VITE_TENANT_FIXTURE as string | undefined) ?? "").trim();
  if (name) {
    try {
      const res = await fetch(`/dev-fixtures/${encodeURIComponent(name)}.json`);
      if (res.ok) {
        // MATERIAL-01: `VITE_HERO_CLIP=<sufijo>` apunta el clip 16:9 del fixture a `hero-<sufijo>.*` (sólo dev, para comparar candidatas).
        const data = JSON.parse(applyHeroClip(await res.text(), (import.meta.env.VITE_HERO_CLIP as string | undefined) ?? "")) as TenantConfigDoc;
        normalizeOverlayInPlace(data);
        applyTenantConfigOverride(data);
        console.info(`[Tenant] dev fixture aplicado: dev-fixtures/${name}.json`);
      } else {
        console.warn(`[Tenant] dev fixture no encontrado: dev-fixtures/${name}.json (${res.status})`);
      }
    } catch (error) {
      console.warn("[Tenant] dev fixture ilegible:", error);
    }
  }
  return { clientId, access: "allowed", status: "active", suspended: false };
}

export async function bootstrapTenantConfig(): Promise<TenantBootstrapResult> {
  const clientId = env.clientId;

  if (!isFirebaseConfigured) {
    if (import.meta.env.DEV) return bootstrapFromDevFixture(clientId);
    return { clientId, access: "unavailable" };
  }

  const clientRead = readWithinDeadline(async () => {
    const snapshot = await getDocFromServer(doc(db, "clients", clientId));
    return snapshot.exists() ? snapshot.data()?.status as unknown : undefined;
  });
  const configRead = readWithinDeadline(async () => {
    const snapshot = await getDoc(doc(db, "config", clientId));
    return snapshot.exists() ? snapshot.data() as TenantConfigDoc : undefined;
  });
  const decision = resolveTenantAccess(await clientRead);
  if (decision.access === "unavailable") {
    return { clientId, access: "unavailable" };
  }
  const status = decision.status;
  if (decision.access === "blocked") {
    return { clientId, access: "blocked", status, suspended: true };
  }

  const configResult = await configRead;
  if (configResult.status === "fulfilled" && configResult.value) {
    const data = configResult.value;
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
    access: "allowed",
    status,
    suspended: false,
  };
}
