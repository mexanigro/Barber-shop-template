// VERDAD-08 · A · restos por proceso (D-53). A1: `rojo-verde` da a cada corrida de tests un directorio temporal propio y los «restos»
// son lo que queda ahí, no un barrido de `<tmpdir>` por prefijo — lo que otro proceso deja en el `<tmpdir>` real no se cuenta ni se
// borra (B2: la suite de H cayó 214/216 dos veces por eso). A2: `os.tmpdir()` dentro de un test corrido por `rojo-verde` obedece ese
// directorio, así que los diez `_util.ts` congelados siguen sirviendo sin tocarlos.
// Sesión A (2026-09-22): tests rojos — hoy `correr()` compara `readdirSync(tmpdir())` antes/después (rojo-verde.mjs:97–100) y borra
// todo lo que empiece por «<id>-», sea de quien sea; y `TEMP`/`TMP`/`TMPDIR` son los del que llama.
// Caja negra: `node tools/verdad/rojo-verde.mjs --orden <id> --repo <tmp>` sobre un repo temporal propio; el fixture anota lo que ve
// en un JSONL de ruta absoluta (el clon neutro escribe en el mismo archivo). Un mismo archivo en T y en H (cmp → 0).
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NOMBRE, REPO, ROOT, borrar, conTemporal, fuenteFixture, git, leerRegistro, norm, repoConOrden, rojoVerde } from "./_util.ts";

/** Carpetas que el fixture crea en el `<tmpdir>` REAL haciéndose pasar por otro proceso de la misma suite. */
const AJENAS = [1, 2].map((n) => join(tmpdir(), `resto-01-ajena-${n}`));

test("`rojo-verde --orden <id>` corre los tests del rojo y del verde con `TEMP`, `TMP` y `TMPDIR` apuntando a un directorio temporal propio de esa corrida (`<tmpdir>/<id>-neutro-<azar>/tmp` y `<tmpdir>/<id>-verde-<azar>/tmp`, creados vacíos), y los «restos» son las entradas que quedan en ese directorio al terminar (se listan, se borran y se declaran «<id> · carpetas temporales borradas: …»; las del verde son falla D1); nunca lee `<tmpdir>` entero: sobre un repo temporal con una orden cuyo test verde crea y no borra `<tmp>/<id>-marca-…`, sale 2 nombrando esa carpeta, y las dos carpetas `<id>-ajena-…` que ese mismo test crea en `<tmpdir>` real DURANTE la corrida (otro proceso en paralelo) siguen existiendo al terminar, sin listarse ni borrarse", () => {
  try {
    conTemporal((base) => {
      const registro = join(base, NOMBRE[REPO], "registro.jsonl");
      const frase = "el fixture de resto-01 anota el entorno temporal, deja su marca y dos carpetas ajenas";
      const { repo } = repoConOrden(base, "resto-01", frase, fuenteFixture(frase, registro, tmpdir()));
      for (const a of AJENAS) borrar(a); // por si una corrida anterior las dejó: el fixture las crea durante la corrida
      const r = rojoVerde("resto-01", repo.dir);
      // El barrido es del directorio propio de la corrida: lo que otro proceso deja en el <tmpdir> real sigue ahí.
      for (const a of AJENAS) assert.ok(existsSync(a), `rojo-verde no debe tocar ${a} (otro proceso en paralelo)\n${r.out.slice(-3000)}`);
      assert.doesNotMatch(r.out, /resto-01-ajena-/, `las carpetas de otro proceso no se listan\n${r.out.slice(-3000)}`);
      // El resto propio del verde sí es falla (D1) y se declara borrado.
      assert.equal(r.status, 2, `el resto que deja el test verde es falla (salió ${r.status})\n${r.out.slice(-3000)}`);
      assert.match(r.stderr, /resto-01: carpetas temporales sin borrar: [^\n]*resto-01-marca-/, `debe nombrar resto-01-marca-…\n${r.stderr.slice(-3000)}`);
      assert.match(r.stderr, /^resto-01 · carpetas temporales borradas: [^\n]*resto-01-marca-/m, `debe declarar «resto-01 · carpetas temporales borradas: …»\n${r.stderr.slice(-3000)}`);
      // Y el directorio propio de cada corrida está bajo <tmpdir>, se creó vacío y ya no queda nada suyo.
      const reg = leerRegistro(registro);
      const real = norm(tmpdir());
      for (const e of reg) {
        const propio = norm(e.TEMP ?? "");
        assert.ok(propio.startsWith(`${real}/resto-01-neutro-`) || propio.startsWith(`${real}/resto-01-verde-`), `TEMP de cada corrida es su directorio propio (dio ${e.TEMP})`);
        assert.equal(norm(e.TMP ?? ""), propio, "TMP acompaña a TEMP");
        assert.equal(norm(e.TMPDIR ?? ""), propio, "TMPDIR acompaña a TEMP");
        assert.ok(!existsSync(propio), `el directorio propio de la corrida se borra al terminar (${propio})`);
      }
    });
  } finally {
    for (const a of AJENAS) borrar(a);
  }
});

test("`os.tmpdir()` dentro de un test corrido por `rojo-verde` devuelve el directorio propio de esa corrida (el fixture escribe `os.tmpdir()` a un archivo y el test lo lee: está bajo `<id>-neutro-` o `<id>-verde-`), y los diez `_util.ts` congelados de `tests/orden/*/` siguen usando `os.tmpdir()` sin cambios (`git diff` vacío)", () => {
  conTemporal((base) => {
    const registro = join(base, NOMBRE[REPO], "registro.jsonl");
    const frase = "el fixture de resto-01 sólo anota el entorno temporal de la corrida";
    const { repo } = repoConOrden(base, "resto-01", frase, fuenteFixture(frase, registro, null));
    const r = rojoVerde("resto-01", repo.dir);
    const reg = leerRegistro(registro);
    const real = norm(tmpdir());
    const rojo = reg.find((e) => !e.verde), verde = reg.find((e) => e.verde);
    assert.ok(rojo && norm(rojo.tmpdir).startsWith(`${real}/resto-01-neutro-`), `os.tmpdir() del árbol rojo debe estar bajo <tmpdir>/resto-01-neutro-… · registro: ${JSON.stringify(reg)}\n${r.out.slice(-2500)}`);
    assert.ok(verde && norm(verde.tmpdir).startsWith(`${real}/resto-01-verde-`), `os.tmpdir() del árbol verde debe estar bajo <tmpdir>/resto-01-verde-… · registro: ${JSON.stringify(reg)}\n${r.out.slice(-2500)}`);
    assert.equal(r.status, 0, `sin restos propios la orden verifica en verde (salió ${r.status})\n${r.out.slice(-3000)}`);
    // Los diez `_util.ts` congelados siguen pidiéndole la carpeta a os.tmpdir() y ninguno cambió desde el rojo de su orden.
    const congeladas = git(ROOT, "ls-files", "tests/orden/").split(/\r?\n/).filter((f) => f.endsWith("/_util.ts") && !f.startsWith("tests/orden/verdad-08/"));
    assert.equal(congeladas.length, 10, `diez órdenes congeladas con _util.ts:\n${congeladas.join("\n")}`);
    for (const archivo of congeladas) {
      const id = archivo.split("/")[2];
      assert.match(readFileSync(join(ROOT, archivo), "utf8"), /tmpdir\(\)/, `${archivo} sigue usando os.tmpdir()`);
      const rojoDeLaOrden = git(ROOT, "log", "-1", "--format=%H", "--diff-filter=A", "main", "--", `tests/orden/${id}/HOJA.md`);
      assert.ok(rojoDeLaOrden, `tests/orden/${id}/ tiene commit rojo`);
      assert.equal(git(ROOT, "diff", "--name-only", rojoDeLaOrden, "HEAD", "--", archivo), "", `${archivo} no cambia desde el rojo ${rojoDeLaOrden.slice(0, 7)} de ${id}`);
    }
  });
});
