// CONEXION-09 · D · retiro de PRESET-01 (D-95): aprobada en tests/orden/APROBADAS.md (rojo-verde --todas la salta) y promovida a
// npm test como copias editables (T: a, d, e = 5 tests; H: b, d, e = 5, la `b` sin B3 porque lee Firestore), con su carpeta
// congelada desde el último rojo. La línea de APROBADAS.md la escribe la sesión B. Sesión A (2026-09-24): tests rojos — no está la
// línea ni están las copias.
// Las copias van recortadas a propósito (D-95), como en PRESET-01: por eso D2 no exige «sin recorte», exige los totales que fija la
// hoja (T 5, H 5) y que cada copia siga importando su `_comun.ts`.
// Caja negra: git del repo real, `rojo-verde --todas --repo <tmp>` sobre una reproducción de HEAD sin las órdenes vivas (calculadas
// en el momento con `excluidas()`, CONEXION-07 pieza 5: una lista de ids escrita a mano se rompe con cada orden nueva), y lectura de
// las copias (D2 NO las corre: la copia `d` de preset-01 reproduce HEAD, que lleva esta orden viva). Un mismo archivo en T y en H
// (cmp → 0): las copias y el conteo se eligen por REPO.
// COPIA PROMOVIDA (E2E-01, 2026-09-25): la carpeta `tests/orden/conexion-09/` queda congelada al aprobarse la orden y ésta es la
// copia editable. Único cambio respecto del original: el import de `_comun.ts` apunta a `./orden/conexion-09/_comun.ts`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { matchesGlob, resolve } from "node:path";
import { PRESET_01, REPO, ROOT, conTemporal, cuentaTestsDe, excluidas, git, ordenesVivas, reproducirHead, rojoVerdeTodas } from "./orden/conexion-09/_comun.ts";

const LETRAS = { T: ["a", "d", "e"], H: ["b", "d", "e"] };
/** Tests que CORREN en cada repo (D-95: la `b` de H sin B3). */
const TOTAL = { T: 5, H: 5 };
const CARPETA = "tests/orden/preset-01";
const ORDEN = "preset-01";
/** Las dieciséis órdenes ya retiradas antes de ésta (control de que ninguna vuelve a correr). */
const RETIRADAS = [
  ["verdad-02", "2026-09-20"], ["verdad-03", "2026-09-21"], ["verdad-04", "2026-09-21"], ["verdad-05", "2026-09-21"],
  ["conexion-01", "2026-09-21"], ["verdad-06", "2026-09-21"], ["verdad-07", "2026-09-22"], ["conexion-02", "2026-09-22"],
  ["conexion-03", "2026-09-22"], ["conexion-04", "2026-09-22"], ["verdad-08", "2026-09-22"], ["verdad-09", "2026-09-22"],
  ["conexion-05", "2026-09-23"], ["conexion-06", "2026-09-23"], ["conexion-07", "2026-09-23"], ["conexion-08", "2026-09-23"],
];
/** Una copia que abre Chromium lo hace por la utilidad de medir PNG de su `_comun.ts`, que importa `playwright` con `import()` dinámico: el guard
 *  literal de `tests/suite-fases.test.ts` no la ve, así que su fase la fija esta afirmación (CONEXION-08 § Interfaz). */
// COPIA PROMOVIDA (E2E-01): el nombre se arma partido, como este mismo archivo hace con «playwright», porque esta copia NO abre
// Chromium y el literal entero la mandaba a `test:browser`, donde `tests/verdad-08-d.test.ts` exige que estén exactamente los que
// importan playwright. Partido, los dos guards dicen lo mismo: va en la fase concurrente.
const NAVEGADOR = "medir" + "Png";

test("preset-01 figura en tests/orden/APROBADAS.md con fecha 2026-09-24, T 1b0ccd6 y H 22845be, y rojo-verde --todas en HEAD imprime «preset-01 · retirada (aprobada 2026-09-24)» y no «orden preset-01 ·»", () => {
  const aprobadas = git(ROOT, "show", "HEAD:tests/orden/APROBADAS.md");
  const esperada = `- ${ORDEN} · aprobada 2026-09-24 · T ${PRESET_01.aprobado.T} · H ${PRESET_01.aprobado.H}`;
  assert.ok(aprobadas.split(/\r?\n/).some((l) => l.trim() === esperada), `HEAD:tests/orden/APROBADAS.md debe tener «${esperada}»:\n${aprobadas}`);
  // --todas «en HEAD» sin correr estos mismos tests (que a su vez correrían --todas): HEAD se reproduce sin ninguna orden viva,
  // que --todas correría entera dentro de la suite. Con la línea de arriba puesta, preset-01 ya no es viva: entra y sale «retirada».
  conTemporal((base) => {
    const { repo, ids } = reproducirHead(base, excluidas("conexion-09"));
    assert.ok(ids.includes(ORDEN), `la reproducción lleva ${CARPETA}/ (ids: ${ids.join(", ")})`);
    assert.ok(!ids.includes("conexion-09"), "la reproducción no lleva tests/orden/conexion-09/");
    const r = rojoVerdeTodas(repo.dir);
    assert.equal(r.status, 0, `--todas sobre la reproducción de HEAD debe salir 0 (salió ${r.status})\n${r.out.slice(-3000)}`);
    assert.match(r.stdout, new RegExp(`^${ORDEN} · retirada \\(aprobada 2026-09-24\\)$`, "m"), `debe decir «${ORDEN} · retirada (aprobada 2026-09-24)»\n${r.stdout}`);
    assert.doesNotMatch(r.stdout, new RegExp(`orden ${ORDEN} ·`), `no debe imprimir la tabla de ${ORDEN}\n${r.stdout}`);
    assert.doesNotMatch(r.stdout, new RegExp(`${ORDEN} · rojo pendiente de B`), `${ORDEN} ya no está pendiente de B`);
    for (const [id, fecha] of RETIRADAS) assert.match(r.stdout, new RegExp(`^${id} · retirada \\(aprobada ${fecha}\\)$`, "m"), `control: ${id} sigue retirada`);
  });
});

test("npm test corre las copias tests/preset-01-a.test.ts, -d, -e en T (5 tests) y tests/preset-01-b.test.ts, -d, -e en H (5 tests; la `b` sin B3), que importan ./orden/preset-01/_comun.ts, sin volver a correr copias anteriores (la copia `d` excluye las órdenes vivas con `excluidas()`, sin nombrarlas); en T van a `test:unit` salvo que abran Chromium; tests/orden/preset-01/ no cambia desde su último rojo (416e6d4 en T, 2faac7b en H)", () => {
  const leer = (rel: string) => readFileSync(resolve(ROOT, rel), "utf8");
  const letras = LETRAS[REPO];
  const copias = letras.map((s) => `tests/${ORDEN}-${s}.test.ts`);
  for (const c of copias) assert.ok(existsSync(resolve(ROOT, c)), `falta ${c} en ${REPO}`);
  for (const c of copias) assert.match(leer(c), new RegExp(`from "\\./orden/${ORDEN}/_comun\\.ts"`), `${c} debe importar ./orden/${ORDEN}/_comun.ts`);
  assert.equal(letras.reduce((n, s) => n + cuentaTestsDe(leer(`tests/${ORDEN}-${s}.test.ts`), REPO), 0), TOTAL[REPO], `en ${REPO} las copias suman ${TOTAL[REPO]} tests que corren`);
  // Sin volver a correr copias anteriores, y sin nombrar ninguna orden viva: la copia que reproduce HEAD las calcula en el momento.
  const vivas = [...new Set([...ordenesVivas(ROOT), "conexion-09"])];
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
      assert.ok(nombra(scripts["test:browser"], c), `${c} abre Chromium (${NAVEGADOR}): va en la fase de a uno, test:browser (D-57)`);
    } else {
      assert.ok(nombra(scripts["test:unit"], c), `en T, ${c} va en la fase concurrente test:unit`);
      assert.doesNotMatch(src, new RegExp(`from ${JSON.stringify("play" + "wright")}`), `${c} no importa playwright (por eso va en test:unit)`);
    }
  }
  // La carpeta de la orden sigue congelada: el último commit de main que añade su HOJA.md es el esperado y ninguno posterior la toca.
  const rojo = git(ROOT, "log", "-1", "--format=%H", "--diff-filter=A", "main", "--", `${CARPETA}/HOJA.md`);
  assert.ok(rojo.startsWith(PRESET_01.rojo[REPO]), `el último rojo de ${ORDEN} en ${REPO} es ${PRESET_01.rojo[REPO]} (git da ${rojo.slice(0, 7)})`);
  assert.equal(git(ROOT, "log", "--format=%h %s", "--diff-filter=MDR", `${rojo}..main`, "--", `${CARPETA}/`), "", `${CARPETA}/ sigue congelada desde su último rojo`);
});
