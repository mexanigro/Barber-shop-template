// CONEXION-04 · D · retiro de CONEXION-03: aprobada en tests/orden/APROBADAS.md (rojo-verde --todas la salta) y promovida a npm test
// como copias editables (H: a, b, d, e = 7 tests que corren; T: b, c, d, e = 5), con su carpeta congelada desde el último rojo. La línea
// de APROBADAS.md la escribe la sesión B (D1 de su orden). Sesión A (2026-09-22): tests rojos — no está la línea ni están las copias.
// Caja negra: git del repo real, `rojo-verde --todas --repo <tmp>` sobre una reproducción de HEAD sin conexion-04/, y el runner sobre
// las copias. Un mismo archivo en T y en H (cmp → 0): las copias se eligen por REPO.
// VERDAD-08 E2 (2026-09-22): copia editable promovida a npm test (la orden está aprobada y retirada de rojo-verde --todas; el
// original de la carpeta congelada no se toca).
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { matchesGlob, resolve } from "node:path";
import { CONEXION_03, REPO, ROOT, conTemporal, cuentaTests, git, reproducirHead, rojoVerdeTodas } from "./orden/conexion-04/_util.ts";

const LETRAS = { H: ["a", "b", "d", "e"], T: ["b", "c", "d", "e"] };
/** Tests que CORREN en cada repo (las copias van enteras; los `test(` guardados por REPO no corren en el otro). */
const TOTAL = { H: 7, T: 5 };
const CARPETA = "tests/orden/conexion-03";
/** Las ocho órdenes ya retiradas antes de esta (control de que ninguna vuelve a correr). */
const RETIRADAS = [
  ["verdad-02", "2026-09-20"], ["verdad-03", "2026-09-21"], ["verdad-04", "2026-09-21"], ["verdad-05", "2026-09-21"],
  ["conexion-01", "2026-09-21"], ["verdad-06", "2026-09-21"], ["verdad-07", "2026-09-22"], ["conexion-02", "2026-09-22"],
];

/** La orden que esta copia promueve más toda orden que HEAD lleva VIVA (carpeta en `tests/orden/` sin su línea «- <id> · aprobada»
 *  en `HEAD:tests/orden/APROBADAS.md`): `--todas` correría entera cualquiera que quedara dentro de la reproducción, incluida la que
 *  está escribiendo esta misma suite. Se calcula en el momento (CONEXION-07, pieza 5): una lista de ids escrita a mano se rompe con
 *  cada orden nueva. */
function excluidas(propia: string): string[] {
  const aprobadas = git(ROOT, "show", "HEAD:tests/orden/APROBADAS.md");
  const vivas = git(ROOT, "ls-tree", "--name-only", "-d", "HEAD:tests/orden/")
    .split(/\r?\n/).map((s) => s.trim().replace(/\/$/, "")).filter(Boolean)
    .filter((id) => !new RegExp(`^- ${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} · aprobada`, "m").test(aprobadas));
  return [...new Set([propia, ...vivas])];
}

test("conexion-03 figura en tests/orden/APROBADAS.md con fecha 2026-09-22, T 4c44c0c y H 47d2908, y rojo-verde --todas en HEAD imprime «conexion-03 · retirada (aprobada 2026-09-22)» y no «orden conexion-03 ·»", () => {
  const aprobadas = git(ROOT, "show", "HEAD:tests/orden/APROBADAS.md");
  const esperada = `- conexion-03 · aprobada 2026-09-22 · T ${CONEXION_03.aprobado.T} · H ${CONEXION_03.aprobado.H}`;
  assert.ok(aprobadas.split(/\r?\n/).some((l) => l.trim() === esperada), `HEAD:tests/orden/APROBADAS.md debe tener «${esperada}»:\n${aprobadas}`);
  // --todas «en HEAD» sin correr estos mismos tests (que a su vez correrían --todas): HEAD se reproduce en un repo temporal sin
  // conexion-04/ y sin ninguna orden viva, que --todas correría entera dentro de la suite.
  conTemporal((base) => {
    const { repo, ids } = reproducirHead(base, excluidas("conexion-04"));
    assert.ok(ids.includes("conexion-03"), `la reproducción lleva tests/orden/conexion-03/ (ids: ${ids.join(", ")})`);
    assert.ok(!ids.includes("conexion-04"), "la reproducción no lleva tests/orden/conexion-04/");
    const r = rojoVerdeTodas(repo.dir);
    assert.equal(r.status, 0, `--todas con las nueve órdenes aprobadas debe salir 0 (salió ${r.status})\n${r.out.slice(-3000)}`);
    assert.match(r.stdout, /^conexion-03 · retirada \(aprobada 2026-09-22\)$/m, `debe decir «conexion-03 · retirada (aprobada 2026-09-22)»\n${r.stdout}`);
    assert.doesNotMatch(r.stdout, /orden conexion-03 ·/, `no debe imprimir la tabla de conexion-03\n${r.stdout}`);
    assert.doesNotMatch(r.stdout, /conexion-03 · rojo pendiente de B/, "conexion-03 ya no está pendiente de B");
    for (const [id, fecha] of RETIRADAS) assert.match(r.stdout, new RegExp(`^${id} · retirada \\(aprobada ${fecha}\\)$`, "m"), `control: ${id} sigue retirada`);
  });
});

test("npm test corre las copias tests/conexion-03-a.test.ts, -b, -d, -e en H (7 tests) y tests/conexion-03-b.test.ts, -c, -d, -e en T (5 tests), que importan ./orden/conexion-03/_util.ts, sin recorte (la `c` de T conserva su C1 entera: recrear sin Firestore); pasan 7/7 y 5/5; tests/orden/conexion-03/ no cambia desde su último rojo (5754669 en T, 8b3eb95 en H)", () => {
  const letras = LETRAS[REPO], total = TOTAL[REPO];
  const copias = letras.map((s) => `tests/conexion-03-${s}.test.ts`);
  for (const c of copias) assert.ok(existsSync(resolve(ROOT, c)), `falta ${c} en ${REPO}`);
  for (const c of copias) assert.ok(/from "\.\/orden\/conexion-03\/_util\.ts"/.test(readFileSync(resolve(ROOT, c), "utf8")), `${c} debe importar ./orden/conexion-03/_util.ts`);
  // Sin recorte: cada copia lleva tantos `test(` como su original en tests/orden/conexion-03/ (los guardados por REPO no corren en el otro repo).
  const cuenta = (archivo: string) => cuentaTests(readFileSync(resolve(ROOT, archivo), "utf8"));
  for (const s of letras) assert.equal(cuenta(`tests/conexion-03-${s}.test.ts`), cuenta(`${CARPETA}/${s}.test.ts`), `la copia ${s} lleva los mismos tests que ${CARPETA}/${s}.test.ts (entera)`);
  // npm test los corre: el script `test` de package.json los nombra (T) o los cubre con un glob (H).
  // VERDAD-08 (D-57): en T `npm test` encadena dos fases y la lista de archivos vive en `test:unit` y `test:browser`; en H sigue
  // siendo el glob de `test`. La lista que corre npm es la unión de las tres.
  const npmScripts = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8")).scripts ?? {};
  const script = [npmScripts.test, npmScripts["test:unit"], npmScripts["test:browser"]].filter(Boolean).join(" ");
  const tokens = script.split(/\s+/).map((t) => t.replace(/^["']|["']$/g, ""));
  for (const c of copias) assert.ok(tokens.some((t) => t === c || (t.includes("*") && matchesGlob(c, t))), `npm test no corre ${c}: ${script}`);
  // «Y pasan»: lo comprueba npm test al correr las copias de conexion-03 (D-13); esta copia no las vuelve a correr.
  // CONEXION-04-B2: dos cadenas anidadas dentro de la misma suite corrían rojo-verde a la vez y se contaban los restos entre sí.
  // Lo que sí se cuenta aquí: las afirmaciones que la HOJA de conexion-03 declara para este repo (7 en H, 5 en T).
  const afirmaciones = readFileSync(resolve(ROOT, `${CARPETA}/HOJA.md`), "utf8").split(/\r?\n/)
    .map((l) => l.match(/^- \[[^\]]+\] \((T\+H|T|H)\) /)).filter((m) => m && (m[1] === "T+H" || m[1] === REPO));
  assert.equal(afirmaciones.length, total, `${CARPETA}/HOJA.md declara ${total} afirmaciones para ${REPO}`);
  // La carpeta de la orden sigue congelada: el último commit de main que añade su HOJA.md es el esperado y ninguno posterior la toca.
  const rojo = git(ROOT, "log", "-1", "--format=%H", "--diff-filter=A", "main", "--", `${CARPETA}/HOJA.md`);
  assert.ok(rojo.startsWith(CONEXION_03.rojo[REPO]), `el último rojo de conexion-03 en ${REPO} es ${CONEXION_03.rojo[REPO]} (git da ${rojo.slice(0, 7)})`);
  assert.equal(git(ROOT, "log", "--format=%h %s", "--diff-filter=MDR", `${rojo}..main`, "--", `${CARPETA}/`), "", `${CARPETA}/ sigue congelada desde su último rojo`);
});
