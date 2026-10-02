// TEAM-RESENAS-01 · copia promovida (INSTAGRAM-FAQ-01, 2026-10-02, D-200). La orden quedó aprobada por Liam el 2026-10-02
// (T 471d2be · H dab461c) y su carpeta está congelada; esto es la copia editable que corre `npm test` todos los días.
// Recorte: entera.
// TEAM-RESENAS-01 · G1 (T+H) · el registro en CLAUDE.md. Sesión A (2026-10-01): test rojo.
// Cada orden deja su párrafo en § Puertas automáticas de T y de H. Y el bloque CONTRATO-DECLARADO no cambia: esta orden no toca hooks.
// Caja negra: lectura de los dos CLAUDE.md (el del otro repo por ruta fija) y `git show` del commit aprobado de SERVICIOS-GALERIA-01.
// Un mismo archivo en T y en H (cmp → 0).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { RAIZ_H, RAIZ_T, SERVICIOS_GALERIA_01, bloqueDe, git, parrafoDe } from "./orden/team-resenas-01/_comun.ts";

const NOMBRA = ["team6", "res6", "data-dinamica", "voces en collage", "CT-2", "validateFraseEquipo", "validateIdiomaResenas", "editarResena", "testimonials[].lang", "D-130", "SERVICIOS-GALERIA-01"];
const RAICES = { T: RAIZ_T, H: RAIZ_H } as const;
const lineas = (s: string) => s.split(/\r?\n/).map((l) => l.trimEnd()).filter((l) => l.trim());

test("CLAUDE.md § Puertas de T y de H tiene un párrafo TEAM-RESENAS-01 que nombra «team6», «res6», «data-dinamica», «voces en collage», «CT-2», «validateFraseEquipo», «validateIdiomaResenas», «editarResena», «testimonials[].lang», «D-130» y «SERVICIOS-GALERIA-01»; y el bloque CONTRATO-DECLARADO es idéntico al del commit aprobado de SERVICIOS-GALERIA-01 (T 428f62d / H 563f230)", () => {
  for (const [repo, raiz] of Object.entries(RAICES) as ["T" | "H", string][]) {
    const texto = readFileSync(resolve(raiz, "CLAUDE.md"), "utf8");
    // (1) El párrafo de esta orden. Hoy no está: aquí está el rojo.
    const p = parrafoDe(texto, "TEAM-RESENAS-01");
    assert.ok(p, `§ Puertas automáticas de ${repo} debe tener un párrafo «**TEAM-RESENAS-01 (AAAA-MM-DD):**»`);
    for (const n of NOMBRA) assert.ok(p.includes(n), `el párrafo TEAM-RESENAS-01 de ${repo} debe nombrar «${n}»:\n${p.slice(0, 400)}`);
  }
  // (2) El bloque CONTRATO-DECLARADO, igual que en el commit aprobado de SERVICIOS-GALERIA-01.
  for (const [repo, raiz] of Object.entries(RAICES) as ["T" | "H", string][]) {
    const aprobado = lineas(bloqueDe(git(raiz, "show", `${SERVICIOS_GALERIA_01.aprobado[repo]}:CLAUDE.md`)));
    assert.ok(aprobado.some((l) => /^githook\.pre-push\s+= destino-no-despliega\.mjs rojo-verde\.mjs --todas$/.test(l)), `precondición: el bloque aprobado de SERVICIOS-GALERIA-01 en ${repo} fija el pre-push`);
    assert.deepEqual(lineas(bloqueDe(readFileSync(resolve(raiz, "CLAUDE.md"), "utf8"))), aprobado, `el bloque CONTRATO-DECLARADO de ${repo} es idéntico al de ${SERVICIOS_GALERIA_01.aprobado[repo]} (esta orden no toca hooks)`);
  }
});
