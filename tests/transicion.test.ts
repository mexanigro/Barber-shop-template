// CONEXION-09 (D-90, D-92): guard de `branding.heroToBackdrop`, el derivado que calcula `tools/material/transicion.mjs` desde el
// material real. D-90 decide que esa fila NO tiene casilla en el hub —la página no la consume desde TRANSICION-02 y el navegador del
// hub no puede leer los píxeles de Storage—, así que lo único que la mantiene verdadera es esta aritmética: los tres casos, sus dos
// bordes, el caso neutro y, sobre todo, que fuera de los tres casos NO se invente ninguna relación (el `?? "adjacent-hue"` que había
// escribió `adjacent-hue` con ΔH 100 en el fixture C el 2026-09-19).
// Corre en `test:unit` (D-57): `relacion.mjs` es puro —no levanta Chromium ni toca el disco—, y por eso la aritmética se sacó de
// `transicion.mjs`, que sí mide.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { relacionHeroFondo } from "../tools/material/relacion.mjs";

const ROOT = resolve(import.meta.dirname, "..");
const TRANSICION = "tools/material/transicion.mjs";
/** La clave del contrato que este guard vigila. */
const CLAVE = "heroToBackdrop";
/** Una medida OKLCH como la que `transicion.mjs` calcula del pie del clip y de la foto del local. */
const lch = (L: number, C: number, H: number) => ({ L, C, H });

test(`los tres casos de ${CLAVE} y sus bordes: ΔH ≤ 10° es same-hue (por luz), ΔH ≤ 35° adjacent-hue`, () => {
  const borde = relacionHeroFondo(lch(0.60, 0.05, 0), lch(0.50, 0.05, 10));
  assert.deepEqual([borde.dH, borde.dL], [10, 0.1], "ΔH 10° y ΔL 0,10");
  assert.equal(borde.relation, "same-hue", "ΔH 10° y ΔL 0,10 → same-hue (los dos bordes entran)");
  assert.equal(borde.mechanism, "veil-from-first-pixel", "…con velo desde el primer píxel");

  const luz = relacionHeroFondo(lch(0.61, 0.05, 0), lch(0.50, 0.05, 10));
  assert.deepEqual([luz.dH, luz.dL], [10, 0.11], "ΔH 10° y ΔL 0,11");
  assert.equal(luz.relation, "same-hue-different-light", "el mismo tono con otra luz cambia de caso en cuanto ΔL pasa de 0,10");
  assert.equal(luz.mechanism, "scrim-dies-into-photo", "…y de mecanismo: el scrim muere dentro de la foto");

  const vecino = relacionHeroFondo(lch(0.60, 0.05, 0), lch(0.58, 0.05, 35));
  assert.equal(vecino.dH, 35, "ΔH 35°");
  assert.equal(vecino.relation, "adjacent-hue", "ΔH 35° → adjacent-hue (el borde entra)");
});

test(`fuera de los tres casos ${CLAVE} no se inventa: relation es null`, () => {
  const fuera = relacionHeroFondo(lch(0.60, 0.05, 0), lch(0.58, 0.05, 36));
  assert.equal(fuera.dH, 36, "ΔH 36°: un grado fuera");
  assert.equal(fuera.relation, null, "el clip y la foto no valen juntos: no hay relación que escribir (D-92)");

  // El otro lado de la misma decisión: la herramienta ya no rellena el hueco con un valor cualquiera.
  const src = readFileSync(resolve(ROOT, TRANSICION), "utf8");
  assert.ok(!src.includes('?? "adjacent-hue"'), `${TRANSICION} no puede volver a inventar una relación con «?? "adjacent-hue"»`);
  assert.match(src, /import\s*\{[^}]*\brelacionHeroFondo\b[^}]*\}\s*from/, `${TRANSICION} usa la función pura, no una copia de la aritmética`);
  assert.match(src, /if \(!relation\)[\s\S]{0,400}else \{/, `${TRANSICION} con --escribir no escribe nada cuando no hay relación`);
});

test(`un tono sin croma no se juzga: neutro y ΔH 0 en ${CLAVE}`, () => {
  for (const [quien, pie, foto] of [
    ["el pie del clip", lch(0.60, 0.005, 0), lch(0.58, 0.05, 200)],
    ["la foto del local", lch(0.60, 0.05, 0), lch(0.58, 0.005, 200)],
  ] as const) {
    const n = relacionHeroFondo(pie, foto);
    assert.equal(n.neutro, true, `croma < 0,01 en ${quien} → neutro`);
    assert.equal(n.dH, 0, `…y ΔH 0: el tono no se juzga (dio ${n.dH})`);
    assert.equal(n.relation, "same-hue", "…y la relación sale por luz");
  }
  // Y con croma suficiente en los dos, el tono vuelve a contar.
  const juzgado = relacionHeroFondo(lch(0.60, 0.05, 0), lch(0.58, 0.05, 200));
  assert.equal(juzgado.neutro, false, "con croma en los dos, el tono se juzga");
  assert.equal(juzgado.relation, null, "…y 160° de diferencia no es ninguno de los tres casos");
});

test(`las dos plantillas: el ${CLAVE} de A y de C sale de sus números, no de una etiqueta escrita a mano`, () => {
  // A (D-93): pie neutro (C 0,005), ΔL 0,079 → same-hue con velo desde el primer píxel.
  const a = relacionHeroFondo(lch(0.601, 0.005, 323), lch(0.522, 0.05, 200));
  assert.equal(a.neutro, true, "A: el pie del clip es neutro");
  assert.deepEqual([a.dH, a.dL], [0, 0.079], "A: ΔH 0 y ΔL 0,079");
  assert.equal(a.relation, "same-hue", "A: same-hue");
  assert.equal(a.mechanism, "veil-from-first-pixel", "A: veil-from-first-pixel");

  // C (D-93): ΔH 6° y ΔL 0,118 → same-hue-different-light con scrim. Lo que guardaba era `adjacent-hue` con ΔH 100.
  const c = relacionHeroFondo(lch(0.519, 0.022, 21), lch(0.401, 0.05, 27));
  assert.deepEqual([c.dH, c.dL], [6, 0.118], "C: ΔH 6° y ΔL 0,118");
  assert.equal(c.relation, "same-hue-different-light", "C: same-hue-different-light");
  assert.equal(c.mechanism, "scrim-dies-into-photo", "C: scrim-dies-into-photo");

  // El pie que `foot` guarda es el que mide, con su hex.
  assert.equal(typeof a.foot.hex, "string", "foot lleva su hex");
  assert.deepEqual([a.foot.L, a.foot.C, a.foot.H], [0.601, 0.005, 323], "foot es el pie medido, sin retocar");
  assert.equal(a.footPortrait, null, "sin pie 9:16 no hay footPortrait");
  assert.equal(relacionHeroFondo(lch(0.601, 0.005, 323), lch(0.522, 0.05, 200), lch(0.64, 0.006, 27)).footPortrait?.hex, "#908b8a", "con pie 9:16, footPortrait es el suyo (el de A)");
});
