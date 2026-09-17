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
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time) ||
      !Number.isInteger(duration) || duration <= 0 ||
      !Number.isInteger(bufferMinutes) || bufferMinutes < 0 ||
      !Number.isInteger(endMinutes) || endMinutes > 1440 || endMinutes <= startMinutes) {
    throw new BookingConflictError("occupancy_unverifiable");
  }
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

// ─── N06 T3 · cancelar libera UNA ocurrencia; mover libera el viejo y reclama el nuevo ─────────
//
// Lógica compartida por los dos escritores de la agenda: el PATCH Admin
// (crm-appointments-handler.ts) y el SDK web (services/db.ts#updateAppointment).
// Cada uno aporta sus "puertos" de transacción; el cuerpo es el mismo.

export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function minutesToTime(total: number): string {
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** Quita EXACTAMENTE una ocurrencia de (start, end); con sobrecupo las demás copias siguen ocupadas. */
export function removeOneInterval(
  intervals: readonly ManifestInterval[],
  start: string,
  end: string,
): { intervals: ManifestInterval[]; removed: boolean } {
  const index = intervals.findIndex((interval) => interval.start === start && interval.end === end);
  if (index < 0) return { intervals: [...intervals], removed: false };
  return { intervals: [...intervals.slice(0, index), ...intervals.slice(index + 1)], removed: true };
}

/** Nuevo fin = nuevo inicio + (manifestEnd − time): el intervalo conserva su longitud, no se recalcula. */
export function shiftInterval(time: string, manifestEnd: string, newTime: string): string {
  const total = timeToMinutes(newTime) + (timeToMinutes(manifestEnd) - timeToMinutes(time));
  if (!Number.isInteger(total) || total > 1440 || total <= timeToMinutes(newTime)) {
    throw new BookingConflictError("occupancy_unverifiable");
  }
  return total === 1440 ? "24:00" : minutesToTime(total);
}

export type AppointmentPatch = { status: string } | { date: string; time: string };

export type ManifestSnapshot = { exists: boolean; data: Record<string, unknown> | undefined };

/** Puertos que cada SDK adapta: lecturas antes de escrituras, como exige Firestore. */
export type AppointmentPatchPorts = {
  clientId: string;
  appointmentRef: unknown;
  manifestRef: (staffId: string, date: string) => unknown;
  read: (ref: unknown) => Promise<ManifestSnapshot>;
  update: (ref: unknown, data: Record<string, unknown>) => void;
  set: (ref: unknown, data: Record<string, unknown>) => void;
  /** Campos extra para la cita (p. ej. saneo de importadas en el SDK web). */
  decorate?: (before: Record<string, unknown>, fields: Record<string, unknown>) => Record<string, unknown>;
};

/** Intervalo persistido interpretable; nunca reconstruye duración ni buffer desde configuración. */
function requireHistoricalInterval(before: Record<string, unknown>): void {
  const { date, time, manifestEnd } = before;
  if (typeof date !== "string" || !isValidBookingDate(date) ||
      typeof time !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time) ||
      typeof manifestEnd !== "string" || !/^(([01]\d|2[0-3]):[0-5]\d|24:00)$/.test(manifestEnd) ||
      timeToMinutes(manifestEnd) <= timeToMinutes(time)) {
    throw new BookingConflictError("occupancy_unverifiable");
  }
}

/** Un manifiesto malformado no equivale a disponibilidad vacía. */
function manifestIntervals(snapshot: ManifestSnapshot, clientId: string): ManifestInterval[] {
  if (!snapshot.exists) return [];
  const intervals = snapshot.data?.intervals;
  if (snapshot.data?.clientId !== clientId || !Array.isArray(intervals)) {
    throw new BookingConflictError("occupancy_unverifiable");
  }
  for (const interval of intervals) {
    if (!interval || typeof interval !== "object") throw new BookingConflictError("occupancy_unverifiable");
    requireHistoricalInterval({ date: "2000-01-01", time: interval.start, manifestEnd: interval.end });
  }
  return intervals;
}

/** Cancelar, mover y reabrir conservan cita/ocupación en una transacción. G3.5 sin rastreo se mantiene. */
export async function applyAppointmentPatchInTransaction(
  ports: AppointmentPatchPorts,
  patch: AppointmentPatch,
): Promise<"not-found" | "ok"> {
  const appointment = await ports.read(ports.appointmentRef);
  const before = appointment.data;
  if (!appointment.exists || !before || before.clientId !== ports.clientId) return "not-found";
  const staffId = typeof before.staffId === "string" ? before.staffId : typeof before.barberId === "string" ? before.barberId : "";
  const hasHistory = staffId !== "" && before.manifestEnd !== undefined;
  const write = (fields: Record<string, unknown>) =>
    ports.update(ports.appointmentRef, ports.decorate ? ports.decorate(before, fields) : fields);
  const writeManifest = (ref: unknown, snapshot: ManifestSnapshot, intervals: ManifestInterval[]) =>
    snapshot.exists ? ports.update(ref, { intervals }) : ports.set(ref, { clientId: ports.clientId, intervals });

  if ("status" in patch) {
    if (patch.status === before.status) return "ok";
    const reopening = before.status === "cancelled" && (patch.status === "confirmed" || patch.status === "pending");
    const releasing = before.status !== "cancelled" && patch.status === "cancelled";
    if (hasHistory && (reopening || releasing)) {
      requireHistoricalInterval(before);
      const ref = ports.manifestRef(staffId, before.date as string);
      const manifest = await ports.read(ref);
      const intervals = manifestIntervals(manifest, ports.clientId);
      if (reopening) {
        if (hasManifestConflict(intervals, timeToMinutes(before.time as string), timeToMinutes(before.manifestEnd as string))) {
          throw new BookingConflictError();
        }
        writeManifest(ref, manifest, [...intervals, { start: before.time as string, end: before.manifestEnd as string }]);
      } else {
        const released = removeOneInterval(intervals, before.time as string, before.manifestEnd as string);
        if (!released.removed) throw new BookingConflictError("occupancy_unverifiable");
        ports.update(ref, { intervals: released.intervals });
      }
    }
    write({ status: patch.status });
    return "ok";
  }

  if (!hasHistory) {
    write({ date: patch.date, time: patch.time });
    return "ok";
  }
  requireHistoricalInterval(before);
  requireHistoricalInterval({ date: patch.date, time: patch.time, manifestEnd: "24:00" });
  if (patch.date === before.date && patch.time === before.time) return "ok";
  const time = before.time as string;
  const manifestEnd = before.manifestEnd as string;
  const newEnd = shiftInterval(time, manifestEnd, patch.time);
  if (before.status === "cancelled") {
    write({ date: patch.date, time: patch.time, manifestEnd: newEnd });
    return "ok";
  }
  const sameDay = patch.date === before.date;
  const oldRef = ports.manifestRef(staffId, before.date as string);
  const newRef = sameDay ? oldRef : ports.manifestRef(staffId, patch.date);
  const oldSnapshot = await ports.read(oldRef);
  const newSnapshot = sameDay ? oldSnapshot : await ports.read(newRef);
  const released = removeOneInterval(manifestIntervals(oldSnapshot, ports.clientId), time, manifestEnd);
  if (!released.removed) throw new BookingConflictError("occupancy_unverifiable");
  const destination = sameDay ? released.intervals : manifestIntervals(newSnapshot, ports.clientId);
  if (hasManifestConflict(destination, timeToMinutes(patch.time), timeToMinutes(newEnd))) {
    throw new BookingConflictError();
  }
  const claimed = [...destination, { start: patch.time, end: newEnd }];
  if (sameDay) {
    writeManifest(oldRef, oldSnapshot, claimed);
  } else {
    ports.update(oldRef, { intervals: released.intervals });
    writeManifest(newRef, newSnapshot, claimed);
  }
  write({ date: patch.date, time: patch.time, manifestEnd: newEnd });
  return "ok";
}
