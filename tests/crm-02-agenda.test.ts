// CRM-02: lo que la agenda y los horarios del CRM hacen con sus datos (src/lib/agenda.ts).
import test from "node:test";
import assert from "node:assert/strict";
import { ordenarPorHora, carriles, DIAS_SEMANA, diasEnOrden, conHorarioGuardado, staffConHorario } from "../src/lib/agenda.ts";

test("los turnos del día van de la mañana a la noche", () => {
  const dia = [{ id: "a", time: "15:00" }, { id: "b", time: "12:00" }, { id: "c", time: "09:00" }, { id: "d", time: "09:30" }];
  assert.deepEqual(ordenarPorHora(dia).map((x) => x.time), ["09:00", "09:30", "12:00", "15:00"]);
});

test("dos turnos que se pisan van en dos carriles; uno solo ocupa todo el ancho", () => {
  const c = carriles([
    { id: "noa", time: "09:00", duration: 120 },
    { id: "roni", time: "09:30", duration: 60 },
    { id: "dana", time: "12:00", duration: 60 },
  ]);
  assert.deepEqual(c.get("noa"), { carril: 0, de: 2 });
  assert.deepEqual(c.get("roni"), { carril: 1, de: 2 });
  assert.deepEqual(c.get("dana"), { carril: 0, de: 1 });
});

test("los días del horario van de domingo a sábado, sea cual sea el orden de las claves", () => {
  const dia = { isOpen: true, hours: { start: "09:00", end: "15:00" }, breaks: [] as unknown[] };
  const desordenado = { tuesday: dia, saturday: dia, wednesday: dia, monday: dia, thursday: dia, friday: dia, sunday: dia };
  assert.deepEqual(diasEnOrden(desordenado as never), DIAS_SEMANA);
  assert.equal(DIAS_SEMANA[0], "sunday");
});

test("el editor muestra el horario guardado, no el del config", () => {
  const cerrado = { isOpen: false, hours: { start: "00:00", end: "00:00" }, breaks: [] as unknown[] };
  const abierto = { isOpen: true, hours: { start: "09:00", end: "15:00" }, breaks: [] as unknown[] };
  const miembro = { id: "adi", schedule: { sunday: abierto } } as never;
  const r = conHorarioGuardado(miembro, { schedule: { sunday: cerrado }, dateOverrides: { "2026-10-20": { type: "dayOff" } } }) as { schedule: { sunday: { isOpen: boolean } }; dateOverrides: object };
  assert.equal(r.schedule.sunday.isOpen, false);
  assert.deepEqual(r.dateOverrides, { "2026-10-20": { type: "dayOff" } });
  assert.equal(conHorarioGuardado(miembro, undefined), miembro);
});

test("guardar un horario lo copia a esa persona de config.staff y no toca a las demás", () => {
  const lista = [{ id: "maya", name: "מאיה", schedule: "viejo" }, { id: "adi", name: "עדי", schedule: "viejo", bio: "x" }];
  const r = staffConHorario(lista, "adi", { schedule: "nuevo", blockedDates: undefined, dateOverrides: {} }) as Record<string, unknown>[];
  assert.deepEqual(r[0], lista[0]);
  assert.deepEqual(r[1], { id: "adi", name: "עדי", schedule: "nuevo", bio: "x", dateOverrides: {} });
  assert.equal("blockedDates" in r[1], false, "Firestore no acepta undefined");
  assert.equal(staffConHorario(lista, "nadie", { schedule: "nuevo" }), null);
});
