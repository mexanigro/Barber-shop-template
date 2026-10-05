// ALTA-IDIOMAS-01 · E1 (T+H) · el registro en CLAUDE.md. Sesión A (2026-10-05): test rojo.
// Cada orden deja su párrafo en § Puertas automáticas de T y de H. El de ésta nombra el camino único (`generate-content`, que se
// reemplaza para todos los nichos, D-241), sus cuatro funciones y el componente (D-242), el modelo (D-239), la excepción a R24 para
// las reseñas (D-237) y el retiro de AUDITORIA-01 (D-235). El bloque CONTRATO-DECLARADO no cambia: esta orden no toca hooks.
// Caja negra: lectura de los dos CLAUDE.md (el del otro repo por ruta fija) y `git show` del commit aprobado de AUDITORIA-01.
// Un mismo archivo en T y en H (cmp → 0).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { AUDITORIA_01, RAIZ_H, RAIZ_T, bloqueDe, git, parrafoDe } from "./_comun.ts";

const NOMBRA = ["generate-content", "escribirTextos", "camposDeTexto", "validarPropuesta", "cuerpoDePropuesta", "PropuestaDeTextos", "claude-opus-5-5", "R24", "reseñas", "AUDITORIA-01"];
const RAICES = { T: RAIZ_T, H: RAIZ_H } as const;
const lineas = (s: string) => s.split(/\r?\n/).map((l) => l.trimEnd()).filter((l) => l.trim());

test("CLAUDE.md § Puertas de T y de H tiene un párrafo ALTA-IDIOMAS-01 que nombra «generate-content», «escribirTextos», «camposDeTexto», «validarPropuesta», «cuerpoDePropuesta», «PropuestaDeTextos», «claude-opus-5-5», «R24», «reseñas» y «AUDITORIA-01»; y el bloque CONTRATO-DECLARADO es idéntico al del commit aprobado de AUDITORIA-01 (T 907f5dc / H 76b1535)", () => {
  for (const [repo, raiz] of Object.entries(RAICES) as ["T" | "H", string][]) {
    const texto = readFileSync(resolve(raiz, "CLAUDE.md"), "utf8");
    // (1) El párrafo de esta orden. Hoy no está: aquí está el rojo.
    const p = parrafoDe(texto, "ALTA-IDIOMAS-01");
    assert.ok(p, `§ Puertas automáticas de ${repo} debe tener un párrafo «**ALTA-IDIOMAS-01 (AAAA-MM-DD):**»`);
    for (const n of NOMBRA) assert.ok(p.includes(n), `el párrafo ALTA-IDIOMAS-01 de ${repo} debe nombrar «${n}»:\n${p.slice(0, 400)}`);
  }
  // (2) El bloque CONTRATO-DECLARADO, igual que en el commit aprobado de AUDITORIA-01.
  for (const [repo, raiz] of Object.entries(RAICES) as ["T" | "H", string][]) {
    const aprobado = lineas(bloqueDe(git(raiz, "show", `${AUDITORIA_01.aprobado[repo]}:CLAUDE.md`)));
    assert.ok(aprobado.some((l) => /^githook\.pre-push\s+= destino-no-despliega\.mjs rojo-verde\.mjs --todas$/.test(l)), `precondición: el bloque aprobado de AUDITORIA-01 en ${repo} fija el pre-push`);
    assert.deepEqual(lineas(bloqueDe(readFileSync(resolve(raiz, "CLAUDE.md"), "utf8"))), aprobado, `el bloque CONTRATO-DECLARADO de ${repo} es idéntico al de ${AUDITORIA_01.aprobado[repo]} (esta orden no toca hooks)`);
  }
});
