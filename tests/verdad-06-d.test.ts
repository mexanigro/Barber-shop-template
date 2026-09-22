// VERDAD-06 · D · retiro de conexion-01: aprobada en tests/orden/APROBADAS.md (rojo-verde --todas la salta) y promovida a npm test como
// copias editables (T: b–e, 8 tests, la copia c sin GET ni recrear, D-28/D-19; H: a, d, e, 6 tests). Sesión A (2026-09-21): tests rojos.
// Caja negra: git del repo real, `node tools/verdad/rojo-verde.mjs --todas --repo <tmp>` sobre una reproducción de HEAD sin verdad-06/, y el
// runner sobre las copias. Mismo patrón que CONEXION-01 D1/D2. Un mismo archivo en T y en H (cmp → 0): las copias se eligen por SOY.
// VERDAD-07 D2 (2026-09-21): copia editable promovida a npm test (la orden está aprobada y retirada de rojo-verde --todas; el original
// en tests/orden/verdad-06/ queda congelado).
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, matchesGlob, resolve } from "node:path";
import { CONEXION_01, ROOT, SOY, conTemporal, correrLargo, git, repoTemporal } from "./orden/verdad-06/_util.ts";

test("conexion-01 figura en tests/orden/APROBADAS.md con fecha 2026-09-21, T fdf0ca2 y H 3132b22, y rojo-verde --todas en HEAD imprime «conexion-01 · retirada (aprobada 2026-09-21)» y no «orden conexion-01 ·»", () => {
  const aprobadas = git(ROOT, "show", "HEAD:tests/orden/APROBADAS.md");
  const esperada = `- conexion-01 · aprobada 2026-09-21 · T ${CONEXION_01.aprobado.T} · H ${CONEXION_01.aprobado.H}`;
  assert.ok(aprobadas.split(/\r?\n/).some((l) => l.trim() === esperada), `HEAD:tests/orden/APROBADAS.md debe tener «${esperada}»:\n${aprobadas}`);
  // --todas «en HEAD» sin correr estos mismos tests (que a su vez correrían --todas): HEAD se reproduce en un repo temporal con
  // tests/orden/APROBADAS.md, tests/orden/verdad-0{2,3,4,5}/ y tests/orden/conexion-01/ tal cual están en HEAD (git show), sin verdad-06/.
  conTemporal((base) => {
    const repo = repoTemporal(SOY, base);
    const rutas = git(ROOT, "ls-tree", "-r", "--name-only", "HEAD", "tests/orden/APROBADAS.md", "tests/orden/verdad-02", "tests/orden/verdad-03", "tests/orden/verdad-04", "tests/orden/verdad-05", "tests/orden/conexion-01").split(/\r?\n/).filter(Boolean);
    assert.ok(rutas.includes("tests/orden/conexion-01/HOJA.md"), "HEAD debe tener tests/orden/conexion-01/HOJA.md");
    assert.ok(!rutas.some((r) => r.startsWith("tests/orden/verdad-06/")), "la reproducción no lleva tests/orden/verdad-06/");
    for (const ruta of rutas) {
      const abs = join(repo.dir, ruta);
      mkdirSync(dirname(abs), { recursive: true });
      writeFileSync(abs, git(ROOT, "show", `HEAD:${ruta}`) + "\n");
    }
    repo.commit("HEAD de este repo: APROBADAS.md + tests/orden/verdad-02/ … verdad-05/ + conexion-01/");
    const r = correrLargo(["tools/verdad/rojo-verde.mjs", "--todas", "--repo", repo.dir]);
    assert.equal(r.status, 0, `--todas con verdad-02..05 y conexion-01 aprobadas debe salir 0 (salió ${r.status})\n${r.out.slice(-3000)}`);
    assert.match(r.stdout, /^conexion-01 · retirada \(aprobada 2026-09-21\)$/m, `debe decir «conexion-01 · retirada (aprobada 2026-09-21)»\n${r.stdout}`);
    assert.doesNotMatch(r.stdout, /orden conexion-01 ·/, `no debe imprimir la tabla de conexion-01\n${r.stdout}`);
    assert.doesNotMatch(r.stdout, /conexion-01 · rojo pendiente de B/, "conexion-01 ya no está pendiente de B");
    for (const [id, fecha] of [["verdad-02", "2026-09-20"], ["verdad-03", "2026-09-21"], ["verdad-04", "2026-09-21"], ["verdad-05", "2026-09-21"]]) {
      assert.match(r.stdout, new RegExp(`^${id} · retirada \\(aprobada ${fecha}\\)$`, "m"), `control: ${id} sigue retirada`);
    }
  });
});

test("npm test corre las copias tests/conexion-01-b.test.ts, -c, -d, -e en T (8 tests) y tests/conexion-01-a.test.ts, -d, -e en H (6 tests), que importan ./orden/conexion-01/_util.ts; en la copia c de T, C1 conserva sólo la lectura de los fixtures (cero `/dev-fixtures/media/`, urls con el prefijo de Storage) sin GET, C2 entera, y C3 no está (D-28, D-19); pasan 8/8 y 6/6; tests/orden/conexion-01/ no cambia desde su último rojo (ed14731 en T, 30b61ab en H)", () => {
  const letras = SOY === "T" ? ["b", "c", "d", "e"] : ["a", "d", "e"];
  const total = SOY === "T" ? 8 : 6;
  const copias = letras.map((s) => `tests/conexion-01-${s}.test.ts`);
  for (const c of copias) assert.ok(existsSync(resolve(ROOT, c)), `falta ${c}`);
  for (const c of copias) assert.ok(/from "\.\/orden\/conexion-01\/_util\.ts"/.test(readFileSync(resolve(ROOT, c), "utf8")), `${c} debe importar ./orden/conexion-01/_util.ts`);
  if (SOY === "T") {
    // La copia c de T (D-28): C1 sólo la lectura de los fixtures (cero /dev-fixtures/media/ y el prefijo de Storage) sin GET; C2 entera
    // (hueco.mjs --json); C3 no está: sin «"recrear.mjs"» ni «"--puerto"» en su fuente, tampoco en comentarios (D-19). Sobre el fuente entero.
    const c = readFileSync(resolve(ROOT, "tests/conexion-01-c.test.ts"), "utf8");
    assert.ok(c.includes('"/dev-fixtures/media/"') && c.includes("firebasestorage.googleapis.com/v0/b/"), "la copia c conserva la lectura de los fixtures de C1 (cero /dev-fixtures/media/, prefijo de Storage)");
    assert.ok(!/\bfetch\s*\(/.test(c), "la copia c no hace GET (sin «fetch(»)");
    assert.ok(c.includes("tools/verdad/hueco.mjs") && c.includes('"--json"'), "la copia c conserva C2 entera (hueco.mjs --json)");
    assert.ok(!c.includes('"recrear.mjs"') && !c.includes("recrear.mjs\""), "la copia c no lleva C3 (sin «recrear.mjs» entre comillas)");
    assert.ok(!c.includes('"--puerto"'), "la copia c no levanta recrear (sin «\"--puerto\"» en su fuente)");
    assert.equal((c.match(/^test\(/gm) ?? []).length, 2, "la copia c tiene dos tests (C1 y C2)");
  }
  // npm test los corre: el script `test` de package.json los nombra (T) o los cubre con un glob (H).
  // VERDAD-08 (D-57): en T `npm test` encadena dos fases y la lista de archivos vive en `test:unit` y `test:browser`; en H sigue
  // siendo el glob de `test`. La lista que corre npm es la unión de las tres.
  const npmScripts = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8")).scripts ?? {};
  const script = [npmScripts.test, npmScripts["test:unit"], npmScripts["test:browser"]].filter(Boolean).join(" ");
  const tokens = script.split(/\s+/).map((t) => t.replace(/^["']|["']$/g, ""));
  for (const c of copias) assert.ok(tokens.some((t) => t === c || (t.includes("*") && matchesGlob(c, t))), `npm test no corre ${c}: ${script}`);
  // Y pasan (8/8 en T, 6/6 en H). Sin NODE_TEST_CONTEXT: el runner anidado heredaría la marca de hijo y se saltaría los archivos.
  const r = correrLargo(["--experimental-strip-types", "--test", ...copias], { env: { NODE_TEST_CONTEXT: undefined } });
  assert.equal(r.status, 0, `las copias deben pasar (salió ${r.status})\n${r.out.slice(-3000)}`);
  assert.match(r.stdout, new RegExp(`^# pass ${total}$`, "m"), `deben ser ${total} tests en verde\n${r.stdout.slice(-600)}`);
  assert.match(r.stdout, /^# fail 0$/m);
  // tests/orden/conexion-01/ no cambia desde su último rojo: el último commit de main que añade su HOJA.md es el esperado (A2 en T) y
  // ningún commit posterior modifica, borra ni renombra lo que hay.
  const rojo = git(ROOT, "log", "-1", "--format=%H", "--diff-filter=A", "main", "--", "tests/orden/conexion-01/HOJA.md");
  assert.ok(rojo.startsWith(CONEXION_01.rojo[SOY]), `el último rojo de conexion-01 en ${SOY} es ${CONEXION_01.rojo[SOY]} (git da ${rojo.slice(0, 7)})`);
  assert.equal(git(ROOT, "log", "--format=%h %s", "--diff-filter=MDR", `${rojo}..main`, "--", "tests/orden/conexion-01/"), "", "tests/orden/conexion-01/ sigue congelada desde su último rojo");
});
