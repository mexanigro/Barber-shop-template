// CONEXION-02 · E · registro: CLAUDE.md § Arquitectura mínima de H nombra la casilla (`hero-video-editor`), la convivencia D-33 («convive»)
// y el campo viejo de la flota (`hero.videoUrl`); § Puertas automáticas de T y de H con un párrafo CONEXION-02 que nombra «5/36»; y el
// bloque CONTRATO-DECLARADO de cada repo idéntico al del commit aprobado de VERDAD-07 (T 5d81390 / H da83814): esta orden no toca hooks.
// Sesión A (2026-09-22): test rojo; lee disco (el otro repo por ruta fija) y compara el bloque, línea a línea (sin CR), por git show.
// Un mismo archivo en T y en H (cmp → 0).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { git, RAIZ_H, RAIZ_T, seccionDeTexto, VERDAD_07 } from "./_util.ts";

/** Cuerpo del bloque ```ini de CONTRATO-DECLARADO en un CLAUDE.md dado. */
function bloqueDe(texto: string): string {
  const m = texto.match(/<!--\s*CONTRATO-DECLARADO[\s\S]*?-->\s*```ini\r?\n([\s\S]*?)```/);
  if (!m) throw new Error("CLAUDE.md sin bloque CONTRATO-DECLARADO");
  return m[1];
}
const lineas = (bloque: string) => bloque.split(/\r?\n/).map((l) => l.replace(/\s+$/, ""));

test("CLAUDE.md § Arquitectura mínima de H nombra `hero-video-editor`, «convive» y `hero.videoUrl`; CLAUDE.md § Puertas de T y de H tiene un párrafo CONEXION-02 que nombra «5/36»; el bloque CONTRATO-DECLARADO es idéntico al del commit aprobado de VERDAD-07 (T 5d81390 / H da83814)", () => {
  const claude = { T: readFileSync(join(RAIZ_T, "CLAUDE.md"), "utf8"), H: readFileSync(join(RAIZ_H, "CLAUDE.md"), "utf8") };
  const arquitectura = seccionDeTexto(claude.H, "Arquitectura mínima");
  for (const nombre of ["hero-video-editor", "convive", "hero.videoUrl"]) assert.ok(arquitectura.includes(nombre), `§ Arquitectura mínima de H debe nombrar «${nombre}»:\n${arquitectura}`);
  for (const repo of ["T", "H"] as const) {
    const puertas = seccionDeTexto(claude[repo], "Puertas automáticas");
    const parrafo = puertas.split(/\r?\n/).find((l) => /^\*\*CONEXION-02 \(\d{4}-\d{2}-\d{2}\):\*\*/.test(l));
    assert.ok(parrafo, `§ Puertas automáticas de ${repo} debe tener un párrafo «**CONEXION-02 (AAAA-MM-DD):**»:\n${puertas}`);
    assert.ok(parrafo.includes("5/36"), `el párrafo CONEXION-02 de ${repo} debe nombrar «5/36»:\n${parrafo}`);
  }
  for (const [repo, raiz] of [["T", RAIZ_T], ["H", RAIZ_H]] as const) {
    const aprobado = lineas(bloqueDe(git(raiz, "show", `${VERDAD_07.aprobado[repo]}:CLAUDE.md`)));
    assert.ok(aprobado.some((l) => /^hook\.PreToolUse\s+= Edit\|Write\|MultiEdit\|Bash\|PowerShell :: candado\.mjs$/.test(l)), `precondición: el bloque aprobado de VERDAD-07 en ${repo} declara el candado para Edit|Write|MultiEdit|Bash|PowerShell`);
    assert.deepEqual(lineas(bloqueDe(claude[repo])), aprobado, `el bloque CONTRATO-DECLARADO de ${repo} es idéntico al de ${VERDAD_07.aprobado[repo]} (esta orden no toca hooks)`);
  }
});
