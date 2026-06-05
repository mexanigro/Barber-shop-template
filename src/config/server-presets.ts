import type { BusinessNiche, Service } from "../types";
import type { UiLanguage } from "./uiLanguage";
import { barberiaPresetAr } from "./presets/barberia.ar";
import { barberiaPresetEn } from "./presets/barberia.en";
import { barberiaPresetHe } from "./presets/barberia.he";
import { barberiaPresetRu } from "./presets/barberia.ru";
import { cafeteriaPresetAr } from "./presets/cafeteria.ar";
import { cafeteriaPresetEn } from "./presets/cafeteria.en";
import { cafeteriaPresetHe } from "./presets/cafeteria.he";
import { cafeteriaPresetRu } from "./presets/cafeteria.ru";
import { esteticaPresetAr } from "./presets/estetica.ar";
import { esteticaPresetEn } from "./presets/estetica.en";
import { esteticaPresetHe } from "./presets/estetica.he";
import { esteticaPresetRu } from "./presets/estetica.ru";
import { nailsPresetAr } from "./presets/nails.ar";
import { nailsPresetEn } from "./presets/nails.en";
import { nailsPresetHe } from "./presets/nails.he";
import { nailsPresetRu } from "./presets/nails.ru";
import { remodelacionesPresetAr } from "./presets/remodelaciones.ar";
import { remodelacionesPresetEn } from "./presets/remodelaciones.en";
import { remodelacionesPresetHe } from "./presets/remodelaciones.he";
import { remodelacionesPresetRu } from "./presets/remodelaciones.ru";
import { tattooPresetAr } from "./presets/tattoo.ar";
import { tattooPresetEn } from "./presets/tattoo.en";
import { tattooPresetHe } from "./presets/tattoo.he";
import { tattooPresetRu } from "./presets/tattoo.ru";

const PRESET_SERVICES: Record<BusinessNiche, Record<UiLanguage, Service[]>> = {
  barberia: {
    ar: barberiaPresetAr.services,
    en: barberiaPresetEn.services,
    he: barberiaPresetHe.services,
    ru: barberiaPresetRu.services,
  },
  cafeteria: {
    ar: cafeteriaPresetAr.services,
    en: cafeteriaPresetEn.services,
    he: cafeteriaPresetHe.services,
    ru: cafeteriaPresetRu.services,
  },
  estetica: {
    ar: esteticaPresetAr.services,
    en: esteticaPresetEn.services,
    he: esteticaPresetHe.services,
    ru: esteticaPresetRu.services,
  },
  nails: {
    ar: nailsPresetAr.services,
    en: nailsPresetEn.services,
    he: nailsPresetHe.services,
    ru: nailsPresetRu.services,
  },
  remodelaciones: {
    ar: remodelacionesPresetAr.services,
    en: remodelacionesPresetEn.services,
    he: remodelacionesPresetHe.services,
    ru: remodelacionesPresetRu.services,
  },
  tattoo: {
    ar: tattooPresetAr.services,
    en: tattooPresetEn.services,
    he: tattooPresetHe.services,
    ru: tattooPresetRu.services,
  },
};

const NICHES = new Set<BusinessNiche>(["barberia", "cafeteria", "estetica", "nails", "remodelaciones", "tattoo"]);
const LANGS = new Set<UiLanguage>(["ar", "en", "he", "ru"]);

export function getPresetServicesForRuntime(nicheRaw?: string, langRaw?: string): Service[] {
  const niche = NICHES.has(nicheRaw as BusinessNiche) ? (nicheRaw as BusinessNiche) : "barberia";
  const lang = LANGS.has(langRaw as UiLanguage) ? (langRaw as UiLanguage) : "en";
  return PRESET_SERVICES[niche][lang] ?? PRESET_SERVICES[niche].en;
}
