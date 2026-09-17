import { BookingConflictError, computeManifestWindow, hasManifestConflict, isValidBookingDuration, type ManifestInterval } from './booking-validation.js';

/** Error público sin documentos ni datos privados en el mensaje. */
export class AvailabilityError extends Error {
  constructor(readonly status: number, readonly code: string) { super(code); }
}

type RecordValue = Record<string, unknown>;
const record = (value: unknown): value is RecordValue => value !== null && typeof value === 'object' && !Array.isArray(value);
const unavailable = (): never => { throw new AvailabilityError(503, 'availability_unverifiable'); };

export function validAvailabilityDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T00:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function validAvailabilityId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 120 && !/[\/\\]/.test(value);
}

function minutes(value: unknown, end = false): number {
  if (typeof value !== 'string' || !(end ? /^(?:[01]\d|2[0-3]):[0-5]\d$|^24:00$/ : /^(?:[01]\d|2[0-3]):[0-5]\d$/).test(value)) return unavailable();
  const [hours, mins] = value.split(':').map(Number);
  return hours * 60 + mins;
}

function interval(value: unknown): { start: number; end: number } {
  if (!record(value)) return unavailable();
  const start = minutes(value.start), end = minutes(value.end, true);
  if (end <= start) return unavailable();
  return { start, end };
}

function unique(list: unknown, id: string, code: string): RecordValue {
  if (!Array.isArray(list)) return unavailable();
  const found = list.filter(x => record(x) && x.id === id);
  if (found.length === 0) throw new AvailabilityError(400, code);
  if (found.length !== 1) return unavailable();
  return found[0] as RecordValue;
}

/** Parámetros de la intención: un retry no cambia precio, duración, estado o buffer. */
export function bookingPolicy(config: RecordValue): string {
  return JSON.stringify([config.services, config.serviceOverrides, config.visibleServices, config.payment, config.businessRules]);
}

export type EffectiveAvailability = {
  duration: number; buffer: number; open: boolean; start: number; end: number;
  breaks: { start: number; end: number }[]; blocks: { start: number; end: number }[];
};

/** Composición existente: el override sustituye cada campo; la excepción diaria cambia sólo las horas. */
export function resolveAvailability(config: RecordValue, override: unknown, tenant: string, staffId: string, serviceId: string, date: string): EffectiveAvailability {
  if (!validAvailabilityDate(date)) throw new AvailabilityError(400, 'invalid_availability_date');
  if (config.clientId !== undefined && config.clientId !== tenant) throw new AvailabilityError(403, 'tenant_mismatch');
  const staff = unique(config.staff, staffId, 'unknown_staff');
  const service = unique(config.services, serviceId, 'unknown_service');
  if (Array.isArray(config.visibleServices) && !config.visibleServices.includes(serviceId)) throw new AvailabilityError(400, 'unknown_service');
  if (!isValidBookingDuration(service.duration)) return unavailable();
  if (override !== undefined && (!record(override) || override.clientId !== tenant || (override.staffId !== undefined && override.staffId !== staffId))) return unavailable();
  const patch = (override ?? {}) as RecordValue;
  const effective = (name: string): unknown => Object.prototype.hasOwnProperty.call(patch, name) ? patch[name] : staff[name];
  const schedule = effective('schedule');
  if (!record(schedule)) return unavailable();
  const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][new Date(date + 'T00:00:00Z').getUTCDay()];
  const day = schedule[dayName];
  if (!record(day) || typeof day.isOpen !== 'boolean' || !Array.isArray(day.breaks)) return unavailable();
  const baseHours = interval(day.hours), breaks = day.breaks.map(interval);
  const dates = effective('blockedDates') ?? [];
  const slots = effective('blockedSlots') ?? [];
  const exceptions = effective('dateOverrides') ?? {};
  // null presente es fuente malformada; ausencia de un campo opcional sí tiene significado vacío.
  for (const name of ['blockedDates', 'blockedSlots', 'dateOverrides']) if (effective(name) === null) return unavailable();
  if (!Array.isArray(dates) || !dates.every(x => typeof x === 'string' && validAvailabilityDate(x)) || !Array.isArray(slots) || !record(exceptions)) return unavailable();
  const blocks = slots.map(x => { if (!record(x) || typeof x.date !== 'string' || !validAvailabilityDate(x.date)) return unavailable(); return { date: x.date, ...interval(x) }; }).filter(x => x.date === date);
  const exception = exceptions[date];
  let hours = baseHours, open = day.isOpen;
  if (exception !== undefined) {
    if (!record(exception)) return unavailable();
    if (exception.type === 'dayOff') open = false;
    else if (exception.type === 'customHours') { hours = interval(exception); open = true; }
    else return unavailable();
  }
  if (dates.includes(date)) open = false;
  const rules = config.businessRules;
  if (rules !== undefined && !record(rules)) return unavailable();
  const rawBuffer = record(rules) ? rules.bufferMinutes : undefined;
  if (rawBuffer !== undefined && (typeof rawBuffer !== 'number' || !Number.isFinite(rawBuffer))) return unavailable();
  const buffer = rawBuffer === undefined ? 10 : Math.min(120, Math.max(0, Math.round(rawBuffer as number)));
  return { duration: service.duration, buffer, open, ...hours, breaks, blocks };
}

/** Horario sin política nueva de grilla; el buffer ocupa agenda, no extiende la atención. */
export function permitsTime(source: EffectiveAvailability, time: string): boolean {
  let start: number;
  try { start = minutes(time); computeManifestWindow(time, source.duration, source.buffer); }
  catch (error) { if (error instanceof AvailabilityError || error instanceof BookingConflictError) return false; throw error; }
  const end = start + source.duration;
  return source.open && start >= source.start && end <= source.end &&
    ![...source.breaks, ...source.blocks].some(x => start < x.end && end > x.start);
}

/** El manifiesto anómalo no se convierte en disponibilidad libre. */
export function availabilityIntervals(data: unknown, tenant: string): ManifestInterval[] {
  if (data === undefined) return [];
  if (!record(data) || data.clientId !== tenant || !Array.isArray(data.intervals)) return unavailable();
  return data.intervals.map(value => { interval(value); return { start: (value as RecordValue).start as string, end: (value as RecordValue).end as string }; });
}

export function publicSlots(source: EffectiveAvailability, occupied: readonly ManifestInterval[]): string[] {
  const slots: string[] = [];
  for (let start = source.start; start < source.end; start += 15) {
    const time = `${String(Math.floor(start / 60)).padStart(2, '0')}:${String(start % 60).padStart(2, '0')}`;
    if (permitsTime(source, time) && !hasManifestConflict(occupied, start, start + source.duration + source.buffer)) slots.push(time);
  }
  return slots;
}
