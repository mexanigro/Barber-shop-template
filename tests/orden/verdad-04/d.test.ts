// VERDAD-04 · D · retiro de verdad-03: aprobada en tests/orden/APROBADAS.md (rojo-verde --todas la salta) y promovida a npm test como
// seis copias editables (12 tests; la copia d sin volver a correr las copias de verdad-02). Sesión A (2026-09-21): tests rojos. Caja negra:
// git del repo real, `node tools/verdad/rojo-verde.mjs --todas --repo <tmp>` sobre una reproducción de HEAD, y el runner sobre las copias.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, matchesGlob, resolve } from "node:path";
import { ROOT, SOY, conTemporal, correrLargo, git, repoTemporal, rojoVerdeTodas } from "./_util.ts";

test("verdad-03 figura en tests/orden/APROBADAS.md con fecha 2026-09-21, T 0d8c51f y H c852e89, y la salida de rojo-verde --todas en HEAD contiene «verdad-03 · retirada (aprobada 2026-09-21)» y no contiene «orden verdad-03 ·»", () => {
  const aprobadas = git(ROOT, "show", "HEAD:tests/orden/APROBADAS.md");
  const linea = aprobadas.split(/\r?\n/).find((l) => /^- verdad-03 · aprobada 2026-09-21 · T 0d8c51f · H c852e89\s*$/.test(l));
  assert.ok(linea, `HEAD:tests/orden/APROBADAS.md debe tener «- verdad-03 · aprobada 2026-09-21 · T 0d8c51f · H c852e89»:\n${aprobadas}`);
  // --todas «en HEAD» sin correr estos mismos tests (que a su vez correrían --todas): HEAD se reproduce en un repo temporal con
  // tests/orden/APROBADAS.md, tests/orden/verdad-02/ y tests/orden/verdad-03/ tal cual están en HEAD (git show), sin tests/orden/verdad-04/.
  conTemporal((base) => {
    const repo = repoTemporal(SOY, base);
    const rutas = git(ROOT, "ls-tree", "-r", "--name-only", "HEAD", "tests/orden/APROBADAS.md", "tests/orden/verdad-02", "tests/orden/verdad-03").split(/\r?\n/).filter(Boolean);
    assert.ok(rutas.includes("tests/orden/verdad-03/HOJA.md"), "HEAD debe tener tests/orden/verdad-03/HOJA.md");
    assert.ok(!rutas.some((r) => r.startsWith("tests/orden/verdad-04/")), "la reproducción no lleva tests/orden/verdad-04/");
    for (const ruta of rutas) {
      const abs = join(repo.dir, ruta);
      mkdirSync(dirname(abs), { recursive: true });
      writeFileSync(abs, git(ROOT, "show", `HEAD:${ruta}`) + "\n");
    }
    repo.commit("HEAD de este repo: APROBADAS.md + tests/orden/verdad-02/ + tests/orden/verdad-03/");
    const r = rojoVerdeTodas(repo.dir);
    assert.equal(r.status, 0, `--todas con verdad-02 y verdad-03 aprobadas debe salir 0 (salió ${r.status})\n${r.out}`);
    assert.match(r.stdout, /^verdad-03 · retirada \(aprobada 2026-09-21\)$/m, `debe decir «verdad-03 · retirada (aprobada 2026-09-21)»\n${r.stdout}`);
    assert.doesNotMatch(r.stdout, /orden verdad-03 ·/, `no debe imprimir la tabla de verdad-03\n${r.stdout}`);
    assert.match(r.stdout, /^verdad-02 · retirada \(aprobada 2026-09-20\)$/m, "control: verdad-02 sigue retirada");
  });
});

test("npm test corre tests/verdad-03-a.test.ts, -b, -c, -d, -e y -f (copias editables de los 12 tests de la orden, que importan ./orden/verdad-03/_util.ts; en la copia d, el test D2 comprueba existencia, import, package.json y git log sin volver a correr las copias de verdad-02, que npm test ya corre) y pasan 12/12; tests/orden/verdad-03/ no cambia", () => {
  const copias = ["a", "b", "c", "d", "e", "f"].map((s) => `tests/verdad-03-${s}.test.ts`);
  for (const c of copias) assert.ok(existsSync(resolve(ROOT, c)), `falta ${c}`);
  for (const c of copias) assert.match(readFileSync(resolve(ROOT, c), "utf8"), /from "\.\/orden\/verdad-03\/_util\.ts"/, `${c} debe importar ./orden/verdad-03/_util.ts`);
  // La copia d comprueba las copias de verdad-02 (existencia, import, package.json, git log) sin volver a correrlas: su fuente no arma
  // ningún runner («"--test"»), que es lo que hoy cuesta ≈ 60 s repetidos dentro de npm test.
  const d = readFileSync(resolve(ROOT, "tests/verdad-03-d.test.ts"), "utf8");
  assert.match(d, /tests\/verdad-02-/, "la copia d sigue comprobando las copias de verdad-02");
  assert.ok(!d.includes('"--test"'), "la copia d no vuelve a correr las copias de verdad-02 (sin runner «\"--test\"» en su fuente)");
  // npm test los corre: el script `test` de package.json los nombra (T) o los cubre con un glob (H).
  const script = String(JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8")).scripts?.test ?? "");
  const tokens = script.split(/\s+/).map((t) => t.replace(/^["']|["']$/g, ""));
  for (const c of copias) assert.ok(tokens.some((t) => t === c || (t.includes("*") && matchesGlob(c, t))), `npm test no corre ${c}: ${script}`);
  // Y pasan (12/12). Sin NODE_TEST_CONTEXT: el runner anidado heredaría la marca de hijo y se saltaría los archivos.
  const r = correrLargo(["--experimental-strip-types", "--test", ...copias], { env: { NODE_TEST_CONTEXT: undefined } });
  assert.equal(r.status, 0, `las copias deben pasar (salió ${r.status})\n${r.out.slice(-3000)}`);
  assert.match(r.stdout, /^# pass 12$/m, `deben ser 12 tests en verde\n${r.stdout.slice(-600)}`);
  assert.match(r.stdout, /^# fail 0$/m);
  // tests/orden/verdad-03/ no cambia: ningún commit de main modifica, borra ni renombra lo que hay.
  assert.equal(git(ROOT, "log", "--format=%h %s", "--diff-filter=MDR", "main", "--", "tests/orden/verdad-03/"), "", "tests/orden/verdad-03/ sigue congelada");
});
