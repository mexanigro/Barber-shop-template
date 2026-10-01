// SERVICIOS-GALERIA-01 · G1 (T+H) · el registro en CLAUDE.md. Sesión A (2026-10-01): test rojo.
// Cada orden deja su párrafo en § Puertas automáticas de T y de H. Ésta además corrige el párrafo ARREGLOS-03 (D-167): tiene que
// nombrar D-158 tal como lo midió la verificadora —las banderas de `ARGS_CHROMIUM` en `qa-regresion-seis.mjs`, con «14 de 15» pares
// idénticos con ellas y «5 de 7» sin ellas—, sin afirmar que estabilizan. Y el bloque CONTRATO-DECLARADO no cambia: esta orden no
// toca hooks.
// Caja negra: lectura de los dos CLAUDE.md (el del otro repo por ruta fija) y `git show` del commit aprobado de ARREGLOS-03.
// Un mismo archivo en T y en H (cmp → 0).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ARREGLOS_03, RAIZ_H, RAIZ_T, bloqueDe, git, parrafoDe } from "./_comun.ts";

const NOMBRA = ["svc-caption", "G1-a", "G2-a", "G3-a", "FONDO-02", "renombrarServicio", "quitarServicio", "featured", "serviceId", "ARREGLOS-03"];
const D158 = ["D-158", "--disable-lcd-text", "14 de 15", "5 de 7"];
const RAICES = { T: RAIZ_T, H: RAIZ_H } as const;
const lineas = (s: string) => s.split(/\r?\n/).map((l) => l.trimEnd()).filter((l) => l.trim());

test("CLAUDE.md § Puertas de T y de H tiene un párrafo SERVICIOS-GALERIA-01 que nombra «svc-caption», «G1-a», «G2-a», «G3-a», «FONDO-02», «renombrarServicio», «quitarServicio», «featured», «serviceId» y «ARREGLOS-03»; el párrafo ARREGLOS-03 nombra «D-158», «--disable-lcd-text», «14 de 15» y «5 de 7» y no dice que las banderas estabilizan; y el bloque CONTRATO-DECLARADO es idéntico al del commit aprobado de ARREGLOS-03 (T d27ebf3 / H 064acb5)", () => {
  for (const [repo, raiz] of Object.entries(RAICES) as ["T" | "H", string][]) {
    const texto = readFileSync(resolve(raiz, "CLAUDE.md"), "utf8");
    // (1) El párrafo de esta orden. Hoy no está: aquí está el rojo.
    const p = parrafoDe(texto, "SERVICIOS-GALERIA-01");
    assert.ok(p, `§ Puertas automáticas de ${repo} debe tener un párrafo «**SERVICIOS-GALERIA-01 (AAAA-MM-DD):**»`);
    for (const n of NOMBRA) assert.ok(p.includes(n), `el párrafo SERVICIOS-GALERIA-01 de ${repo} debe nombrar «${n}»:\n${p.slice(0, 400)}`);
    // (2) El párrafo ARREGLOS-03, corregido (D-167).
    const a = parrafoDe(texto, "ARREGLOS-03");
    assert.ok(a, `§ Puertas de ${repo} conserva el párrafo «**ARREGLOS-03 (2026-09-30):**»`);
    for (const n of D158) assert.ok(a.includes(n), `el párrafo ARREGLOS-03 de ${repo} debe nombrar «${n}» (D-158 tal como se midió):\n${a.slice(-600)}`);
    assert.ok(!/estabiliz/i.test(a), `el párrafo ARREGLOS-03 de ${repo} no dice que las banderas estabilizan (no está medido)`);
  }
  // (3) El bloque CONTRATO-DECLARADO, igual que en el commit aprobado de ARREGLOS-03.
  for (const [repo, raiz] of Object.entries(RAICES) as ["T" | "H", string][]) {
    const aprobado = lineas(bloqueDe(git(raiz, "show", `${ARREGLOS_03.aprobado[repo]}:CLAUDE.md`)));
    assert.ok(aprobado.some((l) => /^githook\.pre-push\s+= destino-no-despliega\.mjs rojo-verde\.mjs --todas$/.test(l)), `precondición: el bloque aprobado de ARREGLOS-03 en ${repo} fija el pre-push`);
    assert.deepEqual(lineas(bloqueDe(readFileSync(resolve(raiz, "CLAUDE.md"), "utf8"))), aprobado, `el bloque CONTRATO-DECLARADO de ${repo} es idéntico al de ${ARREGLOS_03.aprobado[repo]} (esta orden no toca hooks)`);
  }
});
