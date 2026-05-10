import { env } from "./env";
import { TOUR_TRANSLATIONS, type TourLanguage, type TourTranslations } from "./tour.translations";

export const TOUR_CONFIG = {
  isDemoMode: true,
  showTourButton: true,
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
