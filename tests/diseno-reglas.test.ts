// DISENO-REGLAS.md existe (bloque-04 hoy, docs/ al cierre del bloque 4), cada entrada tiene
// número, fecha y frase de origen, y el CLAUDE.md lo referencia. Rojo si falta cualquiera.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const CANDIDATOS = [resolve(ROOT, "docs/DISENO-REGLAS.md"), "C:/Users/liama/Desktop/Nichos/bloque-04/DISENO-REGLAS.md"];

test("DISENO-REGLAS.md existe, cada regla lleva número, fecha y frase de origen, y CLAUDE.md lo referencia", () => {
  const ruta = CANDIDATOS.find(existsSync);
  assert.ok(ruta, `no existe DISENO-REGLAS.md en ${CANDIDATOS.join(" ni ")}`);
  const texto = readFileSync(ruta, "utf8");
  const entradas = texto.split(/^### /m).slice(1);
  assert.ok(entradas.length > 0, "DISENO-REGLAS.md no tiene ninguna entrada ### R<n>");
  for (const e of entradas) {
    const titulo = e.split("\n")[0];
    assert.match(titulo, /^R\d+ · \d{4}-\d{2}-\d{2} · \S/, `entrada sin número o fecha: "${titulo}"`);
    assert.match(e, /^- Frase de origen/m, `entrada sin "Frase de origen": "${titulo}"`);
  }
  assert.match(readFileSync(resolve(ROOT, "CLAUDE.md"), "utf8"), /DISENO-REGLAS\.md/, "CLAUDE.md no referencia DISENO-REGLAS.md");
});
