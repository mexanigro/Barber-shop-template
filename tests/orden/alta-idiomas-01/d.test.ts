// ALTA-IDIOMAS-01 · D1 (T) · retiro de AUDITORIA-01 (D-235): promovida a npm test como copias editables, con su carpeta congelada
// desde el último rojo. Sesión A (2026-10-05): test rojo. La línea de APROBADAS.md la escribe A en este mismo commit rojo (precedente
// D-38/D-146/D-159/D-172/D-188/D-201/D-213/D-226): por eso no es una afirmación —ya no puede estar en rojo—.
// D-244 (como D-210/D-221/D-232): se promueven las letras que afirman producto —en T `a` (A1), `b` (B1) y `c` (C1 y C2)—, no la de
// retiro (`d`) ni la de registro (`e`). En H, AUDITORIA-01 sólo tiene `d` y `e`: no hay nada que promover y esta afirmación es sólo de
// T. Ninguna de las tres es «, webs» ni sale a las webs desplegadas: se promueven enteras. Las tres abren Chromium —`a` en este
// proceso; `b` (modo-paleta en un clon) y `c` (`e2e.mjs` en C2) como proceso hijo— y van a `test:browser` (D-57, D-230). Medido por A
// (2026-10-05, corridas solas en HEAD 907f5dc, en serie): a 55 s, b 39 s, c 73 s → 167 s más a `test:browser`.
// Caja negra: git del repo real y lectura de las copias.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { matchesGlob, resolve } from "node:path";
import { AUDITORIA_01, ROOT, git } from "./_comun.ts";

const LETRAS = ["a", "b", "c"];
const ORDEN = "auditoria-01";
const CARPETA = `tests/orden/${ORDEN}`;

test("npm test corre las copias de auditoria-01 que esta hoja promueve —en T `a`, `b` y `c`, enteras y las tres en `test:browser`—, que importan ./orden/auditoria-01/_comun.ts; y tests/orden/auditoria-01/ no cambia desde su último rojo (9045107)", () => {
  const leer = (rel: string) => readFileSync(resolve(ROOT, rel), "utf8");
  const copias = LETRAS.map((s) => `tests/${ORDEN}-${s}.test.ts`);
  // (1) Las copias. Hoy no existen: aquí está el rojo.
  for (const c of copias) assert.ok(existsSync(resolve(ROOT, c)), `falta ${c} en T`);
  for (const c of copias) assert.match(leer(c), new RegExp(`from "\\./orden/${ORDEN}/_comun\\.ts"`), `${c} debe importar ./orden/${ORDEN}/_comun.ts`);
  for (const [i, c] of copias.entries()) {
    const original = leer(`${CARPETA}/${LETRAS[i]}.test.ts`);
    const nombres = [...original.matchAll(/^test\("((?:[^"\\]|\\.)*)"/gm)].map((x) => x[1]);
    for (const n of nombres) assert.ok(leer(c).includes(`test("${n}"`), `${c} conserva el test «${n.slice(0, 60)}…» (se promueve entera)`);
  }
  // (2) npm test las corre, en test:browser.
  const scripts = JSON.parse(leer("package.json")).scripts ?? {};
  const nombra = (script: string, archivo: string) => String(script ?? "").split(/\s+/).map((t) => t.replace(/^["']|["']$/g, "")).some((t) => t === archivo || (t.includes("*") && matchesGlob(archivo, t)));
  for (const c of copias) {
    assert.ok(nombra(scripts["test:browser"], c), `en T, ${c} va en test:browser (abre Chromium: D-57, D-230)`);
    assert.ok(!nombra(scripts["test:unit"], c), `${c} no va también en test:unit`);
  }
  // (3) La carpeta de la orden, congelada desde su último rojo.
  const rojo = git(ROOT, "log", "-1", "--format=%H", "--diff-filter=A", "main", "--", `${CARPETA}/HOJA.md`);
  assert.ok(rojo.startsWith(AUDITORIA_01.rojo.T), `el último rojo de ${ORDEN} en T es ${AUDITORIA_01.rojo.T} (git da ${rojo.slice(0, 7)})`);
  assert.equal(git(ROOT, "log", "--format=%h %s", "--diff-filter=MDR", `${rojo}..main`, "--", `${CARPETA}/`), "", `${CARPETA}/ sigue congelada desde su último rojo`);
});
