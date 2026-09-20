// VERDAD-02 · A · rojo antes que verde, comprobable por git (tools/verdad/rojo-verde.mjs).
// Sesión A (2026-09-20): tests rojos. Caja negra: se lanza `node tools/verdad/rojo-verde.mjs --orden x --repo <tmp>` desde el repo real
// contra repositorios git temporales con commit rojo (HOJA + test que falla), commit verde y variantes. La construcción es de B.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { OTRO, ROOT, SOY, bloqueContrato, borrar, carpetaTemporal, correr, hojaMinima, repoTemporal, rojoVerde, testMinimo, type Repo } from "./_util.ts";

const ORDEN = "x";
const CARPETA = `tests/orden/${ORDEN}`;
const sha7 = (s: string) => s.slice(0, 7);

type Escenario = { hoja: [string, string, string][]; tests: [string, string | null][]; verde?: string[] };

/** Repo temporal con commit rojo (HOJA.md + x.test.ts) y, si se pide, commit verde con los archivos que ponen los tests en verde. */
function escenario(base: string, e: Escenario): { repo: Repo; rojo: string; verde: string | null } {
  const repo = repoTemporal(SOY, base);
  const rojo = repo.commit("rojo", { [`${CARPETA}/HOJA.md`]: hojaMinima(e.hoja), [`${CARPETA}/x.test.ts`]: testMinimo(e.tests) });
  const verde = e.verde ? repo.commit("verde", Object.fromEntries(e.verde.map((a) => [a, "verde\n"]))) : null;
  return { repo, rojo, verde };
}

test("El commit rojo de una orden es el primer commit de main que añade tests/orden/<id>/HOJA.md; sin ese commit, rojo-verde --orden <id> sale con 2 y dice «sin commit rojo»", () => {
  const base1 = carpetaTemporal();
  const sinRojo = repoTemporal(SOY, base1); // main sin tests/orden/x/
  const r1 = rojoVerde(ORDEN, sinRojo.dir);
  assert.equal(r1.status, 2, `sin commit rojo debe salir 2 (salió ${r1.status})\n${r1.out}`);
  assert.match(r1.out, /sin commit rojo/, "debe decir «sin commit rojo»");
  borrar(base1);

  // Dirección positiva: con rojo y verde no dice «sin commit rojo», sale 0 y cita el SHA del commit rojo.
  const base2 = carpetaTemporal();
  const { repo, rojo } = escenario(base2, { hoja: [["X1", "T+H", "frase uno"]], tests: [["frase uno", "verde.txt"]], verde: ["verde.txt"] });
  const r2 = rojoVerde(ORDEN, repo.dir);
  assert.equal(r2.status, 0, `con rojo y verde debe salir 0 (salió ${r2.status})\n${r2.out}`);
  assert.doesNotMatch(r2.out, /sin commit rojo/);
  assert.ok(r2.stdout.includes(sha7(rojo)), `debe citar el commit rojo ${sha7(rojo)}\n${r2.stdout}`);

  // «El PRIMER commit que añade»: si HOJA.md se quita y se repone idéntica, el rojo sigue siendo el primero, no el que la repone.
  const hoja = readFileSync(join(repo.dir, CARPETA, "HOJA.md"), "utf8");
  repo.git("rm", "-q", `${CARPETA}/HOJA.md`);
  repo.git("commit", "-q", "-m", "quita HOJA");
  const repone = repo.commit("repone HOJA", { [`${CARPETA}/HOJA.md`]: hoja });
  const r3 = rojoVerde(ORDEN, repo.dir);
  assert.equal(r3.status, 0, `tras reponer HOJA.md idéntica debe seguir en 0 (salió ${r3.status})\n${r3.out}`);
  assert.ok(r3.stdout.includes(sha7(rojo)), `debe citar el primer commit ${sha7(rojo)}\n${r3.stdout}`);
  assert.ok(!r3.stdout.includes(sha7(repone)), `no debe tomar por rojo al commit que repone ${sha7(repone)}\n${r3.stdout}`);
  borrar(base2);
});

test("En el árbol del commit rojo cada test de tests/orden/<id>/ corre y falla; si alguno pasa en ese árbol, exit 2 con «<nombre>: nunca estuvo en rojo»", () => {
  const base = carpetaTemporal();
  // «frase dos» pasa siempre (también en el árbol rojo); «frase uno» falla en rojo y pasa en verde.
  const { repo } = escenario(base, { hoja: [["X1", "T+H", "frase uno"], ["X2", "T+H", "frase dos"]], tests: [["frase uno", "verde.txt"], ["frase dos", null]], verde: ["verde.txt"] });
  const r = rojoVerde(ORDEN, repo.dir);
  assert.equal(r.status, 2, `un test que pasa en el árbol rojo debe dar 2 (salió ${r.status})\n${r.out}`);
  assert.match(r.out, /frase dos: nunca estuvo en rojo/, "debe nombrar al test que nunca estuvo en rojo");
  assert.doesNotMatch(r.out, /frase uno: nunca estuvo en rojo/, "«frase uno» sí estuvo en rojo");
  borrar(base);
});

test("En HEAD cada test de tests/orden/<id>/ pasa; si alguno falla, exit 2 con su nombre", () => {
  const base = carpetaTemporal();
  // El verde sólo pone verde.txt: «frase dos» (que pide verde2.txt) sigue fallando en HEAD.
  const { repo } = escenario(base, { hoja: [["X1", "T+H", "frase uno"], ["X2", "T+H", "frase dos"]], tests: [["frase uno", "verde.txt"], ["frase dos", "verde2.txt"]], verde: ["verde.txt"] });
  const r = rojoVerde(ORDEN, repo.dir);
  assert.equal(r.status, 2, `un test que falla en HEAD debe dar 2 (salió ${r.status})\n${r.out}`);
  assert.match(r.out, /frase dos/, "debe nombrar al test que falla en HEAD");
  // Dirección positiva: con verde2.txt en HEAD, sale 0.
  repo.commit("verde2", { "verde2.txt": "verde\n" });
  const r2 = rojoVerde(ORDEN, repo.dir);
  assert.equal(r2.status, 0, `con todos los tests en verde debe salir 0 (salió ${r2.status})\n${r2.out}`);
  borrar(base);
});

test("git diff <rojo> HEAD -- tests/orden/<id>/ no tiene cambios; si los hay, exit 2 con la lista de archivos tocados", () => {
  const base = carpetaTemporal();
  const { repo } = escenario(base, { hoja: [["X1", "T+H", "frase uno"]], tests: [["frase uno", "verde.txt"]], verde: ["verde.txt"] });
  const antes = rojoVerde(ORDEN, repo.dir);
  assert.equal(antes.status, 0, `sin tocar los tests debe salir 0 (salió ${antes.status})\n${antes.out}`);
  // Un commit posterior toca el test (sólo un comentario): la carpeta de la orden cambió entre rojo y HEAD.
  const ruta = `${CARPETA}/x.test.ts`;
  repo.commit("toca tests", { [ruta]: readFileSync(join(repo.dir, ruta), "utf8") + "// tocado después del rojo\n" });
  const r = rojoVerde(ORDEN, repo.dir);
  assert.equal(r.status, 2, `tests tocados tras el rojo deben dar 2 (salió ${r.status})\n${r.out}`);
  assert.ok(r.out.replace(/\\/g, "/").includes(ruta), `debe listar el archivo tocado ${ruta}\n${r.out}`);
  borrar(base);
});

test("Cada test de tests/orden/<id>/ tiene por nombre una frase que está literal en HOJA.md como afirmación de ese repo, y cada afirmación de ese repo tiene un test con ese nombre; un test sin afirmación o una afirmación sin test → exit 2 con la lista", () => {
  const base = carpetaTemporal();
  // HOJA: X1 «frase uno» (con test), X2 «frase dos» (sin test), X3 del otro repo (no cuenta aquí). Tests: «frase uno», «frase tres» (sin afirmación).
  const { repo } = escenario(base, {
    hoja: [["X1", "T+H", "frase uno"], ["X2", "T+H", "frase dos"], ["X3", OTRO, "frase del otro repo"]],
    tests: [["frase uno", "verde.txt"], ["frase tres", "verde.txt"]],
    verde: ["verde.txt"],
  });
  const r = rojoVerde(ORDEN, repo.dir);
  assert.equal(r.status, 2, `afirmación sin test y test sin afirmación deben dar 2 (salió ${r.status})\n${r.out}`);
  assert.match(r.out, /frase dos/, "debe listar la afirmación sin test");
  assert.match(r.out, /frase tres/, "debe listar el test sin afirmación");
  assert.doesNotMatch(r.out, /frase del otro repo/, `una afirmación del repo ${OTRO} no se exige en ${SOY}`);
  borrar(base);
});

test("Con A1–A5 cumplidas sale 0 e imprime una tabla por test: id, frase, «rojo en <sha7>», «verde en <sha7 de HEAD>», sin horas ni texto libre; dos corridas seguidas sobre el mismo HEAD producen bytes idénticos", () => {
  const base = carpetaTemporal();
  const { repo, rojo, verde } = escenario(base, { hoja: [["X1", "T+H", "frase uno"], ["X2", "T+H", "frase dos"]], tests: [["frase uno", "verde.txt"], ["frase dos", "verde.txt"]], verde: ["verde.txt"] });
  const r1 = rojoVerde(ORDEN, repo.dir);
  assert.equal(r1.status, 0, `todo cumplido debe salir 0 (salió ${r1.status})\n${r1.out}`);
  for (const esperado of ["X1", "X2", "frase uno", "frase dos", `rojo en ${sha7(rojo)}`, `verde en ${sha7(verde!)}`]) {
    assert.ok(r1.stdout.includes(esperado), `la tabla debe contener «${esperado}»\n${r1.stdout}`);
  }
  assert.doesNotMatch(r1.stdout, /\b\d{1,2}:\d{2}(:\d{2})?\b/, `sin horas en la salida\n${r1.stdout}`);
  const r2 = rojoVerde(ORDEN, repo.dir);
  assert.equal(r2.status, 0);
  assert.equal(r2.stdout, r1.stdout, "dos corridas sobre el mismo HEAD deben producir bytes idénticos");
  borrar(base);
});

test(".githooks/pre-push corre rojo-verde --todas (cada <id> con carpeta en tests/orden/) y rechaza el push con cualquier exit 2; el bloque CONTRATO-DECLARADO de CLAUDE.md lo declara y tests/contrato-hooks.test.ts sigue verde", () => {
  const base = carpetaTemporal();
  const repo = repoTemporal(SOY, base);
  const marca = join(base, "rojo-verde-invocado.txt");
  // El pre-push REAL de este repo, con destino-no-despliega neutralizado (exit 0) y un rojo-verde que deja marca y sale 2.
  repo.commit("hooks", {
    ".githooks/pre-push": readFileSync(resolve(ROOT, ".githooks/pre-push"), "utf8"),
    "tools/destino-no-despliega.mjs": "process.exit(0);\n",
    "tools/verdad/rojo-verde.mjs": `import { writeFileSync } from "node:fs";\nwriteFileSync(${JSON.stringify(marca)}, process.argv.slice(2).join(" "));\nprocess.exit(2);\n`,
    "tests/orden/x/HOJA.md": hojaMinima([["X1", "T+H", "frase uno"]]),
  });
  repo.git("config", "core.hooksPath", ".githooks");
  const push1 = spawnSync("git", ["push", "origin", "main"], { cwd: repo.dir, encoding: "utf8", windowsHide: true });
  assert.notEqual(push1.status, 0, `con rojo-verde en 2 el push debe ser rechazado\n${push1.stderr}`);
  assert.ok(existsSync(marca), "el pre-push debe haber invocado tools/verdad/rojo-verde.mjs");
  assert.match(readFileSync(marca, "utf8"), /--todas/, "debe invocarlo con --todas");
  // Dirección contraria: con rojo-verde en 0 el mismo hook deja pasar el push (no rechaza por otra causa).
  repo.commit("rojo-verde en verde", { "tools/verdad/rojo-verde.mjs": "process.exit(0);\n" });
  const push2 = spawnSync("git", ["push", "origin", "main"], { cwd: repo.dir, encoding: "utf8", windowsHide: true });
  assert.equal(push2.status, 0, `con rojo-verde en 0 el push debe pasar\n${push2.stderr}`);
  borrar(base);
  // Declarado en CLAUDE.md y contrato-hooks sigue verde.
  const lineas = bloqueContrato().split(/\r?\n/);
  assert.ok(lineas.some((l) => /pre-push/.test(l) && /rojo-verde/.test(l)), `el bloque CONTRATO-DECLARADO debe listar pre-push con rojo-verde:\n${lineas.join("\n")}`);
  const guard = correr(["--experimental-strip-types", "--test", "tests/contrato-hooks.test.ts"]);
  assert.equal(guard.status, 0, `tests/contrato-hooks.test.ts debe seguir verde\n${guard.out}`);
});
