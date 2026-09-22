// VERDAD-08 · E · retiro de CONEXION-04 (D-58): aprobada en tests/orden/APROBADAS.md (rojo-verde --todas la salta) y promovida a
// npm test como copias editables, con su carpeta congelada desde el último rojo. La línea de APROBADAS.md la escribe la sesión B.
// Sesión A (2026-09-22): tests rojos — no está la línea ni están las copias.
// E2 NO corre las copias: la copia `d` corre `rojo-verde --todas` sobre una reproducción de HEAD que incluye verdad-08, que volvería
// a correr este mismo test sin fin (ver el «ajuste de A» de E2 en la HOJA). El verde de las copias lo da `npm test` al correrlas;
// aquí se comprueba que están enteras (mismos `test(` que su original) y que son tantas como afirmaciones tiene su HOJA por repo.
// Un mismo archivo en T y en H (cmp → 0): las copias se eligen por REPO.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { matchesGlob, resolve } from "node:path";
import { CONEXION_04, REPO, ROOT, conTemporal, cuentaTests, git, reproducirHead, rojoVerdeTodas } from "./_util.ts";

const LETRAS = { H: ["a", "b", "d", "e"], T: ["b", "d", "e"] };
/** Tests que CORREN en cada repo = afirmaciones de la HOJA de conexion-04 para ese repo (los `test(` guardados por REPO no corren en el otro). */
const TOTAL = { H: 8, T: 5 };
const CARPETA = "tests/orden/conexion-04";
/** Las nueve órdenes ya retiradas antes de esta (control de que ninguna vuelve a correr). */
const RETIRADAS = [
  ["verdad-02", "2026-09-20"], ["verdad-03", "2026-09-21"], ["verdad-04", "2026-09-21"], ["verdad-05", "2026-09-21"],
  ["conexion-01", "2026-09-21"], ["verdad-06", "2026-09-21"], ["verdad-07", "2026-09-22"], ["conexion-02", "2026-09-22"],
  ["conexion-03", "2026-09-22"],
];

test("conexion-04 figura en tests/orden/APROBADAS.md con fecha 2026-09-22, T 4a22d7b y H f8bd9bb, y rojo-verde --todas en HEAD imprime «conexion-04 · retirada (aprobada 2026-09-22)» y no «orden conexion-04 ·»", () => {
  const aprobadas = git(ROOT, "show", "HEAD:tests/orden/APROBADAS.md");
  const esperada = `- conexion-04 · aprobada 2026-09-22 · T ${CONEXION_04.aprobado.T} · H ${CONEXION_04.aprobado.H}`;
  assert.ok(aprobadas.split(/\r?\n/).some((l) => l.trim() === esperada), `HEAD:tests/orden/APROBADAS.md debe tener «${esperada}»:\n${aprobadas}`);
  // --todas «en HEAD» sin correr estos mismos tests (que a su vez correrían --todas): HEAD se reproduce en un repo temporal sin verdad-08/.
  conTemporal((base) => {
    const { repo, ids } = reproducirHead(base, ["verdad-08"]);
    assert.ok(ids.includes("conexion-04"), `la reproducción lleva ${CARPETA}/ (ids: ${ids.join(", ")})`);
    assert.ok(!ids.includes("verdad-08"), "la reproducción no lleva tests/orden/verdad-08/");
    const r = rojoVerdeTodas(repo.dir);
    assert.equal(r.status, 0, `--todas con las diez órdenes aprobadas debe salir 0 (salió ${r.status})\n${r.out.slice(-3000)}`);
    assert.match(r.stdout, /^conexion-04 · retirada \(aprobada 2026-09-22\)$/m, `debe decir «conexion-04 · retirada (aprobada 2026-09-22)»\n${r.stdout}`);
    assert.doesNotMatch(r.stdout, /orden conexion-04 ·/, `no debe imprimir la tabla de conexion-04\n${r.stdout}`);
    assert.doesNotMatch(r.stdout, /conexion-04 · rojo pendiente de B/, "conexion-04 ya no está pendiente de B");
    for (const [id, fecha] of RETIRADAS) assert.match(r.stdout, new RegExp(`^${id} · retirada \\(aprobada ${fecha}\\)$`, "m"), `control: ${id} sigue retirada`);
  });
});

test("npm test corre las copias tests/conexion-04-a.test.ts, -b, -d, -e en H (8 tests) y tests/conexion-04-b.test.ts, -d, -e en T (5 tests), que importan ./orden/conexion-04/_util.ts, sin recorte (cada copia lleva los mismos `test(` que su original en la carpeta congelada), y la copia `d` no importa `correrLargo`: no vuelve a correr las copias anteriores (B2); tests/orden/conexion-04/ no cambia desde su último rojo (47490a2 en T, 00b4fe0 en H)", () => {
  const letras = LETRAS[REPO];
  const copias = letras.map((s) => `tests/conexion-04-${s}.test.ts`);
  for (const c of copias) assert.ok(existsSync(resolve(ROOT, c)), `falta ${c} en ${REPO}`);
  for (const c of copias) assert.ok(/from "\.\/orden\/conexion-04\/_util\.ts"/.test(readFileSync(resolve(ROOT, c), "utf8")), `${c} debe importar ./orden/conexion-04/_util.ts`);
  // Sin recorte: cada copia lleva tantos `test(` como su original en la carpeta congelada.
  const cuenta = (archivo: string) => cuentaTests(readFileSync(resolve(ROOT, archivo), "utf8"));
  for (const s of letras) assert.equal(cuenta(`tests/conexion-04-${s}.test.ts`), cuenta(`${CARPETA}/${s}.test.ts`), `la copia ${s} lleva los mismos tests que ${CARPETA}/${s}.test.ts (entera)`);
  // Y son tantos como afirmaciones declara su HOJA para este repo (8 en H, 5 en T).
  const afirmaciones = readFileSync(resolve(ROOT, `${CARPETA}/HOJA.md`), "utf8").split(/\r?\n/)
    .map((l) => l.match(/^- \[[^\]]+\] \((T\+H|T|H)\) /)).filter((m) => m && (m[1] === "T+H" || m[1] === REPO));
  assert.equal(afirmaciones.length, TOTAL[REPO], `${CARPETA}/HOJA.md declara ${TOTAL[REPO]} afirmaciones para ${REPO}`);
  // npm test los corre: el script `test` de package.json los nombra (T) o los cubre con un glob (H).
  const script = String(JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8")).scripts?.test ?? "");
  const tokens = script.split(/\s+/).map((t) => t.replace(/^["']|["']$/g, ""));
  for (const c of copias) assert.ok(tokens.some((t) => t === c || (t.includes("*") && matchesGlob(c, t))), `npm test no corre ${c}: ${script}`);
  // La copia `d` no vuelve a correr las copias anteriores (CONEXION-04-B2: dos cadenas anidadas corrían rojo-verde a la vez).
  assert.doesNotMatch(readFileSync(resolve(ROOT, "tests/conexion-04-d.test.ts"), "utf8"), /correrLargo/, "la copia `d` no importa correrLargo: no anida otra corrida");
  // La carpeta de la orden sigue congelada: el último commit de main que añade su HOJA.md es el esperado y ninguno posterior la toca.
  const rojo = git(ROOT, "log", "-1", "--format=%H", "--diff-filter=A", "main", "--", `${CARPETA}/HOJA.md`);
  assert.ok(rojo.startsWith(CONEXION_04.rojo[REPO]), `el último rojo de conexion-04 en ${REPO} es ${CONEXION_04.rojo[REPO]} (git da ${rojo.slice(0, 7)})`);
  assert.equal(git(ROOT, "log", "--format=%h %s", "--diff-filter=MDR", `${rojo}..main`, "--", `${CARPETA}/`), "", `${CARPETA}/ sigue congelada desde su último rojo`);
});
