// VERDAD-07 · D · retiro de verdad-06 (D-32): aprobada en tests/orden/APROBADAS.md (rojo-verde --todas la salta) y promovida entera a npm
// test como copias editables (T: a–e, 10 tests; H: b–e, 9 tests). Sesión A (2026-09-21): tests rojos. Caja negra: git del repo real,
// `node tools/verdad/rojo-verde.mjs --todas --repo <tmp>` sobre una reproducción de HEAD sin verdad-07/, y el runner sobre las copias.
// Mismo patrón que VERDAD-06 D1/D2. Un mismo archivo en T y en H (cmp → 0): las copias se eligen por SOY.
// CONEXION-02 D2 (2026-09-22): copia editable promovida a npm test (VERDAD-07 está aprobada y retirada de rojo-verde --todas; el original
// en tests/orden/verdad-07/ queda congelado).
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { matchesGlob, resolve } from "node:path";
import { ROOT, SOY, VERDAD_06, conTemporal, correrLargo, git, reproducirHead, rojoVerdeTodas } from "./orden/verdad-07/_util.ts";

test("verdad-06 figura en tests/orden/APROBADAS.md con fecha 2026-09-21, T 0a9dc03 y H 7ef7a8a, y rojo-verde --todas en HEAD imprime «verdad-06 · retirada (aprobada 2026-09-21)» y no «orden verdad-06 ·»", () => {
  const aprobadas = git(ROOT, "show", "HEAD:tests/orden/APROBADAS.md");
  const esperada = `- verdad-06 · aprobada 2026-09-21 · T ${VERDAD_06.aprobado.T} · H ${VERDAD_06.aprobado.H}`;
  assert.ok(aprobadas.split(/\r?\n/).some((l) => l.trim() === esperada), `HEAD:tests/orden/APROBADAS.md debe tener «${esperada}»:\n${aprobadas}`);
  // --todas «en HEAD» sin correr estos mismos tests (que a su vez correrían --todas): HEAD se reproduce en un repo temporal sin verdad-07/.
  conTemporal((base) => {
    const { repo, ids } = reproducirHead(base, ["verdad-07"]);
    assert.ok(ids.includes("verdad-06"), `la reproducción lleva tests/orden/verdad-06/ (ids: ${ids.join(", ")})`);
    const r = rojoVerdeTodas(repo.dir);
    assert.equal(r.status, 0, `--todas con verdad-02..06 y conexion-01 aprobadas debe salir 0 (salió ${r.status})\n${r.out.slice(-3000)}`);
    assert.match(r.stdout, /^verdad-06 · retirada \(aprobada 2026-09-21\)$/m, `debe decir «verdad-06 · retirada (aprobada 2026-09-21)»\n${r.stdout}`);
    assert.doesNotMatch(r.stdout, /orden verdad-06 ·/, `no debe imprimir la tabla de verdad-06\n${r.stdout}`);
    assert.doesNotMatch(r.stdout, /verdad-06 · rojo pendiente de B/, "verdad-06 ya no está pendiente de B");
    for (const [id, fecha] of [["verdad-02", "2026-09-20"], ["verdad-03", "2026-09-21"], ["verdad-04", "2026-09-21"], ["verdad-05", "2026-09-21"], ["conexion-01", "2026-09-21"]]) {
      assert.match(r.stdout, new RegExp(`^${id} · retirada \\(aprobada ${fecha}\\)$`, "m"), `control: ${id} sigue retirada`);
    }
  });
});

test("npm test corre las copias tests/verdad-06-a.test.ts, -b, -c, -d, -e en T (10 tests) y -b, -c, -d, -e en H (9 tests), que importan ./orden/verdad-06/_util.ts, sin recorte (D-32); pasan 10/10 y 9/9; tests/orden/verdad-06/ no cambia desde su último rojo (16c0f1f en T, 088b32e en H)", () => {
  const letras = SOY === "T" ? ["a", "b", "c", "d", "e"] : ["b", "c", "d", "e"];
  const total = SOY === "T" ? 10 : 9;
  const copias = letras.map((s) => `tests/verdad-06-${s}.test.ts`);
  for (const c of copias) assert.ok(existsSync(resolve(ROOT, c)), `falta ${c}`);
  for (const c of copias) assert.ok(/from "\.\/orden\/verdad-06\/_util\.ts"/.test(readFileSync(resolve(ROOT, c), "utf8")), `${c} debe importar ./orden/verdad-06/_util.ts`);
  // Sin recorte (D-32): cada copia tiene tantos `test(` como su original en tests/orden/verdad-06/.
  const cuenta = (archivo: string) => (readFileSync(resolve(ROOT, archivo), "utf8").match(/^test\(/gm) ?? []).length;
  for (const s of letras) assert.equal(cuenta(`tests/verdad-06-${s}.test.ts`), cuenta(`tests/orden/verdad-06/${s}.test.ts`), `la copia ${s} lleva los mismos tests que tests/orden/verdad-06/${s}.test.ts (entera)`);
  assert.equal(letras.reduce((n, s) => n + cuenta(`tests/orden/verdad-06/${s}.test.ts`), 0), total, `precondición: la orden tiene ${total} tests en ${SOY}`);
  // npm test los corre: el script `test` de package.json los nombra (T) o los cubre con un glob (H).
  const script = String(JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8")).scripts?.test ?? "");
  const tokens = script.split(/\s+/).map((t) => t.replace(/^["']|["']$/g, ""));
  for (const c of copias) assert.ok(tokens.some((t) => t === c || (t.includes("*") && matchesGlob(c, t))), `npm test no corre ${c}: ${script}`);
  // Y pasan (10/10 en T, 9/9 en H). Sin NODE_TEST_CONTEXT: el runner anidado heredaría la marca de hijo y se saltaría los archivos.
  const r = correrLargo(["--experimental-strip-types", "--test", ...copias], { env: { NODE_TEST_CONTEXT: undefined } });
  assert.equal(r.status, 0, `las copias deben pasar (salió ${r.status})\n${r.out.slice(-3000)}`);
  assert.match(r.stdout, new RegExp(`^# pass ${total}$`, "m"), `deben ser ${total} tests en verde\n${r.stdout.slice(-600)}`);
  assert.match(r.stdout, /^# fail 0$/m);
  // tests/orden/verdad-06/ no cambia desde su último rojo: el último commit de main que añade su HOJA.md es el esperado (A3 en T) y
  // ningún commit posterior modifica, borra ni renombra lo que hay.
  const rojo = git(ROOT, "log", "-1", "--format=%H", "--diff-filter=A", "main", "--", "tests/orden/verdad-06/HOJA.md");
  assert.ok(rojo.startsWith(VERDAD_06.rojo[SOY]), `el último rojo de verdad-06 en ${SOY} es ${VERDAD_06.rojo[SOY]} (git da ${rojo.slice(0, 7)})`);
  assert.equal(git(ROOT, "log", "--format=%h %s", "--diff-filter=MDR", `${rojo}..main`, "--", "tests/orden/verdad-06/"), "", "tests/orden/verdad-06/ sigue congelada desde su último rojo");
});
