// CONEXION-09 · C (T) · los dos pendientes que dejó la corrida en limpio de PRESET-01 (D-94): el guard que vigila D-87 (C1) y las
// tres copias promovidas que se conforman con contar brechas (C2). Sesión A (2026-09-24): tests rojos — no existe
// `tests/instagram-sin-cuenta.test.ts` (C1) y `tests/conexion-02-c.test.ts` sigue con `informe.brechas.length <= tope` (C2).
// C1 corre el guard con el MISMO runner que su fase `test:browser` en la suite de T (`tsx --test`, `NODE_TEST_CONTEXT` borrado):
// el guard monta la página real con Vite en proceso, así que `node` a secas no sirve (§ Interfaz, lección de PRESET-01-A).
// C2 es lectura: una copia que compara `brechas.length <= tope` deja pasar una brecha distinta en el lugar de otra, que es
// exactamente lo que estas copias tenían que impedir. Sólo en T (inciso n).
// COPIA PROMOVIDA (E2E-01, 2026-09-25): la carpeta `tests/orden/conexion-09/` queda congelada al aprobarse la orden y ésta es la
// copia editable. Único cambio respecto del original: el import de `_comun.ts` apunta a `./orden/conexion-09/_comun.ts`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { COPIAS_BRECHAS, GUARD_INSTAGRAM, ROOT, TIPO_DIFF, TOPE, correrGuardTsx, fuente, nombresTap, tokensDeScript } from "./orden/conexion-09/_comun.ts";

/** La clave que el guard de C1 tiene que nombrar. */
const CLAVE = "instagram";

test("tests/instagram-sin-cuenta.test.ts existe, está en `test:browser` de package.json y nombra literalmente «instagram»; monta la página real (Vite en proceso) y afirma que con el fixture A la sección de Instagram pinta sus seis fotos y ningún `<a>` (ni `href=\"\"` ni `instagram.com/`), y que con una cuenta (un nicho de la flota cuyo preset trae `sections.instagram.url`) la misma sección sí pinta el enlace a esa url", () => {
  // (1) El guard nuevo: existe, lo corre la fase de a uno y nombra la clave. Hoy no existe: aquí es donde esta orden está en rojo.
  assert.ok(existsSync(resolve(ROOT, GUARD_INSTAGRAM)), `no existe ${GUARD_INSTAGRAM}`);
  assert.ok(tokensDeScript("test:browser").includes(GUARD_INSTAGRAM), `${GUARD_INSTAGRAM} debe estar en el script test:browser (D-57: monta la página)`);
  assert.ok(!tokensDeScript("test:unit").includes(GUARD_INSTAGRAM), `${GUARD_INSTAGRAM} no va en la fase concurrente`);
  assert.ok(fuente(GUARD_INSTAGRAM).includes(CLAVE), `${GUARD_INSTAGRAM} debe nombrar literalmente «${CLAVE}»`);

  // (2) El guard CORRE con el runner de su fase (`tsx --test`, como `npm run test:browser`) y pasa de verdad, con las dos
  //     direcciones declaradas en el TAP: sin cuenta no hay enlace, con cuenta sí.
  const r = correrGuardTsx(GUARD_INSTAGRAM);
  assert.equal(r.status, 0, `${GUARD_INSTAGRAM} debe salir 0 con tsx --test (salió ${r.status})\n${r.out.slice(-3000)}`);
  assert.match(r.stdout, /^# fail 0$/m, `${GUARD_INSTAGRAM} sin fallos:\n${r.stdout.slice(-2000)}`);
  assert.doesNotMatch(r.out, /skipping running files/, "el runner anidado corrió de verdad (NODE_TEST_CONTEXT borrado)");
  const nombres = nombresTap(r.stdout);
  assert.ok(nombres.length >= 2, `las dos direcciones, cada una con su test en el TAP (hay ${nombres.length}: ${nombres.join(" · ")})`);
});

test("tests/conexion-02-c.test.ts, tests/conexion-03-c.test.ts y tests/conexion-05-b.test.ts no contienen `brechas.length <=` y comparan, por paleta, el conjunto de `tipo · campo` de las brechas de `recrear` con una lista escrita en el propio test", () => {
  for (const copia of COPIAS_BRECHAS) {
    assert.ok(existsSync(resolve(ROOT, copia)), `precondición: existe ${copia}`);
    const src = fuente(copia);
    // (1) Ninguna sigue contando. Hoy las tres lo hacen: aquí es donde esta orden está en rojo.
    assert.ok(!src.includes(TOPE), `${copia} no debe contener «${TOPE}»: una brecha distinta puede ocupar el lugar de otra sin que nadie se entere (D-94 b)`);
    // (2) Y compara el conjunto de `tipo · campo` con una lista escrita en el propio archivo: la lista nombra la brecha que la
    //     corrida deja de verdad («diff ≠ 0», la línea base de estas tres desde CONEXION-04), no un número.
    assert.match(src, /b\.tipo\} · \$\{b\.campo\}/, `${copia} debe armar el nombre de cada brecha como «\${b.tipo} · \${b.campo}»`);
    assert.match(src, /assert\.deepEqual\(/, `${copia} debe comparar el CONJUNTO de brechas (deepEqual), no su cantidad`);
    assert.ok(src.includes(TIPO_DIFF), `${copia} debe llevar escrita la lista de brechas esperadas, que nombra «${TIPO_DIFF}» (hoy sólo cuenta)`);
  }
});
