// VERDAD-03 · B · corrección del rojo: el rojo es el ÚLTIMO commit que añade HOJA.md (rojo-verde cita los anteriores) y el candado
// mira la historia de main, no sólo HEAD (HIGIENE_ROOT=<ruta> para probarlo contra un repo temporal). Sesión A (2026-09-20): tests rojos.
import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { SOY, candado, conTemporal, hojaMinima, repoTemporal, rojoVerde, testMinimo } from "./_util.ts";

const sha7 = (s: string) => s.slice(0, 7);
const HOJA = "tests/orden/x/HOJA.md";
const TEST = "tests/orden/x/x.test.ts";

test("Rojo = el ÚLTIMO commit de main que añade tests/orden/<id>/HOJA.md; cuando hubo más de uno, la tabla de rojo-verde termina con una línea «rojos anteriores: <sha7> …» (los reverts quedan a la vista); con un solo rojo la salida no cambia", () => {
  conTemporal((base) => {
    // rojo 1 → revert (la carpeta sale de HEAD) → rojo 2 corregido (el test cambia) → verde.
    const repo = repoTemporal(SOY, join(base, "dos"));
    const hoja = hojaMinima([["X1", "T+H", "frase uno"]]);
    const rojo1 = repo.commit("rojo 1", { [HOJA]: hoja, [TEST]: testMinimo([["frase uno", "verde.txt"]]) });
    repo.git("rm", "-r", "-q", "tests/orden/x");
    repo.git("commit", "-q", "-m", "revert del rojo 1");
    const rojo2 = repo.commit("rojo 2 (corregido)", { [HOJA]: hoja, [TEST]: testMinimo([["frase uno", "verde.txt"]]) + "// corregido por A tras el revert\n" });
    repo.commit("verde", { "verde.txt": "verde\n" });
    const r = rojoVerde("x", repo.dir);
    assert.equal(r.status, 0, `con el rojo corregido (último que añade HOJA.md) y verde debe salir 0 (salió ${r.status})\n${r.out}`);
    assert.ok(r.stdout.includes(`rojo en ${sha7(rojo2)}`), `debe citar como rojo al último que añade HOJA.md ${sha7(rojo2)}\n${r.stdout}`);
    assert.ok(!r.stdout.includes(`rojo en ${sha7(rojo1)}`), `no debe citar como rojo al primero ${sha7(rojo1)}\n${r.stdout}`);
    const ultima = r.stdout.split(/\r?\n/).filter((l) => l.trim()).at(-1) ?? "";
    assert.match(ultima, new RegExp(`^rojos anteriores: .*\\b${sha7(rojo1)}\\b`), `la tabla debe terminar con «rojos anteriores: ${sha7(rojo1)}»; última línea: ${ultima}`);
    assert.ok(!ultima.includes(sha7(rojo2)), "el rojo vigente no es un rojo anterior");
    // Dirección contraria: un solo rojo → sin la línea, la salida termina en la última fila de la tabla.
    const uno = repoTemporal(SOY, join(base, "uno"));
    uno.commit("rojo", { [HOJA]: hoja, [TEST]: testMinimo([["frase uno", "verde.txt"]]) });
    uno.commit("verde", { "verde.txt": "verde\n" });
    const s = rojoVerde("x", uno.dir);
    assert.equal(s.status, 0, `un solo rojo + verde debe salir 0 (salió ${s.status})\n${s.out}`);
    assert.doesNotMatch(s.stdout, /rojos anteriores/, "con un solo rojo no hay línea de rojos anteriores");
    const cierre = s.stdout.split(/\r?\n/).filter((l) => l.trim()).at(-1) ?? "";
    assert.match(cierre, /^\[X1\] frase uno · rojo en [0-9a-f]{7} · verde en [0-9a-f]{7}$/, `con un solo rojo la salida termina con la fila de la tabla: ${cierre}`);
  });
});

test("candado.mjs corta tests/orden/<id>/… también cuando HOJA.md de esa orden estuvo alguna vez en la historia de main aunque hoy no esté en HEAD (revert incluido), salvo HIGIENE_PERMITIR_TESTS=1; una orden nunca commiteada sigue libre; HIGIENE_ROOT=<ruta> sustituye la raíz sólo para pruebas", () => {
  conTemporal((base) => {
    const repo = repoTemporal(SOY, base);
    repo.commit("rojo", { [HOJA]: hojaMinima([["X1", "T+H", "frase uno"]]), [TEST]: testMinimo([["frase uno", "verde.txt"]]) });
    const env = { HIGIENE_ROOT: repo.dir };
    // Con HOJA.md en HEAD (como en VERDAD-02), pero sobre el repo temporal por HIGIENE_ROOT → 2.
    const enHead = candado("Edit", join(repo.dir, TEST), env);
    assert.equal(enHead.status, 2, `HIGIENE_ROOT debe apuntar el candado al repo temporal: HOJA.md en HEAD → 2 (salió ${enHead.status})\n${enHead.out}`);
    assert.match(enHead.stderr, /CANDADO/);
    // Revert: la carpeta sale de HEAD, pero HOJA.md estuvo en la historia de main.
    repo.git("rm", "-r", "-q", "tests/orden/x");
    repo.git("commit", "-q", "-m", "revert del rojo");
    assert.equal(repo.git("ls-tree", "--name-only", "HEAD", HOJA), "", "precondición: HOJA.md ya no está en HEAD");
    for (const tool of ["Edit", "Write", "MultiEdit"]) {
      const r = candado(tool, join(repo.dir, HOJA), env);
      assert.equal(r.status, 2, `${tool} sobre tests/orden/x/ tras el revert debe dar 2 (salió ${r.status})\n${r.out}`);
      assert.match(r.stderr, /CANDADO/, "debe explicarlo como CANDADO");
      const nuevo = candado(tool, join(repo.dir, "tests/orden/x/nuevo.test.ts"), env);
      assert.equal(nuevo.status, 2, `${tool} de un archivo nuevo en tests/orden/x/ tras el revert debe dar 2 (salió ${nuevo.status})`);
      const cero = candado(tool, join(repo.dir, HOJA), { ...env, HIGIENE_PERMITIR_TESTS: "0" });
      assert.equal(cero.status, 2, `${tool}: HIGIENE_PERMITIR_TESTS=0 no abre (salió ${cero.status})`);
      const abierto = candado(tool, join(repo.dir, HOJA), { ...env, HIGIENE_PERMITIR_TESTS: "1" });
      assert.equal(abierto.status, 0, `${tool}: con HIGIENE_PERMITIR_TESTS=1 pasa (salió ${abierto.status})\n${abierto.out}`);
      const libre = candado(tool, join(repo.dir, "tests/orden/nunca/HOJA.md"), env);
      assert.equal(libre.status, 0, `${tool}: una orden nunca commiteada sigue libre (salió ${libre.status})\n${libre.out}`);
    }
    // Sin HIGIENE_ROOT la raíz es el repo real: la ruta temporal queda fuera y el candado no opina (0). La variable es sólo para pruebas.
    const sinRoot = candado("Edit", join(repo.dir, HOJA));
    assert.equal(sinRoot.status, 0, `sin HIGIENE_ROOT el repo temporal está fuera del repo real (salió ${sinRoot.status})\n${sinRoot.out}`);
  });
});
