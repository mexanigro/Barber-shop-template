// ARREGLOS-01 · F · registro: § Puertas automáticas de los dos CLAUDE.md con un párrafo ARREGLOS-01 que nombre lo que esta orden
// deja medible («estable», «repeticiones»), el hueco de `sections.services.images` («hueco») y la orden de la casilla de logo
// («LOGO-01»); y el bloque CONTRATO-DECLARADO de cada repo idéntico al del commit aprobado de E2E-01 (T c4faa5d / H 0c6d3e0):
// esta orden no toca hooks. Sesión A (2026-09-25): test rojo (no está el párrafo). Lee disco (el otro repo por ruta fija) y compara
// el bloque línea a línea, sin CR, por `git show`. Un mismo archivo en T y en H (cmp → 0).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { E2E_01, RAIZ_H, RAIZ_T, bloqueDe, git, seccionDeTexto } from "./_comun.ts";

const lineas = (bloque: string) => bloque.split(/\r?\n/).map((l) => l.replace(/\s+$/, ""));
/** Lo que el párrafo de esta orden tiene que nombrar (D-107/D-108, D-109, D-110). */
const NOMBRA = ["estable", "repeticiones", "hueco", "LOGO-01"];

test("CLAUDE.md § Puertas de T y de H tiene un párrafo ARREGLOS-01 que nombra «estable», «repeticiones», «hueco» y «LOGO-01»; el bloque CONTRATO-DECLARADO es idéntico al del commit aprobado de E2E-01 (T c4faa5d / H 0c6d3e0)", () => {
  const claude = { T: readFileSync(join(RAIZ_T, "CLAUDE.md"), "utf8"), H: readFileSync(join(RAIZ_H, "CLAUDE.md"), "utf8") };
  for (const repo of ["T", "H"] as const) {
    const puertas = seccionDeTexto(claude[repo], "Puertas automáticas");
    const parrafo = puertas.split(/\r?\n/).find((l) => /^\*\*ARREGLOS-01 \(\d{4}-\d{2}-\d{2}\):\*\*/.test(l));
    assert.ok(parrafo, `§ Puertas automáticas de ${repo} debe tener un párrafo «**ARREGLOS-01 (AAAA-MM-DD):**»`);
    for (const nombre of NOMBRA) assert.ok(parrafo.includes(nombre), `el párrafo ARREGLOS-01 de ${repo} debe nombrar «${nombre}»:\n${parrafo}`);
  }
  for (const [repo, raiz] of [["T", RAIZ_T], ["H", RAIZ_H]] as const) {
    const aprobado = lineas(bloqueDe(git(raiz, "show", `${E2E_01.aprobado[repo]}:CLAUDE.md`)));
    assert.ok(aprobado.some((l) => /^hook\.PreToolUse\s+= Edit\|Write\|MultiEdit\|Bash\|PowerShell :: candado\.mjs$/.test(l)), `precondición: el bloque aprobado de E2E-01 en ${repo} declara el candado para Edit|Write|MultiEdit|Bash|PowerShell`);
    assert.deepEqual(lineas(bloqueDe(claude[repo])), aprobado, `el bloque CONTRATO-DECLARADO de ${repo} es idéntico al de ${E2E_01.aprobado[repo]} (esta orden no toca hooks)`);
  }
});
