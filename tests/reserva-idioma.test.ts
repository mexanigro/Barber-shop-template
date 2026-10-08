// Reserva en el idioma que eligió la visitante (Liam, 2026-10-08, web de Evyatar: «la idea es que se muestre en el idioma en el que la
// persona seleccionó el idioma») · guard.
//
// Por qué existe. En la reserva de su web, en hebreo los días del calendario decían «או בו גו דו הו וו שו» y en ruso la fecha salía en
// inglés («OCT 8, 2026 · October 2026»): `getDateFnsLocale` no tenía ruso y caía a enUS. Con sólo agregar el locale, el mes del
// calendario salía en genitivo («октября 2026», `MMMM`) y la confirmación «четверг, октября 8-е» (el patrón inglés).
//
// Qué vigila, en las dos direcciones:
//   (1) Los días cortos del hebreo son «א׳ … ש׳», de domingo a sábado.
//   (2) En ruso: locale ruso, el mes suelto en nominativo («октябрь 2026») y el día antes del mes en los tres patrones de la reserva.
//   (3) En he, ar y en nada cambia: el patrón es el mismo que recibe y el encabezado del mes da lo mismo que con `MMMM`.
//   (4) El asistente y el calendario usan esas piezas en cada fecha que muestran con locale.
// `src/config/locale` lee `import.meta.env` (sólo Vite): se sustituye por un doble cuyo idioma el test cambia.
// Corre en `test:unit` (D-57): no abre navegador.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { register } from "node:module";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { format } from "date-fns";
import { ru, he, arSA, enUS } from "date-fns/locale";
import { messagesHe } from "../src/config/locales/he";

const g = globalThis as unknown as { __locReserva: { lang: string } };
g.__locReserva = { lang: "ru" };
const hook = `export async function resolve(spec, context, next) {
  if (spec.endsWith("/config/locale")) return { url: "data:text/javascript," + encodeURIComponent("export const localeConfig = globalThis.__locReserva;"), shortCircuit: true };
  return next(spec, context);
}`;
register("data:text/javascript," + encodeURIComponent(hook));
type Fechas = { getDateFnsLocale: () => unknown; datePattern: (p: string) => string; MES_DEL_CALENDARIO: string };
const fechas = async () => (await import(pathToFileURL(resolve("src/lib/dateLocale.ts")).href)) as unknown as Fechas;
const DIA = new Date(2026, 9, 8); // jueves 8 de octubre de 2026
const PATRONES = ["MMM d, yyyy", "MMM d", "EEEE, MMMM do"];

test("(1) los días cortos del hebreo son «א׳ … ש׳», de domingo a sábado", () => {
  assert.deepEqual([...messagesHe.calendar.weekdaysShort], ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"]);
});

test("(2) en ruso la fecha sale en ruso, el mes en nominativo y el día antes del mes", async () => {
  g.__locReserva.lang = "ru";
  const { getDateFnsLocale, datePattern, MES_DEL_CALENDARIO } = await fechas();
  const locale = getDateFnsLocale() as typeof ru;
  assert.equal(locale, ru, "getDateFnsLocale() en ruso devuelve el locale ruso");
  assert.equal(format(DIA, MES_DEL_CALENDARIO, { locale }), "октябрь 2026");
  assert.deepEqual(PATRONES.map((p) => format(DIA, datePattern(p), { locale })), ["8 окт. 2026", "8 окт.", "четверг, 8 октября"]);
});

test("(3) en he, ar y en nada cambia", async () => {
  const { getDateFnsLocale, datePattern, MES_DEL_CALENDARIO } = await fechas();
  for (const [lang, esperado] of [["he", he], ["ar", arSA], ["en", enUS]] as const) {
    g.__locReserva.lang = lang;
    const locale = getDateFnsLocale() as typeof he;
    assert.equal(locale, esperado, `getDateFnsLocale() en ${lang}`);
    for (const p of PATRONES) assert.equal(datePattern(p), p, `${lang}: «${p}» no cambia`);
    assert.equal(format(DIA, MES_DEL_CALENDARIO, { locale }), format(DIA, "MMMM yyyy", { locale }), `${lang}: el encabezado del mes no cambia`);
  }
  g.__locReserva.lang = "ru";
});

test("(4) el asistente y el calendario usan esas piezas en cada fecha con locale", () => {
  const wizard = readFileSync("src/components/booking/BookingWizard.tsx", "utf8");
  const conLocale = wizard.match(/format\(selectedDate, .*?\{ locale: getDateFnsLocale\(\) \}\)/g) ?? [];
  assert.equal(conLocale.length, 4, "las cuatro fechas del asistente con locale");
  for (const f of conLocale) assert.match(f, /datePattern\("/, `pasa por datePattern: ${f}`);
  const calendario = readFileSync("src/components/ui/calendar.tsx", "utf8");
  assert.match(calendario, /format\(viewMonth, MES_DEL_CALENDARIO, \{ locale: getDateFnsLocale\(\) \}\)/);
});
