// PRESET-01 · D · retiro de CONEXION-08 (D-89): aprobada en tests/orden/APROBADAS.md (rojo-verde --todas la salta) y promovida a
// npm test como copias editables (T: a, b, d, e = 7 tests; H: c, d, e = 4), con su carpeta congelada desde el último rojo.
// La línea de APROBADAS.md la escribe la sesión B. Sesión A (2026-09-23): tests rojos — no está la línea ni están las copias.
// Las copias de esta orden van RECORTADAS a propósito (D-89): la `a` de T pierde el GET a Storage —una copia promovida no sale a la
// red en cada `npm test`— y la `c` de H se queda sólo con C1, porque C2 lee Firestore. Por eso D2 no exige «sin recorte» como las
// hojas anteriores: exige los totales que fija la hoja (T 7, H 4) y que cada copia siga importando su `_comun.ts`.
// Caja negra: git del repo real, `rojo-verde --todas --repo <tmp>` sobre una reproducción de HEAD sin las órdenes vivas (calculadas
// en el momento con `excluidas()`, CONEXION-07 pieza 5: una lista de ids escrita a mano se rompe con cada orden nueva), y lectura de
// las copias (D2 NO las corre: la copia `d` de conexion-08 reproduce HEAD, que lleva esta orden viva). Un mismo archivo en T y en H
// (cmp → 0): las copias y el conteo se eligen por REPO.
// COPIA PROMOVIDA (CONEXION-09, 2026-09-24): la carpeta `tests/orden/preset-01/` queda congelada y esta copia es la editable. Único
// cambio respecto del original: las órdenes vivas del control de D2 salen enteras de `ordenesVivas()` (cuando se escribió el
// original, preset-01 era la viva y estaba escrita a mano; ya está retirada).
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { matchesGlob, resolve } from "node:path";
import { CONEXION_08, REPO, ROOT, conTemporal, cuentaTestsDe, excluidas, git, ordenesVivas, reproducirHead, rojoVerdeTodas } from "./orden/preset-01/_comun.ts";

const LETRAS = { T: ["a", "b", "d", "e"], H: ["c", "d", "e"] };
/** Tests que CORREN en cada repo (D-89: la `a` de T sin el GET a Storage, la `c` de H sólo con C1). */
const TOTAL = { T: 7, H: 4 };
const CARPETA = "tests/orden/conexion-08";
const ORDEN = "conexion-08";
/** Las quince órdenes ya retiradas antes de ésta (control de que ninguna vuelve a correr). */
const RETIRADAS = [
  ["verdad-02", "2026-09-20"], ["verdad-03", "2026-09-21"], ["verdad-04", "2026-09-21"], ["verdad-05", "2026-09-21"],
  ["conexion-01", "2026-09-21"], ["verdad-06", "2026-09-21"], ["verdad-07", "2026-09-22"], ["conexion-02", "2026-09-22"],
  ["conexion-03", "2026-09-22"], ["conexion-04", "2026-09-22"], ["verdad-08", "2026-09-22"], ["verdad-09", "2026-09-22"],
  ["conexion-05", "2026-09-23"], ["conexion-06", "2026-09-23"], ["conexion-07", "2026-09-23"],
];
/** La copia que abre Chromium lo hace por la utilidad que su `_comun.ts` exporta, que importa `playwright` con `import()`
 *  dinámico: el guard literal de `tests/suite-fases.test.ts` no la ve, así que su fase la fija esta afirmación (CONEXION-08
 *  § Interfaz). El nombre se arma en dos trozos a propósito (VERDAD-09 D-63): esta copia CLASIFICA por ese literal y corre en la
 *  fase concurrente, así que escrito entero se delataría a sí misma. */
const NAVEGADOR = "medir" + "Png";

test("conexion-08 figura en tests/orden/APROBADAS.md con fecha 2026-09-23, T 621bfe5 y H 73d0070, y rojo-verde --todas en HEAD imprime «conexion-08 · retirada (aprobada 2026-09-23)» y no «orden conexion-08 ·»", () => {
  const aprobadas = git(ROOT, "show", "HEAD:tests/orden/APROBADAS.md");
  const esperada = `- ${ORDEN} · aprobada 2026-09-23 · T ${CONEXION_08.aprobado.T} · H ${CONEXION_08.aprobado.H}`;
  assert.ok(aprobadas.split(/\r?\n/).some((l) => l.trim() === esperada), `HEAD:tests/orden/APROBADAS.md debe tener «${esperada}»:\n${aprobadas}`);
  // --todas «en HEAD» sin correr estos mismos tests (que a su vez correrían --todas): HEAD se reproduce sin ninguna orden viva,
  // que --todas correría entera dentro de la suite. Con la línea de arriba puesta, conexion-08 ya no es viva: entra y sale «retirada».
  conTemporal((base) => {
    const { repo, ids } = reproducirHead(base, excluidas("preset-01"));
    assert.ok(ids.includes(ORDEN), `la reproducción lleva ${CARPETA}/ (ids: ${ids.join(", ")})`);
    assert.ok(!ids.includes("preset-01"), "la reproducción no lleva tests/orden/preset-01/");
    const r = rojoVerdeTodas(repo.dir);
    assert.equal(r.status, 0, `--todas sobre la reproducción de HEAD debe salir 0 (salió ${r.status})\n${r.out.slice(-3000)}`);
    assert.match(r.stdout, new RegExp(`^${ORDEN} · retirada \\(aprobada 2026-09-23\\)$`, "m"), `debe decir «${ORDEN} · retirada (aprobada 2026-09-23)»\n${r.stdout}`);
    assert.doesNotMatch(r.stdout, new RegExp(`orden ${ORDEN} ·`), `no debe imprimir la tabla de ${ORDEN}\n${r.stdout}`);
    assert.doesNotMatch(r.stdout, new RegExp(`${ORDEN} · rojo pendiente de B`), `${ORDEN} ya no está pendiente de B`);
    for (const [id, fecha] of RETIRADAS) assert.match(r.stdout, new RegExp(`^${id} · retirada \\(aprobada ${fecha}\\)$`, "m"), `control: ${id} sigue retirada`);
  });
});

test("npm test corre las copias tests/conexion-08-a.test.ts, -b, -d, -e en T (7 tests; la `a` sin el GET a Storage) y tests/conexion-08-c.test.ts, -d, -e en H (4 tests; la `c` sólo con C1), que importan ./orden/conexion-08/_comun.ts, sin volver a correr copias anteriores (la copia `d` excluye las órdenes vivas con `excluidas()`, sin nombrarlas); en T van a `test:unit` salvo que importen `playwright`; tests/orden/conexion-08/ no cambia desde su último rojo (8e913a5 en T, 6bcad35 en H)", () => {
  const leer = (rel: string) => readFileSync(resolve(ROOT, rel), "utf8");
  const letras = LETRAS[REPO];
  const copias = letras.map((s) => `tests/${ORDEN}-${s}.test.ts`);
  for (const c of copias) assert.ok(existsSync(resolve(ROOT, c)), `falta ${c} en ${REPO}`);
  for (const c of copias) assert.match(leer(c), new RegExp(`from "\\./orden/${ORDEN}/_comun\\.ts"`), `${c} debe importar ./orden/${ORDEN}/_comun.ts`);
  assert.equal(letras.reduce((n, s) => n + cuentaTestsDe(leer(`tests/${ORDEN}-${s}.test.ts`), REPO), 0), TOTAL[REPO], `en ${REPO} las copias suman ${TOTAL[REPO]} tests que corren`);
  // Sin volver a correr copias anteriores, y sin nombrar ninguna orden viva: la copia que reproduce HEAD las calcula en el momento.
  const vivas = ordenesVivas(ROOT);
  for (const c of copias) {
    const src = leer(c);
    if (!src.includes("reproducirHead(")) continue;
    assert.match(src, /reproducirHead\([^,]+,\s*excluidas\(/, `${c} reproduce HEAD: debe excluir las órdenes vivas con excluidas(), no con una lista escrita a mano`);
    for (const id of vivas) assert.ok(!src.includes(`"${id}"`), `${c} no debe nombrar la orden viva «${id}» (una lista fija se rompe con cada orden nueva)`);
  }
  // npm test las corre: los scripts de package.json las nombran (en T, por fase, D-57) o las cubren con un glob (H).
  const scripts = JSON.parse(leer("package.json")).scripts ?? {};
  const nombra = (script: string, archivo: string) => String(script ?? "").split(/\s+/).map((t) => t.replace(/^["']|["']$/g, "")).some((t) => t === archivo || (t.includes("*") && matchesGlob(archivo, t)));
  for (const c of copias) {
    assert.ok(["test", "test:unit", "test:browser"].some((s) => nombra(scripts[s], c)), `npm test no corre ${c}`);
    if (REPO !== "T") continue;
    const src = leer(c);
    const navegador = src.includes(NAVEGADOR) || new RegExp(`from ${JSON.stringify("play" + "wright")}`).test(src);
    if (navegador) {
      assert.ok(nombra(scripts["test:browser"], c), `${c} levanta Chromium (${NAVEGADOR}): va en la fase de a uno, test:browser (D-57)`);
    } else {
      assert.ok(nombra(scripts["test:unit"], c), `en T, ${c} va en la fase concurrente test:unit`);
      assert.doesNotMatch(src, new RegExp(`from ${JSON.stringify("play" + "wright")}`), `${c} no importa playwright (por eso va en test:unit)`);
    }
  }
  // La carpeta de la orden sigue congelada: el último commit de main que añade su HOJA.md es el esperado y ninguno posterior la toca.
  const rojo = git(ROOT, "log", "-1", "--format=%H", "--diff-filter=A", "main", "--", `${CARPETA}/HOJA.md`);
  assert.ok(rojo.startsWith(CONEXION_08.rojo[REPO]), `el último rojo de ${ORDEN} en ${REPO} es ${CONEXION_08.rojo[REPO]} (git da ${rojo.slice(0, 7)})`);
  assert.equal(git(ROOT, "log", "--format=%h %s", "--diff-filter=MDR", `${rojo}..main`, "--", `${CARPETA}/`), "", `${CARPETA}/ sigue congelada desde su último rojo`);
});
