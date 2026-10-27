// VELOCIDAD-02 · M1 (T+H, mismo archivo en los dos repos): la copia que recorre todas las órdenes aprobadas toma el rojo efectivo (D-399).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "../../..");

test("tests/verdad-08-a.test.ts toma el rojo de cada orden aprobada como el último commit de main que toca su carpeta, no como el último que añade su HOJA.md", () => {
  const copia = readFileSync(resolve(ROOT, "tests/verdad-08-a.test.ts"), "utf8");
  const linea = copia.split(/\r?\n/).find((l) => /const rojoDeLaOrden = /.test(l));
  assert.ok(linea, "tests/verdad-08-a.test.ts calcula `rojoDeLaOrden`");
  assert.doesNotMatch(linea, /--diff-filter=A/, `el rojo de cada orden ya no es el último que añade su HOJA.md:\n${linea}`);
  assert.ok(linea.includes('"main", "--", `tests/orden/${id}/`)'), `el rojo de cada orden es el último commit de main que toca su carpeta:\n${linea}`);
});
