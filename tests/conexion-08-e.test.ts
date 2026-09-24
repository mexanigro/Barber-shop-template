// CONEXION-08 · E · registro: § Puertas automáticas de los dos CLAUDE.md con un párrafo CONEXION-08 que nombra la línea base nueva
// («29/36»), lo que D-79 decide («genérico»), la herramienta nueva de T («logo-generico») y adónde se va `features.themeToggle`
// («DISEÑO-01», D-82); y el bloque CONTRATO-DECLARADO de cada repo idéntico al del commit aprobado de CONEXION-07 (T 637ed2b /
// H 9c0f1e9): esta orden no toca hooks. Sesión A (2026-09-23): test rojo (no está el párrafo). Lee disco (el otro repo por ruta fija)
// y compara el bloque línea a línea, sin CR, por `git show`. Un mismo archivo en T y en H (cmp → 0).
// COPIA PROMOVIDA (PRESET-01, 2026-09-23): la carpeta `tests/orden/conexion-08/` queda congelada y esta copia es la editable. Sin
// cambios respecto del original.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CONEXION_07, RAIZ_H, RAIZ_T, bloqueDe, git, seccionDeTexto } from "./orden/conexion-08/_comun.ts";

const lineas = (bloque: string) => bloque.split(/\r?\n/).map((l) => l.replace(/\s+$/, ""));
/** Lo que el párrafo de esta orden tiene que nombrar (D-79, D-81, D-82). */
const NOMBRA = ["29/36", "genérico", "logo-generico", "DISEÑO-01"];

test("CLAUDE.md § Puertas de T y de H tiene un párrafo CONEXION-08 que nombra «29/36», «genérico», «logo-generico» y «DISEÑO-01»; el bloque CONTRATO-DECLARADO es idéntico al del commit aprobado de CONEXION-07 (T 637ed2b / H 9c0f1e9)", () => {
  const claude = { T: readFileSync(join(RAIZ_T, "CLAUDE.md"), "utf8"), H: readFileSync(join(RAIZ_H, "CLAUDE.md"), "utf8") };
  for (const repo of ["T", "H"] as const) {
    const puertas = seccionDeTexto(claude[repo], "Puertas automáticas");
    const parrafo = puertas.split(/\r?\n/).find((l) => /^\*\*CONEXION-08 \(\d{4}-\d{2}-\d{2}\):\*\*/.test(l));
    assert.ok(parrafo, `§ Puertas automáticas de ${repo} debe tener un párrafo «**CONEXION-08 (AAAA-MM-DD):**»`);
    for (const nombre of NOMBRA) assert.ok(parrafo.includes(nombre), `el párrafo CONEXION-08 de ${repo} debe nombrar «${nombre}»:\n${parrafo}`);
  }
  for (const [repo, raiz] of [["T", RAIZ_T], ["H", RAIZ_H]] as const) {
    const aprobado = lineas(bloqueDe(git(raiz, "show", `${CONEXION_07.aprobado[repo]}:CLAUDE.md`)));
    assert.ok(aprobado.some((l) => /^hook\.PreToolUse\s+= Edit\|Write\|MultiEdit\|Bash\|PowerShell :: candado\.mjs$/.test(l)), `precondición: el bloque aprobado de CONEXION-07 en ${repo} declara el candado para Edit|Write|MultiEdit|Bash|PowerShell`);
    assert.deepEqual(lineas(bloqueDe(claude[repo])), aprobado, `el bloque CONTRATO-DECLARADO de ${repo} es idéntico al de ${CONEXION_07.aprobado[repo]} (esta orden no toca hooks)`);
  }
});
