// CONEXION-08 · D · retiro de CONEXION-07 (D-84): aprobada en tests/orden/APROBADAS.md (rojo-verde --todas la salta) y promovida a
// npm test como copias editables (T: a, b, c, d, e = 6 tests; H: d, e = 3), con su carpeta congelada desde el último rojo.
// La línea de APROBADAS.md la escribe la sesión B. Sesión A (2026-09-23): tests rojos — no está la línea ni están las copias.
// Caja negra: git del repo real, `rojo-verde --todas --repo <tmp>` sobre una reproducción de HEAD sin las órdenes vivas (calculadas en
// el momento con `excluidas()`, CONEXION-07 pieza 5: una lista de ids escrita a mano se rompe con cada orden nueva), y lectura de las
// copias (D2 NO las corre: la copia `d` de conexion-07 reproduce HEAD, que lleva esta orden viva). Un mismo archivo en T y en H
// (cmp → 0): las copias y el conteo se eligen por REPO.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { matchesGlob, resolve } from "node:path";
import { CONEXION_07, REPO, ROOT, conTemporal, cuentaTests, cuentaTestsDe, excluidas, git, ordenesVivas, reproducirHead, rojoVerdeTodas } from "./_comun.ts";

const LETRAS = { T: ["a", "b", "c", "d", "e"], H: ["d", "e"] };
/** Tests que CORREN en cada repo (las copias van enteras; los `test(` guardados por REPO no corren en el otro). */
const TOTAL = { T: 6, H: 3 };
const CARPETA = "tests/orden/conexion-07";
const ORDEN = "conexion-07";
/** Las catorce órdenes ya retiradas antes de ésta (control de que ninguna vuelve a correr). */
const RETIRADAS = [
  ["verdad-02", "2026-09-20"], ["verdad-03", "2026-09-21"], ["verdad-04", "2026-09-21"], ["verdad-05", "2026-09-21"],
  ["conexion-01", "2026-09-21"], ["verdad-06", "2026-09-21"], ["verdad-07", "2026-09-22"], ["conexion-02", "2026-09-22"],
  ["conexion-03", "2026-09-22"], ["conexion-04", "2026-09-22"], ["verdad-08", "2026-09-22"], ["verdad-09", "2026-09-22"],
  ["conexion-05", "2026-09-23"], ["conexion-06", "2026-09-23"],
];

test("conexion-07 figura en tests/orden/APROBADAS.md con fecha 2026-09-23, T 637ed2b y H 9c0f1e9, y rojo-verde --todas en HEAD imprime «conexion-07 · retirada (aprobada 2026-09-23)» y no «orden conexion-07 ·»", () => {
  const aprobadas = git(ROOT, "show", "HEAD:tests/orden/APROBADAS.md");
  const esperada = `- ${ORDEN} · aprobada 2026-09-23 · T ${CONEXION_07.aprobado.T} · H ${CONEXION_07.aprobado.H}`;
  assert.ok(aprobadas.split(/\r?\n/).some((l) => l.trim() === esperada), `HEAD:tests/orden/APROBADAS.md debe tener «${esperada}»:\n${aprobadas}`);
  // --todas «en HEAD» sin correr estos mismos tests (que a su vez correrían --todas): HEAD se reproduce sin ninguna orden viva,
  // que --todas correría entera dentro de la suite. Con la línea de arriba puesta, conexion-07 ya no es viva: entra y sale «retirada».
  conTemporal((base) => {
    const { repo, ids } = reproducirHead(base, excluidas("conexion-08"));
    assert.ok(ids.includes(ORDEN), `la reproducción lleva ${CARPETA}/ (ids: ${ids.join(", ")})`);
    assert.ok(!ids.includes("conexion-08"), "la reproducción no lleva tests/orden/conexion-08/");
    const r = rojoVerdeTodas(repo.dir);
    assert.equal(r.status, 0, `--todas sobre la reproducción de HEAD debe salir 0 (salió ${r.status})\n${r.out.slice(-3000)}`);
    assert.match(r.stdout, new RegExp(`^${ORDEN} · retirada \\(aprobada 2026-09-23\\)$`, "m"), `debe decir «${ORDEN} · retirada (aprobada 2026-09-23)»\n${r.stdout}`);
    assert.doesNotMatch(r.stdout, new RegExp(`orden ${ORDEN} ·`), `no debe imprimir la tabla de ${ORDEN}\n${r.stdout}`);
    assert.doesNotMatch(r.stdout, new RegExp(`${ORDEN} · rojo pendiente de B`), `${ORDEN} ya no está pendiente de B`);
    for (const [id, fecha] of RETIRADAS) assert.match(r.stdout, new RegExp(`^${id} · retirada \\(aprobada ${fecha}\\)$`, "m"), `control: ${id} sigue retirada`);
  });
});

test("npm test corre las copias tests/conexion-07-a.test.ts, -b, -c, -d, -e en T (6 tests) y -d, -e en H (3 tests), que importan ./orden/conexion-07/_comun.ts, sin recorte y sin volver a correr copias anteriores (la copia `d` excluye las órdenes vivas con `excluidas()`, sin nombrarlas); en T van a `test:unit`; tests/orden/conexion-07/ no cambia desde su último rojo (3cde6db en T, e8af546 en H)", () => {
  const leer = (rel: string) => readFileSync(resolve(ROOT, rel), "utf8");
  const letras = LETRAS[REPO];
  const copias = letras.map((s) => `tests/${ORDEN}-${s}.test.ts`);
  for (const c of copias) assert.ok(existsSync(resolve(ROOT, c)), `falta ${c} en ${REPO}`);
  for (const c of copias) assert.match(leer(c), new RegExp(`from "\\./orden/${ORDEN}/_comun\\.ts"`), `${c} debe importar ./orden/${ORDEN}/_comun.ts`);
  // Sin recorte: cada copia lleva tantos `test(` como su original en la carpeta congelada (los guardados por REPO no corren en el otro).
  for (const s of letras) {
    assert.equal(cuentaTests(leer(`tests/${ORDEN}-${s}.test.ts`)), cuentaTests(leer(`${CARPETA}/${s}.test.ts`)), `la copia ${s} lleva los mismos tests que ${CARPETA}/${s}.test.ts (entera)`);
  }
  assert.equal(letras.reduce((n, s) => n + cuentaTestsDe(leer(`tests/${ORDEN}-${s}.test.ts`), REPO), 0), TOTAL[REPO], `en ${REPO} las copias suman ${TOTAL[REPO]} tests que corren`);
  // Sin volver a correr copias anteriores, y sin nombrar ninguna orden viva: la copia que reproduce HEAD las calcula en el momento.
  const vivas = [...new Set([...ordenesVivas(ROOT), "conexion-08"])];
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
  assert.ok(rojo.startsWith(CONEXION_07.rojo[REPO]), `el último rojo de ${ORDEN} en ${REPO} es ${CONEXION_07.rojo[REPO]} (git da ${rojo.slice(0, 7)})`);
  assert.equal(git(ROOT, "log", "--format=%h %s", "--diff-filter=MDR", `${rojo}..main`, "--", `${CARPETA}/`), "", `${CARPETA}/ sigue congelada desde su último rojo`);
});
