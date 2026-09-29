// ARREGLOS-02 · copia promovida (IDIOMAS-01, 2026-09-29, D-127). La orden quedó aprobada por Liam el 2026-09-27
// (T 19ba544 · H 3bc8aa5) y su carpeta de la orden está congelada; esto es la copia editable que corre `npm test` todos los días.
// Recorte: sin A1, que corre `e2e.mjs --corridas 3` contra las dos webs desplegadas (~30 min, sale a la red; D-89, D-95). Queda A2,
// el protocolo de `capturasEstables` con un elemento de prueba, que no abre navegador ni sale a la red.
// ARREGLOS-02 · A (T) · la medición contra las webs REALES, estable. Sesión A (2026-09-25): tests rojos — `tools/verdad/e2e.mjs`
// no exporta `capturasEstables` ni acepta `--corridas`.
//
// D-115 (medido, sólo lectura contra las dos webs desplegadas). Con `asentar` aplicado y cuatro capturas seguidas del mismo
// elemento a 1280, la PRIMERA difiere de las tres siguientes, que son idénticas entre sí: 13 a 17 píxeles, siempre en
// x = 1150–1151 y en las filas 19–23 y 64–68, con cambios de ±1 por canal. `document.elementFromPoint` sobre esos puntos da, en
// las dos webs, `div.relative.mx-3 < nav.fixed.inset-x-0`, con `backdrop-filter: blur(16px)`: es la pastilla de navbar-v6
// (`mx-3 mt-3 h-14 lg:h-16 lg:mx-auto lg:max-w-5xl rounded-xl border … backdrop-blur-[16px]`), que a 1280 va de x=128 a x=1152 y
// de y=12 a y=76 — o sea, las dos esquinas redondeadas de su borde derecho. Entra en la captura porque `#main-content` empieza en
// y=0 y mide 1149 px (/servicios) y 1377 px (/galeria) con un viewport de 800.
//
// D-116 (medido): una captura de calentamiento descartada por lado y por zona deja las 24 entradas de las dos webs iguales; lo
// que hace hoy `repetir()` (N capturas seguidas, sin descartar) falla en siete de ellas.
// D-117 (medido): una página LOCAL no reproduce la causa — ocho variantes, las cuatro capturas siempre idénticas. Por eso A2
// falsa el PROTOCOLO con un elemento de prueba que reproduce la FORMA medida, y la prueba contra lo real es A1.
// D-118 (medido): en la corrida completa de `--web a`, `pagina-galeria 375` dio 7 px con las dos capturas de cada lado iguales —
// una diferencia entre LADOS que la repetición no ve—, y 0 px en tres corridas acotadas. Por eso A1 exige TRES corridas.
//
// Sólo en T (inciso n). Ningún test escribe en Firestore, en Storage, en Vercel ni en el repo: `e2e.mjs` sólo LEE los dos dominios.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { CAPTURAS_ESTABLES, E2E, ROOT, canonico, importarModulo } from "./orden/arreglos-02/_comun.ts";

/** La precondición barata que comparten A1, A2 y B1: hoy falla en milisegundos, así que el árbol rojo no paga las corridas reales. */
async function precondicion(): Promise<Record<string, unknown>> {
  assert.ok(existsSync(resolve(ROOT, E2E)), `no existe ${E2E} (E2E-01)`);
  const mod = await importarModulo(E2E);
  assert.equal(typeof mod[CAPTURAS_ESTABLES], "function", `${E2E} debe exportar \`${CAPTURAS_ESTABLES}(elemento, repeticiones)\`, que descarta una captura de calentamiento antes de medir (exporta: ${Object.keys(mod).join(", ") || "nada"})`);
  return mod;
}

test("tools/verdad/e2e.mjs exporta `capturasEstables(elemento, repeticiones)`, que pide `repeticiones + 1` capturas y descarta la primera: devuelve las últimas `repeticiones`, da `estable` verdadero cuando sólo la primera captura difiere —la forma medida en las dos webs— y falso cuando difiere una posterior", async () => {
  const mod = await precondicion();
  const capturasEstables = mod[CAPTURAS_ESTABLES] as (el: unknown, n: number) => Promise<{ capturas: Buffer[]; estable: boolean }>;

  /** Un elemento de prueba: `screenshot()` devuelve el buffer que le toque a cada llamada y cuenta cuántas veces la llamaron.
   *  No abre navegador (D-117: la causa no se reproduce en local; lo que se falsa aquí es el PROTOCOLO, no el compositor). */
  const elemento = (porLlamada: (i: number) => string) => {
    const llamadas: string[] = [];
    return {
      llamadas,
      el: { async screenshot() { const s = porLlamada(llamadas.length); llamadas.push(s); return Buffer.from(s, "utf8"); } },
    };
  };
  const N = 3;

  // (1) La forma medida: la PRIMERA captura distinta y las siguientes iguales entre sí → estable, y la primera no se devuelve.
  const soloLaPrimera = elemento((i) => (i === 0 ? "fria" : "tibia"));
  const a = await capturasEstables(soloLaPrimera.el, N);
  assert.equal(soloLaPrimera.llamadas.length, N + 1, `capturasEstables debe pedir ${N + 1} capturas para medir ${N}: la primera es el calentamiento y se descarta (pidió ${soloLaPrimera.llamadas.length})`);
  assert.equal(a.capturas.length, N, `devuelve las ${N} capturas medidas, no la de calentamiento`);
  assert.equal(a.estable, true, "con sólo la primera captura distinta —la forma medida en las dos webs— la zona es estable");
  assert.deepEqual(canonico(a.capturas.map((b) => b.toString("utf8"))), canonico(Array.from({ length: N }, () => "tibia")), "las capturas devueltas son las de después del calentamiento");

  // (2) La falsación: si cambia una captura POSTERIOR al calentamiento, la zona NO es estable. Sin esto, `estable` podría ser
  //     verdadero siempre y el descarte estaría tapando la inestabilidad en vez de resolverla.
  const cambiaDespues = elemento((i) => (i <= 1 ? "tibia" : "otra"));
  const b = await capturasEstables(cambiaDespues.el, N);
  assert.equal(b.estable, false, "una captura que cambia DESPUÉS del calentamiento sigue siendo inestable: el descarte no puede tapar nada");

  // (3) Control: todo igual desde el principio → estable, y la cuenta de capturas no cambia.
  const siempreIgual = elemento(() => "quieta");
  const c = await capturasEstables(siempreIgual.el, N);
  assert.equal(c.estable, true, "una zona que no se mueve es estable");
  assert.equal(siempreIgual.llamadas.length, N + 1, "también aquí se pide una captura de calentamiento");
});
