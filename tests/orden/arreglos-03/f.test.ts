// ARREGLOS-03 · F1 (T+H) · retiro de IDIOMAS-01 (D-146): promovida a npm test como copias editables, con su carpeta congelada
// desde el último rojo. Sesión A (2026-09-30): test rojo. La línea de APROBADAS.md la escribe A en este mismo commit rojo
// (precedente D-38): por eso no es una afirmación —ya no puede estar en rojo—.
// D-156: se promueven las diez letras —en T `d`, `e`, `f` (A1–A4), `g` (B1), `h` (C3) e `i` (D1 entero y D2 sólo con su
// precondición del árbol); en H `a` (C1), `b` (C2), `d` y `e`—. C1 y C2 en H y B1 en T hoy sólo los vigila el pre-push
// (verificadora, hallazgo 3). Ninguna copia corre `e2e.mjs`: sale a la red (D-89, D-95), como las copias de ARREGLOS-02.
// D-121: `tests/suite-fases.test.ts` sólo ve el literal `from "playwright"`; aquí la fase se decide por las dos formas de traerlo
// más `medirPng`. El literal va partido: este archivo no abre navegador y no puede caer en su propio detector.
// Caja negra: git del repo real y lectura de las copias. Un mismo archivo en T y en H (cmp → 0).
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { matchesGlob, resolve } from "node:path";
import { IDIOMAS_01, ORDEN as PROPIA, REPO, ROOT, git, ordenesVivas } from "./_comun.ts";

/** Las letras de IDIOMAS-01 que esta hoja promueve en cada repo (D-156). */
const LETRAS = { T: ["d", "e", "f", "g", "h", "i"], H: ["a", "b", "d", "e"] };
const ORDEN = "idiomas-01";
const CARPETA = `tests/orden/${ORDEN}`;
const PW = "play" + "wright";
const conNavegador = (src: string) => src.includes("medirPng") || new RegExp(`from ${JSON.stringify(PW)}`).test(src) || new RegExp(`import\\(${JSON.stringify(PW)}\\)`).test(src);

test("npm test corre las copias de idiomas-01 que esta hoja promueve —en T `d`, `e`, `f`, `g`, `h` e `i`; en H `a`, `b`, `d` y `e`—, que importan ./orden/idiomas-01/_comun.ts, sin volver a correr copias anteriores (la `d` excluye las órdenes vivas con `excluidas()`, sin nombrarlas); ninguna corre `e2e.mjs`; en T, toda copia que abra Chromium va a `test:browser`; y tests/orden/idiomas-01/ no cambia desde su último rojo (3a4d4be en T, cc25f94 en H)", () => {
  const leer = (rel: string) => readFileSync(resolve(ROOT, rel), "utf8");
  const copias = LETRAS[REPO].map((s) => `tests/${ORDEN}-${s}.test.ts`);
  // (1) Las copias. Hoy no existen: aquí está el rojo.
  for (const c of copias) assert.ok(existsSync(resolve(ROOT, c)), `falta ${c} en ${REPO}`);
  for (const c of copias) assert.match(leer(c), new RegExp(`from "\\./orden/${ORDEN}/_comun\\.ts"`), `${c} debe importar ./orden/${ORDEN}/_comun.ts`);

  // (2) Sin volver a correr copias anteriores: la que reproduce HEAD excluye las vivas con excluidas(), sin nombrarlas.
  const vivas = [...new Set([...ordenesVivas(ROOT), PROPIA])];
  for (const c of copias) {
    const src = leer(c);
    if (!src.includes("reproducirHead(")) continue;
    assert.match(src, /reproducirHead\([^,]+,\s*excluidas\(/, `${c} reproduce HEAD: debe excluir las órdenes vivas con excluidas(), no con una lista escrita a mano`);
    for (const id of vivas) assert.ok(!src.includes(`"${id}"`), `${c} no debe nombrar la orden viva «${id}»`);
  }

  // (3) Ninguna sale contra las webs: ni la ruta de e2e.mjs como argumento ni el lanzador de D2.
  for (const c of copias) {
    const src = leer(c);
    assert.doesNotMatch(src, /["'`]tools\/verdad\/e2e\.mjs["'`]/, `${c} no corre tools/verdad/e2e.mjs (sale a la red; D2 va sólo con su precondición del árbol)`);
    assert.doesNotMatch(src, /\bcorrerE2E\(/, `${c} no llama a correrE2E`);
  }

  // (4) npm test las corre; en T, la fase la decide si abren Chromium.
  const scripts = JSON.parse(leer("package.json")).scripts ?? {};
  const nombra = (script: string, archivo: string) => String(script ?? "").split(/\s+/).map((t) => t.replace(/^["']|["']$/g, "")).some((t) => t === archivo || (t.includes("*") && matchesGlob(archivo, t)));
  for (const c of copias) {
    assert.ok(["test", "test:unit", "test:browser"].some((s) => nombra(scripts[s], c)), `npm test no corre ${c}`);
    if (REPO !== "T") continue;
    if (conNavegador(leer(c))) assert.ok(nombra(scripts["test:browser"], c), `${c} abre Chromium: va en test:browser (D-57, D-121)`);
    else assert.ok(nombra(scripts["test:unit"], c), `en T, ${c} va en la fase concurrente test:unit`);
  }

  // (5) La carpeta de la orden, congelada desde su último rojo.
  const rojo = git(ROOT, "log", "-1", "--format=%H", "--diff-filter=A", "main", "--", `${CARPETA}/HOJA.md`);
  assert.ok(rojo.startsWith(IDIOMAS_01.rojo[REPO]), `el último rojo de ${ORDEN} en ${REPO} es ${IDIOMAS_01.rojo[REPO]} (git da ${rojo.slice(0, 7)})`);
  assert.equal(git(ROOT, "log", "--format=%h %s", "--diff-filter=MDR", `${rojo}..main`, "--", `${CARPETA}/`), "", `${CARPETA}/ sigue congelada desde su último rojo`);
});
