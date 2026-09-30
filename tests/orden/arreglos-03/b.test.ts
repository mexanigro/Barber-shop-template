// ARREGLOS-03 · B1 (T+H) · el mensaje de cada caída. Sesión A (2026-09-30): test rojo.
//
// Hoy `tools/verdad/rojo-verde.mjs:128–134` lee sólo las líneas `ok` / `not ok` del TAP y descarta el resto: la caída del push de
// B de IDIOMAS-01 quedó en «tests que fallan en HEAD 26ddb48: las dos webs…» sin zona, vista ni px (4.3.md, «Cierre de B2»).
// Medido el TAP de Node 22.22.2 (D-152): bajo `not ok N - <nombre>` va un bloque YAML con `error: '<mensaje>'`, o `error: |-` y
// las líneas sangradas cuando el mensaje ocupa varias. Lo que se pide: ese mensaje en stderr, debajo del nombre, con `--orden` y
// con `--todas`, sin cambiar el exit.
// Cómo se mide: una orden de prueba en un repo temporal cuyo segundo test falla en HEAD con un mensaje de dos líneas, y el
// `rojo-verde.mjs` de este repo con `--repo`. Un mismo archivo en T y en H (cmp → 0). No escribe fuera de su carpeta temporal.
import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { REPO, conTemporal, correrLargo, hojaMinima, repoTemporal } from "./_comun.ts";

const ID = "zz-mensaje";
const UNO = "frase uno";
const DOS = "frase dos";
const L1 = "ARREGLOS03-MENSAJE línea uno";
const L2 = "segunda línea del mensaje";
const HOJA = hojaMinima([["Y1", "T+H", UNO], ["Y2", "T+H", DOS]]);
/** «frase uno» pide verde.txt; «frase dos» pide verde2.txt y, si falta, cae con un mensaje de dos líneas. */
const TESTS = `import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
const raiz = resolve(import.meta.dirname, "../../..");
test(${JSON.stringify(UNO)}, () => { assert.ok(existsSync(join(raiz, "verde.txt")), "falta verde.txt"); });
test(${JSON.stringify(DOS)}, () => { assert.ok(existsSync(join(raiz, "verde2.txt")), ${JSON.stringify(`${L1}\n${L2}`)}); });
`;
const rv = (repo: string, args: string[]) => correrLargo(["tools/verdad/rojo-verde.mjs", ...args, "--repo", repo]);

test("cuando un test de una orden falla en HEAD, `rojo-verde` imprime en stderr, debajo de su nombre, el mensaje de su aserción —el de su bloque YAML bajo `not ok`, todas sus líneas—, con `--orden` y con `--todas`, y sale 2 como antes; con todo en verde no imprime ningún mensaje y sale 0", () => {
  conTemporal((base) => {
    const repo = repoTemporal(REPO, join(base, "mensaje"));
    repo.commit("rojo", { [`tests/orden/${ID}/HOJA.md`]: HOJA, [`tests/orden/${ID}/y.test.ts`]: TESTS });
    repo.commit("verde a medias", { "verde.txt": "verde\n" });

    for (const args of [["--orden", ID], ["--todas"]]) {
      const r = rv(repo.dir, args);
      const donde = args.join(" ");
      // (1) El mensaje, las dos líneas. Hoy no está: aquí está el rojo.
      const i1 = r.stderr.indexOf(L1), i2 = r.stderr.indexOf(L2);
      assert.ok(i1 >= 0, `${donde}: stderr tiene que traer el mensaje de la aserción que cayó («${L1}»)\n${r.stderr.slice(-2500)}`);
      assert.ok(i2 > i1, `${donde}: y todas sus líneas, en orden («${L2}»)\n${r.stderr.slice(-2500)}`);
      // (2) Debajo de su nombre, dentro de «tests que fallan en HEAD».
      const cabeza = r.stderr.indexOf(`${ID}: tests que fallan en HEAD`);
      assert.ok(cabeza >= 0, `${donde}: nombra «${ID}: tests que fallan en HEAD»\n${r.stderr}`);
      const nombre = r.stderr.indexOf(DOS, cabeza);
      assert.ok(nombre > cabeza && nombre < i1, `${donde}: el mensaje va debajo del nombre del test que cayó («${DOS}»)\n${r.stderr}`);
      // (3) El exit no cambia.
      assert.equal(r.status, 2, `${donde}: un test que falla en HEAD sigue dando 2 (salió ${r.status})`);
    }

    // (4) La otra dirección: con todo en verde, sale 0 y no imprime ningún mensaje de aserción.
    repo.commit("verde entero", { "verde2.txt": "verde\n" });
    const ok = rv(repo.dir, ["--orden", ID]);
    assert.equal(ok.status, 0, `con todo en verde sale 0 (salió ${ok.status})\n${ok.out.slice(-2000)}`);
    assert.ok(!ok.out.includes(L1), `con todo en verde no hay mensaje de aserción que imprimir\n${ok.out}`);
  });
});
