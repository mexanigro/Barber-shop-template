/// <reference types="vite/client" />
import type { BusinessNiche, NichePreset, SiteConfig, SiteTheme } from "../types";
import { env } from "./env";
import { barberiaPresetEn } from "./presets/barberia.en";
import { barberiaPresetHe } from "./presets/barberia.he";
import { barberiaPresetRu } from "./presets/barberia.ru";
import { barberiaPresetAr } from "./presets/barberia.ar";
import { esteticaPresetEn } from "./presets/estetica.en";
import { esteticaPresetHe } from "./presets/estetica.he";
import { esteticaPresetRu } from "./presets/estetica.ru";
import { esteticaPresetAr } from "./presets/estetica.ar";
import { nailsPresetEn } from "./presets/nails.en";
import { nailsPresetHe } from "./presets/nails.he";
import { nailsPresetRu } from "./presets/nails.ru";
import { nailsPresetAr } from "./presets/nails.ar";
import { tattooPresetEn } from "./presets/tattoo.en";
import { tattooPresetHe } from "./presets/tattoo.he";
import { tattooPresetRu } from "./presets/tattoo.ru";
import { tattooPresetAr } from "./presets/tattoo.ar";
import { cafeteriaPresetEn } from "./presets/cafeteria.en";
import { cafeteriaPresetHe } from "./presets/cafeteria.he";
import { cafeteriaPresetRu } from "./presets/cafeteria.ru";
import { cafeteriaPresetAr } from "./presets/cafeteria.ar";
import { remodelacionesPresetEn } from "./presets/remodelaciones.en";
import { remodelacionesPresetHe } from "./presets/remodelaciones.he";
import { remodelacionesPresetRu } from "./presets/remodelaciones.ru";
import { remodelacionesPresetAr } from "./presets/remodelaciones.ar";
import { employmentPresetEn } from "./presets/employment.en";
import { employmentPresetHe } from "./presets/employment.he";
import { employmentPresetRu } from "./presets/employment.ru";
import { employmentPresetAr } from "./presets/employment.ar";
import type { UiLanguage } from "./uiLanguage";

// ─── Active niche (build-time) ────────────────────────────────────────────────
// Set `VITE_ACTIVE_NICHE` and `VITE_UI_LANGUAGE` on Vercel (or `.env` locally).
// Supported niches: barberia | estetica | tattoo | nails (+ legal LIBRARY in legalContent.ts).

// ─── Preset Registry ─────────────────────────────────────────────────────────
const PRESETS: Record<BusinessNiche, Record<UiLanguage, NichePreset>> = {
  barberia: { en: barberiaPresetEn, he: barberiaPresetHe, ru: barberiaPresetRu, ar: barberiaPresetAr },
  estetica: { en: esteticaPresetEn, he: esteticaPresetHe, ru: esteticaPresetRu, ar: esteticaPresetAr },
  tattoo: { en: tattooPresetEn, he: tattooPresetHe, ru: tattooPresetRu, ar: tattooPresetAr },
  nails: { en: nailsPresetEn, he: nailsPresetHe, ru: nailsPresetRu, ar: nailsPresetAr },
  cafeteria: { en: cafeteriaPresetEn, he: cafeteriaPresetHe, ru: cafeteriaPresetRu, ar: cafeteriaPresetAr },
  remodelaciones: { en: remodelacionesPresetEn, he: remodelacionesPresetHe, ru: remodelacionesPresetRu, ar: remodelacionesPresetAr },
  employment: { en: employmentPresetEn, he: employmentPresetHe, ru: employmentPresetRu, ar: employmentPresetAr },
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
    showWhyChooseUs: true,
    showServices: true,
    showTeam: true,
    showGallery: true,
    showTestimonials: true,
    showInquiry: true,
    showLocation: true,
    showBusinessHours: true,
    showInstagram: true,
    showBooking: true,
    /** Set to false to keep staff cards static (no individual profile pages). */
    enableStaffPages: true,
    showAbout: false,
    enableAboutPage: false,
    showWhatsAppInChat: false,
    showFaq: true,
    showHeroStats: true,
  },

  payment: {
    enabled: false,
    // 'none' | 'deposit' | 'full' | 'cash-only'
    mode: "none",
    depositAmount: 2000, // in cents/agorot — 2000 = ₪20.00
    depositRequired: false,
    acceptCash: false,
    currency: "ils",
    provider: "none",
    providerPublicKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || import.meta.env.VITE_PAYMENT_PUBLIC_KEY || "",
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
    (import.meta.env.VITE_ADMIN_EMAIL ?? "").trim(),

  /**
   * SPLASH SCREEN
   * Shown once per hard load. SPA navigation to/from home does not replay it.
   * durationMs: visible time before the exit curtain starts (~500 ms extra for exit).
   * Set enabled: false to bypass it entirely for any client deployment.
   */
  splash: {
    enabled: true,
    durationMs: 2100,
    // image: optional background image URL — rendered behind the splash animation with a dark overlay.
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
  ...PRESETS[env.activeNiche][env.uiLanguage],
  ...BASE_CONFIG,
};

// ─── businessMode → feature flag derivation ─────────────────────────────────
// When businessMode is "solo", ensure the features reflect a single-person
// business (showAbout true, showTeam false). This is the official toggle;
// the old "showAbout && !showTeam" heuristic continues to work as fallback.
function _applyBusinessMode(): void {
  if (siteConfig.businessMode === "solo") {
    siteConfig.features.showAbout = true;
    siteConfig.features.showTeam = false;
  }
}

// ─── Niche-specific feature overrides ────────────────────────────────────────
// Certain niches require specific feature states regardless of Firestore config.
function _applyNicheFeatures(): void {
  const niche = siteConfig.business.type;
  if (niche === "cafeteria") {
    siteConfig.features.showBooking = false;
    siteConfig.features.showMenu ??= true;
    siteConfig.features.showPhilosophy ??= true;
    siteConfig.features.showProcess ??= true;
    siteConfig.features.showAmbience ??= true;
  }
  if (niche === "remodelaciones") {
    siteConfig.features.showBooking = false;
    siteConfig.features.showPortfolio ??= true;
    siteConfig.features.showProcess ??= true;
  }
  if (niche === "employment") {
    siteConfig.features.showBooking = false;
    siteConfig.features.showServices = false;
    siteConfig.features.showTeam = false;
    siteConfig.features.showGallery = false;
    siteConfig.features.showInstagram = false;
    // Employment is a placement agency, not a brick-and-mortar storefront —
    // the contact section keeps form + hours, no map.
    siteConfig.features.showLocation = false;
    siteConfig.features.showHowItWorks ??= true;
    siteConfig.features.showJobCategories ??= true;
    siteConfig.features.showEmploymentForm ??= true;
  }
}

_applyBusinessMode();
_applyNicheFeatures();

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

// ─── Tenant Override Persistence ─────────────────────────────────────────────
// Stored so it can be re-applied when the user switches language at runtime
// (switchSiteLanguage rebuilds siteConfig from scratch, losing Firestore data).
let _tenantOverride: DeepPartial<SiteConfig> | null = null;

/** Apply tenant-specific config overlay fetched from Firestore (`config/{clientId}`). */
export function applyTenantConfigOverride(override: DeepPartial<SiteConfig>) {
  _tenantOverride = override;
  siteConfig = mergeDeep(siteConfig as Record<string, unknown>, override as DeepPartial<Record<string, unknown>>) as SiteConfig;
  _applyBusinessMode();
  _applyNicheFeatures();
  _applyVisibleServicesFilter();
}

/** Swap the site preset to a different language at runtime. */
export function switchSiteLanguage(lang: UiLanguage): void {
  const preset = PRESETS[env.activeNiche]?.[lang];
  if (!preset) return;
  siteConfig = {
    tenant: { clientId: env.clientId },
    ...preset,
    ...BASE_CONFIG,
  };
  // Re-apply Firestore overlay so per-client config survives language switches
  if (_tenantOverride) {
    siteConfig = mergeDeep(siteConfig as Record<string, unknown>, _tenantOverride as DeepPartial<Record<string, unknown>>) as SiteConfig;
  }
  _applyBusinessMode();
  _applyNicheFeatures();
  _applyVisibleServicesFilter();
}

/**
 * Swap the site preset to a different niche at runtime.
 * Used by the dev-only wizard-refs preview route to render each niche's
 * sections without rebuilding the app. Tenant overrides are intentionally
 * NOT preserved — niche switch implies a clean preset baseline.
 */
export function switchSiteToNiche(niche: BusinessNiche, lang?: UiLanguage): void {
  const targetLang = lang ?? env.uiLanguage;
  const preset = PRESETS[niche]?.[targetLang] ?? PRESETS[niche]?.en;
  if (!preset) return;
  _tenantOverride = null;
  siteConfig = {
    tenant: { clientId: env.clientId },
    ...preset,
    ...BASE_CONFIG,
  };
  _applyBusinessMode();
  _applyNicheFeatures();
  _applyVisibleServicesFilter();
}

// ─── Per-Client Service Customization ────────────────────────────────────────
// Two Firestore mechanisms, applied in order:
//   1. `visibleServices` — filter which services to show (by ID, in order)
//   2. `serviceOverrides` — patch individual fields (name, price, image, etc.)
function _applyVisibleServicesFilter(): void {
  // ── Step 1: Filter by visibleServices ──
  const ids = siteConfig.visibleServices;
  if (ids && ids.length > 0) {
    const allServices = siteConfig.services;
    const allImages = siteConfig.sections?.services?.images ?? [];

    const filtered: typeof allServices = [];
    const filteredImages: string[] = [];

    for (const id of ids) {
      const idx = allServices.findIndex((s) => s.id === id);
      if (idx === -1) continue;
      filtered.push(allServices[idx]);
      filteredImages.push(allImages[idx] ?? "");
    }

    if (filtered.length > 0) {
      siteConfig.services = filtered;
      if (siteConfig.sections?.services) {
        siteConfig.sections.services.images = filteredImages;
      }
    }
  }

  // ── Step 2: Apply per-service overrides ──
  const overrides = siteConfig.serviceOverrides;
  if (!overrides) return;

  const images = siteConfig.sections?.services?.images;

  siteConfig.services = siteConfig.services.map((service, i) => {
    const patch = overrides[service.id];
    if (!patch) return service;

    // Override image in the parallel images array
    if (patch.image && images && i < images.length) {
      images[i] = patch.image;
    }

    // Override service fields (name, price, description, duration)
    const { image: _img, ...serviceFields } = patch;
    return { ...service, ...serviceFields };
  });
}
