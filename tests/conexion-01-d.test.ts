// CONEXION-01 · D · retiro de verdad-05: aprobada en tests/orden/APROBADAS.md (rojo-verde --todas la salta) y promovida a npm test como
// copias editables (T: a–e, 9 tests; H: c–e, 4 tests; la copia c de T sin levantar recrear, D-19). Sesión A (2026-09-21): tests rojos.
// Caja negra: git del repo real, `node tools/verdad/rojo-verde.mjs --todas --repo <tmp>` sobre una reproducción de HEAD sin conexion-01/, y el
// runner sobre las copias. Mismo patrón que VERDAD-05 D1/D2. Un mismo archivo en T y en H (cmp → 0): las copias se eligen por SOY.
// VERDAD-06 D2 (2026-09-21): copia editable promovida a npm test (la orden está aprobada y retirada de rojo-verde --todas; el original
// en tests/orden/conexion-01/ queda congelado).
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, matchesGlob, resolve } from "node:path";
import { ROOT, SOY, conTemporal, correrLargo, git, repoTemporal } from "./orden/conexion-01/_util.ts";

const APROBADO = { T: "30b7daa", H: "8239e2d" };

test("verdad-05 figura en tests/orden/APROBADAS.md con fecha 2026-09-21, T 30b7daa y H 8239e2d, y rojo-verde --todas en HEAD imprime «verdad-05 · retirada (aprobada 2026-09-21)» y no «orden verdad-05 ·»", () => {
  const aprobadas = git(ROOT, "show", "HEAD:tests/orden/APROBADAS.md");
  const linea = aprobadas.split(/\r?\n/).find((l) => new RegExp(`^- verdad-05 · aprobada 2026-09-21 · T ${APROBADO.T} · H ${APROBADO.H}\\s*$`).test(l));
  assert.ok(linea, `HEAD:tests/orden/APROBADAS.md debe tener «- verdad-05 · aprobada 2026-09-21 · T ${APROBADO.T} · H ${APROBADO.H}»:\n${aprobadas}`);
  // --todas «en HEAD» sin correr estos mismos tests (que a su vez correrían --todas): HEAD se reproduce en un repo temporal con
  // tests/orden/APROBADAS.md y tests/orden/verdad-0{2,3,4,5}/ tal cual están en HEAD (git show), sin tests/orden/conexion-01/.
  conTemporal((base) => {
    const repo = repoTemporal(SOY, base);
    const rutas = git(ROOT, "ls-tree", "-r", "--name-only", "HEAD", "tests/orden/APROBADAS.md", "tests/orden/verdad-02", "tests/orden/verdad-03", "tests/orden/verdad-04", "tests/orden/verdad-05").split(/\r?\n/).filter(Boolean);
    assert.ok(rutas.includes("tests/orden/verdad-05/HOJA.md"), "HEAD debe tener tests/orden/verdad-05/HOJA.md");
    assert.ok(!rutas.some((r) => r.startsWith("tests/orden/conexion-01/")), "la reproducción no lleva tests/orden/conexion-01/");
    for (const ruta of rutas) {
      const abs = join(repo.dir, ruta);
      mkdirSync(dirname(abs), { recursive: true });
      writeFileSync(abs, git(ROOT, "show", `HEAD:${ruta}`) + "\n");
    }
    repo.commit("HEAD de este repo: APROBADAS.md + tests/orden/verdad-02/ … verdad-05/");
    const r = correrLargo(["tools/verdad/rojo-verde.mjs", "--todas", "--repo", repo.dir]);
    assert.equal(r.status, 0, `--todas con verdad-02..05 aprobadas debe salir 0 (salió ${r.status})\n${r.out.slice(-3000)}`);
    assert.match(r.stdout, /^verdad-05 · retirada \(aprobada 2026-09-21\)$/m, `debe decir «verdad-05 · retirada (aprobada 2026-09-21)»\n${r.stdout}`);
    assert.doesNotMatch(r.stdout, /orden verdad-05 ·/, `no debe imprimir la tabla de verdad-05\n${r.stdout}`);
    assert.doesNotMatch(r.stdout, /verdad-05 · rojo pendiente de B/, "verdad-05 ya no está pendiente de B");
    assert.match(r.stdout, /^verdad-02 · retirada \(aprobada 2026-09-20\)$/m, "control: verdad-02 sigue retirada");
    assert.match(r.stdout, /^verdad-03 · retirada \(aprobada 2026-09-21\)$/m, "control: verdad-03 sigue retirada");
    assert.match(r.stdout, /^verdad-04 · retirada \(aprobada 2026-09-21\)$/m, "control: verdad-04 sigue retirada");
  });
});

test("npm test corre las copias tests/verdad-05-a.test.ts, -b, -c, -d, -e en T (9 tests) y tests/verdad-05-c.test.ts, -d, -e en H (4 tests), que importan ./orden/verdad-05/_util.ts; en la copia c de T, C1 conserva sólo las funciones puras y C2 sólo la lectura de PORT en server.ts, sin levantar recrear (D-19); pasan 9/9 y 4/4; tests/orden/verdad-05/ no cambia desde su último rojo", () => {
  const letras = SOY === "T" ? ["a", "b", "c", "d", "e"] : ["c", "d", "e"];
  const total = SOY === "T" ? 9 : 4;
  const copias = letras.map((s) => `tests/verdad-05-${s}.test.ts`);
  for (const c of copias) assert.ok(existsSync(resolve(ROOT, c)), `falta ${c}`);
  for (const c of copias) assert.ok(/from "\.\/orden\/verdad-05\/_util\.ts"/.test(readFileSync(resolve(ROOT, c), "utf8")), `${c} debe importar ./orden/verdad-05/_util.ts`);
  if (SOY === "T") {
    // La copia c de T: C1 sólo las funciones puras (hojas/sinContrato/huecoDe/diffPng) y C2 sólo la lectura de PORT en server.ts; nada que
    // levante recrear: sin «"--puerto"» ni «"recrear.mjs", "--paleta"» en su fuente, tampoco en comentarios (D-19). Sobre fuentes enteros, assert.ok.
    const c = readFileSync(resolve(ROOT, "tests/verdad-05-c.test.ts"), "utf8");
    assert.ok(/\bhojas\b/.test(c) && /\bdiffPng\b/.test(c), "la copia c conserva las funciones puras de C1 (hojas, diffPng)");
    assert.ok(c.includes("process\\.env\\.PORT") || c.includes("process.env.PORT"), "la copia c conserva la lectura de PORT en server.ts (C2)");
    assert.ok(!c.includes('"--puerto"'), "la copia c no levanta recrear (sin «\"--puerto\"» en su fuente)");
    assert.ok(!c.includes('"recrear.mjs", "--paleta"'), "la copia c no corre «recrear.mjs --paleta» (tampoco en comentarios)");
  }
  // npm test los corre: el script `test` de package.json los nombra (T) o los cubre con un glob (H).
  const script = String(JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8")).scripts?.test ?? "");
  const tokens = script.split(/\s+/).map((t) => t.replace(/^["']|["']$/g, ""));
  for (const c of copias) assert.ok(tokens.some((t) => t === c || (t.includes("*") && matchesGlob(c, t))), `npm test no corre ${c}: ${script}`);
  // Y pasan (9/9 en T, 4/4 en H). Sin NODE_TEST_CONTEXT: el runner anidado heredaría la marca de hijo y se saltaría los archivos.
  const r = correrLargo(["--experimental-strip-types", "--test", ...copias], { env: { NODE_TEST_CONTEXT: undefined } });
  assert.equal(r.status, 0, `las copias deben pasar (salió ${r.status})\n${r.out.slice(-3000)}`);
  assert.match(r.stdout, new RegExp(`^# pass ${total}$`, "m"), `deben ser ${total} tests en verde\n${r.stdout.slice(-600)}`);
  assert.match(r.stdout, /^# fail 0$/m);
  // tests/orden/verdad-05/ no cambia desde su último rojo: ningún commit posterior al último que añade su HOJA.md modifica, borra ni renombra lo que hay.
  const rojo = git(ROOT, "log", "-1", "--format=%H", "--diff-filter=A", "main", "--", "tests/orden/verdad-05/HOJA.md");
  assert.ok(rojo, "precondición: hay un commit que añade tests/orden/verdad-05/HOJA.md");
  assert.equal(git(ROOT, "log", "--format=%h %s", "--diff-filter=MDR", `${rojo}..main`, "--", "tests/orden/verdad-05/"), "", "tests/orden/verdad-05/ sigue congelada desde su último rojo");
});
