// CONEXION-03 · E · registro: CLAUDE.md § Arquitectura mínima de H nombra las cinco casillas de servicios en `services-editor`;
// § Puertas automáticas de T y de H con un párrafo CONEXION-03 que nombra «10/36» y «featured = orden»; y el bloque CONTRATO-DECLARADO
// de cada repo idéntico al del commit aprobado de CONEXION-02 (T 6410316 / H 5bf6762): esta orden no toca hooks. Sesión A (2026-09-22):
// test rojo; lee disco (el otro repo por ruta fija) y compara el bloque, línea a línea (sin CR), por git show.
// Un mismo archivo en T y en H (cmp → 0).
// CONEXION-04 D1 (2026-09-22): copia editable promovida a npm test (la orden está aprobada y retirada de rojo-verde --todas; el
// original de la carpeta congelada no se toca).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CONEXION_02, RAIZ_H, RAIZ_T, git, seccionDeTexto } from "./orden/conexion-03/_util.ts";

/** Cuerpo del bloque ```ini de CONTRATO-DECLARADO en un CLAUDE.md dado. */
function bloqueDe(texto: string): string {
  const m = texto.match(/<!--\s*CONTRATO-DECLARADO[\s\S]*?-->\s*```ini\r?\n([\s\S]*?)```/);
  if (!m) throw new Error("CLAUDE.md sin bloque CONTRATO-DECLARADO");
  return m[1];
}
const lineas = (bloque: string) => bloque.split(/\r?\n/).map((l) => l.replace(/\s+$/, ""));

test("CLAUDE.md § Arquitectura mínima de H nombra las casillas de servicios (`priceMax`, `mode`, foto por servicio, destacados, `surface`) en `services-editor`; CLAUDE.md § Puertas de T y de H tiene un párrafo CONEXION-03 que nombra «10/36» y «featured = orden»; el bloque CONTRATO-DECLARADO es idéntico al del commit aprobado de CONEXION-02 (T 6410316 / H 5bf6762)", () => {
  const claude = { T: readFileSync(join(RAIZ_T, "CLAUDE.md"), "utf8"), H: readFileSync(join(RAIZ_H, "CLAUDE.md"), "utf8") };
  const arquitectura = seccionDeTexto(claude.H, "Arquitectura mínima");
  for (const nombre of ["services-editor", "priceMax", "mode", "foto por servicio", "destacad", "surface"]) {
    assert.ok(arquitectura.includes(nombre), `§ Arquitectura mínima de H debe nombrar «${nombre}»:\n${arquitectura}`);
  }
  for (const repo of ["T", "H"] as const) {
    const puertas = seccionDeTexto(claude[repo], "Puertas automáticas");
    const parrafo = puertas.split(/\r?\n/).find((l) => /^\*\*CONEXION-03 \(\d{4}-\d{2}-\d{2}\):\*\*/.test(l));
    assert.ok(parrafo, `§ Puertas automáticas de ${repo} debe tener un párrafo «**CONEXION-03 (AAAA-MM-DD):**»`);
    assert.ok(parrafo.includes("10/36"), `el párrafo CONEXION-03 de ${repo} debe nombrar «10/36»:\n${parrafo}`);
    assert.ok(parrafo.includes("featured = orden"), `el párrafo CONEXION-03 de ${repo} debe nombrar «featured = orden»:\n${parrafo}`);
  }
  for (const [repo, raiz] of [["T", RAIZ_T], ["H", RAIZ_H]] as const) {
    const aprobado = lineas(bloqueDe(git(raiz, "show", `${CONEXION_02.aprobado[repo]}:CLAUDE.md`)));
    assert.ok(aprobado.some((l) => /^hook\.PreToolUse\s+= Edit\|Write\|MultiEdit\|Bash\|PowerShell :: candado\.mjs$/.test(l)), `precondición: el bloque aprobado de CONEXION-02 en ${repo} declara el candado para Edit|Write|MultiEdit|Bash|PowerShell`);
    assert.deepEqual(lineas(bloqueDe(claude[repo])), aprobado, `el bloque CONTRATO-DECLARADO de ${repo} es idéntico al de ${CONEXION_02.aprobado[repo]} (esta orden no toca hooks)`);
  }
});
