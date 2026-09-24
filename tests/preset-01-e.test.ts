// PRESET-01 · E · registro: § Puertas automáticas de los dos CLAUDE.md con un párrafo PRESET-01 que nombre lo que D-85/D-86 deciden
// («genérico»), el dominio reservado que sustituye al del negocio («example.com») y la orden que queda pendiente para la flota
// («FLOTA-01», D-88); y el bloque CONTRATO-DECLARADO de cada repo idéntico al del commit aprobado de CONEXION-08 (T 621bfe5 /
// H 73d0070): esta orden no toca hooks. Sesión A (2026-09-23): test rojo (no está el párrafo). Lee disco (el otro repo por ruta fija)
// y compara el bloque línea a línea, sin CR, por `git show`. Un mismo archivo en T y en H (cmp → 0).
// COPIA PROMOVIDA (CONEXION-09, 2026-09-24): la carpeta `tests/orden/preset-01/` queda congelada y esta copia es la editable. Sin
// cambios respecto del original.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CONEXION_08, RAIZ_H, RAIZ_T, bloqueDe, git, seccionDeTexto } from "./orden/preset-01/_comun.ts";

const lineas = (bloque: string) => bloque.split(/\r?\n/).map((l) => l.replace(/\s+$/, ""));
/** Lo que el párrafo de esta orden tiene que nombrar (D-85, D-86, D-88). */
const NOMBRA = ["genérico", "example.com", "FLOTA-01"];

test("CLAUDE.md § Puertas de T y de H tiene un párrafo PRESET-01 que nombra «genérico», «example.com» y «FLOTA-01»; el bloque CONTRATO-DECLARADO es idéntico al del commit aprobado de CONEXION-08 (T 621bfe5 / H 73d0070)", () => {
  const claude = { T: readFileSync(join(RAIZ_T, "CLAUDE.md"), "utf8"), H: readFileSync(join(RAIZ_H, "CLAUDE.md"), "utf8") };
  for (const repo of ["T", "H"] as const) {
    const puertas = seccionDeTexto(claude[repo], "Puertas automáticas");
    const parrafo = puertas.split(/\r?\n/).find((l) => /^\*\*PRESET-01 \(\d{4}-\d{2}-\d{2}\):\*\*/.test(l));
    assert.ok(parrafo, `§ Puertas automáticas de ${repo} debe tener un párrafo «**PRESET-01 (AAAA-MM-DD):**»`);
    for (const nombre of NOMBRA) assert.ok(parrafo.includes(nombre), `el párrafo PRESET-01 de ${repo} debe nombrar «${nombre}»:\n${parrafo}`);
  }
  for (const [repo, raiz] of [["T", RAIZ_T], ["H", RAIZ_H]] as const) {
    const aprobado = lineas(bloqueDe(git(raiz, "show", `${CONEXION_08.aprobado[repo]}:CLAUDE.md`)));
    assert.ok(aprobado.some((l) => /^hook\.PreToolUse\s+= Edit\|Write\|MultiEdit\|Bash\|PowerShell :: candado\.mjs$/.test(l)), `precondición: el bloque aprobado de CONEXION-08 en ${repo} declara el candado para Edit|Write|MultiEdit|Bash|PowerShell`);
    assert.deepEqual(lineas(bloqueDe(claude[repo])), aprobado, `el bloque CONTRATO-DECLARADO de ${repo} es idéntico al de ${CONEXION_08.aprobado[repo]} (esta orden no toca hooks)`);
  }
});
