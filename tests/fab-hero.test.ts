// El botón flotante de WhatsApp no tapa «reservar» en el hero de peluquería (Liam, 2026-10-09, web de Evyatar: «Todo», con la
// orden de reservar espacio al botón flotante; toca R4/R9 y el 5 rem de D14-bis) · guard.
//
// Por qué existe. El FAB de WhatsApp va fijo en la columna de inicio (`start-3 bottom-[4.5rem]`, 48 px: su borde de arriba queda a
// 7,5 rem del fondo) y el bloque del hero v6 centrado terminaba a 5 rem (`--hero-block-pb`). A 375, sin la fila de reseñas, la fila de
// los dos botones del hero (~265 px) entra en la columna del FAB: medido en la web de Evyatar sin reseñas, el FAB se montaba sobre
// «reservar» 5 px en hebreo, 10 en inglés y 15 en árabe (40 px de alto de cruce). Con la fila de reseñas debajo, los botones ya
// quedaban por encima (cruce 0 en he, en, ru y ar a 375, y a 360, 390 y 768). En escritorio (≥ 1024) manda `--hero-block-pb-lg`.
//
// Qué vigila, en las dos direcciones:
//   (1) En peluquería, sin la fila de reseñas, el bloque del hero queda por encima del FAB: ≥ bottom del FAB + su alto + 0,5 rem.
//   (2) No se infla de más (≤ mínimo + 1 rem; R7) y, con la fila de reseñas, sigue el 5 rem de D14-bis (donde no hay choque).
//   (3) El hero v6 marca la fila de reseñas (`data-confianza`) y lee la variable por debajo de 1024 (`--hero-block-pb-lg` arriba).
// Corre en `test:unit` (D-57): lee el árbol, no abre navegador.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync("src/index.css", "utf8");
const fab = readFileSync("src/components/ui/WhatsAppFab.tsx", "utf8");
const hero = readFileSync("src/components/landing/hero/hero-v6.tsx", "utf8");

const rem = (s: string) => (s.endsWith("rem") ? parseFloat(s) : parseFloat(s) / 16);
function minimo() {
  const clase = fab.match(/className="fixed start-3 bottom-\[([\d.]+(?:rem|px))\][^"]*\bh-(\d+)\b/);
  assert.ok(clase, "WhatsAppFab: fixed start-3 bottom-[…] con su alto h-N");
  return rem(clase![1]) + Number(clase![2]) * 0.25 + 0.5;
}
function pbBase() {
  const bloques = [...css.matchAll(/html\[data-niche="peluqueria"\]\s*\{([^}]*)\}/g)].map((m) => m[1]);
  const v = bloques.map((b) => b.match(/--hero-block-pb:\s*([\d.]+rem)/)).find(Boolean);
  assert.ok(v, "el bloque de peluquería fija --hero-block-pb en rem");
  return rem(v![1]);
}
function pbSinConfianza() {
  const v = css.match(/html\[data-niche="peluqueria"\]\s+\.hero-v6-block\[data-confianza="no"\]\s*\{\s*--hero-block-pb:\s*([\d.]+rem);\s*\}/);
  assert.ok(v, 'index.css: html[data-niche="peluqueria"] .hero-v6-block[data-confianza="no"] { --hero-block-pb: …rem }');
  return rem(v![1]);
}

test("(1) sin fila de reseñas, el bloque del hero termina por encima del botón de WhatsApp", () => {
  const pb = pbSinConfianza(), min = minimo();
  assert.ok(pb >= min, `--hero-block-pb ${pb} rem < ${min} rem (bottom del FAB + su alto + 0,5 rem): el FAB tapa «reservar»`);
});

test("(2) el margen no se infla de más, y con fila de reseñas queda el 5 rem aprobado (D14-bis)", () => {
  const min = minimo();
  assert.ok(pbSinConfianza() <= min + 1, "el bloque del hero sube más de lo necesario");
  assert.equal(pbBase(), 5, "el 5 rem de D14-bis no cambia donde no hay choque");
});

test("(3) el hero v6 marca la fila de reseñas y usa la variable por debajo de 1024", () => {
  assert.match(hero, /className=\{centered \? "hero-v6-block[^}]*\} data-confianza=\{rated\.length > 0 \? "si" : "no"\}/);
  assert.match(hero, /pb-\[calc\(var\(--hero-block-pb,[^)]*\)\+env\(safe-area-inset-bottom\)\)\]/);
  assert.match(hero, /lg:pb-\[var\(--hero-block-pb-lg,/);
});
