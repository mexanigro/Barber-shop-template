import { format, getDay } from "date-fns";
import type { StaffMember } from "../types";

const DIAS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;

/** Ese día la persona no atiende: día libre por excepción, o cerrado en su horario semanal sin una excepción de horario.
 *  Es la regla con la que `generateSlots` devuelve cero turnos sin que el día esté lleno (tests/reserva-dia-cerrado.test.ts). */
export function esDiaCerrado(date: Date, staffMember: Pick<StaffMember, "schedule" | "dateOverrides">): boolean {
  const override = staffMember.dateOverrides?.[format(date, "yyyy-MM-dd")];
  if (override?.type === "dayOff") return true;
  return !staffMember.schedule[DIAS[getDay(date)]]?.isOpen && !override;
}
