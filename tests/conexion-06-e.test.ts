// CONEXION-06 · E · registro: CLAUDE.md § Arquitectura mínima de H nombra la casilla de paleta (`paleta-editor`), que deriva con
// `derivePalette` desde la copia `src/lib/palette.ts` (D-69) y el campo `hero.eyebrow` de la pestaña Contenido (D-72); § Puertas
// automáticas de T y de H con un párrafo CONEXION-06 que nombra «20/36» y «nunca a mano»; y el bloque CONTRATO-DECLARADO de cada repo
// idéntico al del commit aprobado de CONEXION-05 (T a41f93a / H 0c60811): esta orden no toca hooks. Sesión A (2026-09-23): test rojo
// (no está la casilla en § Arquitectura). Lee disco (el otro repo por ruta fija) y compara el bloque línea a línea, sin CR, por
// `git show`. Un mismo archivo en T y en H (cmp → 0).
// CONEXION-07 D2 (2026-09-23): copia editable promovida a npm test (la orden está aprobada y retirada de rojo-verde --todas; el
// original de la carpeta congelada no se toca).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CONEXION_05, RAIZ_H, RAIZ_T, bloqueDe, git, seccionDeTexto } from "./orden/conexion-06/_comun.ts";

const lineas = (bloque: string) => bloque.split(/\r?\n/).map((l) => l.replace(/\s+$/, ""));

test("CLAUDE.md § Arquitectura mínima de H nombra `paleta-editor`, `derivePalette`, la copia `src/lib/palette.ts` y el campo `hero.eyebrow` de Contenido; CLAUDE.md § Puertas de T y de H tiene un párrafo CONEXION-06 que nombra «20/36» y «nunca a mano»; el bloque CONTRATO-DECLARADO es idéntico al del commit aprobado de CONEXION-05 (T a41f93a / H 0c60811)", () => {
  const claude = { T: readFileSync(join(RAIZ_T, "CLAUDE.md"), "utf8"), H: readFileSync(join(RAIZ_H, "CLAUDE.md"), "utf8") };
  const arquitectura = seccionDeTexto(claude.H, "Arquitectura mínima");
  for (const nombre of ["paleta-editor", "derivePalette", "src/lib/palette.ts", "hero.eyebrow"]) {
    assert.ok(arquitectura.includes(nombre), `§ Arquitectura mínima de H debe nombrar «${nombre}»:\n${arquitectura}`);
  }
  for (const repo of ["T", "H"] as const) {
    const puertas = seccionDeTexto(claude[repo], "Puertas automáticas");
    const parrafo = puertas.split(/\r?\n/).find((l) => /^\*\*CONEXION-06 \(\d{4}-\d{2}-\d{2}\):\*\*/.test(l));
    assert.ok(parrafo, `§ Puertas automáticas de ${repo} debe tener un párrafo «**CONEXION-06 (AAAA-MM-DD):**»`);
    assert.ok(parrafo.includes("20/36"), `el párrafo CONEXION-06 de ${repo} debe nombrar «20/36»:\n${parrafo}`);
    assert.ok(parrafo.includes("nunca a mano"), `el párrafo CONEXION-06 de ${repo} debe nombrar «nunca a mano» (CH:11, D-70):\n${parrafo}`);
  }
  for (const [repo, raiz] of [["T", RAIZ_T], ["H", RAIZ_H]] as const) {
    const aprobado = lineas(bloqueDe(git(raiz, "show", `${CONEXION_05.aprobado[repo]}:CLAUDE.md`)));
    assert.ok(aprobado.some((l) => /^hook\.PreToolUse\s+= Edit\|Write\|MultiEdit\|Bash\|PowerShell :: candado\.mjs$/.test(l)), `precondición: el bloque aprobado de CONEXION-05 en ${repo} declara el candado para Edit|Write|MultiEdit|Bash|PowerShell`);
    assert.deepEqual(lineas(bloqueDe(claude[repo])), aprobado, `el bloque CONTRATO-DECLARADO de ${repo} es idéntico al de ${CONEXION_05.aprobado[repo]} (esta orden no toca hooks)`);
  }
});
