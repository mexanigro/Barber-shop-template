// E2E-01 · D (T) · el caso que le falta al guard de la transición. Sesión A (2026-09-24): test rojo — `tests/transicion.test.ts`
// cubre ΔH 10, 10 con ΔL 0,11, 35 y 36, pero no ΔH 11°, el primer grado que ya NO es `same-hue`.
// Medido por mutación (D-103, 2026-09-24): con `MISMO_TONO = 20` en `tools/material/relacion.mjs` el guard pasa 4/4 y el árbol se
// restauró. Sin el caso de 11°, el umbral puede subir de 10 a 20 sin que nada caiga.
// **Cómo se prueba, y por qué así** (corrección de A: la primera versión de este test nació verde por el motivo equivocado — pedía
// que el guard «contuviera 11», y el `0,11` del caso de ΔL ya lo contenía; y mutaba una COPIA del archivo en una carpeta temporal,
// donde el guard fallaba por imports rotos, no por la mutación). Ahora la mutación se inyecta con un HOOK de carga: el guard corre en
// el repo real, con su runner de fase (`tsx`, `NODE_TEST_CONTEXT` borrado), y un `--import` devuelve la fuente de `relacion.mjs` con
// el umbral cambiado. No se escribe un solo byte fuera de la carpeta temporal de la orden, que se borra en `finally`.
// Las dos direcciones: sin el hook el guard tiene que PASAR (si no, lo que falla es el arnés) y con el hook tiene que FALLAR con un
// `# fail` del TAP, no con un error de carga. Sólo en T (inciso n).
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { DH_VECINO, GUARD_TRANSICION, RELACION, ROOT, UMBRAL, conTemporal, correrGuardTsx, correrLargo, fuente, nombresTap } from "./_comun.ts";

/** La relación que le toca a ΔH 11° y el grado, escrito como lo escribe el guard (hoy no está: «0,11» no cuenta). */
const VECINO = "adjacent-hue";
const GRADO = `${DH_VECINO}°`;
/** El umbral mutado: 20 deja pasar ΔH 11..20 como `same-hue` sin que ninguna aserción de hoy caiga (D-103). */
const MUTADO = 20;

test("tests/transicion.test.ts afirma que ΔH 11° da `adjacent-hue` (el primer grado fuera de `same-hue`), y con `MISMO_TONO = 20` en tools/material/relacion.mjs el guard FALLA", () => {
  assert.ok(existsSync(resolve(ROOT, GUARD_TRANSICION)), `precondición: existe ${GUARD_TRANSICION} (CONEXION-09)`);
  assert.ok(existsSync(resolve(ROOT, RELACION)), `precondición: existe ${RELACION} (CONEXION-09, D-92)`);
  const relacion = fuente(RELACION);
  const re = new RegExp(`(export const ${UMBRAL} = )\\d+`);
  assert.match(relacion, re, `${RELACION} declara «export const ${UMBRAL} = <n>»`);

  // (1) El guard nombra el caso, con el grado escrito («0,11» del caso de ΔL no vale). Hoy no lo nombra: aquí está el rojo.
  const guard = fuente(GUARD_TRANSICION);
  assert.ok(guard.includes(GRADO), `${GUARD_TRANSICION} debe nombrar el caso ΔH ${GRADO}, el primer grado que ya no es same-hue`);
  assert.ok(guard.includes(VECINO), `${GUARD_TRANSICION} debe nombrar «${VECINO}»`);

  // (2) Sin mutación el guard PASA, con el runner de su fase: si esto cae, lo que falla es el arnés y no el caso.
  const verde = correrGuardTsx(GUARD_TRANSICION);
  assert.equal(verde.status, 0, `${GUARD_TRANSICION} debe salir 0 con tsx --test (salió ${verde.status})\n${verde.out.slice(-3000)}`);
  assert.match(verde.stdout, /^# fail 0$/m, `${GUARD_TRANSICION} sin fallos:\n${verde.stdout.slice(-1500)}`);

  // (3) La mutación, por hook de carga: el guard corre en el repo real y `relacion.mjs` llega con el umbral en 20. Tiene que CAER,
  //     y caer con un `# fail` del TAP (una falla de carga no probaría nada).
  conTemporal((base) => {
    const objetivo = pathToFileURL(resolve(ROOT, RELACION)).href;
    const hook = join(base, "umbral.mjs");
    writeFileSync(hook, `import { readFile } from "node:fs/promises";
const OBJETIVO = ${JSON.stringify(objetivo)};
export async function load(url, context, next) {
  if (url !== OBJETIVO) return next(url, context);
  const source = await readFile(new URL(url), "utf8");
  const mutado = source.replace(${re.toString()}, "$1${MUTADO}");
  if (mutado === source) throw new Error("el hook no pudo mutar ${UMBRAL}");
  return { format: "module", source: mutado, shortCircuit: true };
}
`);
    const roto = correrLargo(["--import", "tsx", "--import", pathToFileURL(hook).href, "--test", GUARD_TRANSICION], { env: { NODE_TEST_CONTEXT: undefined } });
    // El guard tiene que haber CARGADO y corrido sus propios tests: un fallo de carga también imprime «# tests 1» con el nombre del
    // archivo, y entonces la mutación no probaría nada. Se compara con la corrida limpia, que acaba de correr arriba.
    const suyos = nombresTap(verde.stdout), conHook = nombresTap(roto.stdout);
    assert.ok(suyos.length >= 4, `precondición: ${GUARD_TRANSICION} declara sus tests en el TAP (hay ${suyos.length})`);
    assert.deepEqual(conHook, suyos, `con el hook puesto corren los MISMOS tests del guard, no un fallo de carga:\n${roto.out.slice(-2000)}`);
    assert.match(roto.stdout, /^# fail [1-9]/m, `con ${UMBRAL} = ${MUTADO} el guard tiene que FALLAR: sin el caso de ΔH ${GRADO} el umbral sube de 10 a ${MUTADO} sin que nadie se entere\n${roto.stdout.slice(-2000)}`);
    assert.notEqual(roto.status, 0, `…y salir distinto de 0 (salió ${roto.status})`);
  });
});
