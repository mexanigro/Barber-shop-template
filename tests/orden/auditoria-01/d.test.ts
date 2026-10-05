// AUDITORIA-01 · D1 (T+H) · retiro de CIERRE-TRAMO-01 (D-226): promovida a npm test como copias editables, con su carpeta congelada
// desde el último rojo. Sesión A (2026-10-04): test rojo. La línea de APROBADAS.md la escribe A en este mismo commit rojo (precedente
// D-38/D-146/D-159/D-172/D-188/D-201/D-213): por eso no es una afirmación —ya no puede estar en rojo—.
// D-232 (como D-210/D-221, y con el recorte de las copias de E2E-01): se promueven las letras que afirman producto —en T `b`, `c` y `m`;
// en H `a` y `h`—, no la de retiro ni la de registro. Una copia promovida no sale a la red: la `b` de T (B1, marcada «, webs») queda
// sólo con su condición del árbol —el commit desplegado de cada web desciende del rojo de cierre-tramo-01— y la `a` de H (A1, Firestore)
// sólo con la suya —la carga declarada de cada web es la de un fixture de T que contiene cierre-tramo-01—: ninguna corre `e2e.mjs`, lee
// Firestore ni pide una url. En T, `b` va a `test:unit`; `c` (corre `conexion-08-a`, que abre Chromium, en un clon) y `m` (abre
// Chromium) a `test:browser`.
// Caja negra: git del repo real y lectura de las copias. Un mismo archivo en T y en H (cmp → 0).
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { matchesGlob, resolve } from "node:path";
import { CIERRE_TRAMO_01, REPO, ROOT, git } from "./_comun.ts";

/** Las letras de CIERRE-TRAMO-01 que esta hoja promueve en cada repo; en T, las que van a test:browser. */
const LETRAS = { T: ["b", "c", "m"], H: ["a", "h"] };
const NAVEGADOR_T = ["c", "m"];
const ORDEN = "cierre-tramo-01";
const CARPETA = `tests/orden/${ORDEN}`;
/** Lo que sale a la red o a Firestore en las afirmaciones «, webs» de cierre-tramo-01: la copia recortada no lo llama. */
const RED = /\bcorrerE2E\(|tools\/verdad\/e2e\.mjs|\bleerDoc\(|\bshaDeUrl\(|\bfetch\(/;
/** La copia recortada: la de B1 en T, la de A1 en H. */
const RECORTADA = { T: "b", H: "a" } as const;

test("npm test corre las copias de cierre-tramo-01 que esta hoja promueve —en T `b`, `c` y `m`; en H `a` y `h`—, que importan ./orden/cierre-tramo-01/_comun.ts; la `b` de T y la `a` de H quedan sólo con lo que se lee del árbol —el commit desplegado de cada web desciende del rojo de cierre-tramo-01; la carga de cada web es la de un fixture que lo contiene— y no corren `e2e.mjs`, ni leen Firestore, ni piden una url; en T `b` va a `test:unit` y `c` y `m` a `test:browser`; y tests/orden/cierre-tramo-01/ no cambia desde su último rojo (6665383 en T, c0f61c2 en H)", () => {
  const leer = (rel: string) => readFileSync(resolve(ROOT, rel), "utf8");
  const copias = LETRAS[REPO].map((s) => `tests/${ORDEN}-${s}.test.ts`);
  // (1) Las copias. Hoy no existen: aquí está el rojo.
  for (const c of copias) assert.ok(existsSync(resolve(ROOT, c)), `falta ${c} en ${REPO}`);
  for (const c of copias) assert.match(leer(c), new RegExp(`from "\\./orden/${ORDEN}/_comun\\.ts"`), `${c} debe importar ./orden/${ORDEN}/_comun.ts`);

  // (2) La copia recortada: sólo el árbol.
  const rec = `tests/${ORDEN}-${RECORTADA[REPO]}.test.ts`;
  const texto = leer(rec);
  assert.ok(!RED.test(texto), `${rec} no sale a la red ni a Firestore (nombra «${texto.match(RED)?.[0]}»)`);
  assert.match(texto, /\bdesciende\(/, `${rec} conserva la condición del árbol (desciende del rojo de ${ORDEN})`);
  assert.match(texto, /\brojoDe\(\s*\w+,\s*ORDEN\s*\)|rojoDe\([^)]*cierre-tramo-01/, `${rec} toma el rojo de ${ORDEN} con rojoDe`);

  // (3) npm test las corre; en T, la fase por letra.
  const scripts = JSON.parse(leer("package.json")).scripts ?? {};
  const nombra = (script: string, archivo: string) => String(script ?? "").split(/\s+/).map((t) => t.replace(/^["']|["']$/g, "")).some((t) => t === archivo || (t.includes("*") && matchesGlob(archivo, t)));
  for (const [i, c] of copias.entries()) {
    assert.ok(["test", "test:unit", "test:browser"].some((s) => nombra(scripts[s], c)), `npm test no corre ${c}`);
    if (REPO !== "T") continue;
    const fase = NAVEGADOR_T.includes(LETRAS.T[i]) ? "test:browser" : "test:unit";
    assert.ok(nombra(scripts[fase], c), `en T, ${c} va en ${fase} (D-57, D-121)`);
  }

  // (4) La carpeta de la orden, congelada desde su último rojo.
  const rojo = git(ROOT, "log", "-1", "--format=%H", "--diff-filter=A", "main", "--", `${CARPETA}/HOJA.md`);
  assert.ok(rojo.startsWith(CIERRE_TRAMO_01.rojo[REPO]), `el último rojo de ${ORDEN} en ${REPO} es ${CIERRE_TRAMO_01.rojo[REPO]} (git da ${rojo.slice(0, 7)})`);
  assert.equal(git(ROOT, "log", "--format=%h %s", "--diff-filter=MDR", `${rojo}..main`, "--", `${CARPETA}/`), "", `${CARPETA}/ sigue congelada desde su último rojo`);
});
