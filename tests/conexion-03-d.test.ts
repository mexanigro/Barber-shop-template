// CONEXION-03 · D · retiro de CONEXION-02: las copias editables en npm test (H a, b, d, e = 6 tests; T b, c, d, e = 5, con la `c`
// recortada a la parte de recrear de C1 —sin `show` ni nada de H, inciso n, D-19) y la carpeta congelada desde su último rojo. La línea
// de tests/orden/APROBADAS.md ya la escribió Liam al aprobar. Sesión A (2026-09-22): test rojo (no hay copias). Caja negra: git del repo
// real y el runner sobre las copias. Un mismo archivo en T y en H (cmp → 0).
// CONEXION-04 D1 (2026-09-22): copia editable promovida a npm test (la orden está aprobada y retirada de rojo-verde --todas; el
// original de la carpeta congelada no se toca).
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { matchesGlob, resolve } from "node:path";
import { CONEXION_02, REPO, ROOT, cuentaTests, git } from "./orden/conexion-03/_util.ts";

const LETRAS = { H: ["a", "b", "d", "e"], T: ["b", "c", "d", "e"] };
const TOTAL = { H: 6, T: 5 };
const CARPETA = "tests/orden/conexion-02";

test("npm test corre las copias tests/conexion-02-a.test.ts, -b, -d, -e en H (6 tests) y tests/conexion-02-b.test.ts, -c, -d, -e en T (5 tests: la copia `c` conserva sólo la parte de recrear de C1, sin `show` ni nada de H, inciso n), que importan ./orden/conexion-02/_util.ts; pasan 6/6 y 5/5; tests/orden/conexion-02/ no cambia desde su último rojo (25d5be7 en T, f1e25f1 en H)", () => {
  const letras = LETRAS[REPO], total = TOTAL[REPO];
  const copias = letras.map((s) => `tests/conexion-02-${s}.test.ts`);
  for (const c of copias) assert.ok(existsSync(resolve(ROOT, c)), `falta ${c} en ${REPO}`);
  for (const c of copias) assert.ok(/from "\.\/orden\/conexion-02\/_util\.ts"/.test(readFileSync(resolve(ROOT, c), "utf8")), `${c} debe importar ./orden/conexion-02/_util.ts`);
  // Los tests que quedan tras el recorte por repo (D-19): en total, 6 en H y 5 en T.
  const suma = copias.reduce((n, c) => n + cuentaTests(readFileSync(resolve(ROOT, c), "utf8")), 0);
  assert.equal(suma, total, `las copias de ${REPO} suman ${total} tests (suman ${suma}: ${copias.map((c) => `${c}=${cuentaTests(readFileSync(resolve(ROOT, c), "utf8"))}`).join(", ")})`);
  // Inciso n: la copia `c` de T no mira a H.
  if (REPO === "T") {
    const c = readFileSync(resolve(ROOT, "tests/conexion-02-c.test.ts"), "utf8");
    for (const prohibido of ["b4-tenant", "RAIZ_H", ".env.local", "configDeShow"]) assert.ok(!c.includes(prohibido), `la copia c de T no debe nombrar «${prohibido}» (inciso n: ninguna afirmación de T mira a H)`);
  }
  // npm test los corre: el script `test` de package.json los nombra (T) o los cubre con un glob (H).
  const script = String(JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8")).scripts?.test ?? "");
  const tokens = script.split(/\s+/).map((t) => t.replace(/^["']|["']$/g, ""));
  for (const c of copias) assert.ok(tokens.some((t) => t === c || (t.includes("*") && matchesGlob(c, t))), `npm test no corre ${c}: ${script}`);
  // «Y pasan»: lo comprueba npm test al correr las copias de conexion-02 (D-13); esta copia no las vuelve a correr.
  // CONEXION-04-B2: dos cadenas anidadas dentro de la misma suite corrían rojo-verde a la vez y se contaban los restos entre sí.
  // La carpeta de la orden sigue congelada: el último commit de main que añade su HOJA.md es el esperado y ninguno posterior la toca.
  const rojo = git(ROOT, "log", "-1", "--format=%H", "--diff-filter=A", "main", "--", `${CARPETA}/HOJA.md`);
  assert.ok(rojo.startsWith(CONEXION_02.rojo[REPO]), `el último rojo de conexion-02 en ${REPO} es ${CONEXION_02.rojo[REPO]} (git da ${rojo.slice(0, 7)})`);
  assert.equal(git(ROOT, "log", "--format=%h %s", "--diff-filter=MDR", `${rojo}..main`, "--", `${CARPETA}/`), "", `${CARPETA}/ sigue congelada desde su último rojo`);
});
