import { enUS, he as heLocale, arSA as arLocale, ru as ruLocale } from "date-fns/locale";
import { localeConfig } from "../config/locale";

export function getDateFnsLocale() {
  if (localeConfig.lang === "he") return heLocale;
  if (localeConfig.lang === "ar") return arLocale;
  if (localeConfig.lang === "ru") return ruLocale;
  return enUS;
}

/** Encabezado del mes del calendario: `LLLL` es el mes suelto (ru «октябрь 2026», no el genitivo «октября»); en he, ar y en da lo mismo que `MMMM`. */
export const MES_DEL_CALENDARIO = "LLLL yyyy";

// Ruso: el día va antes del mes («8 окт. 2026», «четверг, 8 октября»); con el patrón inglés salía «четверг, октября 8-е».
const PATRONES_RU: Record<string, string> = { "MMM d, yyyy": "d MMM yyyy", "MMM d": "d MMM", "EEEE, MMMM do": "EEEE, d MMMM" };

/** El patrón de fecha de la reserva en el idioma de la página; fuera del ruso, el mismo que recibe. */
export function datePattern(patron: string): string {
  return localeConfig.lang === "ru" ? PATRONES_RU[patron] ?? patron : patron;
}
