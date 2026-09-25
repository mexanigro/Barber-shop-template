// ARREGLOS-02 · C · retiro de ARREGLOS-01 (D-113): aprobada en tests/orden/APROBADAS.md (rojo-verde --todas la salta) y promovida
// a npm test como copias editables, con su carpeta congelada desde el último rojo. La línea de APROBADAS.md la escribe la sesión B.
// Sesión A (2026-09-25): tests rojos — no está la línea ni están las copias.
// Las copias van recortadas cuando salen a la red o a Firestore (D-89, D-95): por eso C2 no exige «sin recorte», exige que cada
// letra que su hoja promueve exista, importe su `_comun.ts` y la corra `npm test`.
// D-121 (medido): `tests/suite-fases.test.ts:15` detecta la fase por el literal `from "playwright"`, y la copia `f` de
// arreglos-01 abre Chromium con `await import("playwright")`, que ese guard NO ve. Aquí la fase se decide por CUALQUIERA de las
// dos formas de traer playwright, más el detector heredado (`medirPng`).
// Caja negra: git del repo real, `rojo-verde --todas --repo <tmp>` sobre una reproducción de HEAD sin las órdenes vivas (calculadas
// en el momento con `excluidas()`, CONEXION-07 pieza 5), y lectura de las copias (C2 NO las corre: la copia `d` de arreglos-01
// reproduce HEAD, que lleva esta orden viva). Un mismo archivo en T y en H (cmp → 0): las copias se eligen por REPO.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { matchesGlob, resolve } from "node:path";
import { ARREGLOS_01, REPO, ROOT, conTemporal, excluidas, git, ordenesVivas, reproducirHead, rojoVerdeTodas } from "./_comun.ts";

/** Las letras que ARREGLOS-01 promueve en cada repo (§ Interfaz de esta hoja). */
const LETRAS = { T: ["d", "e", "f", "g"], H: ["a", "b", "c", "d", "e"] };
const CARPETA = "tests/orden/arreglos-01";
const ORDEN = "arreglos-01";
const FECHA = "2026-09-25";
/** Las diecinueve órdenes ya retiradas antes de ésta (control de que ninguna vuelve a correr). */
const RETIRADAS = [
  ["verdad-02", "2026-09-20"], ["verdad-03", "2026-09-21"], ["verdad-04", "2026-09-21"], ["verdad-05", "2026-09-21"],
  ["conexion-01", "2026-09-21"], ["verdad-06", "2026-09-21"], ["verdad-07", "2026-09-22"], ["conexion-02", "2026-09-22"],
  ["conexion-03", "2026-09-22"], ["conexion-04", "2026-09-22"], ["verdad-08", "2026-09-22"], ["verdad-09", "2026-09-22"],
  ["conexion-05", "2026-09-23"], ["conexion-06", "2026-09-23"], ["conexion-07", "2026-09-23"], ["conexion-08", "2026-09-23"],
  ["preset-01", "2026-09-24"], ["conexion-09", "2026-09-24"], ["e2e-01", "2026-09-25"],
];
/** Una copia abre Chromium si trae playwright de cualquiera de las dos formas, o si usa el `medirPng` de un `_comun.ts`
 *  (import dinámico que el guard literal de `tests/suite-fases.test.ts` tampoco ve). El literal va partido: este archivo no abre
 *  navegador y no puede caer en su propio detector. */
const PW = "play" + "wright";
const conNavegador = (src: string) => src.includes("medirPng") || new RegExp(`from ${JSON.stringify(PW)}`).test(src) || new RegExp(`import\\(${JSON.stringify(PW)}\\)`).test(src);

test("arreglos-01 figura en tests/orden/APROBADAS.md con fecha 2026-09-25, T d026b0f y H 951932c, y rojo-verde --todas en HEAD imprime «arreglos-01 · retirada (aprobada 2026-09-25)» y no «orden arreglos-01 ·»", () => {
  const aprobadas = git(ROOT, "show", "HEAD:tests/orden/APROBADAS.md");
  const esperada = `- ${ORDEN} · aprobada ${FECHA} · T ${ARREGLOS_01.aprobado.T} · H ${ARREGLOS_01.aprobado.H}`;
  assert.ok(aprobadas.split(/\r?\n/).some((l) => l.trim() === esperada), `HEAD:tests/orden/APROBADAS.md debe tener «${esperada}»:\n${aprobadas}`);
  // --todas «en HEAD» sin correr estos mismos tests (que a su vez correrían --todas): HEAD se reproduce sin ninguna orden viva,
  // que --todas correría entera dentro de la suite. Con la línea de arriba puesta, arreglos-01 ya no es viva: entra y sale «retirada».
  conTemporal((base) => {
    const { repo, ids } = reproducirHead(base, excluidas("arreglos-02"));
    assert.ok(ids.includes(ORDEN), `la reproducción lleva ${CARPETA}/ (ids: ${ids.join(", ")})`);
    assert.ok(!ids.includes("arreglos-02"), "la reproducción no lleva tests/orden/arreglos-02/");
    const r = rojoVerdeTodas(repo.dir);
    assert.equal(r.status, 0, `--todas sobre la reproducción de HEAD debe salir 0 (salió ${r.status})\n${r.out.slice(-3000)}`);
    assert.match(r.stdout, new RegExp(`^${ORDEN} · retirada \\(aprobada ${FECHA}\\)$`, "m"), `debe decir «${ORDEN} · retirada (aprobada ${FECHA})»\n${r.stdout}`);
    assert.doesNotMatch(r.stdout, new RegExp(`orden ${ORDEN} ·`), `no debe imprimir la tabla de ${ORDEN}\n${r.stdout}`);
    assert.doesNotMatch(r.stdout, new RegExp(`${ORDEN} · rojo pendiente de B`), `${ORDEN} ya no está pendiente de B`);
    for (const [id, fecha] of RETIRADAS) assert.match(r.stdout, new RegExp(`^${id} · retirada \\(aprobada ${fecha}\\)$`, "m"), `control: ${id} sigue retirada`);
  });
});

test("npm test corre las copias de arreglos-01 que su hoja promueve, que importan ./orden/arreglos-01/_comun.ts, sin volver a correr copias anteriores (la copia `d` excluye las órdenes vivas con `excluidas()`, sin nombrarlas); en T, toda copia que abra Chromium va a `test:browser` aunque importe playwright con `import()` dinámico; y tests/orden/arreglos-01/ no cambia desde su último rojo (ae2d5ac en T, 2df3e8f en H)", () => {
  const leer = (rel: string) => readFileSync(resolve(ROOT, rel), "utf8");
  const copias = LETRAS[REPO].map((s) => `tests/${ORDEN}-${s}.test.ts`);
  for (const c of copias) assert.ok(existsSync(resolve(ROOT, c)), `falta ${c} en ${REPO}`);
  for (const c of copias) assert.match(leer(c), new RegExp(`from "\\./orden/${ORDEN}/_comun\\.ts"`), `${c} debe importar ./orden/${ORDEN}/_comun.ts`);
  // Sin volver a correr copias anteriores, y sin nombrar ninguna orden viva: la copia que reproduce HEAD las calcula en el momento.
  const vivas = [...new Set([...ordenesVivas(ROOT), "arreglos-02"])];
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
    if (conNavegador(src)) {
      assert.ok(nombra(scripts["test:browser"], c), `${c} abre Chromium: va en la fase de a uno, test:browser (D-57). Ojo: suite-fases.test.ts sólo ve «from "${PW}"», no el import() dinámico (D-121)`);
    } else {
      assert.ok(nombra(scripts["test:unit"], c), `en T, ${c} va en la fase concurrente test:unit`);
    }
  }
  // La carpeta de la orden sigue congelada: el último commit de main que añade su HOJA.md es el esperado y ninguno posterior la toca.
  const rojo = git(ROOT, "log", "-1", "--format=%H", "--diff-filter=A", "main", "--", `${CARPETA}/HOJA.md`);
  assert.ok(rojo.startsWith(ARREGLOS_01.rojo[REPO]), `el último rojo de ${ORDEN} en ${REPO} es ${ARREGLOS_01.rojo[REPO]} (git da ${rojo.slice(0, 7)})`);
  assert.equal(git(ROOT, "log", "--format=%h %s", "--diff-filter=MDR", `${rojo}..main`, "--", `${CARPETA}/`), "", `${CARPETA}/ sigue congelada desde su último rojo`);
});
