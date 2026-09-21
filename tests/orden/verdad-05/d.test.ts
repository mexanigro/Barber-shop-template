// VERDAD-05 · D · retiro de verdad-04: aprobada en tests/orden/APROBADAS.md (rojo-verde --todas la salta) y promovida a npm test como
// cinco copias editables (9 tests; la copia c sin volver a correr las copias de verdad-02 ni `--orden verdad-02`). Sesión A (2026-09-21):
// tests rojos. Caja negra: git del repo real, `node tools/verdad/rojo-verde.mjs --todas --repo <tmp>` sobre una reproducción de HEAD, y el
// runner sobre las copias. Mismo patrón que VERDAD-04 D1/D2 (la aserción «desde su último rojo» es la corregida en A2, D-15).
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, matchesGlob, resolve } from "node:path";
import { ROOT, SOY, conTemporal, correrLargo, git, repoTemporal } from "./_util.ts";

const APROBADO = { T: "f202481", H: "7d42172" };

test("verdad-04 figura en tests/orden/APROBADAS.md con fecha 2026-09-21, T f202481 y H 7d42172, y la salida de rojo-verde --todas en HEAD contiene «verdad-04 · retirada (aprobada 2026-09-21)» y no contiene «orden verdad-04 ·»", () => {
  const aprobadas = git(ROOT, "show", "HEAD:tests/orden/APROBADAS.md");
  const linea = aprobadas.split(/\r?\n/).find((l) => new RegExp(`^- verdad-04 · aprobada 2026-09-21 · T ${APROBADO.T} · H ${APROBADO.H}\\s*$`).test(l));
  assert.ok(linea, `HEAD:tests/orden/APROBADAS.md debe tener «- verdad-04 · aprobada 2026-09-21 · T ${APROBADO.T} · H ${APROBADO.H}»:\n${aprobadas}`);
  // --todas «en HEAD» sin correr estos mismos tests (que a su vez correrían --todas): HEAD se reproduce en un repo temporal con
  // tests/orden/APROBADAS.md y tests/orden/verdad-0{2,3,4}/ tal cual están en HEAD (git show), sin tests/orden/verdad-05/.
  conTemporal((base) => {
    const repo = repoTemporal(SOY, base);
    const rutas = git(ROOT, "ls-tree", "-r", "--name-only", "HEAD", "tests/orden/APROBADAS.md", "tests/orden/verdad-02", "tests/orden/verdad-03", "tests/orden/verdad-04").split(/\r?\n/).filter(Boolean);
    assert.ok(rutas.includes("tests/orden/verdad-04/HOJA.md"), "HEAD debe tener tests/orden/verdad-04/HOJA.md");
    assert.ok(!rutas.some((r) => r.startsWith("tests/orden/verdad-05/")), "la reproducción no lleva tests/orden/verdad-05/");
    for (const ruta of rutas) {
      const abs = join(repo.dir, ruta);
      mkdirSync(dirname(abs), { recursive: true });
      writeFileSync(abs, git(ROOT, "show", `HEAD:${ruta}`) + "\n");
    }
    repo.commit("HEAD de este repo: APROBADAS.md + tests/orden/verdad-02/ + verdad-03/ + verdad-04/");
    const r = correrLargo(["tools/verdad/rojo-verde.mjs", "--todas", "--repo", repo.dir]);
    assert.equal(r.status, 0, `--todas con verdad-02, verdad-03 y verdad-04 aprobadas debe salir 0 (salió ${r.status})\n${r.out.slice(-3000)}`);
    assert.match(r.stdout, /^verdad-04 · retirada \(aprobada 2026-09-21\)$/m, `debe decir «verdad-04 · retirada (aprobada 2026-09-21)»\n${r.stdout}`);
    assert.doesNotMatch(r.stdout, /orden verdad-04 ·/, `no debe imprimir la tabla de verdad-04\n${r.stdout}`);
    assert.doesNotMatch(r.stdout, /verdad-04 · rojo pendiente de B/, "verdad-04 ya no está pendiente de B");
    assert.match(r.stdout, /^verdad-02 · retirada \(aprobada 2026-09-20\)$/m, "control: verdad-02 sigue retirada");
    assert.match(r.stdout, /^verdad-03 · retirada \(aprobada 2026-09-21\)$/m, "control: verdad-03 sigue retirada");
  });
});

test("npm test corre tests/verdad-04-a.test.ts, -b, -c, -d y -e (copias editables de los 9 tests, que importan ./orden/verdad-04/_util.ts; en la copia c, C1 comprueba sólo el fuente de las copias de verdad-02 y C2 sólo el repo temporal de las tres fallas, sin correr `--orden verdad-02`) y pasan 9/9; tests/orden/verdad-04/ no cambia desde su último rojo", () => {
  const copias = ["a", "b", "c", "d", "e"].map((s) => `tests/verdad-04-${s}.test.ts`);
  for (const c of copias) assert.ok(existsSync(resolve(ROOT, c)), `falta ${c}`);
  for (const c of copias) assert.ok(/from "\.\/orden\/verdad-04\/_util\.ts"/.test(readFileSync(resolve(ROOT, c), "utf8")), `${c} debe importar ./orden/verdad-04/_util.ts`);
  // La copia c: C1 comprueba sólo el fuente de las copias de verdad-02 (sin runner «"--test"», que es lo que cuesta ≈ 60 s) y C2 sólo el
  // repo temporal de las tres fallas (sin `--orden verdad-02` contra lo real, ≈ 60 s más). Sobre fuentes enteros, assert.ok(re.test(…)).
  const c = readFileSync(resolve(ROOT, "tests/verdad-04-c.test.ts"), "utf8");
  assert.ok(/tests\/verdad-02-/.test(c), "la copia c sigue comprobando el fuente de las copias de verdad-02");
  assert.ok(/zz-acumula/.test(c), "la copia c sigue probando el repo temporal de las tres fallas");
  assert.ok(!c.includes('"--test"'), "la copia c no vuelve a correr las copias de verdad-02 (sin «\"--test\"» en su fuente)");
  assert.ok(!c.includes('"--orden", "verdad-02"'), "la copia c no corre «--orden verdad-02» contra lo real");
  // npm test los corre: el script `test` de package.json los nombra (T) o los cubre con un glob (H).
  const script = String(JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8")).scripts?.test ?? "");
  const tokens = script.split(/\s+/).map((t) => t.replace(/^["']|["']$/g, ""));
  for (const c of copias) assert.ok(tokens.some((t) => t === c || (t.includes("*") && matchesGlob(c, t))), `npm test no corre ${c}: ${script}`);
  // Y pasan (9/9). Sin NODE_TEST_CONTEXT: el runner anidado heredaría la marca de hijo y se saltaría los archivos.
  const r = correrLargo(["--experimental-strip-types", "--test", ...copias], { env: { NODE_TEST_CONTEXT: undefined } });
  assert.equal(r.status, 0, `las copias deben pasar (salió ${r.status})\n${r.out.slice(-3000)}`);
  assert.match(r.stdout, /^# pass 9$/m, `deben ser 9 tests en verde\n${r.stdout.slice(-600)}`);
  assert.match(r.stdout, /^# fail 0$/m);
  // tests/orden/verdad-04/ no cambia desde su último rojo: ningún commit posterior al último que añade su HOJA.md modifica, borra ni renombra lo que hay.
  const rojo = git(ROOT, "log", "-1", "--format=%H", "--diff-filter=A", "main", "--", "tests/orden/verdad-04/HOJA.md");
  assert.ok(rojo, "precondición: hay un commit que añade tests/orden/verdad-04/HOJA.md");
  assert.equal(git(ROOT, "log", "--format=%h %s", "--diff-filter=MDR", `${rojo}..main`, "--", "tests/orden/verdad-04/"), "", "tests/orden/verdad-04/ sigue congelada desde su último rojo");
});
