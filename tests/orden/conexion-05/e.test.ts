// CONEXION-05 · E · registro: CLAUDE.md § Arquitectura mínima de H nombra la casilla de fondo en `fondo-editor` con sus cuatro claves y
// el derivado `heroToBackdrop` (D-64); § Puertas automáticas de T y de H con un párrafo CONEXION-05 que nombra «18/36»; y el bloque
// CONTRATO-DECLARADO de cada repo idéntico al del commit aprobado de VERDAD-09 (T 49d5121 / H b7952bf): esta orden no toca hooks.
// Sesión A (2026-09-22): test rojo (no está la casilla en § Arquitectura). Lee disco (el otro repo por ruta fija) y compara el bloque
// línea a línea, sin CR, por git show. Un mismo archivo en T y en H (cmp → 0).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { RAIZ_H, RAIZ_T, VERDAD_09, bloqueDe, git, seccionDeTexto } from "./_comun.ts";

const lineas = (bloque: string) => bloque.split(/\r?\n/).map((l) => l.replace(/\s+$/, ""));

test("CLAUDE.md § Arquitectura mínima de H nombra `fondo-editor` y las cuatro casillas (modo, textura, foto del local escritorio y móvil) y que `heroToBackdrop` se calcula con `transicion.mjs` (D-64); CLAUDE.md § Puertas de T y de H tiene un párrafo CONEXION-05 que nombra «18/36»; el bloque CONTRATO-DECLARADO es idéntico al del commit aprobado de VERDAD-09 (T 49d5121 / H b7952bf)", () => {
  const claude = { T: readFileSync(join(RAIZ_T, "CLAUDE.md"), "utf8"), H: readFileSync(join(RAIZ_H, "CLAUDE.md"), "utf8") };
  const arquitectura = seccionDeTexto(claude.H, "Arquitectura mínima");
  for (const nombre of ["fondo-editor", "mode", "texture", "localPhoto", "localPhotoMobile", "heroToBackdrop", "transicion.mjs"]) {
    assert.ok(arquitectura.includes(nombre), `§ Arquitectura mínima de H debe nombrar «${nombre}»:\n${arquitectura}`);
  }
  for (const repo of ["T", "H"] as const) {
    const puertas = seccionDeTexto(claude[repo], "Puertas automáticas");
    const parrafo = puertas.split(/\r?\n/).find((l) => /^\*\*CONEXION-05 \(\d{4}-\d{2}-\d{2}\):\*\*/.test(l));
    assert.ok(parrafo, `§ Puertas automáticas de ${repo} debe tener un párrafo «**CONEXION-05 (AAAA-MM-DD):**»`);
    assert.ok(parrafo.includes("18/36"), `el párrafo CONEXION-05 de ${repo} debe nombrar «18/36»:\n${parrafo}`);
  }
  for (const [repo, raiz] of [["T", RAIZ_T], ["H", RAIZ_H]] as const) {
    const aprobado = lineas(bloqueDe(git(raiz, "show", `${VERDAD_09.aprobado[repo]}:CLAUDE.md`)));
    assert.ok(aprobado.some((l) => /^hook\.PreToolUse\s+= Edit\|Write\|MultiEdit\|Bash\|PowerShell :: candado\.mjs$/.test(l)), `precondición: el bloque aprobado de VERDAD-09 en ${repo} declara el candado para Edit|Write|MultiEdit|Bash|PowerShell`);
    assert.deepEqual(lineas(bloqueDe(claude[repo])), aprobado, `el bloque CONTRATO-DECLARADO de ${repo} es idéntico al de ${VERDAD_09.aprobado[repo]} (esta orden no toca hooks)`);
  }
});
