// MARCA-01 · E1 (T+H) · el registro: el párrafo MARCA-01 en § Puertas de CLAUDE.md y el bloque CONTRATO-DECLARADO sin cambios.
// Sesión A (2026-10-07): test rojo. Igual byte a byte en T y en H; cada repo afirma su propio CLAUDE.md (inciso n).
import { test } from "node:test";
import assert from "node:assert/strict";
import { REPO, ROOT, SECCIONES_02, bloqueDe, fuente, git, parrafoDe } from "./_comun.ts";

const PALABRAS = ["N", "dN ≤ 0,020", "graduar.mjs", "material.ts", "pedidos", "aprobar", "subir", "heroToBackdrop", "alt", "Instagram", "slug", "SECCIONES-02"];

test("CLAUDE.md § Puertas de T y de H tiene un párrafo MARCA-01 que nombra «N», «dN ≤ 0,020», «graduar.mjs», «material.ts», «pedidos», «aprobar», «subir», «heroToBackdrop», «alt», «Instagram», «slug» y «SECCIONES-02»; y el bloque CONTRATO-DECLARADO es idéntico al del commit aprobado de SECCIONES-02 (T 80fa0d7 / H 43b0384)", () => {
  const claude = fuente("CLAUDE.md");
  const p = parrafoDe(claude, "MARCA-01");
  assert.ok(p, `§ Puertas automáticas de ${REPO} debe tener un párrafo «**MARCA-01 (AAAA-MM-DD):**»`);
  const faltan = PALABRAS.filter((w) => (w === "N" ? !/(^|[^\p{L}])N([^\p{L}]|$)/u.test(p) : !p.includes(w)));
  assert.deepEqual(faltan, [], `el párrafo MARCA-01 de ${REPO} debe nombrar ${faltan.map((w) => `«${w}»`).join(", ")}`);
  const aprobado = git(ROOT, "show", `${SECCIONES_02.aprobado[REPO]}:CLAUDE.md`);
  assert.equal(bloqueDe(claude), bloqueDe(aprobado), `el bloque CONTRATO-DECLARADO de ${REPO} no cambia respecto de ${SECCIONES_02.aprobado[REPO]}`);
});
