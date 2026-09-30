// ARREGLOS-03 · A1 (T+H) · D2 fuera del pre-push. Sesión A (2026-09-30): test rojo.
//
// Hoy `.githooks/pre-push:11` corre `rojo-verde.mjs --todas`, que corre en HEAD los tests de cada orden viva. Una afirmación que
// mide las webs desplegadas (D2 de IDIOMAS-01: `e2e.mjs` ~27 min por web) hizo que cada push costara ~55 min y cayera a veces sólo
// dentro del hook (4.3.md § IDIOMAS-01 · B, «Cierre de B2»; verificadora, hallazgo 6). D-151: la hoja marca esa afirmación con
// `, webs` junto al repo —`(T, webs)`, `(H, webs)`, `(T+H, webs)`—; `--todas` no la corre en HEAD y lo dice en la tabla («no corrida en --todas; correr --orden <id>»,
// condición de Liam, 2026-09-30); el árbol
// rojo sí la corre (inciso l, VERDAD-07); `--orden <id>` la corre entera.
// Cómo se mide: dos órdenes de prueba en repos temporales y el `rojo-verde.mjs` de este repo con `--repo`. La marcada deja rastro
// en ARREGLOS03_RASTRO sólo cuando pasa su condición, así que se ve si corrió en HEAD (el clon neutro del rojo no hereda la
// variable). Hoy el `rojo-verde` no lee la marca: la afirmación marcada no está en su lista y la corrida sale 2 con «tests sin
// afirmación en HOJA.md» — aquí está el rojo. Un mismo archivo en T y en H (cmp → 0). No escribe fuera de su carpeta temporal.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { REPO, conTemporal, correrLargo, hojaMinima, repoTemporal } from "./_comun.ts";

const ID = "zz-webs";
const X = "frase del árbol";
const W = "frase contra las webs";
const HOJA = hojaMinima([["X1", "T+H", X], ["W1", "T+H, webs", W]]);
/** Los dos tests piden `verde.txt` (en el rojo no está); la marcada pide `condicion` y, cuando pasa, deja «corrió» en el rastro. */
const TESTS = (condicion: string) => `import { test } from "node:test";
import assert from "node:assert/strict";
import { appendFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
const raiz = resolve(import.meta.dirname, "../../..");
test(${JSON.stringify(X)}, () => { assert.ok(existsSync(join(raiz, "verde.txt")), "falta verde.txt"); });
test(${JSON.stringify(W)}, () => {
  assert.ok(existsSync(join(raiz, ${JSON.stringify(condicion)})), "falta ${condicion}");
  if (process.env.ARREGLOS03_RASTRO) appendFileSync(process.env.ARREGLOS03_RASTRO, "corrió\\n");
});
`;
const rv = (repo: string, args: string[], rastro: string) => correrLargo(["tools/verdad/rojo-verde.mjs", ...args, "--repo", repo], { env: { ARREGLOS03_RASTRO: rastro } });
const rastroDe = (f: string) => (existsSync(f) ? readFileSync(f, "utf8") : "");

test("una afirmación marcada `(T, webs)`, `(H, webs)` o `(T+H, webs)` en su hoja no se corre en HEAD con `rojo-verde --todas` —lo que corre el pre-push—, que sale 0 si lo demás está verde e imprime para ella «rojo en <sha7> (clon neutro) · contra las webs: no corrida en --todas; correr --orden <id>»; en el árbol rojo sí se corre, así que una marcada que nunca estuvo en rojo sigue saliendo 2; y `rojo-verde --orden <id>` la corre entera", () => {
  conTemporal((base) => {
    // Orden de prueba: rojo = hoja + tests (sin verde.txt); verde = verde.txt. La marcada pide verde.txt, como la otra.
    const repo = repoTemporal(REPO, join(base, "marca"));
    repo.commit("rojo", { [`tests/orden/${ID}/HOJA.md`]: HOJA, [`tests/orden/${ID}/x.test.ts`]: TESTS("verde.txt") });
    repo.commit("verde", { "verde.txt": "verde\n" });

    // (1) --todas, lo que corre el pre-push: sale 0 y NO corre la marcada en HEAD. Hoy sale 2: aquí está el rojo.
    const rastroTodas = join(base, "rastro-todas.txt");
    const todas = rv(repo.dir, ["--todas"], rastroTodas);
    assert.equal(todas.status, 0, `--todas con todo en verde y una afirmación marcada «, webs» tiene que salir 0 (salió ${todas.status})\n${todas.out.slice(-2500)}`);
    assert.equal(rastroDe(rastroTodas), "", "--todas no corre en HEAD la afirmación marcada «, webs» (dejó rastro)");
    assert.match(todas.stdout, new RegExp(`^\\[W1\\] ${W} · rojo en [0-9a-f]{7} \\(clon neutro\\) · contra las webs: no corrida en --todas; correr --orden ${ID}$`, "m"), `--todas dice que la marcada no se corrió y quién la corre\n${todas.stdout}`);
    assert.match(todas.stdout, new RegExp(`^\\[X1\\] ${X} · rojo en [0-9a-f]{7} \\(clon neutro\\) · verde en [0-9a-f]{7}$`, "m"), `la no marcada se verifica como siempre\n${todas.stdout}`);

    // (2) --orden <id>: la corre entera (deja rastro en HEAD) y la tabla dice rojo y verde.
    const rastroOrden = join(base, "rastro-orden.txt");
    const orden = rv(repo.dir, ["--orden", ID], rastroOrden);
    assert.equal(orden.status, 0, `--orden ${ID} tiene que salir 0 (salió ${orden.status})\n${orden.out.slice(-2500)}`);
    assert.match(rastroDe(rastroOrden), /corrió/, "--orden corre en HEAD también la afirmación marcada");
    assert.match(orden.stdout, new RegExp(`^\\[W1\\] ${W} · rojo en [0-9a-f]{7} \\(clon neutro\\) · verde en [0-9a-f]{7}$`, "m"), `--orden la verifica entera\n${orden.stdout}`);

    // (3) El rojo sigue siendo del árbol (inciso l): una marcada que pasa también en el commit rojo sigue cayendo con --todas.
    const nunca = repoTemporal(REPO, join(base, "nunca"));
    nunca.commit("rojo", { [`tests/orden/${ID}/HOJA.md`]: HOJA, [`tests/orden/${ID}/x.test.ts`]: TESTS("README.md") });
    nunca.commit("verde", { "verde.txt": "verde\n" });
    const r = rv(nunca.dir, ["--todas"], join(base, "rastro-nunca.txt"));
    assert.equal(r.status, 2, `una marcada que nunca estuvo en rojo tiene que dar 2 también con --todas (salió ${r.status})\n${r.out.slice(-2500)}`);
    assert.match(r.stderr, new RegExp(`${ID}: ${W}: nunca estuvo en rojo`), `--todas corre la marcada en el árbol rojo\n${r.stderr}`);
  });
});
