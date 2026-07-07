export const WEEK_DAY_KEYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

export type WeekDayKey = (typeof WEEK_DAY_KEYS)[number];
export type DayHours = { start: string; end: string };
export type WeeklyHours = Record<WeekDayKey, DayHours | null>;
export type HoursOverride = Partial<Record<WeekDayKey, DayHours | null>>;

function isDayHours(value: unknown): value is DayHours {
  return (
    !!value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    typeof (value as DayHours).start === "string" &&
    (value as DayHours).start.trim() !== "" &&
    typeof (value as DayHours).end === "string" &&
    (value as DayHours).end.trim() !== ""
  );
}

export function mergeWeeklyHours(base: WeeklyHours, override: unknown): WeeklyHours {
  if (!override || typeof override !== "object" || Array.isArray(override)) return base;

  const source = override as Record<string, unknown>;
  const merged: WeeklyHours = { ...base };

  for (const day of WEEK_DAY_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(source, day)) continue;
    const value = source[day];
    merged[day] = isDayHours(value) ? { start: value.start, end: value.end } : null;
  }

  return merged;
}
