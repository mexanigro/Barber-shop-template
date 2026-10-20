// CRM-04 · E1 (T+H) · el registro: el párrafo CRM-04 en § Puertas de CLAUDE.md. Sesión A (2026-10-20): test rojo.
// Igual byte a byte en T y en H; cada repo afirma su propio CLAUDE.md (inciso n).
import { test } from "node:test";
import assert from "node:assert/strict";
import { REPO, fuente, parrafoDe } from "./_comun.ts";

test("CLAUDE.md de T y de H tienen el párrafo CRM-04 con D-332 a D-351", () => {
  const p = parrafoDe(fuente("CLAUDE.md"), "CRM-04");
  assert.ok(p, `§ Puertas automáticas de ${REPO} debe tener un párrafo «**CRM-04 (AAAA-MM-DD):**»`);
  const faltan = ["D-332", "D-351"].filter((d) => !p.includes(d));
  assert.deepEqual(faltan, [], `el párrafo CRM-04 de ${REPO} nombra D-332 a D-351 (faltan ${faltan.join(", ")})`);
});
