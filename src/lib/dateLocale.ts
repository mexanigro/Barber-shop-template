import { enUS, he as heLocale } from "date-fns/locale";
import { localeConfig } from "../config/locale";

export function getDateFnsLocale() {
  return localeConfig.lang === "he" ? heLocale : enUS;
}
