// E2E-01 · copia promovida (ARREGLOS-01, 2026-09-25, D-105). La orden quedó aprobada por Liam el 2026-09-25
// (T c4faa5d · H 0c6d3e0) y su carpeta de la orden está congelada; esto es la copia editable que corre `npm test` todos los días.
// Recorte: entera.
// E2E-01 · F · registro: § Puertas automáticas de los dos CLAUDE.md con un párrafo E2E-01 que nombre lo que esta orden prueba
// («punta a punta»), de dónde se cargan las dos webs («desde la ficha»), cómo se compara («por elemento», D-101) y la decisión que
// fija qué se juzga («D-97»); y el bloque CONTRATO-DECLARADO de cada repo idéntico al del commit aprobado de CONEXION-09
// (T cc154fb / H b25f1e7): esta orden no toca hooks. Sesión A (2026-09-24): test rojo (no está el párrafo). Lee disco (el otro repo
// por ruta fija) y compara el bloque línea a línea, sin CR, por `git show`. Un mismo archivo en T y en H (cmp → 0).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CONEXION_09, RAIZ_H, RAIZ_T, bloqueDe, git, seccionDeTexto } from "./orden/e2e-01/_comun.ts";

const lineas = (bloque: string) => bloque.split(/\r?\n/).map((l) => l.replace(/\s+$/, ""));
/** Lo que el párrafo de esta orden tiene que nombrar (D-96, D-97, D-101). */
const NOMBRA = ["punta a punta", "desde la ficha", "por elemento", "D-97"];

test("CLAUDE.md § Puertas de T y de H tiene un párrafo E2E-01 que nombra «punta a punta», «desde la ficha», «por elemento» y «D-97»; el bloque CONTRATO-DECLARADO es idéntico al del commit aprobado de CONEXION-09 (T cc154fb / H b25f1e7)", () => {
  const claude = { T: readFileSync(join(RAIZ_T, "CLAUDE.md"), "utf8"), H: readFileSync(join(RAIZ_H, "CLAUDE.md"), "utf8") };
  for (const repo of ["T", "H"] as const) {
    const puertas = seccionDeTexto(claude[repo], "Puertas automáticas");
    const parrafo = puertas.split(/\r?\n/).find((l) => /^\*\*E2E-01 \(\d{4}-\d{2}-\d{2}\):\*\*/.test(l));
    assert.ok(parrafo, `§ Puertas automáticas de ${repo} debe tener un párrafo «**E2E-01 (AAAA-MM-DD):**»`);
    for (const nombre of NOMBRA) assert.ok(parrafo.includes(nombre), `el párrafo E2E-01 de ${repo} debe nombrar «${nombre}»:\n${parrafo}`);
  }
  for (const [repo, raiz] of [["T", RAIZ_T], ["H", RAIZ_H]] as const) {
    const aprobado = lineas(bloqueDe(git(raiz, "show", `${CONEXION_09.aprobado[repo]}:CLAUDE.md`)));
    assert.ok(aprobado.some((l) => /^hook\.PreToolUse\s+= Edit\|Write\|MultiEdit\|Bash\|PowerShell :: candado\.mjs$/.test(l)), `precondición: el bloque aprobado de CONEXION-09 en ${repo} declara el candado para Edit|Write|MultiEdit|Bash|PowerShell`);
    assert.deepEqual(lineas(bloqueDe(claude[repo])), aprobado, `el bloque CONTRATO-DECLARADO de ${repo} es idéntico al de ${CONEXION_09.aprobado[repo]} (esta orden no toca hooks)`);
  }
});
