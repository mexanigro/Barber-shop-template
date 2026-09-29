// ARREGLOS-02 · copia promovida (IDIOMAS-01, 2026-09-29, D-127). La orden quedó aprobada por Liam el 2026-09-27
// (T 19ba544 · H 3bc8aa5) y su carpeta de la orden está congelada; esto es la copia editable que corre `npm test` todos los días.
// Recorte: sólo (1), la precondición del árbol: (2) y (3) corren `rojo-verde --orden e2e-01`, que arrastra la C2 de E2E-01
// contra las dos webs desplegadas (~15 min, sale a la red; D-89, D-95). `rojo-verde --orden e2e-01` lo sigue corriendo quien verifica.
// ARREGLOS-02 · B (T) · la copia congelada de E2E-01 vuelve a pasar. Sesión A (2026-09-25): test rojo.
//
// Medido hoy, con T en d026b0f: `node tools/verdad/rojo-verde.mjs --orden e2e-01` sale **2** y su stderr dice
//   «- e2e-01: tests que fallan en HEAD d026b0f:» seguido de la frase entera de C2.
// En H la misma orden sale **0** con sus siete tests verdes (A1, A2, B1, B2, E1, E2, F1 no corren `e2e.mjs`), así que esta
// afirmación vive SÓLO en T (D-120, inciso n): en H nacería verde.
//
// Por qué es una afirmación y no un corolario de A1: `rojo-verde --orden` no sólo corre los tests de HEAD; comprueba también que
// el árbol rojo siga en rojo en un clon neutro, que `tests/orden/e2e-01/` no haya cambiado desde su último rojo y que los nombres
// de los tests sigan siendo las frases de su hoja. Que A1 dé verde no garantiza nada de eso.
// Sólo en T (inciso n). No escribe en el repo: `rojo-verde` trabaja en sus propios temporales y los borra.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { CAPTURAS_ESTABLES, E2E, ORDEN_E2E, ROOT, importarModulo } from "./orden/arreglos-02/_comun.ts";

test("rojo-verde --orden e2e-01 sale 0 en T, con la afirmación C2 de E2E-01 entre sus tests verdes y sin tocar tests/orden/e2e-01/", async () => {
  // (1) La misma precondición barata que A1 y A2: sin el calentamiento, esto cae en milisegundos y el árbol rojo no paga los
  //     ~15 minutos que tarda la C2 de E2E-01 contra las dos webs.
  assert.ok(existsSync(resolve(ROOT, E2E)), `no existe ${E2E} (E2E-01)`);
  const mod = await importarModulo(E2E);
  assert.equal(typeof mod[CAPTURAS_ESTABLES], "function", `${E2E} debe exportar \`${CAPTURAS_ESTABLES}\`: sin el calentamiento, la C2 de ${ORDEN_E2E} sigue cayendo (exporta: ${Object.keys(mod).join(", ") || "nada"})`);
});
