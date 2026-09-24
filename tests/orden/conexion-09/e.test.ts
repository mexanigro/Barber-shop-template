// CONEXION-09 · E · registro: § Puertas automáticas de los dos CLAUDE.md con un párrafo CONEXION-09 que nombre lo que D-90 decide
// («sin casilla»), la herramienta que se arregla («transicion»), la decisión de Liam («D-90») y el techo real del constructor
// («30/36»); y el bloque CONTRATO-DECLARADO de cada repo idéntico al del commit aprobado de PRESET-01 (T 1b0ccd6 / H 22845be): esta
// orden no toca hooks. Sesión A (2026-09-24): test rojo (no está el párrafo). Lee disco (el otro repo por ruta fija) y compara el
// bloque línea a línea, sin CR, por `git show`. Un mismo archivo en T y en H (cmp → 0).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PRESET_01, RAIZ_H, RAIZ_T, bloqueDe, git, seccionDeTexto } from "./_comun.ts";

const lineas = (bloque: string) => bloque.split(/\r?\n/).map((l) => l.replace(/\s+$/, ""));
/** Lo que el párrafo de esta orden tiene que nombrar (D-90, D-92). */
const NOMBRA = ["sin casilla", "transicion", "D-90", "30/36"];

test("CLAUDE.md § Puertas de T y de H tiene un párrafo CONEXION-09 que nombra «sin casilla», «transicion», «D-90» y «30/36»; el bloque CONTRATO-DECLARADO es idéntico al del commit aprobado de PRESET-01 (T 1b0ccd6 / H 22845be)", () => {
  const claude = { T: readFileSync(join(RAIZ_T, "CLAUDE.md"), "utf8"), H: readFileSync(join(RAIZ_H, "CLAUDE.md"), "utf8") };
  for (const repo of ["T", "H"] as const) {
    const puertas = seccionDeTexto(claude[repo], "Puertas automáticas");
    const parrafo = puertas.split(/\r?\n/).find((l) => /^\*\*CONEXION-09 \(\d{4}-\d{2}-\d{2}\):\*\*/.test(l));
    assert.ok(parrafo, `§ Puertas automáticas de ${repo} debe tener un párrafo «**CONEXION-09 (AAAA-MM-DD):**»`);
    for (const nombre of NOMBRA) assert.ok(parrafo.includes(nombre), `el párrafo CONEXION-09 de ${repo} debe nombrar «${nombre}»:\n${parrafo}`);
  }
  for (const [repo, raiz] of [["T", RAIZ_T], ["H", RAIZ_H]] as const) {
    const aprobado = lineas(bloqueDe(git(raiz, "show", `${PRESET_01.aprobado[repo]}:CLAUDE.md`)));
    assert.ok(aprobado.some((l) => /^hook\.PreToolUse\s+= Edit\|Write\|MultiEdit\|Bash\|PowerShell :: candado\.mjs$/.test(l)), `precondición: el bloque aprobado de PRESET-01 en ${repo} declara el candado para Edit|Write|MultiEdit|Bash|PowerShell`);
    assert.deepEqual(lineas(bloqueDe(claude[repo])), aprobado, `el bloque CONTRATO-DECLARADO de ${repo} es idéntico al de ${PRESET_01.aprobado[repo]} (esta orden no toca hooks)`);
  }
});
