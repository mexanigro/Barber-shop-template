import { localeConfig } from "../config/locale";
import type { BusinessHours } from "../types";

/**
 * Shared display helpers for business hours. Every section that renders the
 * weekly schedule (contact hubs, footers, booking widgets) must use these so
 * day order and time format follow the active language instead of the US
 * defaults that used to be copy-pasted per component.
 */

const SUNDAY_FIRST: (keyof BusinessHours)[] = [
  "sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday",
];

/** Los negocios están en Israel: la semana empieza el domingo en los 4 idiomas (revisión de idiomas, 2026-10-09; antes en/ru
 *  empezaban el lunes). */
export function orderedDayKeys(): (keyof BusinessHours)[] {
  return SUNDAY_FIRST;
}

/** "18:30" → "6:30 PM" and "19:00" → "7:00 PM" in English (siempre con minutos), 24h "18:30" everywhere else. */
export function fmtTime(time: string): string {
  if (localeConfig.lang !== "en") return time;
  const [hStr, mStr] = time.split(":");
  const h = parseInt(hStr, 10);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${mStr} ${period}`;
}

/**
 * Full "open – close" range. Returned as a single string; render it inside an
 * element with `dir="ltr"` so the start/end order survives RTL bidi.
 */
export function fmtRange(day: { start: string; end: string }): string {
  return `${fmtTime(day.start)} – ${fmtTime(day.end)}`;
}
