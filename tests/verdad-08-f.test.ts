// VERDAD-08 · F · registro: § Puertas automáticas de T y de H con un párrafo VERDAD-08 que nombra lo que esta orden cambia, y el
// bloque CONTRATO-DECLARADO de cada repo idéntico al del commit aprobado de CONEXION-04 (T 4a22d7b / H f8bd9bb): esta orden no toca
// hooks (el matcher del candado y los hooks de git siguen siendo los mismos; lo que cambia es lo que el candado mira por dentro).
// Sesión A (2026-09-22): test rojo (no hay párrafo). Lee disco (el otro repo por ruta fija) y compara el bloque línea a línea, sin
// CR, por git show. Un mismo archivo en T y en H (cmp → 0).
// VERDAD-09 D-63 (2026-09-22): copia editable promovida a npm test (VERDAD-08 está aprobada y retirada de rojo-verde --todas; el original
// en la carpeta congelada de la orden queda como estaba).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CONEXION_04, RAIZ_H, RAIZ_T, bloqueDe, git, seccionDeTexto } from "./orden/verdad-08/_util.ts";

const lineas = (bloque: string) => bloque.split(/\r?\n/).map((l) => l.replace(/\s+$/, ""));

test("CLAUDE.md § Puertas tiene un párrafo VERDAD-08 que nombra «restos por proceso», «hermano», «`cp`», «navegador en serie» y «14/36», y el bloque CONTRATO-DECLARADO es idéntico al del commit aprobado de CONEXION-04 (T 4a22d7b / H f8bd9bb)", () => {
  const claude = { T: readFileSync(join(RAIZ_T, "CLAUDE.md"), "utf8"), H: readFileSync(join(RAIZ_H, "CLAUDE.md"), "utf8") };
  for (const repo of ["T", "H"] as const) {
    const puertas = seccionDeTexto(claude[repo], "Puertas automáticas");
    const parrafo = puertas.split(/\r?\n/).find((l) => /^\*\*VERDAD-08 \(\d{4}-\d{2}-\d{2}\):\*\*/.test(l));
    assert.ok(parrafo, `§ Puertas automáticas de ${repo} debe tener un párrafo «**VERDAD-08 (AAAA-MM-DD):**»`);
    for (const nombre of ["restos por proceso", "hermano", "`cp`", "navegador en serie", "14/36"]) {
      assert.ok(parrafo.includes(nombre), `el párrafo VERDAD-08 de ${repo} debe nombrar «${nombre}»:\n${parrafo}`);
    }
  }
  for (const [repo, raiz] of [["T", RAIZ_T], ["H", RAIZ_H]] as const) {
    const aprobado = lineas(bloqueDe(git(raiz, "show", `${CONEXION_04.aprobado[repo]}:CLAUDE.md`)));
    assert.ok(aprobado.some((l) => /^hook\.PreToolUse\s+= Edit\|Write\|MultiEdit\|Bash\|PowerShell :: candado\.mjs$/.test(l)), `precondición: el bloque aprobado de CONEXION-04 en ${repo} declara el candado para Edit|Write|MultiEdit|Bash|PowerShell`);
    assert.deepEqual(lineas(bloqueDe(claude[repo])), aprobado, `el bloque CONTRATO-DECLARADO de ${repo} es idéntico al de ${CONEXION_04.aprobado[repo]} (esta orden no toca hooks)`);
  }
});
