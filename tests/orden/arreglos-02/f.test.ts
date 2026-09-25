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
import { BANDERA_CORRIDAS, CAPTURAS_ESTABLES, CORRIDAS, E2E, PALETAS, ROOT, VISTAS, ZONAS, canonico, correrE2E, fuente, importarModulo, jsonFinal } from "./_comun.ts";

type Zona = { corrida?: number; zona: string; vista: number; pixels: number; size?: boolean; total?: number; repeticiones?: number; estable?: boolean };
type Tok = { corrida?: number; vista: number; iguales: boolean; distintos?: string[] };
type Informe = { web: string; paleta: string; commitSha: string; corridas?: number; zonas: Zona[]; tokens: Tok[]; faltantes: unknown[] };

/** La precondición barata que comparten A1, A2 y B1: hoy falla en milisegundos, así que el árbol rojo no paga las corridas reales. */
async function precondicion(): Promise<Record<string, unknown>> {
  assert.ok(existsSync(resolve(ROOT, E2E)), `no existe ${E2E} (E2E-01)`);
  const mod = await importarModulo(E2E);
  assert.equal(typeof mod[CAPTURAS_ESTABLES], "function", `${E2E} debe exportar \`${CAPTURAS_ESTABLES}(elemento, repeticiones)\`, que descarta una captura de calentamiento antes de medir (exporta: ${Object.keys(mod).join(", ") || "nada"})`);
  return mod;
}

test("tools/verdad/e2e.mjs acepta `--corridas <n>` y, con `--web a --corridas 3` y `--web c --corridas 3`, las 72 entradas zona·vista·corrida (12 por web y corrida) salen en 0 px, sin cambio de tamaño y con `estable` verdadero —ninguna «NO ESTABLE»—, los tokens de `:root` iguales en las dos vistas de cada corrida, y las dos invocaciones salen 0", async () => {
  await precondicion();
  assert.ok(fuente(E2E).includes(BANDERA_CORRIDAS), `${E2E} debe aceptar «${BANDERA_CORRIDAS} <n>» (D-119: la referencia se construye una vez y la medición se repite)`);

  const esperadas = ZONAS.flatMap((z) => VISTAS.flatMap((v) => Array.from({ length: CORRIDAS }, (_, i) => `${i + 1}|${z}|${v}`)));
  let total = 0;
  for (const p of PALETAS) {
    const r = correrE2E([E2E, "--web", p, "--corridas", String(CORRIDAS), "--json"]);
    assert.equal(r.status, 0, `${E2E} --web ${p} --corridas ${CORRIDAS} debe salir 0 (salió ${r.status})\n${r.out.slice(-4000)}`);
    const informe = jsonFinal(r.stdout) as unknown as Informe;

    // (1) Es de esta web, de este commit, y de las tres corridas.
    assert.equal(informe.paleta, p, `${p}: el informe es de la paleta ${p}`);
    assert.deepEqual(informe.faltantes ?? [], [], `${p}: ninguna zona quedó sin medir`);

    // (2) Las 36 entradas de esta web: tres corridas × seis zonas × dos vistas, cada una identificada por su corrida.
    const hay = (informe.zonas ?? []).map((z) => `${z.corrida}|${z.zona}|${z.vista}`);
    assert.deepEqual(canonico([...hay].sort()), canonico([...esperadas].sort()), `${p}: el informe cubre las seis zonas en las dos vistas, en las ${CORRIDAS} corridas`);

    // (3) Y todas a cero y estables. Una zona «NO ESTABLE» no es una medición: es una medición que no se puede afirmar (D-108).
    const inestables = (informe.zonas ?? []).filter((z) => z.estable !== true).map((z) => `corrida ${z.corrida} · ${z.zona} ${z.vista}`);
    assert.deepEqual(inestables, [], `${p}: ninguna zona puede salir «NO ESTABLE» (la causa medida es la primera rasterización de la pastilla con backdrop-filter, D-115)`);
    const malas = (informe.zonas ?? []).filter((z) => z.pixels !== 0 || z.size === true).map((z) => `corrida ${z.corrida} · ${z.zona} ${z.vista}: ${z.size ? "tamaño distinto" : `${z.pixels} px`}`);
    assert.deepEqual(malas, [], `${p}: ninguna zona juzgada difiere de su plantilla`);

    // (4) La paleta en su modo y la tipografía, en las dos vistas de cada corrida.
    for (let c = 1; c <= CORRIDAS; c++) {
      for (const v of VISTAS) {
        const t = (informe.tokens ?? []).find((x) => x.corrida === c && x.vista === v);
        assert.ok(t, `${p}: el informe trae los tokens de :root de la corrida ${c} a ${v}`);
        assert.equal(t.iguales, true, `${p} · corrida ${c} · ${v}: los tokens de :root son iguales (distintos: ${(t.distintos ?? []).join(", ")})`);
      }
    }
    total += hay.length;
  }
  assert.equal(total, ZONAS.length * VISTAS.length * CORRIDAS * PALETAS.length, `las dos webs dan ${ZONAS.length * VISTAS.length * CORRIDAS * PALETAS.length} entradas zona·vista·corrida`);
});

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
