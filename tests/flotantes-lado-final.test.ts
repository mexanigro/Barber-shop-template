// En peluquería los botones flotantes (WhatsApp y accesibilidad) van en la columna del lado final (Liam, 2026-10-10, web de Maestro:
// «Lado final», orden directa que cambia R9 «columna del lado inicio») · guard.
//
// Por qué existe. A 375 la columna de inicio caía justo donde empiezan las líneas (a la derecha en hebreo y árabe, a la izquierda en
// inglés y ruso): los botones tapaban el comienzo de reseñas, preguntas del FAQ, el enlace «WhatsApp» del pie y el título del cierre,
// en los cuatro idiomas. Del lado final las líneas terminan desparejas y el texto queda casi siempre libre (capturas comparadas en
// ventas/ashkelon/maestro-hair-designers/trabajo/rev3fab/). La pausa del vídeo del hero, que estaba abajo al lado final, pasa al
// lado inicio para no chocar con ellos.
//
// Qué vigila, en las dos direcciones:
//   (1) WhatsAppFab (sólo peluquería lo monta) va `fixed end-3 bottom-[4.5rem]`, ya no `start-3`;
//   (2) en peluquería, el botón y el panel de accesibilidad se corren al lado final por CSS (`html[data-niche="peluqueria"]`), y en la
//       flota siguen `start-3` en el componente (los seis nichos no cambian);
//   (3) la pausa del vídeo del hero v6 queda en el lado inicio (`start-4`), lejos de la columna de los flotantes.
// Corre en `test:unit` (D-57): lee el árbol, no abre navegador.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const fab = readFileSync("src/components/ui/WhatsAppFab.tsx", "utf8");
const a11y = readFileSync("src/components/ui/AccessibilityWidget.tsx", "utf8");
const css = readFileSync("src/index.css", "utf8");
const hero = readFileSync("src/components/landing/hero/hero-v6.tsx", "utf8");

test("(1) el botón de WhatsApp va en la columna del lado final", () => {
  assert.match(fab, /className="fixed end-3 bottom-\[4\.5rem\]/, "WhatsAppFab: fixed end-3 bottom-[4.5rem]");
  assert.doesNotMatch(fab, /className="fixed start-3/, "WhatsAppFab ya no va start-3");
});

test("(2) accesibilidad al lado final sólo en peluquería; la flota no cambia", () => {
  assert.match(a11y, /className="a11y-trigger group fixed bottom-4 start-3 /, "el botón de la flota sigue start-3");
  assert.match(a11y, /className="a11y-panel fixed bottom-\[4\.5rem\] start-3 /, "el panel lleva su clase y sigue start-3 en la flota");
  const regla = css.match(/html\[data-niche="peluqueria"\] \.a11y-trigger,\s*html\[data-niche="peluqueria"\] \.a11y-panel\s*\{([^}]*)\}/);
  assert.ok(regla, 'index.css: html[data-niche="peluqueria"] .a11y-trigger, … .a11y-panel { … }');
  assert.match(regla![1], /inset-inline-start:\s*auto/); assert.match(regla![1], /inset-inline-end:\s*0\.75rem/);
});

test("(3) la pausa del vídeo del hero pasa al lado inicio", () => {
  assert.match(hero, /className="absolute bottom-\[calc\(1\.25rem\+env\(safe-area-inset-bottom\)\)\] start-4 z-10/, "pausa en start-4");
  assert.doesNotMatch(hero, /bottom-\[calc\(1\.25rem\+env\(safe-area-inset-bottom\)\)\] end-4/, "ya no end-4");
});
