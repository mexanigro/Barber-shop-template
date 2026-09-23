// CONEXION-07 · E · registro: § Puertas automáticas de los dos CLAUDE.md con un párrafo CONEXION-07 que nombra la línea base nueva
// («26/36») y los dos guards de T («hero-textos», «secciones-datos»); y el bloque CONTRATO-DECLARADO de cada repo idéntico al del
// commit aprobado de CONEXION-06 (T b5b78f7 / H 07739a1): esta orden no toca hooks. Sesión A (2026-09-23): test rojo (no está el
// párrafo). Lee disco (el otro repo por ruta fija) y compara el bloque línea a línea, sin CR, por `git show`. Un mismo archivo en T y
// en H (cmp → 0).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CONEXION_06, RAIZ_H, RAIZ_T, bloqueDe, git, seccionDeTexto } from "./_comun.ts";

const lineas = (bloque: string) => bloque.split(/\r?\n/).map((l) => l.replace(/\s+$/, ""));
/** Lo que el párrafo de esta orden tiene que nombrar: la línea base nueva y los dos guards de T (D-77). */
const NOMBRA = ["26/36", "hero-textos", "secciones-datos"];

test("CLAUDE.md § Puertas de T y de H tiene un párrafo CONEXION-07 que nombra «26/36», «hero-textos» y «secciones-datos»; el bloque CONTRATO-DECLARADO es idéntico al del commit aprobado de CONEXION-06 (T b5b78f7 / H 07739a1)", () => {
  const claude = { T: readFileSync(join(RAIZ_T, "CLAUDE.md"), "utf8"), H: readFileSync(join(RAIZ_H, "CLAUDE.md"), "utf8") };
  for (const repo of ["T", "H"] as const) {
    const puertas = seccionDeTexto(claude[repo], "Puertas automáticas");
    const parrafo = puertas.split(/\r?\n/).find((l) => /^\*\*CONEXION-07 \(\d{4}-\d{2}-\d{2}\):\*\*/.test(l));
    assert.ok(parrafo, `§ Puertas automáticas de ${repo} debe tener un párrafo «**CONEXION-07 (AAAA-MM-DD):**»`);
    for (const nombre of NOMBRA) assert.ok(parrafo.includes(nombre), `el párrafo CONEXION-07 de ${repo} debe nombrar «${nombre}»:\n${parrafo}`);
  }
  for (const [repo, raiz] of [["T", RAIZ_T], ["H", RAIZ_H]] as const) {
    const aprobado = lineas(bloqueDe(git(raiz, "show", `${CONEXION_06.aprobado[repo]}:CLAUDE.md`)));
    assert.ok(aprobado.some((l) => /^hook\.PreToolUse\s+= Edit\|Write\|MultiEdit\|Bash\|PowerShell :: candado\.mjs$/.test(l)), `precondición: el bloque aprobado de CONEXION-06 en ${repo} declara el candado para Edit|Write|MultiEdit|Bash|PowerShell`);
    assert.deepEqual(lineas(bloqueDe(claude[repo])), aprobado, `el bloque CONTRATO-DECLARADO de ${repo} es idéntico al de ${CONEXION_06.aprobado[repo]} (esta orden no toca hooks)`);
  }
});
