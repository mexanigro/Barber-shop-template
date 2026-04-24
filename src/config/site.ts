/// <reference types="vite/client" />
import type { BusinessNiche, NichePreset, SiteConfig } from "../types";
import { env } from "./env";
import { abogadoPresetEn } from "./presets/abogado.en";
import { abogadoPresetHe } from "./presets/abogado.he";
import { barberiaPresetEn } from "./presets/barberia.en";
import { barberiaPresetHe } from "./presets/barberia.he";
import { esteticaPresetEn } from "./presets/estetica.en";
import { esteticaPresetHe } from "./presets/estetica.he";
import { nailsPresetEn } from "./presets/nails.en";
import { nailsPresetHe } from "./presets/nails.he";
import { tattooPresetEn } from "./presets/tattoo.en";
import { tattooPresetHe } from "./presets/tattoo.he";
import type { UiLanguage } from "./uiLanguage";

// ─── Active Niche ────────────────────────────────────────────────────────────
// Change this single constant to switch the entire site to a different niche.
// All content — brand, hero, services, staff, gallery, legal texts — updates
// automatically. No component files need to be touched.
// Supported: barberia | estetica | abogado | tattoo | nails (add more presets + legal LIBRARY entries).
// Demo: tattoo + Hebrew (see vercel.json build.env VITE_UI_LANGUAGE; switch back to barberia for default niche).
const ACTIVE_NICHE: BusinessNiche = "tattoo";

// ─── Preset Registry ─────────────────────────────────────────────────────────
const PRESETS: Record<BusinessNiche, Record<UiLanguage, NichePreset>> = {
  barberia: { en: barberiaPresetEn, he: barberiaPresetHe },
  estetica: { en: esteticaPresetEn, he: esteticaPresetHe },
  abogado: { en: abogadoPresetEn, he: abogadoPresetHe },
  tattoo: { en: tattooPresetEn, he: tattooPresetHe },
  nails: { en: nailsPresetEn, he: nailsPresetHe },
};

// ─── Base Config (niche-agnostic) ─────────────────────────────────────────────
// These settings govern infrastructure, feature flags, and integrations.
// They are intentionally separate from niche presets so a developer can
// enable/disable features without touching the content layer.
type BaseConfig = Pick<
  SiteConfig,
  "features" | "payment" | "notifications" | "adminEmail" | "splash"
>;

const BASE_CONFIG: BaseConfig = {
  features: {
    showHero: true,
    showWhyChooseUs: false,
    showServices: true,
    showTeam: true,
    showGallery: true,
    showTestimonials: true,
    showInquiry: true,
    showLocation: true,
    showBooking: true,
    /** Set to false to keep staff cards static (no individual profile pages). */
    enableStaffPages: true,
  },

  payment: {
    enabled: false,
    // 'none' | 'deposit' | 'full' — default: cardless / free booking flow
    mode: "none",
    depositAmount: 2000, // $20.00 if using deposit mode
    currency: "usd",
    provider: "stripe",
    stripePublishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "",
  },

  /**
   * NOTIFICATION CONFIGURATION
   *
   * Add the following to your deployment environment secrets to activate:
   *   BUSINESS_OWNER_EMAIL    → main recipient for all alerts
   *   EMAIL_FROM_ADDRESS       → verified "send-from" address
   *   EMAIL_PROVIDER_API_KEY   → API key (Resend, SendGrid, etc.)
   */
  notifications: {
    enabled: true,
    bookingAlerts: true,
    contactInquiries: true,
  },

  /**
   * Must match the Firebase Google sign-in email exactly (case-insensitive).
   * Override per deployment with VITE_ADMIN_EMAIL in `.env`.
   */
  adminEmail:
    (import.meta.env.VITE_ADMIN_EMAIL ?? "").trim() ||
    "admin@mastertemplate.com",

  /**
   * SPLASH SCREEN
   * Shown once per hard load. SPA navigation to/from home does not replay it.
   * durationMs: visible time before the exit curtain starts (~500 ms extra for exit).
   * Set enabled: false to bypass it entirely for any client deployment.
   */
  splash: {
    enabled: true,
    durationMs: 2100,
    // image: optional — reserved for future background use; current design is solid dark.
  },
};

// ─── Final Config Export ──────────────────────────────────────────────────────
// Spread order: preset first (content), then base (infrastructure).
// Base fields intentionally overwrite any same-named preset fields so that
// infrastructure settings are always authoritative.
export let siteConfig: SiteConfig = {
  tenant: {
    clientId: env.clientId,
  },
  ...PRESETS[ACTIVE_NICHE][env.uiLanguage],
  ...BASE_CONFIG,
};

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends Record<string, unknown> ? DeepPartial<T[K]> : T[K];
};

function mergeDeep<T extends Record<string, unknown>>(target: T, source: DeepPartial<T>): T {
  const out = { ...target } as T;
  for (const key of Object.keys(source) as Array<keyof T>) {
    const incoming = source[key];
    if (incoming == null) continue;
    const current = out[key];
    if (
      typeof current === "object" &&
      current !== null &&
      !Array.isArray(current) &&
      typeof incoming === "object" &&
      !Array.isArray(incoming)
    ) {
      out[key] = mergeDeep(current as Record<string, unknown>, incoming as Record<string, unknown>) as T[keyof T];
    } else {
      out[key] = incoming as T[keyof T];
    }
  }
  return out;
}

/** Apply tenant-specific config overlay fetched from Firestore (`config/{clientId}`). */
export function applyTenantConfigOverride(override: DeepPartial<SiteConfig>) {
  siteConfig = mergeDeep(siteConfig as Record<string, unknown>, override as DeepPartial<Record<string, unknown>>) as SiteConfig;
}
