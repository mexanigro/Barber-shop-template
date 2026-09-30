// ARREGLOS-03 · G1 (T+H) · el registro en CLAUDE.md. Sesión A (2026-09-30): test rojo.
// Cada orden deja su párrafo en § Puertas automáticas de T y de H. Esta además cambia la regla o-ter (D-147, Liam 2026-09-30): la
// carga por la ficha y `e2e.mjs` en 0 px ya no van en cada orden de diseño sino al cierre de cada tramo de secciones; el párrafo
// «Regla o-ter» de CLAUDE.md (escrito en IDIOMAS-01) tiene que decirlo. Y el bloque CONTRATO-DECLARADO no cambia: D-151 salta la
// medición contra las webs dentro de `rojo-verde --todas`, sin tocar el `githook.pre-push` que el bloque fija.
// Caja negra: lectura de los dos CLAUDE.md (el del otro repo por ruta fija) y `git show` del commit aprobado de IDIOMAS-01.
// Un mismo archivo en T y en H (cmp → 0).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { IDIOMAS_01, RAIZ_H, RAIZ_T, bloqueDe, git, parrafoDe, seccionDeTexto } from "./_comun.ts";

const NOMBRA = ["contra las webs", "no corrida en --todas", "diferencias guardadas en", "quitarTextoIdioma", "renombrarTextoIdioma", "clon limpio", "IDIOMAS-01"];
const TRAMO = "al cierre de cada tramo";
const RAICES = { T: RAIZ_T, H: RAIZ_H } as const;
const lineas = (s: string) => s.split(/\r?\n/).map((l) => l.trimEnd()).filter((l) => l.trim());

test("CLAUDE.md § Puertas de T y de H tiene un párrafo ARREGLOS-03 que nombra «contra las webs», «no corrida en --todas», «diferencias guardadas en», «quitarTextoIdioma», «renombrarTextoIdioma», «clon limpio» e «IDIOMAS-01»; el párrafo de la regla o-ter dice que la carga por la ficha y `e2e.mjs` en 0 px van «al cierre de cada tramo»; y el bloque CONTRATO-DECLARADO es idéntico al del commit aprobado de IDIOMAS-01 (T 26ddb48 / H 2c5119a)", () => {
  for (const [repo, raiz] of Object.entries(RAICES) as ["T" | "H", string][]) {
    const texto = readFileSync(resolve(raiz, "CLAUDE.md"), "utf8");
    // (1) El párrafo de esta orden. Hoy no está: aquí está el rojo.
    const p = parrafoDe(texto, "ARREGLOS-03");
    assert.ok(p, `§ Puertas automáticas de ${repo} debe tener un párrafo «**ARREGLOS-03 (AAAA-MM-DD):**»`);
    for (const n of NOMBRA) assert.ok(p.includes(n), `el párrafo ARREGLOS-03 de ${repo} debe nombrar «${n}»:\n${p.slice(0, 400)}`);
    // (2) La regla o-ter, por tramo.
    const oter = seccionDeTexto(texto, "Puertas automáticas").split(/\r?\n/).find((l) => /^\*\*Regla o-ter\b/.test(l));
    assert.ok(oter, `§ Puertas de ${repo} conserva el párrafo «**Regla o-ter …**»`);
    assert.ok(oter.includes(TRAMO), `la regla o-ter de ${repo} dice que la carga por la ficha y e2e.mjs en 0 px van «${TRAMO}» (D-147):\n${oter.slice(0, 400)}`);
  }
  // (3) El bloque CONTRATO-DECLARADO, igual que en el commit aprobado de IDIOMAS-01.
  for (const [repo, raiz] of Object.entries(RAICES) as ["T" | "H", string][]) {
    const aprobado = lineas(bloqueDe(git(raiz, "show", `${IDIOMAS_01.aprobado[repo]}:CLAUDE.md`)));
    assert.ok(aprobado.some((l) => /^githook\.pre-push\s+= destino-no-despliega\.mjs rojo-verde\.mjs --todas$/.test(l)), `precondición: el bloque aprobado de IDIOMAS-01 en ${repo} fija el pre-push`);
    assert.deepEqual(lineas(bloqueDe(readFileSync(resolve(raiz, "CLAUDE.md"), "utf8"))), aprobado, `el bloque CONTRATO-DECLARADO de ${repo} es idéntico al de ${IDIOMAS_01.aprobado[repo]} (esta orden no toca hooks)`);
  }
});
