// CRM-02: lo que la agenda y los horarios del CRM hacen con sus datos. Puro, sin Firebase.
import type { WeeklySchedule } from "../types";

/** Domingo a sábado: la semana de Israel y el orden del calendario del CRM. */
export const DIAS_SEMANA: (keyof WeeklySchedule)[] = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

/** Los días de un horario en orden fijo; Firestore no conserva el orden de las claves de un mapa. */
export function diasEnOrden(schedule: Partial<WeeklySchedule>): (keyof WeeklySchedule)[] {
  return DIAS_SEMANA.filter((d) => schedule[d]);
}

export function ordenarPorHora<T extends { time: string }>(apps: T[]): T[] {
  return [...apps].sort((a, b) => a.time.localeCompare(b.time));
}

const aMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

/** Turnos que se pisan van lado a lado: cada uno recibe su carril y cuántos carriles tiene su grupo. */
export function carriles(apps: { id: string; time: string; duration?: number }[]): Map<string, { carril: number; de: number }> {
  const out = new Map<string, { carril: number; de: number }>();
  let grupo: string[] = [];
  let fines: number[] = [];
  let finGrupo = -1;
  const cerrar = () => { for (const id of grupo) out.get(id)!.de = fines.length; grupo = []; fines = []; };
  for (const a of ordenarPorHora(apps)) {
    const ini = aMin(a.time), fin = ini + Math.max(20, a.duration || 30);
    if (ini >= finGrupo) cerrar();
    let carril = fines.findIndex((f) => f <= ini);
    if (carril === -1) { carril = fines.length; fines.push(fin); } else fines[carril] = fin;
    out.set(a.id, { carril, de: 0 });
    grupo.push(a.id);
    finGrupo = Math.max(finGrupo, fin);
  }
  cerrar();
  return out;
}

type Horario = { schedule?: unknown; blockedDates?: unknown; dateOverrides?: unknown };

/** El editor de horarios arranca con lo guardado en staff_overrides, no con el horario del config. */
export function conHorarioGuardado<T extends object>(miembro: T, guardado: Horario | undefined): T {
  if (!guardado) return miembro;
  const m = miembro as T & Horario;
  return { ...miembro, schedule: guardado.schedule ?? m.schedule, blockedDates: guardado.blockedDates ?? m.blockedDates, dateOverrides: guardado.dateOverrides ?? m.dateOverrides };
}

/**
 * config.staff con el horario guardado de una persona: la reserva de la web lee el horario de config/{id}
 * (staff_overrides sólo lo puede leer el admin). null si la persona no está en la lista.
 * CRM-04 (D-346, REV 13): `equipo` es el que muestra el CRM (el del preset cuando config no trae staff). Si config no tiene staff, la
 * lista que se escribe es ese equipo entero —la web lo seguía mostrando—; si la persona sólo está en `equipo`, se agrega al final.
 */
export function staffConHorario(lista: unknown, staffId: string, datos: Horario, equipo?: unknown[]): unknown[] | null {
  const limpio = Object.fromEntries(Object.entries(datos).filter(([k, v]) => v !== undefined && ["schedule", "blockedDates", "dateOverrides"].includes(k)));
  const propia = Array.isArray(lista) && lista.length ? lista : Array.isArray(equipo) ? equipo : [];
  if (propia.some((s) => s?.id === staffId)) return propia.map((s) => (s?.id === staffId ? { ...s, ...limpio } : s));
  const persona = Array.isArray(equipo) ? equipo.find((s) => (s as { id?: unknown })?.id === staffId) : undefined;
  return persona ? [...propia, { ...(persona as object), ...limpio }] : null;
}
