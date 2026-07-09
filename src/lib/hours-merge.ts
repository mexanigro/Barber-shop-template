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
export type BusinessHourSlot = { start: string; end: string };
export type WeeklyHours = Record<WeekDayKey, BusinessHourSlot | null>;
export type PartialWeeklyHours = Partial<Record<WeekDayKey, BusinessHourSlot | null | undefined>>;

function isHourSlot(value: unknown): value is BusinessHourSlot {
  return (
    !!value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    typeof (value as BusinessHourSlot).start === "string" &&
    (value as BusinessHourSlot).start.length > 0 &&
    typeof (value as BusinessHourSlot).end === "string" &&
    (value as BusinessHourSlot).end.length > 0
  );
}

export function mergeTenantWeeklyHours(
  current: PartialWeeklyHours | undefined,
  override: PartialWeeklyHours,
): WeeklyHours {
  const merged = {} as WeeklyHours;
  for (const day of WEEK_DAY_KEYS) {
    if (Object.prototype.hasOwnProperty.call(override, day)) {
      const incoming = override[day];
      merged[day] = isHourSlot(incoming) ? { start: incoming.start, end: incoming.end } : null;
      continue;
    }

    const existing = current?.[day];
    merged[day] = isHourSlot(existing) ? { start: existing.start, end: existing.end } : null;
  }
  return merged;
}
