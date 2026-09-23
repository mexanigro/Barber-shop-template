// CONEXION-05 · D · retiro de VERDAD-09 (D-68): aprobada en tests/orden/APROBADAS.md (rojo-verde --todas la salta) y promovida a npm
// test como copias editables (a, b, c, d = 7 tests que corren en cada repo), con su carpeta congelada desde el último rojo. La línea de
// APROBADAS.md la escribe la sesión B. Sesión A (2026-09-22): tests rojos — no está la línea ni están las copias.
// Caja negra: git del repo real, `rojo-verde --todas --repo <tmp>` sobre una reproducción de HEAD sin conexion-05/, y lectura de las
// copias (D2 NO las corre: `verdad-09-c` reproduce HEAD y correría esta misma orden). Un mismo archivo en T y en H (cmp → 0).
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { matchesGlob, resolve } from "node:path";
import { REPO, ROOT, VERDAD_09, conTemporal, cuentaTests, git, reproducirHead, rojoVerdeTodas } from "./_comun.ts";

const LETRAS = ["a", "b", "c", "d"];
/** Tests que CORREN en cada repo = afirmaciones de la HOJA de verdad-09 (las siete son T+H). */
const TOTAL = 7;
const CARPETA = "tests/orden/verdad-09";
/** Las once órdenes ya retiradas antes de esta (control de que ninguna vuelve a correr). */
const RETIRADAS = [
  ["verdad-02", "2026-09-20"], ["verdad-03", "2026-09-21"], ["verdad-04", "2026-09-21"], ["verdad-05", "2026-09-21"],
  ["conexion-01", "2026-09-21"], ["verdad-06", "2026-09-21"], ["verdad-07", "2026-09-22"], ["conexion-02", "2026-09-22"],
  ["conexion-03", "2026-09-22"], ["conexion-04", "2026-09-22"], ["verdad-08", "2026-09-22"],
];

test("verdad-09 figura en tests/orden/APROBADAS.md con fecha 2026-09-22, T 49d5121 y H b7952bf, y rojo-verde --todas en HEAD imprime «verdad-09 · retirada (aprobada 2026-09-22)» y no «orden verdad-09 ·»", () => {
  const aprobadas = git(ROOT, "show", "HEAD:tests/orden/APROBADAS.md");
  const esperada = `- verdad-09 · aprobada 2026-09-22 · T ${VERDAD_09.aprobado.T} · H ${VERDAD_09.aprobado.H}`;
  assert.ok(aprobadas.split(/\r?\n/).some((l) => l.trim() === esperada), `HEAD:tests/orden/APROBADAS.md debe tener «${esperada}»:\n${aprobadas}`);
  // --todas «en HEAD» sin correr estos mismos tests (que a su vez correrían --todas): HEAD se reproduce sin conexion-05/.
  conTemporal((base) => {
    const { repo, ids } = reproducirHead(base, ["conexion-05"]);
    assert.ok(ids.includes("verdad-09"), `la reproducción lleva ${CARPETA}/ (ids: ${ids.join(", ")})`);
    assert.ok(!ids.includes("conexion-05"), "la reproducción no lleva tests/orden/conexion-05/");
    const r = rojoVerdeTodas(repo.dir);
    assert.equal(r.status, 0, `--todas sobre la reproducción de HEAD debe salir 0 (salió ${r.status})\n${r.out.slice(-3000)}`);
    assert.match(r.stdout, /^verdad-09 · retirada \(aprobada 2026-09-22\)$/m, `debe decir «verdad-09 · retirada (aprobada 2026-09-22)»\n${r.stdout}`);
    assert.doesNotMatch(r.stdout, /orden verdad-09 ·/, `no debe imprimir la tabla de verdad-09\n${r.stdout}`);
    assert.doesNotMatch(r.stdout, /verdad-09 · rojo pendiente de B/, "verdad-09 ya no está pendiente de B");
    for (const [id, fecha] of RETIRADAS) assert.match(r.stdout, new RegExp(`^${id} · retirada \\(aprobada ${fecha}\\)$`, "m"), `control: ${id} sigue retirada`);
  });
});

test("npm test corre las copias tests/verdad-09-a.test.ts, -b, -c, -d en T y en H (7 tests cada uno), que importan ./orden/verdad-09/_comun.ts, sin recorte y sin volver a correr copias anteriores; en T van a `test:unit`; tests/orden/verdad-09/ no cambia desde su último rojo (753e027 en T, 7482ad4 en H)", () => {
  const leer = (rel: string) => readFileSync(resolve(ROOT, rel), "utf8");
  const copias = LETRAS.map((s) => `tests/verdad-09-${s}.test.ts`);
  for (const c of copias) assert.ok(existsSync(resolve(ROOT, c)), `falta ${c} en ${REPO}`);
  for (const c of copias) assert.match(leer(c), /from "\.\/orden\/verdad-09\/_comun\.ts"/, `${c} debe importar ./orden/verdad-09/_comun.ts`);
  // Sin recorte: cada copia lleva tantos `test(` como su original en la carpeta congelada, y entre todas suman las siete afirmaciones.
  for (const s of LETRAS) {
    assert.equal(cuentaTests(leer(`tests/verdad-09-${s}.test.ts`)), cuentaTests(leer(`${CARPETA}/${s}.test.ts`)), `la copia ${s} lleva los mismos tests que ${CARPETA}/${s}.test.ts (entera)`);
  }
  assert.equal(LETRAS.reduce((n, s) => n + cuentaTests(leer(`tests/verdad-09-${s}.test.ts`)), 0), TOTAL, `las copias suman ${TOTAL} tests`);
  // Sin volver a correr copias anteriores: ninguna reproduce HEAD ni corre `--todas` sobre él (HEAD lleva conexion-05, viva: sería recursión).
  for (const c of copias) {
    assert.doesNotMatch(leer(c), /reproducirHead\(/, `${c} no reproduce HEAD: volvería a correr las órdenes vivas de HEAD`);
  }
  // npm test las corre: los scripts de package.json las nombran (en T, `test:unit`, porque `test` encadena las fases, D-57) o las cubren con un glob (H).
  const scripts = JSON.parse(leer("package.json")).scripts ?? {};
  const nombra = (script: string, archivo: string) => String(script ?? "").split(/\s+/).map((t) => t.replace(/^["']|["']$/g, "")).some((t) => t === archivo || (t.includes("*") && matchesGlob(archivo, t)));
  for (const c of copias) {
    assert.ok(["test", "test:unit", "test:browser"].some((s) => nombra(scripts[s], c)), `npm test no corre ${c}`);
    if (REPO === "T") {
      assert.ok(nombra(scripts["test:unit"], c), `en T, ${c} va en la fase concurrente test:unit`);
      assert.doesNotMatch(leer(c), /from "playwright"/, `${c} no importa playwright (por eso va en test:unit)`);
    }
  }
  // La carpeta de la orden sigue congelada: el último commit de main que añade su HOJA.md es el esperado y ninguno posterior la toca.
  const rojo = git(ROOT, "log", "-1", "--format=%H", "--diff-filter=A", "main", "--", `${CARPETA}/HOJA.md`);
  assert.ok(rojo.startsWith(VERDAD_09.rojo[REPO]), `el último rojo de verdad-09 en ${REPO} es ${VERDAD_09.rojo[REPO]} (git da ${rojo.slice(0, 7)})`);
  assert.equal(git(ROOT, "log", "--format=%h %s", "--diff-filter=MDR", `${rojo}..main`, "--", `${CARPETA}/`), "", `${CARPETA}/ sigue congelada desde su último rojo`);
});
