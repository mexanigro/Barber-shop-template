// E2E-01 · D (T) · el caso que le falta al guard de la transición. Sesión A (2026-09-24): test rojo — `tests/transicion.test.ts`
// cubre ΔH 10, 10 con ΔL 0,11, 35 y 36, pero no ΔH 11°, el primer grado que ya NO es `same-hue`.
// Medido por mutación (D-103, 2026-09-24): con `MISMO_TONO = 20` en `tools/material/relacion.mjs` el guard pasa 4/4.
//
// **Corrección de A (2026-09-24), el arnés.** La primera versión inyectaba la mutación con `node --import tsx --import <hook>`, donde
// <hook> era un módulo que EXPORTA `load`. `--import` sólo PRECARGA el módulo: no registra sus hooks de carga. Medido: con ese
// arnés, importar `relacion.mjs` daba `MISMO_TONO = 10` — el hook nunca corría, la mutación era inerte y el guard pasaba 4/4 con o
// sin el caso de ΔH 11°, así que D1 no podía ponerse verde nunca. Ahora el segundo `--import` apunta a un módulo que llama
// `module.register(<url del hook>, <parentURL>)`, que sí lo registra (medido: `MISMO_TONO = 20`).
// Por eso el test lleva una PRECONDICIÓN del arnés, independiente del guard: con el registro puesto, importar `relacion.mjs` y leer
// `MISMO_TONO === 20`; sin el registro, 10. Si esa precondición cae, el mensaje dice que falló el arnés y no el caso.
//
// El guard corre en el repo real con el runner de su fase (`tsx`, `NODE_TEST_CONTEXT` borrado); no se escribe un solo byte fuera de
// la carpeta temporal de la orden, que se borra en `finally`. Las dos direcciones: sin el hook el guard tiene que PASAR (si no, lo
// que falla es el arnés) y con el hook tiene que FALLAR con un `# fail` del TAP, no con un error de carga. Sólo en T (inciso n).
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, writeFileSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { DH_VECINO, GUARD_TRANSICION, RELACION, ROOT, UMBRAL, conTemporal, correrGuardTsx, correrLargo, fuente, nombresTap } from "./_comun.ts";

/** La relación que le toca a ΔH 11° y el grado, escrito como lo escribe el guard (hoy no está: «0,11» no cuenta). */
const VECINO = "adjacent-hue";
const GRADO = `${DH_VECINO}°`;
/** El umbral mutado: 20 deja pasar ΔH 11..20 como `same-hue` sin que ninguna aserción de hoy caiga (D-103). */
const MUTADO = 20;
/** El umbral que el árbol declara hoy, y que la precondición del arnés mide sin el registro puesto. */
const LIMPIO = 10;

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

  // (3) La mutación, por hook de carga REGISTRADO: el guard corre en el repo real y `relacion.mjs` llega con el umbral en 20.
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
    // `--import <hook>` NO registra el hook: sólo lo precarga. Hay que llamar a `module.register` (corrección de A).
    const registrar = join(base, "registrar.mjs");
    writeFileSync(registrar, `import { register } from "node:module";
register(${JSON.stringify(pathToFileURL(hook).href)}, ${JSON.stringify(pathToFileURL(base + sep).href)});
`);
    const conRegistro = ["--import", "tsx", "--import", pathToFileURL(registrar).href];
    const leerUmbral = `import { ${UMBRAL} } from ${JSON.stringify(objetivo)}; console.log("${UMBRAL}=" + ${UMBRAL});`;

    // (3a) PRECONDICIÓN DEL ARNÉS, que no depende del guard: con el registro puesto el módulo llega mutado, y sin él no.
    const sinRegistro = correrLargo(["--import", "tsx", "--input-type=module", "-e", leerUmbral], { env: { NODE_TEST_CONTEXT: undefined } });
    assert.equal(sinRegistro.stdout.trim(), `${UMBRAL}=${LIMPIO}`, `ARNÉS: sin el registro, ${RELACION} llega como está (dio «${sinRegistro.stdout.trim()}»)\n${sinRegistro.out.slice(-1200)}`);
    const conMutacion = correrLargo([...conRegistro, "--input-type=module", "-e", leerUmbral], { env: { NODE_TEST_CONTEXT: undefined } });
    assert.equal(conMutacion.stdout.trim(), `${UMBRAL}=${MUTADO}`, `ARNÉS: con el registro, ${UMBRAL} tiene que llegar en ${MUTADO} (dio «${conMutacion.stdout.trim()}»). Si esto falla, falló el arnés de la mutación, no el caso de ΔH ${GRADO}\n${conMutacion.out.slice(-1500)}`);

    // (3b) Y entonces el guard tiene que CAER, con un `# fail` del TAP y sus propios tests corridos (no un error de carga).
    const roto = correrLargo([...conRegistro, "--test", GUARD_TRANSICION], { env: { NODE_TEST_CONTEXT: undefined } });
    const suyos = nombresTap(verde.stdout), conHook = nombresTap(roto.stdout);
    assert.ok(suyos.length >= 4, `precondición: ${GUARD_TRANSICION} declara sus tests en el TAP (hay ${suyos.length})`);
    assert.deepEqual(conHook, suyos, `ARNÉS: con la mutación corren los MISMOS tests del guard, no un fallo de carga:\n${roto.out.slice(-2000)}`);
    assert.match(roto.stdout, /^# fail [1-9]/m, `con ${UMBRAL} = ${MUTADO} el guard tiene que FALLAR: sin el caso de ΔH ${GRADO} el umbral sube de ${LIMPIO} a ${MUTADO} sin que nadie se entere\n${roto.stdout.slice(-2000)}`);
    assert.notEqual(roto.status, 0, `…y salir distinto de 0 (salió ${roto.status})`);
  });
});
