// VERDAD-03 · D · tests de orden: limpieza (rojo-verde mide los restos «<id>-…» en os.tmpdir() tras correr la orden en HEAD) y
// promoción de los 18 tests de verdad-02 a npm test (copias editables en tests/). Sesión A (2026-09-20): tests rojos.
// VERDAD-04 D2 (2026-09-21, decisión D-13): copia editable promovida a npm test, recortada: el test D2 comprueba existencia, import,
// package.json y git log de las copias de verdad-02 SIN volver a correrlas (npm test ya las corre; correrlas aquí costaba ≈ 60 s
// repetidos). El original en tests/orden/verdad-03/ queda congelado.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, matchesGlob, resolve } from "node:path";
import { ROOT, borrar, conTemporal, correr, git, hojaMinima, repoTemporal, SOY } from "./orden/verdad-03/_util.ts";

const ID = `zz-limpieza-${process.pid}`; // prefijo «zz-limpieza-<pid>-» en os.tmpdir(): sólo lo dejan los tests de prueba de ESTA instancia (VERDAD-07: dentro de npm test corren dos a la vez, la de arriba y la anidada por verdad-04-d, y por prefijo fijo se contaban y borraban las carpetas entre sí)
const HOJA = hojaMinima([["X1", "T+H", "frase uno"]]);

/** Test de prueba que crea una carpeta «<ID>-…» en os.tmpdir(); `limpia` la borra antes de afirmar; siempre anota su ruta en VERDAD03_RASTRO. */
function testConCarpeta(limpia: boolean): string {
  return `import { test } from "node:test";
import assert from "node:assert/strict";
import { appendFileSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

test("frase uno", () => {
  const d = mkdtempSync(join(tmpdir(), ${JSON.stringify(`${ID}-`)}));
  if (process.env.VERDAD03_RASTRO) appendFileSync(process.env.VERDAD03_RASTRO, d + "\\n");
  ${limpia ? "rmSync(d, { recursive: true, force: true });" : "// no la borra: resto en el directorio temporal"}
  assert.ok(existsSync(resolve(import.meta.dirname, "../../..", "verde.txt")), "falta verde.txt");
});
`;
}

test("rojo-verde mide el directorio temporal del sistema antes y después de correr los tests de una orden en HEAD; si quedan carpetas nuevas cuyo nombre empieza por «<id>-», sale 2 con «<id>: carpetas temporales sin borrar: …»; sin restos, nada cambia", () => {
  conTemporal((base) => {
    const rastro = join(base, "rastro.txt");
    try {
      // Orden cuyo test deja una carpeta «zz-limpieza-…» → 2 y la lista.
      const sucio = repoTemporal(SOY, join(base, "sucio"));
      sucio.commit("rojo", { [`tests/orden/${ID}/HOJA.md`]: HOJA, [`tests/orden/${ID}/x.test.ts`]: testConCarpeta(false) });
      sucio.commit("verde", { "verde.txt": "verde\n" });
      const r = correr(["tools/verdad/rojo-verde.mjs", "--orden", ID, "--repo", sucio.dir], { env: { VERDAD03_RASTRO: rastro } });
      const dejadas = existsSync(rastro) ? readFileSync(rastro, "utf8").split(/\r?\n/).filter(Boolean) : [];
      assert.ok(dejadas.length >= 1, "precondición: el test de prueba corrió en HEAD y dejó al menos una carpeta");
      assert.equal(r.status, 2, `restos «${ID}-…» tras la corrida en HEAD deben dar 2 (salió ${r.status})\n${r.out}`);
      assert.match(r.out, new RegExp(`${ID}: carpetas temporales sin borrar:`), `debe decir «${ID}: carpetas temporales sin borrar: …»\n${r.out}`);
      assert.ok(dejadas.some((d) => r.out.includes(basename(d))), `debe listar la carpeta dejada (${dejadas.map((d) => basename(d)).join(", ")})\n${r.out}`);
      // Dirección contraria: el mismo test borrando lo suyo → 0 y tabla como siempre.
      const limpio = repoTemporal(SOY, join(base, "limpio"));
      limpio.commit("rojo", { [`tests/orden/${ID}/HOJA.md`]: HOJA, [`tests/orden/${ID}/x.test.ts`]: testConCarpeta(true) });
      limpio.commit("verde", { "verde.txt": "verde\n" });
      const s = correr(["tools/verdad/rojo-verde.mjs", "--orden", ID, "--repo", limpio.dir], { env: { VERDAD03_RASTRO: rastro } });
      assert.equal(s.status, 0, `sin restos debe salir 0 (salió ${s.status})\n${s.out}`);
      assert.doesNotMatch(s.out, /carpetas temporales sin borrar/, "sin restos, nada cambia");
      assert.match(s.stdout, /^\[X1\] frase uno · rojo en [0-9a-f]{7} \(clon neutro\) · verde en [0-9a-f]{7}$/m, "la tabla sigue igual (VERDAD-07 A1: «(clon neutro)»)");
    } finally {
      // Lo que dejaron los tests de prueba (en HEAD y en el árbol rojo), anotado en el rastro o por prefijo.
      if (existsSync(rastro)) for (const d of readFileSync(rastro, "utf8").split(/\r?\n/).filter(Boolean)) borrar(d);
      // VERDAD-07 A1: «<id>-neutro-…» es el clon neutro de rojo-verde (lo borra él); otra instancia de este test corre en paralelo (copias
      // anidadas por verdad-03-f / verdad-04-d) y borrarle el clon vivo daba EBUSY.
      for (const d of readdirSync(tmpdir())) if (d.startsWith(`${ID}-`) && !d.startsWith(`${ID}-neutro-`)) borrar(join(tmpdir(), d));
    }
  });
});

test("npm test corre tests/verdad-02-a.test.ts, tests/verdad-02-b.test.ts, tests/verdad-02-c.test.ts y tests/verdad-02-e.test.ts (copias editables de los 18 tests de la orden, que importan ./orden/verdad-02/_util.ts; A1 adaptado a «último commit que añade» y a los rojos anteriores) y pasan; tests/orden/verdad-02/ no cambia", () => {
  const copias = ["a", "b", "c", "e"].map((s) => `tests/verdad-02-${s}.test.ts`);
  for (const c of copias) assert.ok(existsSync(resolve(ROOT, c)), `falta ${c}`);
  for (const c of copias) assert.match(readFileSync(resolve(ROOT, c), "utf8"), /from "\.\/orden\/verdad-02\/_util\.ts"/, `${c} debe importar ../orden/verdad-02/_util.ts`);
  assert.match(readFileSync(resolve(ROOT, "tests/verdad-02-a.test.ts"), "utf8"), /rojos anteriores/, "A1 de la copia adaptado a «último commit que añade» y a los rojos anteriores");
  // npm test los corre: el script `test` de package.json los nombra o los cubre con un glob.
  // VERDAD-08 (D-57): en T `npm test` encadena dos fases y la lista de archivos vive en `test:unit` y `test:browser`; en H sigue
  // siendo el glob de `test`. La lista que corre npm es la unión de las tres.
  const npmScripts = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8")).scripts ?? {};
  const script = [npmScripts.test, npmScripts["test:unit"], npmScripts["test:browser"]].filter(Boolean).join(" ");
  const tokens = script.split(/\s+/).map((t) => t.replace(/^["']|["']$/g, ""));
  for (const c of copias) assert.ok(tokens.some((t) => t === c || (t.includes("*") && matchesGlob(c, t))), `npm test no corre ${c}: ${script}`);
  // «Y pasan»: lo comprueba npm test al correr las copias (D-13); esta copia no las vuelve a correr.
  // tests/orden/verdad-02/ no cambia: ningún commit de main modifica, borra ni renombra lo que hay.
  assert.equal(git(ROOT, "log", "--format=%h %s", "--diff-filter=MDR", "main", "--", "tests/orden/verdad-02/"), "", "tests/orden/verdad-02/ sigue congelada");
});
