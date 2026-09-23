// CONEXION-07 · D · retiro de CONEXION-06 (D-78): aprobada en tests/orden/APROBADAS.md (rojo-verde --todas la salta) y promovida a
// npm test como copias editables (H: a, d, e = 9 tests que corren; T: b, d, e = 5), con su carpeta congelada desde el último rojo.
// COPIA PROMOVIDA (CONEXION-08, 2026-09-23): la carpeta `tests/orden/conexion-07/` queda congelada y esta copia es la editable. Único
// cambio respecto del original: la reproducción de HEAD excluye las órdenes vivas calculadas EN EL MOMENTO (`excluidas`, CONEXION-07
// pieza 5) en vez de una lista de ids escrita a mano, que se rompe con cada orden nueva.
// Caja negra: git del repo real, `rojo-verde --todas --repo <tmp>` sobre una reproducción de HEAD sin las órdenes vivas, y lectura de
// las copias (D2 NO las corre). Un mismo archivo en T y en H (cmp → 0): las copias y el conteo se eligen por REPO.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { matchesGlob, resolve } from "node:path";
import { CONEXION_06, REPO, ROOT, conTemporal, cuentaTests, cuentaTestsDe, git, ordenesVivas, reproducirHead, rojoVerdeTodas } from "./orden/conexion-07/_comun.ts";

const LETRAS = { H: ["a", "d", "e"], T: ["b", "d", "e"] };
/** Tests que CORREN en cada repo (las copias van enteras; los `test(` guardados por REPO no corren en el otro). */
const TOTAL = { H: 9, T: 5 };
const CARPETA = "tests/orden/conexion-06";
/** Las trece órdenes ya retiradas antes de esta (control de que ninguna vuelve a correr). */
const RETIRADAS = [
  ["verdad-02", "2026-09-20"], ["verdad-03", "2026-09-21"], ["verdad-04", "2026-09-21"], ["verdad-05", "2026-09-21"],
  ["conexion-01", "2026-09-21"], ["verdad-06", "2026-09-21"], ["verdad-07", "2026-09-22"], ["conexion-02", "2026-09-22"],
  ["conexion-03", "2026-09-22"], ["conexion-04", "2026-09-22"], ["verdad-08", "2026-09-22"], ["verdad-09", "2026-09-22"],
  ["conexion-05", "2026-09-23"],
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

test("conexion-06 figura en tests/orden/APROBADAS.md con fecha 2026-09-23, T b5b78f7 y H 07739a1, y rojo-verde --todas en HEAD imprime «conexion-06 · retirada (aprobada 2026-09-23)» y no «orden conexion-06 ·»", () => {
  const aprobadas = git(ROOT, "show", "HEAD:tests/orden/APROBADAS.md");
  const esperada = `- conexion-06 · aprobada 2026-09-23 · T ${CONEXION_06.aprobado.T} · H ${CONEXION_06.aprobado.H}`;
  assert.ok(aprobadas.split(/\r?\n/).some((l) => l.trim() === esperada), `HEAD:tests/orden/APROBADAS.md debe tener «${esperada}»:\n${aprobadas}`);
  // --todas «en HEAD» sin correr estos mismos tests (que a su vez correrían --todas): HEAD se reproduce sin las órdenes vivas.
  conTemporal((base) => {
    const { repo, ids } = reproducirHead(base, excluidas("conexion-07"));
    assert.ok(ids.includes("conexion-06"), `la reproducción lleva ${CARPETA}/ (ids: ${ids.join(", ")})`);
    assert.ok(!ids.includes("conexion-07"), "la reproducción no lleva tests/orden/conexion-07/");
    const r = rojoVerdeTodas(repo.dir);
    assert.equal(r.status, 0, `--todas sobre la reproducción de HEAD debe salir 0 (salió ${r.status})\n${r.out.slice(-3000)}`);
    assert.match(r.stdout, /^conexion-06 · retirada \(aprobada 2026-09-23\)$/m, `debe decir «conexion-06 · retirada (aprobada 2026-09-23)»\n${r.stdout}`);
    assert.doesNotMatch(r.stdout, /orden conexion-06 ·/, `no debe imprimir la tabla de conexion-06\n${r.stdout}`);
    assert.doesNotMatch(r.stdout, /conexion-06 · rojo pendiente de B/, "conexion-06 ya no está pendiente de B");
    for (const [id, fecha] of RETIRADAS) assert.match(r.stdout, new RegExp(`^${id} · retirada \\(aprobada ${fecha}\\)$`, "m"), `control: ${id} sigue retirada`);
  });
});

test("npm test corre las copias tests/conexion-06-a.test.ts, -d, -e en H (9 tests) y tests/conexion-06-b.test.ts, -d, -e en T (5 tests), que importan ./orden/conexion-06/_comun.ts, sin recorte y sin volver a correr copias anteriores; en T van a `test:unit`; tests/orden/conexion-06/ no cambia desde su último rojo (014523d en T, 6ad11a4 en H)", () => {
  const leer = (rel: string) => readFileSync(resolve(ROOT, rel), "utf8");
  const letras = LETRAS[REPO];
  const copias = letras.map((s) => `tests/conexion-06-${s}.test.ts`);
  for (const c of copias) assert.ok(existsSync(resolve(ROOT, c)), `falta ${c} en ${REPO}`);
  for (const c of copias) assert.match(leer(c), /from "\.\/orden\/conexion-06\/_comun\.ts"/, `${c} debe importar ./orden/conexion-06/_comun.ts`);
  // Sin recorte: cada copia lleva tantos `test(` como su original en la carpeta congelada (los guardados por REPO no corren en el otro).
  for (const s of letras) {
    assert.equal(cuentaTests(leer(`tests/conexion-06-${s}.test.ts`)), cuentaTests(leer(`${CARPETA}/${s}.test.ts`)), `la copia ${s} lleva los mismos tests que ${CARPETA}/${s}.test.ts (entera)`);
  }
  assert.equal(letras.reduce((n, s) => n + cuentaTestsDe(leer(`tests/conexion-06-${s}.test.ts`), REPO), 0), TOTAL[REPO], `en ${REPO} las copias suman ${TOTAL[REPO]} tests que corren`);
  // Sin volver a correr copias anteriores: la copia que reproduce HEAD excluye TODA orden viva (si no, --todas correría esta misma).
  const vivas = [...new Set([...ordenesVivas(ROOT), "conexion-07"])];
  for (const c of copias) {
    const src = leer(c);
    if (!src.includes("reproducirHead(")) continue;
    assert.match(src, /reproducirHead\([^,]+,\s*excluidas\(/, `${c} reproduce HEAD: debe excluir las órdenes vivas con excluidas(), no con una lista escrita a mano`);
    for (const id of vivas) assert.ok(!src.includes(`"${id}"`), `${c} no debe nombrar la orden viva «${id}» (una lista fija se rompe con cada orden nueva)`);
  }
  // npm test las corre: los scripts de package.json las nombran (en T, `test:unit`, porque `test` encadena las fases, D-57) o las cubren con un glob (H).
  const scripts = JSON.parse(leer("package.json")).scripts ?? {};
  const nombra = (script: string, archivo: string) => String(script ?? "").split(/\s+/).map((t) => t.replace(/^["']|["']$/g, "")).some((t) => t === archivo || (t.includes("*") && matchesGlob(archivo, t)));
  for (const c of copias) {
    assert.ok(["test", "test:unit", "test:browser"].some((s) => nombra(scripts[s], c)), `npm test no corre ${c}`);
    if (REPO === "T") {
      assert.ok(nombra(scripts["test:unit"], c), `en T, ${c} va en la fase concurrente test:unit`);
      assert.doesNotMatch(leer(c), new RegExp(`from ${JSON.stringify("play" + "wright")}`), `${c} no importa playwright (por eso va en test:unit)`);
    }
  }
  // La carpeta de la orden sigue congelada: el último commit de main que añade su HOJA.md es el esperado y ninguno posterior la toca.
  const rojo = git(ROOT, "log", "-1", "--format=%H", "--diff-filter=A", "main", "--", `${CARPETA}/HOJA.md`);
  assert.ok(rojo.startsWith(CONEXION_06.rojo[REPO]), `el último rojo de conexion-06 en ${REPO} es ${CONEXION_06.rojo[REPO]} (git da ${rojo.slice(0, 7)})`);
  assert.equal(git(ROOT, "log", "--format=%h %s", "--diff-filter=MDR", `${rojo}..main`, "--", `${CARPETA}/`), "", `${CARPETA}/ sigue congelada desde su último rojo`);
});
