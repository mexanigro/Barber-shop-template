// N06 T4 · Lógica pura del wizard de reserva: disponibilidad por intervalos del manifiesto y
// clasificación del fallo al enviar. Sin imports con efectos: se prueba en node y se muta.
import { hasManifestConflict, type ManifestInterval } from "./api/booking-validation";

/** Un hueco se ofrece sólo si [inicio, inicio + duración + buffer) no solapa ningún intervalo ocupado. */
export function slotIsFree(
  startMinutes: number,
  durationMinutes: number,
  bufferMinutes: number,
  occupied: readonly ManifestInterval[],
): boolean {
  return !hasManifestConflict(occupied, startMinutes, startMinutes + durationMinutes + bufferMinutes);
}

export type BookingFailure = { phase: "book"; status: number | null } | { phase: "checkout" };

export type BookingFailureOutcome = {
  /** Paso al que vuelve el wizard. */
  step: "datetime" | "details" | "payment";
  /** Clave de `localeConfig.booking` con el aviso; null cuando el paso ya explica el estado. */
  messageKey: "slotTaken" | "bookingFailed" | null;
  /** Volver a leer el manifiesto (el hueco cambió debajo del visitante). */
  reloadSlots: boolean;
};

/**
 * 409 → el hueco ya no está: paso de horario, aviso, recarga. Cualquier otro fallo de /api/book
 * (400, 503, red) → aviso de error en el paso de datos, sin «reserva guardada». Sólo el fallo del
 * checkout —la cita ya existe— puede ir al paso de pago con «Wait-list Reserved».
 */
export function resolveBookingFailure(failure: BookingFailure): BookingFailureOutcome {
  if (failure.phase === "checkout") return { step: "payment", messageKey: null, reloadSlots: false };
  if (failure.status === 409) return { step: "datetime", messageKey: "slotTaken", reloadSlots: true };
  return { step: "details", messageKey: "bookingFailed", reloadSlots: false };
}
