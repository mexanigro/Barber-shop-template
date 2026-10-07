// SECCIONES-02 · E1 (T+H) · el registro en CLAUDE.md. Sesión A (2026-10-06): test rojo.
// Cada orden deja su párrafo en § Puertas automáticas de los dos repos. Ésta además deja en T lo que la orden de higiene iba a dejar
// (D-249): los párrafos PLANTILLA-01 y VENTA-01, que hoy están sólo en H, copiados de H tal cual (el de ALTA-IDIOMAS-01 ya está en T:
// medido, igual al de H; D-280). El bloque CONTRATO-DECLARADO no cambia: esta orden no toca hooks.
// Caja negra: lectura de CLAUDE.md de los dos repos (el otro por su ruta fija) y `git show` del commit aprobado de VENTA-01.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { RAIZ_H, RAIZ_T, REPO, VENTA_01, bloqueDe, git, parrafoDe } from "./_comun.ts";

const NOMBRA = ["S2-1", "S2-2", "S2-3", ".ct6", ".team6", "16:10", "tarjeta-perfil", ":has", "!important", "VENTA-01"];
const lineas = (s: string) => s.split(/\r?\n/).map((l) => l.trimEnd()).filter((l) => l.trim());
/** El repo propio primero: así el rojo de cada árbol es el suyo (inciso l). */
const RAICES = (REPO === "T" ? [["T", RAIZ_T], ["H", RAIZ_H]] : [["H", RAIZ_H], ["T", RAIZ_T]]) as ["T" | "H", string][];

test("CLAUDE.md § Puertas de T y de H tiene un párrafo SECCIONES-02 que nombra «S2-1», «S2-2», «S2-3», «.ct6», «.team6», «16:10», «tarjeta-perfil», «:has», «!important» y «VENTA-01»; el de T tiene además los párrafos ALTA-IDIOMAS-01, PLANTILLA-01 y VENTA-01 iguales a los de H; y el bloque CONTRATO-DECLARADO es idéntico al del commit aprobado de VENTA-01 (T 3222922 / H fa5674e)", () => {
  const texto = Object.fromEntries(RAICES.map(([r, raiz]) => [r, readFileSync(resolve(raiz, "CLAUDE.md"), "utf8")])) as Record<"T" | "H", string>;
  // (1) El párrafo de esta orden. Hoy no está: aquí está el rojo.
  for (const [repo] of RAICES) {
    const p = parrafoDe(texto[repo], "SECCIONES-02");
    assert.ok(p, `§ Puertas automáticas de ${repo} debe tener un párrafo «**SECCIONES-02 (AAAA-MM-DD):**»`);
    for (const n of NOMBRA) assert.ok(p.includes(n), `el párrafo SECCIONES-02 de ${repo} debe nombrar «${n}»:\n${p.slice(0, 400)}`);
  }
  // (2) Lo pendiente de T (D-249): los párrafos de las tres órdenes que sólo tocaron H, iguales a los de H.
  for (const id of ["ALTA-IDIOMAS-01", "PLANTILLA-01", "VENTA-01"]) {
    const h = parrafoDe(texto.H, id);
    assert.ok(h, `precondición: H tiene el párrafo ${id}`);
    assert.equal(parrafoDe(texto.T, id), h, `§ Puertas automáticas de T tiene el párrafo ${id}, igual al de H`);
  }
  // (3) El bloque CONTRATO-DECLARADO, igual que en el commit aprobado de VENTA-01.
  for (const [repo, raiz] of RAICES) {
    const aprobado = lineas(bloqueDe(git(raiz, "show", `${VENTA_01.aprobado[repo]}:CLAUDE.md`)));
    assert.ok(aprobado.some((l) => /^githook\.pre-push\s+= destino-no-despliega\.mjs rojo-verde\.mjs --todas$/.test(l)), `precondición: el bloque aprobado de VENTA-01 en ${repo} fija el pre-push`);
    assert.deepEqual(lineas(bloqueDe(texto[repo])), aprobado, `el bloque CONTRATO-DECLARADO de ${repo} es idéntico al de ${VENTA_01.aprobado[repo]} (esta orden no toca hooks)`);
  }
});
