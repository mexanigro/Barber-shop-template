// ─── Booking validation + daily-manifest math (shared) ──────────────────────
//
// Single source of truth for server-side booking validation, consumed by BOTH
// Express runtimes: server.ts (/api/book) and api/index.ts
// (/api/bookings/validate). The daily_manifests interval math and the
// conflict-checked booking transaction live here so a fix to the overlap rule
// or the duration cap lands in both runtimes at once.
//
// Data access is injected: callers pass the firebase-admin db + FieldValue
// (same pattern as src/lib/ai/admin-tools.ts executors).

export const BOOKING_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const BOOKING_TIME_RE = /^\d{2}:\d{2}$/;

// Cap de duración: entre 5 y 480 minutos (evita manifests absurdos que
// bloquean el día entero o duraciones negativas/no enteras).
export const BOOKING_MIN_DURATION_MINUTES = 5;
export const BOOKING_MAX_DURATION_MINUTES = 480;

// Buffer added after every appointment before the next slot can start.
export const BOOKING_BUFFER_MINUTES = 10;
export const CHECKOUT_AMOUNT_MIN_CENTS = 50;
export const CHECKOUT_AMOUNT_MAX_CENTS = 2_000_000;

export function isValidBookingDate(date: string): boolean {
  return BOOKING_DATE_RE.test(date);
}

export function isValidBookingTime(time: string): boolean {
  return BOOKING_TIME_RE.test(time);
}

export function isValidBookingDuration(duration: unknown): duration is number {
  return (
    typeof duration === "number" &&
    Number.isInteger(duration) &&
    duration >= BOOKING_MIN_DURATION_MINUTES &&
    duration <= BOOKING_MAX_DURATION_MINUTES
  );
}

export type ManifestInterval = { start: string; end: string };

export type ManifestWindow = {
  startMinutes: number;
  endMinutes: number;
  /** "HH:mm" end of the appointment including the buffer. */
  endTime: string;
};

/** Computes the occupied window (start..end+buffer) for a booking. */
export function computeManifestWindow(
  time: string,
  duration: number,
  bufferMinutes: number = BOOKING_BUFFER_MINUTES,
): ManifestWindow {
  const [hours, minutes] = time.split(":").map(Number);
  const startMinutes = hours * 60 + minutes;
  const endMinutes = startMinutes + duration + bufferMinutes;
  const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`;
  return { startMinutes, endMinutes, endTime };
}

/** True if [startMinutes, endMinutes) overlaps any existing interval. */
export function hasManifestConflict(
  intervals: readonly ManifestInterval[],
  startMinutes: number,
  endMinutes: number,
): boolean {
  return intervals.some((inv) => {
    const [ih, im] = inv.start.split(":").map(Number);
    const [eh, em] = inv.end.split(":").map(Number);
    const invStart = ih * 60 + im;
    const invEnd = eh * 60 + em;
    return startMinutes < invEnd && endMinutes > invStart;
  });
}

export class BookingConflictError extends Error {
  constructor(message = "This time slot is no longer available.") {
    super(message);
    this.name = "BookingConflictError";
  }
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function numberFromUnknown(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeCents(value: unknown): number | null {
  const amount = numberFromUnknown(value);
  if (amount === null || !Number.isInteger(amount)) return null;
  if (amount < CHECKOUT_AMOUNT_MIN_CENTS || amount > CHECKOUT_AMOUNT_MAX_CENTS) return null;
  return amount;
}

function priceMajorUnitsToCents(value: unknown): number | null {
  const price = numberFromUnknown(value);
  if (price === null || price < 0) return null;
  const cents = Math.round(price * 100);
  if (cents === 0) return 0;
  if (cents < CHECKOUT_AMOUNT_MIN_CENTS || cents > CHECKOUT_AMOUNT_MAX_CENTS) return null;
  return cents;
}

export type TrustedBookingService = {
  id: string;
  name: string;
  duration: number;
  priceCents: number;
};

export function resolveTrustedBookingService(
  services: unknown,
  serviceId: string,
): TrustedBookingService | null {
  if (!Array.isArray(services)) return null;
  const service = services.find((entry): entry is UnknownRecord =>
    isRecord(entry) && entry.id === serviceId,
  );
  if (!service) return null;

  const duration = numberFromUnknown(service.duration);
  if (!isValidBookingDuration(duration)) return null;

  const priceCents = priceMajorUnitsToCents(service.price);
  if (priceCents === null) return null;

  const name = typeof service.name === "string" && service.name.trim()
    ? service.name.trim().slice(0, 160)
    : serviceId;

  return { id: serviceId, name, duration, priceCents };
}

export function resolveTrustedStaffName(staff: unknown, staffId: string): string | undefined {
  if (!Array.isArray(staff)) return undefined;
  const member = staff.find((entry): entry is UnknownRecord =>
    isRecord(entry) && entry.id === staffId,
  );
  const name = member && typeof member.name === "string" ? member.name.trim() : "";
  return name ? name.slice(0, 120) : undefined;
}

export function resolveCheckoutAmountCents(
  paymentConfig: unknown,
  servicePriceCents: number,
): number | undefined {
  if (!isRecord(paymentConfig) || paymentConfig.enabled !== true) return undefined;
  const mode = typeof paymentConfig.mode === "string" ? paymentConfig.mode : "none";
  if (mode === "deposit") {
    return normalizeCents(paymentConfig.depositAmount ?? 2000) ?? undefined;
  }
  if (mode === "full") {
    return normalizeCents(servicePriceCents) ?? undefined;
  }
  return undefined;
}

export function resolveStoredCheckoutAmountCents(
  appointmentData: Record<string, unknown>,
  mode: "deposit" | "full",
): number | null {
  const checkoutAmountCents = normalizeCents(appointmentData.checkoutAmountCents);
  if (checkoutAmountCents !== null) return checkoutAmountCents;
  if (mode === "deposit") return null;

  const priceCents = normalizeCents(appointmentData.priceCents);
  if (priceCents !== null) return priceCents;
  const legacyPriceCents = priceMajorUnitsToCents(appointmentData.price);
  return legacyPriceCents && legacyPriceCents > 0 ? legacyPriceCents : null;
}

// firebase-admin db/FieldValue injected by the runtime (same convention as
// src/lib/ai/admin-tools.ts).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminDb = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminFieldValue = any;

export type CreateBookingParams = {
  db: AdminDb;
  FieldValue: AdminFieldValue;
  clientId: string;
  staffId: string;
  date: string;
  time: string;
  duration: number;
  /**
   * Extra fields persisted on the appointment doc alongside the manifest
   * bookkeeping (customer data, status, serviceId, paymentStatus, ...).
   */
  appointmentFields: Record<string, unknown>;
  bufferMinutes?: number;
};

/**
 * Creates an appointment inside a daily_manifests transaction: re-reads the
 * manifest, rejects on interval overlap (BookingConflictError), then writes
 * the appointment + the updated interval list atomically.
 * Manifest doc id = `${clientId}_${staffId}_${date}` (flat collection).
 */
export async function createBookingWithManifest(params: CreateBookingParams): Promise<string> {
  const { db, FieldValue, clientId, staffId, date, time, duration, appointmentFields } = params;
  const manifestId = `${clientId}_${staffId}_${date}`;
  const manifestRef = db.collection("daily_manifests").doc(manifestId);
  const { startMinutes, endMinutes, endTime } = computeManifestWindow(
    time,
    duration,
    params.bufferMinutes ?? BOOKING_BUFFER_MINUTES,
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const appointmentId: string = await db.runTransaction(async (tx: any) => {
    const manifestSnap = await tx.get(manifestRef);
    const intervals: ManifestInterval[] = manifestSnap.exists
      ? (manifestSnap.data()?.intervals ?? [])
      : [];

    if (hasManifestConflict(intervals, startMinutes, endMinutes)) {
      throw new BookingConflictError();
    }

    const apptRef = db.collection("appointments").doc();
    tx.set(apptRef, {
      clientId,
      staffId,
      date,
      time,
      duration,
      manifestEnd: endTime,
      createdAt: FieldValue.serverTimestamp(),
      ...appointmentFields,
    });

    tx.set(manifestRef, {
      clientId,
      intervals: [...intervals, { start: time, end: endTime }],
    });

    return apptRef.id;
  });

  return appointmentId;
}
