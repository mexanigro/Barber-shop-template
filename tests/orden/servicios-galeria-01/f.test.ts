// SERVICIOS-GALERIA-01 · F1 (T+H) · retiro de ARREGLOS-03 (D-159): promovida a npm test como copias editables, con su carpeta
// congelada desde el último rojo. Sesión A (2026-10-01): test rojo. La línea de APROBADAS.md la escribe A en este mismo commit rojo
// (precedente D-38/D-146): por eso no es una afirmación —ya no puede estar en rojo—.
// D-165: se promueven todas las letras —en T `a` (A1), `b` (B1), `c` (C1), `e` (E1), `f` (F1) y `g` (G1); en H `a`, `b`, `d` (D1,
// D2), `f` y `g`—. La copia de E1 NO compara capturas, ni byte a byte ni por umbral (E1 no es determinista: con las banderas de
// D-158, 14 de 15 pares idénticos, medido por la verificadora) y no puede alargar cada pre-commit en minutos: corre
// `scripts/qa-regresion-seis.mjs` en un clon limpio, sin `.env`, con UN nicho (`--niches`) y sin `--baseline`, y afirma que sale 0
// y deja sus dos capturas. En T, `c` y `e` abren Chromium como proceso hijo (`e2e.mjs`, `qa-regresion-seis.mjs`), que el detector de
// `tests/suite-fases.test.ts` no ve: van a `test:browser` por nombre (D-57, D-121); el resto, a `test:unit`.
// Caja negra: git del repo real y lectura de las copias. Un mismo archivo en T y en H (cmp → 0).
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { matchesGlob, resolve } from "node:path";
import { ARREGLOS_03, REPO, ROOT, git } from "./_comun.ts";

/** Las letras de ARREGLOS-03 que esta hoja promueve en cada repo (D-165) y las que, en T, van a test:browser. */
const LETRAS = { T: ["a", "b", "c", "e", "f", "g"], H: ["a", "b", "d", "f", "g"] };
const NAVEGADOR_T = ["c", "e"];
const ORDEN = "arreglos-03";
const CARPETA = `tests/orden/${ORDEN}`;

test("npm test corre las copias de arreglos-03 que esta hoja promueve —en T `a`, `b`, `c`, `e`, `f` y `g`; en H `a`, `b`, `d`, `f` y `g`—, que importan ./orden/arreglos-03/_comun.ts; ninguna pasa `--web` a `e2e.mjs`; la copia de E1 corre `qa-regresion-seis.mjs` en un clon limpio sin `.env` con un solo nicho y sin comparar capturas (sin `--baseline`, sin «IDÉNTICO» ni umbral); en T, `c` y `e` van a `test:browser` y las demás a `test:unit`; y tests/orden/arreglos-03/ no cambia desde su último rojo (574dd55 en T, 348bd12 en H)", () => {
  const leer = (rel: string) => readFileSync(resolve(ROOT, rel), "utf8");
  const copias = LETRAS[REPO].map((s) => `tests/${ORDEN}-${s}.test.ts`);
  // (1) Las copias. Hoy no existen: aquí está el rojo.
  for (const c of copias) assert.ok(existsSync(resolve(ROOT, c)), `falta ${c} en ${REPO}`);
  for (const c of copias) assert.match(leer(c), new RegExp(`from "\\./orden/${ORDEN}/_comun\\.ts"`), `${c} debe importar ./orden/${ORDEN}/_comun.ts`);

  // (2) Ninguna sale contra las webs.
  for (const c of copias) assert.ok(!/["'`]--web["'`]/.test(leer(c)), `${c} no pasa --web a e2e.mjs (sale a la red)`);

  // (3) La copia de E1 (sólo en T): clon limpio, un nicho, sin comparar.
  if (REPO === "T") {
    const e = leer(`tests/${ORDEN}-e.test.ts`);
    assert.ok(/clonLimpio\(/.test(e) && /entornoLimpio\(/.test(e), "la copia de E1 corre en un clon limpio con el entorno sin las variables del .env");
    assert.ok(/qa-regresion-seis\.mjs/.test(e) && /["'`]--niches["'`]\s*,\s*["'`][a-z]+["'`]/.test(e), "la copia de E1 corre qa-regresion-seis.mjs con un solo nicho (--niches <uno>)");
    assert.ok(!/--baseline|IDÉNTICO|\.equals\(/.test(e), "la copia de E1 no compara capturas: ni --baseline, ni «IDÉNTICO», ni byte a byte");
  }

  // (4) npm test las corre; en T, la fase por letra.
  const scripts = JSON.parse(leer("package.json")).scripts ?? {};
  const nombra = (script: string, archivo: string) => String(script ?? "").split(/\s+/).map((t) => t.replace(/^["']|["']$/g, "")).some((t) => t === archivo || (t.includes("*") && matchesGlob(archivo, t)));
  for (const [i, c] of copias.entries()) {
    assert.ok(["test", "test:unit", "test:browser"].some((s) => nombra(scripts[s], c)), `npm test no corre ${c}`);
    if (REPO !== "T") continue;
    const fase = NAVEGADOR_T.includes(LETRAS.T[i]) ? "test:browser" : "test:unit";
    assert.ok(nombra(scripts[fase], c), `en T, ${c} va en ${fase} (D-57, D-121)`);
  }

  // (5) La carpeta de la orden, congelada desde su último rojo.
  const rojo = git(ROOT, "log", "-1", "--format=%H", "--diff-filter=A", "main", "--", `${CARPETA}/HOJA.md`);
  assert.ok(rojo.startsWith(ARREGLOS_03.rojo[REPO]), `el último rojo de ${ORDEN} en ${REPO} es ${ARREGLOS_03.rojo[REPO]} (git da ${rojo.slice(0, 7)})`);
  assert.equal(git(ROOT, "log", "--format=%h %s", "--diff-filter=MDR", `${rojo}..main`, "--", `${CARPETA}/`), "", `${CARPETA}/ sigue congelada desde su último rojo`);
});
