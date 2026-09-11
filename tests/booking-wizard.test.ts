import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { slotIsFree, resolveBookingFailure } from "../src/lib/booking-outcome.js";

// N06 T4 · G4.2: disponibilidad por intervalos del manifiesto (mismo cálculo que el servidor desde T2)
const m = (t: string) => { const [h, mm] = t.split(":").map(Number); return h * 60 + mm; };
const occupied = [{ start: "10:00", end: "10:40" }];
const offered = (buffer: number) => ["09:15", "09:30", "09:45", "10:00", "10:15", "10:30", "10:40", "10:45"].filter(t => slotIsFree(m(t), 30, buffer, occupied));

test("G4.2 manifiesto [10:00–10:40], servicio 30, buffer 10: no ofrece 10:00, 10:15 ni 10:30; sí 10:40", () => {
  assert.deepEqual(offered(10), ["09:15", "10:40", "10:45"]);
});
test("G4.2 buffer 0: sí 10:40 y no 10:30; el hueco anterior (09:30) cabe justo", () => {
  assert.deepEqual(offered(0), ["09:15", "09:30", "10:40", "10:45"]);
});
test("G4.2 sin intervalos, todo libre; dos intervalos, ambos descuentan", () => {
  assert.equal(slotIsFree(m("10:00"), 30, 10, []), true);
  assert.equal(slotIsFree(m("11:00"), 30, 10, [{ start: "10:00", end: "10:40" }, { start: "11:20", end: "12:00" }]), false);
});

// G4.3: el fallo al enviar no se muestra como «reserva guardada» salvo en el checkout
test("G4.3 409 → paso de horario con aviso y recarga del manifiesto", () => {
  assert.deepEqual(resolveBookingFailure({ phase: "book", status: 409 }), { step: "datetime", messageKey: "slotTaken", reloadSlots: true });
});
test("G4.3 400 / 503 / red → aviso de error en el paso de datos, nunca el paso de pago", () => {
  for (const status of [400, 503, 500, null]) {
    const r = resolveBookingFailure({ phase: "book", status });
    assert.equal(r.step, "details"); assert.equal(r.messageKey, "bookingFailed"); assert.equal(r.reloadSlots, false);
  }
});
test("G4.3 fallo del checkout (la cita ya existe) → rama de pago, como hoy", () => {
  assert.deepEqual(resolveBookingFailure({ phase: "checkout" }), { step: "payment", messageKey: null, reloadSlots: false });
});

// G4.4: paridad de claves del bloque `booking` en los cuatro locales (conjunto de rutas, no inspección visual)
const bookingKeys = (lang: string) => {
  const text = readFileSync(new URL(`../src/config/locales/${lang}.ts`, import.meta.url), "utf8");
  const block = text.slice(text.indexOf("\n  booking: {"), text.indexOf("\n  },", text.indexOf("\n  booking: {")));
  return [...block.matchAll(/^    ([a-zA-Z]+):/gm)].map(x => x[1]).sort();
};
test("G4.4 las claves de booking coinciden en ar/en/he/ru e incluyen las tres de T4", () => {
  const en = bookingKeys("en");
  for (const lang of ["ar", "he", "ru"]) assert.deepEqual(bookingKeys(lang), en, `paridad ${lang} vs en`);
  for (const key of ["slotTaken", "bookingFailed", "cancelFailed"]) assert.ok(en.includes(key), `falta ${key}`);
});

// El wizard consume el resolutor y ya no lee citas: se comprueba por texto (la UI no corre en node).
test("BookingWizard usa resolveBookingFailure y el manifiesto, no getAppointmentsForDate", () => {
  const wizard = readFileSync(new URL("../src/components/booking/BookingWizard.tsx", import.meta.url), "utf8");
  assert.match(wizard, /resolveBookingFailure\(/);
  assert.match(wizard, /getManifestIntervals\(/);
  assert.doesNotMatch(wizard, /getAppointmentsForDate/);
  assert.match(wizard, /localeConfig\.booking\.cancelFailed/);
});
