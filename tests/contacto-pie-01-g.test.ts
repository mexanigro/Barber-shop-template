// CONTACTO-PIE-01 · copia promovida (CIERRE-TRAMO-01, 2026-10-03, D-221). La orden quedó aprobada por Liam el 2026-10-03
// (T bcb746a · H 52a9af4) y su carpeta está congelada; esto es la copia editable que corre `npm test` todos los días.
// Recorte: entera.
// CONTACTO-PIE-01 · G1 (T+H) · el registro en CLAUDE.md. Sesión A (2026-10-03): test rojo.
// Cada orden deja su párrafo en § Puertas automáticas de T y de H. Y el bloque CONTRATO-DECLARADO no cambia: esta orden no toca hooks.
// Caja negra: lectura de los dos CLAUDE.md (el del otro repo por ruta fija) y `git show` del commit aprobado de INSTAGRAM-FAQ-01.
// Un mismo archivo en T y en H (cmp → 0).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { INSTAGRAM_FAQ_01, RAIZ_H, RAIZ_T, bloqueDe, git, parrafoDe } from "./orden/contacto-pie-01/_comun.ts";

const NOMBRA = ["ct6", "pie6", "ubicación y horarios", "el cierre", "sections.contact.variant", "footer.variant", "D21", "encajar", "transitionSpeed", "recrear", "INSTAGRAM-FAQ-01"];
const RAICES = { T: RAIZ_T, H: RAIZ_H } as const;
const lineas = (s: string) => s.split(/\r?\n/).map((l) => l.trimEnd()).filter((l) => l.trim());

test("CLAUDE.md § Puertas de T y de H tiene un párrafo CONTACTO-PIE-01 que nombra «ct6», «pie6», «ubicación y horarios», «el cierre», «sections.contact.variant», «footer.variant», «D21», «encajar», «transitionSpeed», «recrear» e «INSTAGRAM-FAQ-01»; y el bloque CONTRATO-DECLARADO es idéntico al del commit aprobado de INSTAGRAM-FAQ-01 (T 392acff / H 75ede45)", () => {
  for (const [repo, raiz] of Object.entries(RAICES) as ["T" | "H", string][]) {
    const texto = readFileSync(resolve(raiz, "CLAUDE.md"), "utf8");
    // (1) El párrafo de esta orden. Hoy no está: aquí está el rojo.
    const p = parrafoDe(texto, "CONTACTO-PIE-01");
    assert.ok(p, `§ Puertas automáticas de ${repo} debe tener un párrafo «**CONTACTO-PIE-01 (AAAA-MM-DD):**»`);
    for (const n of NOMBRA) assert.ok(p.includes(n), `el párrafo CONTACTO-PIE-01 de ${repo} debe nombrar «${n}»:\n${p.slice(0, 400)}`);
  }
  // (2) El bloque CONTRATO-DECLARADO, igual que en el commit aprobado de INSTAGRAM-FAQ-01.
  for (const [repo, raiz] of Object.entries(RAICES) as ["T" | "H", string][]) {
    const aprobado = lineas(bloqueDe(git(raiz, "show", `${INSTAGRAM_FAQ_01.aprobado[repo]}:CLAUDE.md`)));
    assert.ok(aprobado.some((l) => /^githook\.pre-push\s+= destino-no-despliega\.mjs rojo-verde\.mjs --todas$/.test(l)), `precondición: el bloque aprobado de INSTAGRAM-FAQ-01 en ${repo} fija el pre-push`);
    assert.deepEqual(lineas(bloqueDe(readFileSync(resolve(raiz, "CLAUDE.md"), "utf8"))), aprobado, `el bloque CONTRATO-DECLARADO de ${repo} es idéntico al de ${INSTAGRAM_FAQ_01.aprobado[repo]} (esta orden no toca hooks)`);
  }
});
