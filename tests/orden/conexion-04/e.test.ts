// CONEXION-04 · E · registro: CLAUDE.md § Arquitectura mínima de H nombra la casilla de galería en `gallery-editor` con sus cuatro
// claves; § Puertas automáticas de T y de H con un párrafo CONEXION-04 que nombra «14/36»; y el bloque CONTRATO-DECLARADO de cada repo
// idéntico al del commit aprobado de CONEXION-03 (T 4c44c0c / H 47d2908): esta orden no toca hooks. Sesión A (2026-09-22): test rojo;
// lee disco (el otro repo por ruta fija) y compara el bloque, línea a línea (sin CR), por git show.
// Un mismo archivo en T y en H (cmp → 0).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CONEXION_03, RAIZ_H, RAIZ_T, git, seccionDeTexto } from "./_util.ts";

/** Cuerpo del bloque ```ini de CONTRATO-DECLARADO en un CLAUDE.md dado. */
function bloqueDe(texto: string): string {
  const m = texto.match(/<!--\s*CONTRATO-DECLARADO[\s\S]*?-->\s*```ini\r?\n([\s\S]*?)```/);
  if (!m) throw new Error("CLAUDE.md sin bloque CONTRATO-DECLARADO");
  return m[1];
}
const lineas = (bloque: string) => bloque.split(/\r?\n/).map((l) => l.replace(/\s+$/, ""));

test("CLAUDE.md § Arquitectura mínima de H nombra `gallery-editor` y las cuatro casillas (piezas con tipo y alt ×4, selección, superficie); CLAUDE.md § Puertas de T y de H tiene un párrafo CONEXION-04 que nombra «14/36»; el bloque CONTRATO-DECLARADO es idéntico al del commit aprobado de CONEXION-03 (T 4c44c0c / H 47d2908)", () => {
  const claude = { T: readFileSync(join(RAIZ_T, "CLAUDE.md"), "utf8"), H: readFileSync(join(RAIZ_H, "CLAUDE.md"), "utf8") };
  const arquitectura = seccionDeTexto(claude.H, "Arquitectura mínima");
  for (const nombre of ["gallery-editor", "items", "alt", "selection", "surface"]) {
    assert.ok(arquitectura.includes(nombre), `§ Arquitectura mínima de H debe nombrar «${nombre}»:\n${arquitectura}`);
  }
  for (const repo of ["T", "H"] as const) {
    const puertas = seccionDeTexto(claude[repo], "Puertas automáticas");
    const parrafo = puertas.split(/\r?\n/).find((l) => /^\*\*CONEXION-04 \(\d{4}-\d{2}-\d{2}\):\*\*/.test(l));
    assert.ok(parrafo, `§ Puertas automáticas de ${repo} debe tener un párrafo «**CONEXION-04 (AAAA-MM-DD):**»`);
    assert.ok(parrafo.includes("14/36"), `el párrafo CONEXION-04 de ${repo} debe nombrar «14/36»:\n${parrafo}`);
  }
  for (const [repo, raiz] of [["T", RAIZ_T], ["H", RAIZ_H]] as const) {
    const aprobado = lineas(bloqueDe(git(raiz, "show", `${CONEXION_03.aprobado[repo]}:CLAUDE.md`)));
    assert.ok(aprobado.some((l) => /^hook\.PreToolUse\s+= Edit\|Write\|MultiEdit\|Bash\|PowerShell :: candado\.mjs$/.test(l)), `precondición: el bloque aprobado de CONEXION-03 en ${repo} declara el candado para Edit|Write|MultiEdit|Bash|PowerShell`);
    assert.deepEqual(lineas(bloqueDe(claude[repo])), aprobado, `el bloque CONTRATO-DECLARADO de ${repo} es idéntico al de ${CONEXION_03.aprobado[repo]} (esta orden no toca hooks)`);
  }
});
