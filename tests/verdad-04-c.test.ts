// VERDAD-04 · C · copias promovidas limpias (tests/verdad-02-*.test.ts borran también cuando fallan) y rojo-verde que acumula todas las
// fallas de una orden en una sola salida y borra las carpetas temporales que detectó. Sesión A (2026-09-21): tests rojos. Caja negra:
// `node --experimental-strip-types --test` sobre las copias reales y `node tools/verdad/rojo-verde.mjs --orden … [--repo <tmp>]`.
// VERDAD-05 D2 (2026-09-21): copia editable promovida a npm test, recortada: C1 comprueba sólo el fuente de las copias de verdad-02
// (sin volver a correrlas: npm test ya las corre) y C2 sólo el repo temporal de las tres fallas (sin la corrida contra lo real, ≈ 60 s).
// El original en tests/orden/verdad-04/ queda congelado.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { ROOT, SOY, borrar, conTemporal, correrLargo, hojaMinima, repoTemporal } from "./orden/verdad-04/_util.ts";

const COPIAS_02 = ["a", "b", "c", "e"].map((s) => `tests/verdad-02-${s}.test.ts`);

/** Carpetas nuevas en os.tmpdir() (respecto de `antes`) cuyo nombre empieza por `prefijo`. */
const nuevas = (antes: Set<string>, prefijo: string) => readdirSync(tmpdir()).filter((d) => d.startsWith(prefijo) && !antes.has(d));

test("tests/verdad-02-a.test.ts, -b, -c y -e borran sus carpetas temporales también cuando fallan (finally o after), y tras correr las cuatro copias en verde no queda ninguna carpeta «verdad-02-…» nueva en el directorio temporal", () => {
  // Borrar también cuando fallan: el fuente de cada copia limpia en `finally` o en un hook `after(...)`, no sólo en el camino feliz.
  for (const c of COPIAS_02) {
    const fuente = readFileSync(resolve(ROOT, c), "utf8");
    assert.match(fuente, /\bfinally\b|\bafter\s*\(/, `${c} debe borrar sus carpetas también cuando falla: finally o after(...)`);
  }
  // «Corren en verde y no dejan restos»: lo comprueba npm test al correr las copias de verdad-02 (D-13); esta copia no las vuelve a correr.
});

const ID = "zz-acumula"; // prefijo «zz-acumula-» en os.tmpdir(): sólo lo deja el test de prueba de este archivo
const HOJA_TRIPLE = hojaMinima([["X1", "T+H", "frase uno"], ["X2", "T+H", "frase dos"], ["X3", "T+H", "frase tres"]]);
/** Tres fallas en una orden: «frase uno» pasa siempre (nunca estuvo en rojo), «frase dos» pide verde2.txt que nunca existe (falla en HEAD),
 *  «frase tres» deja una carpeta «zz-acumula-…» (anota su ruta en VERDAD04_RASTRO) y pide verde.txt (pasa en HEAD, falla en el rojo). */
const TEST_TRIPLE = `import { test } from "node:test";
import assert from "node:assert/strict";
import { appendFileSync, existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const raiz = resolve(import.meta.dirname, "../../..");
test("frase uno", () => { assert.ok(true); });
test("frase dos", () => { assert.ok(existsSync(join(raiz, "verde2.txt")), "falta verde2.txt"); });
test("frase tres", () => {
  const d = mkdtempSync(join(tmpdir(), ${JSON.stringify(`${ID}-`)}));
  if (process.env.VERDAD04_RASTRO) appendFileSync(process.env.VERDAD04_RASTRO, d + "\\n");
  assert.ok(existsSync(join(raiz, "verde.txt")), "falta verde.txt");
});
`;

test("rojo-verde acumula en una sola salida todas las fallas de una orden (tests tocados desde el rojo, nombres sin afirmación o sin test, archivos que no cargan, tests que fallan en HEAD, tests que nunca estuvieron en rojo, carpetas temporales sin borrar) en vez de parar en la primera, y borra las carpetas temporales que detectó tras listarlas; con --orden verdad-02 sale 2 y la salida nombra «tests que fallan en HEAD» con el A1 de verdad-02 (exige «primer commit»), además de lo demás que haya", () => {
  conTemporal((base) => {
    const rastro = join(base, "rastro.txt");
    const antesReal = new Set(readdirSync(tmpdir()));
    try {
      // Repo temporal con la orden de las tres fallas: rojo (hoja + test) y verde (sólo verde.txt).
      const repo = repoTemporal(SOY, join(base, "triple"));
      repo.commit("rojo", { [`tests/orden/${ID}/HOJA.md`]: HOJA_TRIPLE, [`tests/orden/${ID}/x.test.ts`]: TEST_TRIPLE });
      repo.commit("verde", { "verde.txt": "verde\n" });
      const r = correrLargo(["tools/verdad/rojo-verde.mjs", "--orden", ID, "--repo", repo.dir], { env: { VERDAD04_RASTRO: rastro } });
      const dejadas = existsSync(rastro) ? readFileSync(rastro, "utf8").split(/\r?\n/).filter(Boolean) : [];
      assert.ok(dejadas.length >= 1, "precondición: «frase tres» corrió en HEAD y dejó al menos una carpeta");
      assert.equal(r.status, 2, `tres fallas deben dar 2 (salió ${r.status})\n${r.out}`);
      // Las tres, nombradas en la misma salida (hoy para en la primera que encuentra).
      assert.match(r.stderr, new RegExp(`${ID}: tests que fallan en HEAD`), `debe nombrar «tests que fallan en HEAD»\n${r.stderr}`);
      assert.match(r.stderr, /frase dos/, `debe nombrar a «frase dos» (falla en HEAD)\n${r.stderr}`);
      assert.match(r.stderr, /frase uno: nunca estuvo en rojo/, `debe nombrar a «frase uno» (pasa en el rojo)\n${r.stderr}`);
      assert.doesNotMatch(r.stderr, /frase tres: nunca estuvo en rojo/, "«frase tres» sí falla en el rojo");
      const m = r.stderr.match(new RegExp(`${ID}: carpetas temporales sin borrar: (.*)`));
      assert.ok(m, `debe nombrar «${ID}: carpetas temporales sin borrar: …»\n${r.stderr}`);
      const listadas = m[1].trim().split(/\s+/).filter(Boolean);
      assert.ok(listadas.length >= 1 && listadas.every((n) => n.startsWith(`${ID}-`)), `las listadas empiezan por «${ID}-»: ${listadas.join(" ")}`);
      assert.ok(dejadas.some((d) => listadas.includes(basename(d))), `debe listar la carpeta dejada (${dejadas.map((d) => basename(d)).join(", ")})\n${r.stderr}`);
      // Y las borra tras listarlas, declarándolo.
      assert.match(r.stderr, /borradas: /, `debe declarar «borradas: …»\n${r.stderr}`);
      for (const n of listadas) assert.ok(!existsSync(join(tmpdir(), n)), `la carpeta listada ${n} debe estar borrada al terminar`);
      // La corrida contra lo real (verdad-02 congelada, ≈ 60 s) queda en el original congelado; esta copia sólo prueba el repo temporal.
    } finally {
      // Lo que dejaron los tests de prueba (en HEAD y en el árbol rojo) y la corrida real, anotado en el rastro o por prefijo.
      if (existsSync(rastro)) for (const d of readFileSync(rastro, "utf8").split(/\r?\n/).filter(Boolean)) borrar(d);
      for (const d of readdirSync(tmpdir())) if (d.startsWith(`${ID}-`)) borrar(join(tmpdir(), d));
      for (const d of nuevas(antesReal, "verdad-02-")) borrar(join(tmpdir(), d));
    }
  });
});
