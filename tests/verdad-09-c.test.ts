// VERDAD-09 · C · retiro de VERDAD-08 (D-63): aprobada en tests/orden/APROBADAS.md (rojo-verde --todas la salta) y promovida a
// npm test como copias editables, con su carpeta congelada desde el último rojo. La línea de APROBADAS.md la escribe la sesión B.
// Sesión A (2026-09-22): tests rojos — no está la línea ni están las copias.
// C2 NO corre las copias: el verde de las copias lo da `npm test` al correrlas (D-13); aquí se comprueba que están enteras (mismos
// `test(` que su original en la carpeta congelada), que suman las afirmaciones de su HOJA por repo y que ninguna vuelve a correr las
// órdenes de HEAD (`reproducirHead` + `--todas` anidaría esta misma orden, que todavía está viva). Un mismo archivo T/H (cmp → 0).
// CONEXION-05 D1/D2 (2026-09-23): copia editable promovida a npm test (VERDAD-09 está aprobada y retirada de rojo-verde --todas; el
// original en la carpeta congelada de la orden queda como estaba). C1 deja de reproducir HEAD y de correr `--todas` (HEAD lleva
// conexion-05, viva: dentro de `npm test` sería recursión), como hizo VERDAD-09 C2 con la copia `e` de verdad-08.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { matchesGlob, resolve } from "node:path";
import { REPO, ROOT, VERDAD_08, cuentaTests, git, leer } from "./orden/verdad-09/_comun.ts";

const LETRAS = { T: ["a", "b", "c", "d", "e", "f"], H: ["a", "b", "c", "e", "f"] };
/** Tests que CORREN en cada repo = afirmaciones de la HOJA de verdad-08 para ese repo (D1 y D2 van sólo en T). */
const TOTAL = { T: 11, H: 9 };
const CARPETA = "tests/orden/verdad-08";

test("verdad-08 figura en tests/orden/APROBADAS.md con fecha 2026-09-22, T 139a2f8 y H 5737d30, y rojo-verde --todas en HEAD imprime «verdad-08 · retirada (aprobada 2026-09-22)» y no «orden verdad-08 ·»", () => {
  const aprobadas = git(ROOT, "show", "HEAD:tests/orden/APROBADAS.md");
  const esperada = `- verdad-08 · aprobada 2026-09-22 · T ${VERDAD_08.aprobado.T} · H ${VERDAD_08.aprobado.H}`;
  assert.ok(aprobadas.split(/\r?\n/).some((l) => l.trim() === esperada), `HEAD:tests/orden/APROBADAS.md debe tener «${esperada}»:\n${aprobadas}`);
  // CONEXION-05 D2: la copia no reproduce HEAD ni corre `--todas` (HEAD lleva órdenes vivas y esta copia corre dentro de `npm test`:
  // sería recursión y volvería a correr las copias anteriores). Lo que hace que rojo-verde salte a verdad-08 es esa línea de
  // APROBADAS.md, que es justo lo que se comprueba arriba; aquí queda el control de que su carpeta sigue en el árbol, congelada.
  assert.ok(existsSync(resolve(ROOT, `${CARPETA}/HOJA.md`)), `${CARPETA}/ sigue en el árbol, congelada`);
});

test("npm test corre las copias tests/verdad-08-a.test.ts, -b, -c, -d, -e, -f en T (11 tests) y -a, -b, -c, -e, -f en H (9 tests), que importan ./orden/verdad-08/_util.ts, sin recorte y sin volver a correr copias anteriores; la copia `a` adapta A2 al inciso m (no exige un número exacto de `_util.ts` congelados); en T van a `test:unit` (ninguna importa `playwright`); tests/orden/verdad-08/ no cambia desde su último rojo (519a892 en T, bd6e61f en H)", () => {
  const letras = LETRAS[REPO];
  const copias = letras.map((s) => `tests/verdad-08-${s}.test.ts`);
  for (const c of copias) assert.ok(existsSync(resolve(ROOT, c)), `falta ${c} en ${REPO}`);
  for (const c of copias) assert.match(leer(c), /from "\.\/orden\/verdad-08\/_util\.ts"/, `${c} debe importar ./orden/verdad-08/_util.ts`);
  // Sin recorte: cada copia lleva tantos `test(` como su original en la carpeta congelada, y entre todas suman las afirmaciones del repo.
  for (const s of letras) {
    assert.equal(cuentaTests(leer(`tests/verdad-08-${s}.test.ts`)), cuentaTests(leer(`${CARPETA}/${s}.test.ts`)), `la copia ${s} lleva los mismos tests que ${CARPETA}/${s}.test.ts (entera)`);
  }
  assert.equal(letras.reduce((n, s) => n + cuentaTests(leer(`tests/verdad-08-${s}.test.ts`)), 0), TOTAL[REPO], `las copias de ${REPO} suman ${TOTAL[REPO]} tests`);
  // Sin volver a correr copias anteriores: ninguna reproduce HEAD ni corre `--todas` (HEAD lleva verdad-09, viva: sería recursión).
  for (const c of copias) {
    assert.doesNotMatch(leer(c), /reproducirHead\(|rojoVerdeTodas\(/, `${c} no reproduce HEAD ni corre --todas: volvería a correr las órdenes vivas de HEAD`);
  }
  // Inciso m: la copia `a` no puede exigir un número exacto de `_util.ts` congelados (cada orden nueva añade uno y la tumbaría).
  assert.doesNotMatch(leer("tests/verdad-08-a.test.ts"), /\.length,\s*\d+/, "la copia `a` de verdad-08 adapta A2 al inciso m: no cuenta las órdenes con `_util.ts`");
  // npm test las corre: los scripts de package.json las nombran (en T, `test:unit`, porque `test` encadena las fases, D-57) o las cubren con un glob (H).
  const scripts = JSON.parse(leer("package.json")).scripts ?? {};
  const nombra = (script: string, archivo: string) => String(script ?? "").split(/\s+/).map((t) => t.replace(/^["']|["']$/g, "")).some((t) => t === archivo || (t.includes("*") && matchesGlob(archivo, t)));
  for (const c of copias) {
    const enAlguno = ["test", "test:unit", "test:browser"].some((s) => nombra(scripts[s], c));
    assert.ok(enAlguno, `npm test no corre ${c}`);
    if (REPO === "T") {
      assert.ok(nombra(scripts["test:unit"], c), `en T, ${c} va en la fase concurrente test:unit`);
      // El literal se arma en dos trozos a propósito (como `tests/suite-fases.test.ts`): esta copia corre en `test:unit` y pasa
      // por ese guard, que busca el import de navegador por texto.
      assert.doesNotMatch(leer(c), new RegExp(`from ${JSON.stringify("play" + "wright")}`), `${c} no importa playwright (por eso va en test:unit)`);
    }
  }
  // La carpeta de la orden sigue congelada: el último commit de main que añade su HOJA.md es el esperado y ninguno posterior la toca.
  const rojo = git(ROOT, "log", "-1", "--format=%H", "--diff-filter=A", "main", "--", `${CARPETA}/HOJA.md`);
  assert.ok(rojo.startsWith(VERDAD_08.rojo[REPO]), `el último rojo de verdad-08 en ${REPO} es ${VERDAD_08.rojo[REPO]} (git da ${rojo.slice(0, 7)})`);
  assert.equal(git(ROOT, "log", "--format=%h %s", "--diff-filter=MDR", `${rojo}..main`, "--", `${CARPETA}/`), "", `${CARPETA}/ sigue congelada desde su último rojo`);
});
