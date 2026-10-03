// CIERRE-TRAMO-01 · E1 (T+H) · el registro en CLAUDE.md. Sesión A (2026-10-03): test rojo.
// Cada orden deja su párrafo en § Puertas automáticas de T y de H. Y el bloque CONTRATO-DECLARADO no cambia: esta orden no toca hooks.
// Caja negra: lectura de los dos CLAUDE.md (el del otro repo por ruta fija) y `git show` del commit aprobado de CONTACTO-PIE-01.
// Un mismo archivo en T y en H (cmp → 0).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { CONTACTO_PIE_01, RAIZ_H, RAIZ_T, bloqueDe, git, parrafoDe } from "./_comun.ts";

const NOMBRA = ["e2e.mjs", "--idiomas", "#team", "footer", "carga", "parcheDeContenido", "contact.address", "brand.description", "prefers-reduced-motion", "conexion-08-a", "CONTACTO-PIE-01"];
const RAICES = { T: RAIZ_T, H: RAIZ_H } as const;
const lineas = (s: string) => s.split(/\r?\n/).map((l) => l.trimEnd()).filter((l) => l.trim());

test("CLAUDE.md § Puertas de T y de H tiene un párrafo CIERRE-TRAMO-01 que nombra «e2e.mjs», «--idiomas», «#team», «footer», «carga», «parcheDeContenido», «contact.address», «brand.description», «prefers-reduced-motion», «conexion-08-a» y «CONTACTO-PIE-01»; y el bloque CONTRATO-DECLARADO es idéntico al del commit aprobado de CONTACTO-PIE-01 (T bcb746a / H 52a9af4)", () => {
  for (const [repo, raiz] of Object.entries(RAICES) as ["T" | "H", string][]) {
    const texto = readFileSync(resolve(raiz, "CLAUDE.md"), "utf8");
    // (1) El párrafo de esta orden. Hoy no está: aquí está el rojo.
    const p = parrafoDe(texto, "CIERRE-TRAMO-01");
    assert.ok(p, `§ Puertas automáticas de ${repo} debe tener un párrafo «**CIERRE-TRAMO-01 (AAAA-MM-DD):**»`);
    for (const n of NOMBRA) assert.ok(p.includes(n), `el párrafo CIERRE-TRAMO-01 de ${repo} debe nombrar «${n}»:\n${p.slice(0, 400)}`);
  }
  // (2) El bloque CONTRATO-DECLARADO, igual que en el commit aprobado de CONTACTO-PIE-01.
  for (const [repo, raiz] of Object.entries(RAICES) as ["T" | "H", string][]) {
    const aprobado = lineas(bloqueDe(git(raiz, "show", `${CONTACTO_PIE_01.aprobado[repo]}:CLAUDE.md`)));
    assert.ok(aprobado.some((l) => /^githook\.pre-push\s+= destino-no-despliega\.mjs rojo-verde\.mjs --todas$/.test(l)), `precondición: el bloque aprobado de CONTACTO-PIE-01 en ${repo} fija el pre-push`);
    assert.deepEqual(lineas(bloqueDe(readFileSync(resolve(raiz, "CLAUDE.md"), "utf8"))), aprobado, `el bloque CONTRATO-DECLARADO de ${repo} es idéntico al de ${CONTACTO_PIE_01.aprobado[repo]} (esta orden no toca hooks)`);
  }
});
