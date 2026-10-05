// CIERRE-TRAMO-01 · copia promovida (AUDITORIA-01, 2026-10-05, D-232) de tests/orden/cierre-tramo-01/b.test.ts: B1 (T), en `test:unit`.
// La orden quedó aprobada por Liam el 2026-10-04 (T 6503410 · H 7e41eae) y su carpeta está congelada; esto es la copia editable que
// corre `npm test`.
// Recorte (D-232, como las copias de E2E-01, D-104/D-112): B1 está marcada «, webs» y una copia promovida no sale a la red, así que queda
// SÓLO su condición del árbol (inciso l): el `commitSha` que `H tests/e2e-01-webs.json` declara para cada web desciende del rojo de
// cierre-tramo-01. La medición de las 180 entradas por web contra su plantilla queda en la orden congelada:
// `rojo-verde --orden cierre-tramo-01`.
// Sólo en T (inciso n). Lee el registro de H por ruta fija y el git de T; no escribe nada.
import { test } from "node:test";
import assert from "node:assert/strict";
import { ORDEN, PALETAS, ROOT, desciende, registro, rojoDe } from "./orden/cierre-tramo-01/_comun.ts";

test("las dos webs de prueba están desplegadas sobre un commit de T que contiene cierre-tramo-01: el `commitSha` que `tests/e2e-01-webs.json` de H declara para cada una desciende del rojo de esa orden", () => {
  const webs = registro().webs;
  const rojo = rojoDe(ROOT, ORDEN);
  assert.ok(rojo, `precondición: hay un commit que añade tests/orden/${ORDEN}/HOJA.md en main`);
  for (const p of PALETAS) {
    const w = webs.find((x) => x.paleta === p);
    assert.ok(w?.commitSha, `precondición: el registro declara la web ${p}`);
    assert.ok(desciende(ROOT, rojo, w!.commitSha), `la web ${p} tiene que estar desplegada sobre un commit que contiene ${ORDEN} (registrado ${w!.commitSha.slice(0, 7)}, que no desciende de ${rojo.slice(0, 7)})`);
  }
});
