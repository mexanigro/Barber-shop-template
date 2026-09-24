// E2E-01 · E · retiro de CONEXION-09 (D-104): aprobada en tests/orden/APROBADAS.md (rojo-verde --todas la salta) y promovida a
// npm test como copias editables, con su carpeta congelada desde el último rojo. La línea de APROBADAS.md la escribe la sesión B.
// Sesión A (2026-09-24): tests rojos — no está la línea ni están las copias.
// Las copias van recortadas cuando salen a la red o a Firestore (D-89, D-95): por eso E2 no exige «sin recorte», exige que cada
// letra que su hoja promueve exista, importe su `_comun.ts` y la corra `npm test`.
// Caja negra: git del repo real, `rojo-verde --todas --repo <tmp>` sobre una reproducción de HEAD sin las órdenes vivas (calculadas
// en el momento con `excluidas()`, CONEXION-07 pieza 5), y lectura de las copias (E2 NO las corre: la copia `d` de conexion-09
// reproduce HEAD, que lleva esta orden viva). Un mismo archivo en T y en H (cmp → 0): las copias se eligen por REPO.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { matchesGlob, resolve } from "node:path";
import { CONEXION_09, REPO, ROOT, conTemporal, excluidas, git, ordenesVivas, reproducirHead, rojoVerdeTodas } from "./_comun.ts";

/** Las letras que CONEXION-09 promueve en cada repo (su hoja: a, b, c en T; v en H; d y e en los dos). */
const LETRAS = { T: ["a", "b", "c", "d", "e"], H: ["v", "d", "e"] };
const CARPETA = "tests/orden/conexion-09";
const ORDEN = "conexion-09";
/** Las diecisiete órdenes ya retiradas antes de ésta (control de que ninguna vuelve a correr). */
const RETIRADAS = [
  ["verdad-02", "2026-09-20"], ["verdad-03", "2026-09-21"], ["verdad-04", "2026-09-21"], ["verdad-05", "2026-09-21"],
  ["conexion-01", "2026-09-21"], ["verdad-06", "2026-09-21"], ["verdad-07", "2026-09-22"], ["conexion-02", "2026-09-22"],
  ["conexion-03", "2026-09-22"], ["conexion-04", "2026-09-22"], ["verdad-08", "2026-09-22"], ["verdad-09", "2026-09-22"],
  ["conexion-05", "2026-09-23"], ["conexion-06", "2026-09-23"], ["conexion-07", "2026-09-23"], ["conexion-08", "2026-09-23"],
  ["preset-01", "2026-09-24"],
];
/** Una copia que abre Chromium lo hace por `medirPng` de su `_comun.ts`, que importa `playwright` con `import()` dinámico: el guard
 *  literal de `tests/suite-fases.test.ts` no la ve, así que su fase la fija esta afirmación (CONEXION-08 § Interfaz). */
const NAVEGADOR = "medirPng";

test("conexion-09 figura en tests/orden/APROBADAS.md con fecha 2026-09-24, T cc154fb y H b25f1e7, y rojo-verde --todas en HEAD imprime «conexion-09 · retirada (aprobada 2026-09-24)» y no «orden conexion-09 ·»", () => {
  const aprobadas = git(ROOT, "show", "HEAD:tests/orden/APROBADAS.md");
  const esperada = `- ${ORDEN} · aprobada 2026-09-24 · T ${CONEXION_09.aprobado.T} · H ${CONEXION_09.aprobado.H}`;
  assert.ok(aprobadas.split(/\r?\n/).some((l) => l.trim() === esperada), `HEAD:tests/orden/APROBADAS.md debe tener «${esperada}»:\n${aprobadas}`);
  // --todas «en HEAD» sin correr estos mismos tests (que a su vez correrían --todas): HEAD se reproduce sin ninguna orden viva,
  // que --todas correría entera dentro de la suite. Con la línea de arriba puesta, conexion-09 ya no es viva: entra y sale «retirada».
  conTemporal((base) => {
    const { repo, ids } = reproducirHead(base, excluidas("e2e-01"));
    assert.ok(ids.includes(ORDEN), `la reproducción lleva ${CARPETA}/ (ids: ${ids.join(", ")})`);
    assert.ok(!ids.includes("e2e-01"), "la reproducción no lleva tests/orden/e2e-01/");
    const r = rojoVerdeTodas(repo.dir);
    assert.equal(r.status, 0, `--todas sobre la reproducción de HEAD debe salir 0 (salió ${r.status})\n${r.out.slice(-3000)}`);
    assert.match(r.stdout, new RegExp(`^${ORDEN} · retirada \\(aprobada 2026-09-24\\)$`, "m"), `debe decir «${ORDEN} · retirada (aprobada 2026-09-24)»\n${r.stdout}`);
    assert.doesNotMatch(r.stdout, new RegExp(`orden ${ORDEN} ·`), `no debe imprimir la tabla de ${ORDEN}\n${r.stdout}`);
    assert.doesNotMatch(r.stdout, new RegExp(`${ORDEN} · rojo pendiente de B`), `${ORDEN} ya no está pendiente de B`);
    for (const [id, fecha] of RETIRADAS) assert.match(r.stdout, new RegExp(`^${id} · retirada \\(aprobada ${fecha}\\)$`, "m"), `control: ${id} sigue retirada`);
  });
});

test("npm test corre las copias de conexion-09 que su hoja promueve, que importan ./orden/conexion-09/_comun.ts, sin volver a correr copias anteriores (la copia `d` excluye las órdenes vivas con `excluidas()`, sin nombrarlas); en T van a `test:unit` salvo que abran Chromium; y tests/orden/conexion-09/ no cambia desde su último rojo (ce8f56f en T, cb43704 en H)", () => {
  const leer = (rel: string) => readFileSync(resolve(ROOT, rel), "utf8");
  const copias = LETRAS[REPO].map((s) => `tests/${ORDEN}-${s}.test.ts`);
  for (const c of copias) assert.ok(existsSync(resolve(ROOT, c)), `falta ${c} en ${REPO}`);
  for (const c of copias) assert.match(leer(c), new RegExp(`from "\\./orden/${ORDEN}/_comun\\.ts"`), `${c} debe importar ./orden/${ORDEN}/_comun.ts`);
  // Sin volver a correr copias anteriores, y sin nombrar ninguna orden viva: la copia que reproduce HEAD las calcula en el momento.
  const vivas = [...new Set([...ordenesVivas(ROOT), "e2e-01"])];
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
  assert.ok(rojo.startsWith(CONEXION_09.rojo[REPO]), `el último rojo de ${ORDEN} en ${REPO} es ${CONEXION_09.rojo[REPO]} (git da ${rojo.slice(0, 7)})`);
  assert.equal(git(ROOT, "log", "--format=%h %s", "--diff-filter=MDR", `${rojo}..main`, "--", `${CARPETA}/`), "", `${CARPETA}/ sigue congelada desde su último rojo`);
});
