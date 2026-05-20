import { env } from "./env";
import { TOUR_TRANSLATIONS, type TourLanguage, type TourTranslations } from "./tour.translations";

const resolveIsDemoMode = (): boolean => {
  const raw = ((import.meta.env.VITE_DEMO_MODE as string | undefined) ?? "").trim().toLowerCase();
  // Default FALSE for security — demo mode bypasses auth.
  // Set VITE_DEMO_MODE=true explicitly only for demo/preview deployments.
  return raw === "true" || raw === "1";
};

export const TOUR_CONFIG = {
  isDemoMode: resolveIsDemoMode(),
  showTourButton: resolveIsDemoMode(),
} as const;

// Guard: make it very obvious in console if demo mode leaks to production.
if (TOUR_CONFIG.isDemoMode && typeof window !== "undefined") {
  const host = window.location.hostname;
  if (host !== "localhost" && host !== "127.0.0.1") {
    console.error(
      "[CRITICAL] VITE_DEMO_MODE=true on production hostname:",
      host,
      "— Auth is BYPASSED, admin shows fake data. Fix immediately.",
    );
  }
}

function resolveTourLanguage(): TourLanguage {
  const lang = env.uiLanguage;
  if (lang in TOUR_TRANSLATIONS) return lang as TourLanguage;
  return "en";
}

export function getTourTranslations(): TourTranslations {
  return TOUR_TRANSLATIONS[resolveTourLanguage()];
}

export function getTourLanguage(): TourLanguage {
  return resolveTourLanguage();
}
