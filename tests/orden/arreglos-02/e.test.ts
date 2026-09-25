// ARREGLOS-02 · D · registro: § Puertas automáticas de los dos CLAUDE.md con un párrafo ARREGLOS-02 que nombre el arreglo
// («calentamiento»), contra qué se probó («webs reales»), cómo («corridas») y la causa medida («backdrop-filter»); y el bloque
// CONTRATO-DECLARADO de cada repo idéntico al del commit aprobado de ARREGLOS-01 (T d026b0f / H 951932c): esta orden no toca
// hooks. Sesión A (2026-09-25): test rojo (no está el párrafo). Lee disco (el otro repo por ruta fija) y compara el bloque línea
// a línea, sin CR, por `git show`. Un mismo archivo en T y en H (cmp → 0).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ARREGLOS_01, RAIZ_H, RAIZ_T, bloqueDe, git, seccionDeTexto } from "./_comun.ts";

const lineas = (bloque: string) => bloque.split(/\r?\n/).map((l) => l.replace(/\s+$/, ""));
/** Lo que el párrafo de esta orden tiene que nombrar (D-115, D-116, D-119 y contra qué se midió). */
const NOMBRA = ["calentamiento", "webs reales", "corridas", "backdrop-filter"];

test("CLAUDE.md § Puertas de T y de H tiene un párrafo ARREGLOS-02 que nombra «calentamiento», «webs reales», «corridas» y «backdrop-filter»; el bloque CONTRATO-DECLARADO es idéntico al del commit aprobado de ARREGLOS-01 (T d026b0f / H 951932c)", () => {
  const claude = { T: readFileSync(join(RAIZ_T, "CLAUDE.md"), "utf8"), H: readFileSync(join(RAIZ_H, "CLAUDE.md"), "utf8") };
  for (const repo of ["T", "H"] as const) {
    const puertas = seccionDeTexto(claude[repo], "Puertas automáticas");
    const parrafo = puertas.split(/\r?\n/).find((l) => /^\*\*ARREGLOS-02 \(\d{4}-\d{2}-\d{2}\):\*\*/.test(l));
    assert.ok(parrafo, `§ Puertas automáticas de ${repo} debe tener un párrafo «**ARREGLOS-02 (AAAA-MM-DD):**»`);
    for (const nombre of NOMBRA) assert.ok(parrafo.includes(nombre), `el párrafo ARREGLOS-02 de ${repo} debe nombrar «${nombre}»:\n${parrafo}`);
  }
  for (const [repo, raiz] of [["T", RAIZ_T], ["H", RAIZ_H]] as const) {
    const aprobado = lineas(bloqueDe(git(raiz, "show", `${ARREGLOS_01.aprobado[repo]}:CLAUDE.md`)));
    assert.ok(aprobado.some((l) => /^hook\.PreToolUse\s+= Edit\|Write\|MultiEdit\|Bash\|PowerShell :: candado\.mjs$/.test(l)), `precondición: el bloque aprobado de ARREGLOS-01 en ${repo} declara el candado para Edit|Write|MultiEdit|Bash|PowerShell`);
    assert.deepEqual(lineas(bloqueDe(claude[repo])), aprobado, `el bloque CONTRATO-DECLARADO de ${repo} es idéntico al de ${ARREGLOS_01.aprobado[repo]} (esta orden no toca hooks)`);
  }
});
