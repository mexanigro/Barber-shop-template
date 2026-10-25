// CRM-05 · E1 (T+H) · el registro: el párrafo CRM-05 en § Puertas de CLAUDE.md. Sesión A (2026-10-25): test rojo.
// Igual byte a byte en T y en H; cada repo afirma su propio CLAUDE.md (inciso n).
import { test } from "node:test";
import assert from "node:assert/strict";
import { REPO, fuente, parrafoDe } from "./_comun.ts";

test("CLAUDE.md de T y de H tienen el párrafo CRM-05 con D-360 a D-369", () => {
  const p = parrafoDe(fuente("CLAUDE.md"), "CRM-05");
  const fallas = !p ? [`§ Puertas automáticas de ${REPO} tiene un párrafo «**CRM-05 (AAAA-MM-DD):**»`] : ["D-360", "D-369"].filter((d) => !p.includes(d)).map((d) => `el párrafo CRM-05 de ${REPO} nombra ${d}`);
  assert.deepEqual(fallas, [], `E1 · el registro:\n${fallas.join("\n")}`);
});
