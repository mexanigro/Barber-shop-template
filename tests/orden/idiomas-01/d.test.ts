// IDIOMAS-01 · E1, E2 · retiro de ARREGLOS-02 (D-127; PLAN.md § Pendientes para la próxima orden, a): aprobada en
// tests/orden/APROBADAS.md (rojo-verde --todas la salta) y promovida a npm test como copias editables, con su carpeta congelada
// desde el último rojo. La línea de APROBADAS.md la escribe la sesión B. Sesión A (2026-09-29): tests rojos.
// Las copias van recortadas cuando salen a la red (D-89, D-95): la `f` de ARREGLOS-02 corre `e2e.mjs` contra las dos webs (A1) y la
// `g` corre `rojo-verde --orden e2e-01`, que arrastra la C2 de E2E-01 contra las webs; por eso E2 no exige «sin recorte», exige
// que cada letra que su hoja promueve exista, importe su `_comun.ts` y la corra `npm test`.
// D-121: `tests/suite-fases.test.ts` sólo ve el literal `from "playwright"`; aquí la fase se decide por las dos formas de traerlo
// más `medirPng`. El literal va partido: este archivo no abre navegador y no puede caer en su propio detector.
// Caja negra: git del repo real, `rojo-verde --todas --repo <tmp>` sobre una reproducción de HEAD sin las órdenes vivas
// (`excluidas()`, calculado en el momento) y lectura de las copias. Un mismo archivo en T y en H (cmp → 0).
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { matchesGlob, resolve } from "node:path";
import { ARREGLOS_02, ORDEN as PROPIA, REPO, ROOT, conTemporal, excluidas, git, ordenesVivas, reproducirHead, rojoVerdeTodas } from "./_comun.ts";

/** Las letras que ARREGLOS-02 promueve en cada repo (su carpeta: d, e, f, g en T; d, e en H). */
const LETRAS = { T: ["d", "e", "f", "g"], H: ["d", "e"] };
const CARPETA = "tests/orden/arreglos-02";
const ORDEN = "arreglos-02";
const FECHA = "2026-09-27";
/** Las veinte órdenes ya retiradas antes de ésta (control de que ninguna vuelve a correr). */
const RETIRADAS = [
  ["verdad-02", "2026-09-20"], ["verdad-03", "2026-09-21"], ["verdad-04", "2026-09-21"], ["verdad-05", "2026-09-21"],
  ["conexion-01", "2026-09-21"], ["verdad-06", "2026-09-21"], ["verdad-07", "2026-09-22"], ["conexion-02", "2026-09-22"],
  ["conexion-03", "2026-09-22"], ["conexion-04", "2026-09-22"], ["verdad-08", "2026-09-22"], ["verdad-09", "2026-09-22"],
  ["conexion-05", "2026-09-23"], ["conexion-06", "2026-09-23"], ["conexion-07", "2026-09-23"], ["conexion-08", "2026-09-23"],
  ["preset-01", "2026-09-24"], ["conexion-09", "2026-09-24"], ["e2e-01", "2026-09-25"], ["arreglos-01", "2026-09-25"],
];
const PW = "play" + "wright";
const conNavegador = (src: string) => src.includes("medirPng") || new RegExp(`from ${JSON.stringify(PW)}`).test(src) || new RegExp(`import\\(${JSON.stringify(PW)}\\)`).test(src);

test("arreglos-02 figura en tests/orden/APROBADAS.md con fecha 2026-09-27, T 19ba544 y H 3bc8aa5, y rojo-verde --todas en HEAD imprime «arreglos-02 · retirada (aprobada 2026-09-27)» y no «orden arreglos-02 ·»", () => {
  const aprobadas = git(ROOT, "show", "HEAD:tests/orden/APROBADAS.md");
  const esperada = `- ${ORDEN} · aprobada ${FECHA} · T ${ARREGLOS_02.aprobado.T} · H ${ARREGLOS_02.aprobado.H}`;
  assert.ok(aprobadas.split(/\r?\n/).some((l) => l.trim() === esperada), `HEAD:tests/orden/APROBADAS.md debe tener «${esperada}»:\n${aprobadas}`);
  conTemporal((base) => {
    const { repo, ids } = reproducirHead(base, excluidas(PROPIA));
    assert.ok(ids.includes(ORDEN), `la reproducción lleva ${CARPETA}/ (ids: ${ids.join(", ")})`);
    assert.ok(!ids.includes(PROPIA), `la reproducción no lleva tests/orden/${PROPIA}/`);
    const r = rojoVerdeTodas(repo.dir);
    assert.equal(r.status, 0, `--todas sobre la reproducción de HEAD debe salir 0 (salió ${r.status})\n${r.out.slice(-3000)}`);
    assert.match(r.stdout, new RegExp(`^${ORDEN} · retirada \\(aprobada ${FECHA}\\)$`, "m"), `debe decir «${ORDEN} · retirada (aprobada ${FECHA})»\n${r.stdout}`);
    assert.doesNotMatch(r.stdout, new RegExp(`orden ${ORDEN} ·`), `no debe imprimir la tabla de ${ORDEN}\n${r.stdout}`);
    assert.doesNotMatch(r.stdout, new RegExp(`${ORDEN} · rojo pendiente de B`), `${ORDEN} ya no está pendiente de B`);
    for (const [id, fecha] of RETIRADAS) assert.match(r.stdout, new RegExp(`^${id} · retirada \\(aprobada ${fecha}\\)$`, "m"), `control: ${id} sigue retirada`);
  });
});

test("npm test corre las copias de arreglos-02 que su hoja promueve, que importan ./orden/arreglos-02/_comun.ts, sin volver a correr copias anteriores (la copia `d` excluye las órdenes vivas con `excluidas()`, sin nombrarlas); en T, toda copia que abra Chromium va a `test:browser` aunque importe playwright con `import()` dinámico; y tests/orden/arreglos-02/ no cambia desde su último rojo (f6389a2 en T, c8834a1 en H)", () => {
  const leer = (rel: string) => readFileSync(resolve(ROOT, rel), "utf8");
  const copias = LETRAS[REPO].map((s) => `tests/${ORDEN}-${s}.test.ts`);
  for (const c of copias) assert.ok(existsSync(resolve(ROOT, c)), `falta ${c} en ${REPO}`);
  for (const c of copias) assert.match(leer(c), new RegExp(`from "\\./orden/${ORDEN}/_comun\\.ts"`), `${c} debe importar ./orden/${ORDEN}/_comun.ts`);
  const vivas = [...new Set([...ordenesVivas(ROOT), PROPIA])];
  for (const c of copias) {
    const src = leer(c);
    if (!src.includes("reproducirHead(")) continue;
    assert.match(src, /reproducirHead\([^,]+,\s*excluidas\(/, `${c} reproduce HEAD: debe excluir las órdenes vivas con excluidas(), no con una lista escrita a mano`);
    for (const id of vivas) assert.ok(!src.includes(`"${id}"`), `${c} no debe nombrar la orden viva «${id}»`);
  }
  const scripts = JSON.parse(leer("package.json")).scripts ?? {};
  const nombra = (script: string, archivo: string) => String(script ?? "").split(/\s+/).map((t) => t.replace(/^["']|["']$/g, "")).some((t) => t === archivo || (t.includes("*") && matchesGlob(archivo, t)));
  for (const c of copias) {
    assert.ok(["test", "test:unit", "test:browser"].some((s) => nombra(scripts[s], c)), `npm test no corre ${c}`);
    if (REPO !== "T") continue;
    if (conNavegador(leer(c))) assert.ok(nombra(scripts["test:browser"], c), `${c} abre Chromium: va en test:browser (D-57, D-121)`);
    else assert.ok(nombra(scripts["test:unit"], c), `en T, ${c} va en la fase concurrente test:unit`);
  }
  const rojo = git(ROOT, "log", "-1", "--format=%H", "--diff-filter=A", "main", "--", `${CARPETA}/HOJA.md`);
  assert.ok(rojo.startsWith(ARREGLOS_02.rojo[REPO]), `el último rojo de ${ORDEN} en ${REPO} es ${ARREGLOS_02.rojo[REPO]} (git da ${rojo.slice(0, 7)})`);
  assert.equal(git(ROOT, "log", "--format=%h %s", "--diff-filter=MDR", `${rojo}..main`, "--", `${CARPETA}/`), "", `${CARPETA}/ sigue congelada desde su último rojo`);
});
