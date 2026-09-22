// VERDAD-09 · D · registro: § Puertas automáticas de T y de H con un párrafo VERDAD-09 que nombra lo que esta orden cambia, y el
// bloque CONTRATO-DECLARADO de cada repo idéntico al del commit aprobado de VERDAD-08 (T 139a2f8 / H 5737d30): esta orden no toca
// hooks (ni el matcher del candado ni los hooks de git cambian; lo que cambia es dónde corren los tests que lo invocan y cuándo se
// exige la paridad de tools/). Sesión A (2026-09-22): test rojo (no hay párrafo). Lee disco (el otro repo por ruta fija) y compara
// el bloque línea a línea, sin CR, por git show. Un mismo archivo en T y en H (cmp → 0).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { RAIZ_H, RAIZ_T, VERDAD_08, bloqueDe, git, seccionDeTexto } from "./_comun.ts";

const lineas = (bloque: string) => bloque.split(/\r?\n/).map((l) => l.replace(/\s+$/, ""));

test("CLAUDE.md § Puertas tiene un párrafo VERDAD-09 que nombra «permiso abierto», «repo temporal», «paridad» y «orden viva», y el bloque CONTRATO-DECLARADO es idéntico al del commit aprobado de VERDAD-08 (T 139a2f8 / H 5737d30)", () => {
  const claude = { T: readFileSync(join(RAIZ_T, "CLAUDE.md"), "utf8"), H: readFileSync(join(RAIZ_H, "CLAUDE.md"), "utf8") };
  for (const repo of ["T", "H"] as const) {
    const puertas = seccionDeTexto(claude[repo], "Puertas automáticas");
    const parrafo = puertas.split(/\r?\n/).find((l) => /^\*\*VERDAD-09 \(\d{4}-\d{2}-\d{2}\):\*\*/.test(l));
    assert.ok(parrafo, `§ Puertas automáticas de ${repo} debe tener un párrafo «**VERDAD-09 (AAAA-MM-DD):**»`);
    for (const nombre of ["permiso abierto", "repo temporal", "paridad", "orden viva"]) {
      assert.ok(parrafo.includes(nombre), `el párrafo VERDAD-09 de ${repo} debe nombrar «${nombre}»:\n${parrafo}`);
    }
  }
  for (const [repo, raiz] of [["T", RAIZ_T], ["H", RAIZ_H]] as const) {
    const aprobado = lineas(bloqueDe(git(raiz, "show", `${VERDAD_08.aprobado[repo]}:CLAUDE.md`)));
    assert.ok(aprobado.some((l) => /^hook\.PreToolUse\s+= Edit\|Write\|MultiEdit\|Bash\|PowerShell :: candado\.mjs$/.test(l)), `precondición: el bloque aprobado de VERDAD-08 en ${repo} declara el candado para Edit|Write|MultiEdit|Bash|PowerShell`);
    assert.deepEqual(lineas(bloqueDe(claude[repo])), aprobado, `el bloque CONTRATO-DECLARADO de ${repo} es idéntico al de ${VERDAD_08.aprobado[repo]} (esta orden no toca hooks)`);
  }
});
