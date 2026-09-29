// IDIOMAS-01 · E3, F1 · el registro. Sesión A (2026-09-29): tests rojos.
// E3 (PLAN.md § Pendientes para la próxima orden, b): las cuatro discrepancias que midió la verificadora en el registro de
// ARREGLOS-02, medidas otra vez por A el 2026-09-29 y todavía presentes —«sin perder fuerza» en CLAUDE.md de T y de H (en
// `e00a816` se BORRÓ la aserción «sin 400 ni 700 de Frank Ruhl Libre» de `tests/ajustes-01.test.ts`); `4.3.md` § ARREGLOS-02 · B
// empieza con «Estado: la orden NO cierra» y cita `1735a78` y `1d8ae6b`, que nunca se pushearon; la regresión de los seis dio
// DIEZ capturas byte a byte, no once; y CLAUDE.md no nombra `115e0e4` entre los commits del `--no-verify`—.
// F1 (PLAN.md § Pendientes, d; D-137): el párrafo IDIOMAS-01 en § Puertas de T y de H, la regla o-ter escrita en § Puertas, y
// `T CLAUDE.md` § Arquitectura sin el «sin capa = preset (`tests/language-roundtrip.test.ts`)» a secas, que para servicios,
// equipo y reseñas deja de ser cierto; el bloque CONTRATO-DECLARADO no cambia.
// Lee disco (el otro repo por ruta fija, y `bloque-04/4.3.md`, sin git) y compara el bloque por `git show`. Un mismo archivo en
// T y en H (cmp → 0).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ARREGLOS_02, BLOQUE, RAIZ_H, RAIZ_T, bloqueDe, git, parrafoDe, seccionDeTexto } from "./_comun.ts";

const lineas = (bloque: string) => bloque.split(/\r?\n/).map((l) => l.replace(/\s+$/, ""));
const claude = () => ({ T: readFileSync(join(RAIZ_T, "CLAUDE.md"), "utf8"), H: readFileSync(join(RAIZ_H, "CLAUDE.md"), "utf8") });
/** Lo que el párrafo de esta orden tiene que nombrar (D-133, D-134, D-130). */
const NOMBRA = ["D11", "translations", "originalText", "nunca del preset"];
/** La frase vieja de § Arquitectura de T (D-137). */
const SIN_CAPA = "sin capa = preset (`tests/language-roundtrip.test.ts`)";

test("el registro de ARREGLOS-02 dice lo que pasó: el párrafo ARREGLOS-02 de CLAUDE.md en T y en H no dice «sin perder fuerza», dice qué aserción de `tests/ajustes-01.test.ts` se borró, nombra `115e0e4` y dice «diez byte a byte»; y bloque-04/4.3.md § ARREGLOS-02 · B no empieza con «Estado: la orden NO cierra» ni cita `1735a78` ni `1d8ae6b`", () => {
  const c = claude();
  for (const repo of ["T", "H"] as const) {
    const p = parrafoDe(c[repo], "ARREGLOS-02");
    assert.ok(p, `precondición: § Puertas de ${repo} tiene el párrafo ARREGLOS-02`);
    // (1) Hoy lo dice: aquí está el rojo.
    assert.ok(!p.includes("sin perder fuerza"), `el párrafo ARREGLOS-02 de ${repo} no puede decir «sin perder fuerza»: en e00a816 se borró una aserción de tests/ajustes-01.test.ts`);
    assert.ok(p.includes("sin 400 ni 700"), `el párrafo ARREGLOS-02 de ${repo} dice qué aserción se borró («sin 400 ni 700 de Frank Ruhl Libre»)`);
    assert.ok(p.includes("115e0e4"), `el párrafo ARREGLOS-02 de ${repo} nombra 115e0e4 entre los commits del --no-verify`);
    assert.ok(p.includes("diez byte a byte") && !p.includes("once byte a byte"), `el párrafo ARREGLOS-02 de ${repo} dice «diez byte a byte» (0 px en las doce, diez idénticas)`);
  }
  const md = readFileSync(join(BLOQUE, "4.3.md"), "utf8");
  const i = md.search(/^## ARREGLOS-02 · B/m);
  assert.ok(i >= 0, "precondición: 4.3.md tiene § ARREGLOS-02 · B");
  const resto = md.slice(i).split(/\r?\n/).slice(1);
  const fin = resto.findIndex((l) => /^## /.test(l));
  const seccion = (fin < 0 ? resto : resto.slice(0, fin)).join("\n");
  const primera = seccion.split(/\r?\n/).find((l) => l.trim()) ?? "";
  assert.ok(!primera.includes("Estado: la orden NO cierra"), `4.3.md § ARREGLOS-02 · B no empieza con «Estado: la orden NO cierra» (empieza con «${primera.slice(0, 80)}»)`);
  for (const sha of ["1735a78", "1d8ae6b"]) assert.ok(!seccion.includes(sha), `4.3.md § ARREGLOS-02 · B no cita ${sha}, que nunca se pusheó`);
});

test("CLAUDE.md § Puertas de T y de H tiene un párrafo IDIOMAS-01 que nombra «D11», «translations», «originalText» y «nunca del preset» y la regla o-ter; T § Arquitectura ya no dice «sin capa = preset» sin nombrar la excepción de servicios, equipo y reseñas; y el bloque CONTRATO-DECLARADO es idéntico al del commit aprobado de ARREGLOS-02 (T 19ba544 / H 3bc8aa5)", () => {
  const c = claude();
  for (const repo of ["T", "H"] as const) {
    const p = parrafoDe(c[repo], "IDIOMAS-01");
    assert.ok(p, `§ Puertas automáticas de ${repo} debe tener un párrafo «**IDIOMAS-01 (AAAA-MM-DD):**»`);
    for (const n of NOMBRA) assert.ok(p.includes(n), `el párrafo IDIOMAS-01 de ${repo} debe nombrar «${n}»:\n${p.slice(0, 400)}`);
    const puertas = seccionDeTexto(c[repo], "Puertas automáticas");
    assert.ok(puertas.includes("o-ter") && puertas.includes("punta a punta"), `§ Puertas de ${repo} escribe la regla o-ter (PLAN.md § Pendientes, d)`);
  }
  const arq = seccionDeTexto(c.T, "Arquitectura mínima");
  assert.ok(!arq.includes(SIN_CAPA), `T § Arquitectura no puede decir «${SIN_CAPA}» a secas: para servicios, equipo y reseñas deja de ser cierto (D-137)`);
  assert.ok(arq.includes("nunca del preset"), "T § Arquitectura nombra la excepción: los datos del cliente, nunca del preset");
  for (const [repo, raiz] of [["T", RAIZ_T], ["H", RAIZ_H]] as const) {
    const aprobado = lineas(bloqueDe(git(raiz, "show", `${ARREGLOS_02.aprobado[repo]}:CLAUDE.md`)));
    assert.ok(aprobado.some((l) => /^hook\.PreToolUse\s+= Edit\|Write\|MultiEdit\|Bash\|PowerShell :: candado\.mjs$/.test(l)), `precondición: el bloque aprobado de ARREGLOS-02 en ${repo} declara el candado`);
    assert.deepEqual(lineas(bloqueDe(c[repo])), aprobado, `el bloque CONTRATO-DECLARADO de ${repo} es idéntico al de ${ARREGLOS_02.aprobado[repo]} (esta orden no toca hooks)`);
  }
});
