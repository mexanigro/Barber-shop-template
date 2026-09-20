// VERDAD-03 · F · registro en CLAUDE.md § Puertas. Sesión A (2026-09-20): test rojo; lee disco.
import { test } from "node:test";
import assert from "node:assert/strict";
import { seccionPuertas } from "./_util.ts";

test("CLAUDE.md § Puertas tiene un párrafo VERDAD-03 que nombra APROBADAS.md, «rojo pendiente de B», «último commit que añade», la corrección por revert, las variables de entorno en rutas y la promoción a npm test; y el párrafo VERDAD-02 ya no dice «el primero que añade»", () => {
  const parrafos = seccionPuertas().split(/\r?\n\s*\r?\n/);
  const p3 = parrafos.find((p) => /VERDAD-03/.test(p));
  assert.ok(p3, "§ Puertas debe tener un párrafo VERDAD-03");
  for (const nombre of ["APROBADAS.md", "rojo pendiente de B", "último commit que añade", "revert", "variables de entorno", "npm test"]) {
    assert.ok(p3.includes(nombre), `el párrafo VERDAD-03 debe nombrar «${nombre}»:\n${p3}`);
  }
  const p2 = parrafos.find((p) => /VERDAD-02/.test(p) && !/VERDAD-03/.test(p));
  assert.ok(p2, "§ Puertas sigue teniendo su párrafo VERDAD-02");
  assert.ok(!p2.includes("el primero que añade"), `el párrafo VERDAD-02 ya no dice «el primero que añade»:\n${p2}`);
});
