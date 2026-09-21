// VERDAD-07 · E · registro en CLAUDE.md § Puertas automáticas (párrafo VERDAD-07) con el bloque CONTRATO-DECLARADO idéntico al del commit
// aprobado de VERDAD-06 (T 0a9dc03 / H 7ef7a8a): esta orden no toca hooks ni su matcher. Sesión A (2026-09-21): test rojo; lee disco y
// compara el bloque, línea a línea (sin CR), por git show. Un mismo archivo en T y en H (cmp → 0).
import { test } from "node:test";
import assert from "node:assert/strict";
import { ROOT, SOY, VERDAD_06, bloqueContrato, git, seccionPuertas } from "./_util.ts";

/** Cuerpo del bloque ```ini de CONTRATO-DECLARADO en un CLAUDE.md dado (misma regex que bloqueContrato, sobre otro texto). */
function bloqueDe(texto: string): string {
  const m = texto.match(/<!--\s*CONTRATO-DECLARADO[\s\S]*?-->\s*```ini\r?\n([\s\S]*?)```/);
  if (!m) throw new Error("CLAUDE.md sin bloque CONTRATO-DECLARADO");
  return m[1];
}
const lineas = (bloque: string) => bloque.split(/\r?\n/).map((l) => l.replace(/\s+$/, ""));

test("CLAUDE.md § Puertas tiene un párrafo VERDAD-07 que nombra «clon neutro», «permitir-tests», «git config» y «el rojo es del árbol», y el bloque CONTRATO-DECLARADO es idéntico al del commit aprobado de VERDAD-06 (T 0a9dc03 / H 7ef7a8a)", () => {
  const parrafo = seccionPuertas().split(/\r?\n/).find((l) => /^\*\*VERDAD-07 \(\d{4}-\d{2}-\d{2}\):\*\*/.test(l));
  assert.ok(parrafo, `§ Puertas automáticas de ${SOY} debe tener un párrafo «**VERDAD-07 (AAAA-MM-DD):**»:\n${seccionPuertas()}`);
  for (const nombre of ["clon neutro", "permitir-tests", "git config", "el rojo es del árbol"]) assert.ok(parrafo.includes(nombre), `el párrafo VERDAD-07 debe nombrar «${nombre}»:\n${parrafo}`);
  const aprobado = lineas(bloqueDe(git(ROOT, "show", `${VERDAD_06.aprobado[SOY]}:CLAUDE.md`)));
  assert.ok(aprobado.some((l) => /^hook\.PreToolUse\s+= Edit\|Write\|MultiEdit\|Bash\|PowerShell :: candado\.mjs$/.test(l)), "precondición: el bloque aprobado de VERDAD-06 declara el candado para Edit|Write|MultiEdit|Bash|PowerShell");
  assert.deepEqual(lineas(bloqueContrato()), aprobado, `el bloque CONTRATO-DECLARADO es idéntico al de ${VERDAD_06.aprobado[SOY]} (esta orden no toca hooks)`);
});
