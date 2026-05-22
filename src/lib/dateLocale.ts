import { enUS, he as heLocale, arSA as arLocale } from "date-fns/locale";
import { localeConfig } from "../config/locale";

export function getDateFnsLocale() {
  if (localeConfig.lang === "he") return heLocale;
  if (localeConfig.lang === "ar") return arLocale;
  return enUS;
}
