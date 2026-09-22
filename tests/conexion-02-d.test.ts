// CONEXION-02 · D · promoción de verdad-07 (D-37): copias editables a–e en npm test (11 tests en T y en H) y carpeta congelada desde su
// rojo. El retiro (la línea de tests/orden/APROBADAS.md) lo escribe la sesión A en su commit rojo (D-38): no hay D1. Sesión A
// (2026-09-22): test rojo. Caja negra: git del repo real y el runner sobre las copias. Mismo patrón que VERDAD-07 D2. Un mismo archivo
// en T y en H (cmp → 0).
// CONEXION-03 D1 (2026-09-22): copia editable promovida a npm test (la orden está aprobada y retirada de rojo-verde --todas; el
// original de la carpeta congelada no se toca).
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { matchesGlob, resolve } from "node:path";
import { git, REPO, ROOT, VERDAD_07 } from "./orden/conexion-02/_util.ts";

test("npm test corre las copias tests/verdad-07-a.test.ts, -b, -c, -d, -e en T y en H (11 tests cada uno), que importan ./orden/verdad-07/_util.ts, sin recorte; pasan 11/11; tests/orden/verdad-07/ no cambia desde su último rojo (b051c89 en T, 296a755 en H)", () => {
  const letras = ["a", "b", "c", "d", "e"];
  const total = 11;
  const copias = letras.map((s) => `tests/verdad-07-${s}.test.ts`);
  for (const c of copias) assert.ok(existsSync(resolve(ROOT, c)), `falta ${c}`);
  for (const c of copias) assert.ok(/from "\.\/orden\/verdad-07\/_util\.ts"/.test(readFileSync(resolve(ROOT, c), "utf8")), `${c} debe importar ./orden/verdad-07/_util.ts`);
  // Sin recorte (D-37): cada copia tiene tantos `test(` como su original en tests/orden/verdad-07/.
  const cuenta = (archivo: string) => (readFileSync(resolve(ROOT, archivo), "utf8").match(/^test\(/gm) ?? []).length;
  for (const s of letras) assert.equal(cuenta(`tests/verdad-07-${s}.test.ts`), cuenta(`tests/orden/verdad-07/${s}.test.ts`), `la copia ${s} lleva los mismos tests que tests/orden/verdad-07/${s}.test.ts (entera)`);
  assert.equal(letras.reduce((n, s) => n + cuenta(`tests/orden/verdad-07/${s}.test.ts`), 0), total, `precondición: la orden tiene ${total} tests en ${REPO}`);
  // npm test los corre: el script `test` de package.json los nombra (T) o los cubre con un glob (H).
  const script = String(JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8")).scripts?.test ?? "");
  const tokens = script.split(/\s+/).map((t) => t.replace(/^["']|["']$/g, ""));
  for (const c of copias) assert.ok(tokens.some((t) => t === c || (t.includes("*") && matchesGlob(c, t))), `npm test no corre ${c}: ${script}`);
  // «Y pasan (11/11)»: lo comprueba npm test al correr las copias de verdad-07 (D-13); esta copia no las vuelve a correr.
  // CONEXION-04-B2: dos cadenas anidadas dentro de la misma suite corrían rojo-verde a la vez y se contaban los restos entre sí.
  // tests/orden/verdad-07/ no cambia desde su último rojo: el último commit de main que añade su HOJA.md es el esperado y ningún commit
  // posterior modifica, borra ni renombra lo que hay.
  const rojo = git(ROOT, "log", "-1", "--format=%H", "--diff-filter=A", "main", "--", "tests/orden/verdad-07/HOJA.md");
  assert.ok(rojo.startsWith(VERDAD_07.rojo[REPO]), `el último rojo de verdad-07 en ${REPO} es ${VERDAD_07.rojo[REPO]} (git da ${rojo.slice(0, 7)})`);
  assert.equal(git(ROOT, "log", "--format=%h %s", "--diff-filter=MDR", `${rojo}..main`, "--", "tests/orden/verdad-07/"), "", "tests/orden/verdad-07/ sigue congelada desde su último rojo");
});
