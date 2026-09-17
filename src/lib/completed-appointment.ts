import { format, isValid, parse } from "date-fns";

/** Misma hora local del navegador que usa la agenda actual; no impone otra zona. */
export function isCompletedTimeValid(date: string, time: string, now = new Date()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return false;
  const value = date + " " + time;
  const instant = parse(value, "yyyy-MM-dd HH:mm", now);
  if (!isValid(instant) || format(instant, "yyyy-MM-dd HH:mm") !== value) return false;
  // Un retroceso del reloj puede representar dos instantes con la misma hora.
  // El formulario actual no permite elegir el offset: no adivinar cuál ocurrió.
  const nextDay = new Date(instant);
  nextDay.setDate(nextDay.getDate() + 1);
  const repeatedMinutes = nextDay.getTimezoneOffset() - instant.getTimezoneOffset();
  if (repeatedMinutes > 0 && format(new Date(instant.getTime() + repeatedMinutes * 60_000), "yyyy-MM-dd HH:mm") === value) return false;
  return instant.getTime() <= now.getTime();
}

/** Defensa previa a escritura; una fecha compatible no acredita atención por sí sola. */
export function assertCompletedTime(data: { status: string; date: string; time: string }): void {
  if (data.status === "completed" && !isCompletedTimeValid(data.date, data.time)) {
    throw new Error("Completed appointment requires a valid, non-future local date and time");
  }
}
