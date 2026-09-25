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
import { CAPTURAS_ESTABLES, E2E, ORDEN_E2E, REPO, ROOT, importarModulo, rojoVerdeOrden } from "./_comun.ts";

/** Dos trozos de la frase de C2, sin los asteriscos del markdown: la tabla imprime la frase tal como está en la HOJA. */
const C2 = ["en las seis zonas juzgadas", "los tokens computados de `:root`"];

test("rojo-verde --orden e2e-01 sale 0 en T, con la afirmación C2 de E2E-01 entre sus tests verdes y sin tocar tests/orden/e2e-01/", async () => {
  // (1) La misma precondición barata que A1 y A2: sin el calentamiento, esto cae en milisegundos y el árbol rojo no paga los
  //     ~15 minutos que tarda la C2 de E2E-01 contra las dos webs.
  assert.ok(existsSync(resolve(ROOT, E2E)), `no existe ${E2E} (E2E-01)`);
  const mod = await importarModulo(E2E);
  assert.equal(typeof mod[CAPTURAS_ESTABLES], "function", `${E2E} debe exportar \`${CAPTURAS_ESTABLES}\`: sin el calentamiento, la C2 de ${ORDEN_E2E} sigue cayendo (exporta: ${Object.keys(mod).join(", ") || "nada"})`);

  // (2) Y entonces la orden congelada vuelve a pasar entera.
  const r = rojoVerdeOrden(ORDEN_E2E);
  assert.equal(r.status, 0, `rojo-verde --orden ${ORDEN_E2E} debe salir 0 en ${REPO} (salió ${r.status})\n${r.out.slice(-4000)}`);
  assert.match(r.stdout, new RegExp(`^orden ${ORDEN_E2E} · ${REPO} · \\d+ tests$`, "m"), `debe imprimir la tabla de ${ORDEN_E2E}\n${r.stdout.slice(-2000)}`);
  for (const trozo of C2) {
    assert.ok(r.stdout.includes(trozo), `la tabla de ${ORDEN_E2E} debe llevar la afirmación C2, que es la que cae hoy («${trozo}»)\n${r.stdout.slice(-2500)}`);
  }
  // (3) Y lo hace sin que nadie haya tocado la carpeta congelada: rojo-verde lo dice fallando, así que basta con que no lo diga.
  assert.doesNotMatch(r.out, /tests tocados desde el rojo/, `tests/orden/${ORDEN_E2E}/ sigue congelada\n${r.out.slice(-2000)}`);
  assert.doesNotMatch(r.out, /nunca estuvo en rojo/, `el rojo de ${ORDEN_E2E} se sigue reconstruyendo en el clon neutro\n${r.out.slice(-2000)}`);
});
