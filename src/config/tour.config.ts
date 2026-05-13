import { env } from "./env";
import { TOUR_TRANSLATIONS, type TourLanguage, type TourTranslations } from "./tour.translations";

const resolveIsDemoMode = (): boolean => {
  const raw = ((import.meta.env.VITE_DEMO_MODE as string | undefined) ?? "").trim().toLowerCase();
  // Default true for backwards compatibility; set VITE_DEMO_MODE=false to disable
  return raw !== "false" && raw !== "0";
};

export const TOUR_CONFIG = {
  isDemoMode: resolveIsDemoMode(),
  showTourButton: resolveIsDemoMode(),
} as const;

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
