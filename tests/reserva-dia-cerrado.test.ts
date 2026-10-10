// Un día cerrado no se anuncia como «lleno» en la reserva (Liam, 2026-10-10, web de Maestro: orden «Día cerrado = lleno») · guard.
//
// Por qué existe. Cuando el día no tenía turnos, la reserva decía siempre `booking.fullyBooked`: «Fully booked for this date» /
// «На эту дату всё занято» / «محجوز بالكامل في هذا اليوم» también el sábado, que en Maestro está cerrado (en hebreo, «אין תורים
// פנויים», era neutro). «Lleno» dice que hay demanda y no hay lugar; «cerrado» dice que ese día no se atiende: son cosas distintas.
//
// Qué vigila:
//   (1) `esDiaCerrado` (src/lib/dia-cerrado.ts) sigue la misma regla que `generateSlots`: día libre por excepción, o día cerrado en el
//       horario semanal sin excepción de horario; un día abierto o un día cerrado con horario especial no está cerrado;
//   (2) `generateSlots` usa esa misma función (una sola regla);
//   (3) la reserva muestra `booking.closedDay` cuando el día está cerrado para quien se eligió (o para todo el equipo con «cualquiera»),
//       y `fullyBooked` sólo cuando el día abre y no queda lugar;
//   (4) los cuatro locales tienen `closedDay`, distinto de `fullyBooked`, y en en/ru/ar no dice «lleno».
// Corre en `test:unit` (D-57): lee el árbol, no abre navegador.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { esDiaCerrado } from "../src/lib/dia-cerrado.ts";

const dia = (isOpen: boolean) => ({ isOpen, hours: { start: "09:00", end: "20:00" }, breaks: [] as never[] });
const semana = { sunday: dia(true), monday: dia(true), tuesday: dia(true), wednesday: dia(true), thursday: dia(true), friday: dia(true), saturday: dia(false) };
const persona = (extra: Record<string, unknown> = {}) => ({ id: "x", name: "x", schedule: semana, ...extra }) as never;
const sabado = new Date(2026, 9, 10), domingo = new Date(2026, 9, 11);

test("(1) esDiaCerrado: cerrado en el horario, día libre por excepción, abierto y horario especial", () => {
  assert.equal(esDiaCerrado(sabado, persona()), true, "el sábado cerrado del horario semanal");
  assert.equal(esDiaCerrado(domingo, persona()), false, "el domingo abierto");
  assert.equal(esDiaCerrado(domingo, persona({ dateOverrides: { "2026-10-11": { type: "dayOff" } } })), true, "día libre por excepción");
  assert.equal(esDiaCerrado(sabado, persona({ dateOverrides: { "2026-10-10": { type: "customHours", start: "10:00", end: "14:00" } } })), false, "horario especial en un día cerrado");
});

test("(2) generateSlots usa la misma regla", () => {
  const src = readFileSync("src/lib/booking.ts", "utf8");
  assert.match(src, /import \{ esDiaCerrado \} from "\.\/dia-cerrado"/);
  assert.match(src, /if \(esDiaCerrado\(date, staffMember\)\) return \[\];/);
});

test("(3) la reserva dice «cerrado» si el día está cerrado y «lleno» sólo si abre", () => {
  const src = readFileSync("src/components/booking/BookingWizard.tsx", "utf8");
  assert.match(src, /const diaCerrado = React\.useMemo\(\(\) =>\s*anySpecialist \? staffList\.length > 0 && staffList\.every\(\(b\) => esDiaCerrado\(selectedDate, b\)\) : !!selectedStaff && esDiaCerrado\(selectedDate, selectedStaff\)/);
  assert.match(src, /\{diaCerrado \? localeConfig\.booking\.closedDay : localeConfig\.booking\.fullyBooked\}/);
});

test("(4) los cuatro locales tienen closedDay, distinto de fullyBooked y sin «lleno»", () => {
  const lleno: Record<string, RegExp> = { en: /booked/i, ru: /занят/i, ar: /محجوز/ };
  for (const l of ["he", "en", "ru", "ar"]) {
    const src = readFileSync(`src/config/locales/${l}.ts`, "utf8");
    const cd = src.match(/closedDay:\s*"([^"]+)"/)?.[1]; const fb = src.match(/fullyBooked:\s*"([^"]+)"/)?.[1];
    assert.ok(cd, `${l}: falta booking.closedDay`);
    assert.notEqual(cd, fb, `${l}: closedDay igual a fullyBooked`);
    if (lleno[l]) assert.doesNotMatch(cd!, lleno[l], `${l}: closedDay dice «lleno»: ${cd}`);
  }
});
