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

const MONDAY_FIRST: (keyof BusinessHours)[] = [
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
];

/** Israel (he/ar) starts the week on Sunday; en/ru keep Monday-first. */
export function orderedDayKeys(): (keyof BusinessHours)[] {
  return localeConfig.lang === "he" || localeConfig.lang === "ar"
    ? SUNDAY_FIRST
    : MONDAY_FIRST;
}

/** "18:30" → "6:30 PM" in English, 24h "18:30" everywhere else. */
export function fmtTime(time: string): string {
  if (localeConfig.lang !== "en") return time;
  const [hStr, mStr] = time.split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12} ${period}` : `${h12}:${mStr} ${period}`;
}

/**
 * Full "open – close" range. Returned as a single string; render it inside an
 * element with `dir="ltr"` so the start/end order survives RTL bidi.
 */
export function fmtRange(day: { start: string; end: string }): string {
  return `${fmtTime(day.start)} – ${fmtTime(day.end)}`;
}
