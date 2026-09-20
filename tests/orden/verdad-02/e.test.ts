// VERDAD-02 · E · registro en CLAUDE.md § Puertas y en el bloque CONTRATO-DECLARADO. Sesión A (2026-09-20): test rojo; lee disco.
import { test } from "node:test";
import assert from "node:assert/strict";
import { bloqueContrato, seccionPuertas } from "./_util.ts";

test("CLAUDE.md § Puertas tiene un párrafo VERDAD-02 que nombra rojo-verde, tests/orden/, HIGIENE_PERMITIR_TESTS y el cierre por transcript, y el bloque CONTRATO-DECLARADO lista pre-push con rojo-verde", () => {
  const parrafos = seccionPuertas().split(/\r?\n\s*\r?\n/);
  const parrafo = parrafos.find((p) => /VERDAD-02/.test(p));
  assert.ok(parrafo, "§ Puertas debe tener un párrafo VERDAD-02");
  for (const nombre of ["rojo-verde", "tests/orden/", "HIGIENE_PERMITIR_TESTS", "transcript"]) {
    assert.ok(parrafo.includes(nombre), `el párrafo VERDAD-02 debe nombrar «${nombre}»:\n${parrafo}`);
  }
  const lineas = bloqueContrato().split(/\r?\n/);
  assert.ok(lineas.some((l) => /pre-push/.test(l) && /rojo-verde/.test(l)), `el bloque CONTRATO-DECLARADO debe listar pre-push con rojo-verde:\n${lineas.join("\n")}`);
});
