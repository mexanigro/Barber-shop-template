// CIERRE-TRAMO-01 · C4 (T) · la preferencia de menos movimiento del visitante gana sobre la velocidad de transiciones de la casilla.
// Sesión A (2026-10-03): test rojo.
//
// c3 de la verificadora de CONTACTO-PIE-01: la casilla de estilo global del hub escribe `global.transitionSpeed` → `<html
// data-gs-speed="slow">`, cuya regla (`src/index.css`, `transition-duration: 600ms !important`) va DESPUÉS de la de
// `prefers-reduced-motion: reduce` (`0.01ms !important`): quien pidió menos movimiento recibe 0,6 s. «fast» (150 ms) es el mismo
// defecto. Alcanza a todos los nichos, así que además la firma de los seis sin reduced-motion no tiene que cambiar.
// Cómo se mide: `instrumentos/movimiento.mjs` (de A) carga la home a 375 y, con y sin la preferencia (`emulateMedia`) y sin velocidad o
// con cada una de las tres (el atributo que escribe la casilla), cuenta las duraciones de transición y de animación computadas de cada
// elemento y de su `::before`/`::after`. Las páginas: la plantilla A (`conPlantillas`), barbería (`conNicho`) y los seis nichos en un clon
// del commit rojo y en HEAD (como D1 de CONTACTO-PIE-01). Primera aserción: la plantilla A con reduced-motion y «slow» (hoy 600 ms).
// Sólo en T (inciso n). Nada sale a la red (el material y el mapa los responde `_nav.mjs`); no escribe fuera de su carpeta temporal.
import { test } from "node:test";
import assert from "node:assert/strict";
import { SEIS, ROOT, clonDe, conNicho, conPlantillas, conTemporalAsync, instrumento, quitarEnlace, rojoDeEstaOrden, type Urls } from "./_comun.ts";

type Hist = Record<string, number>;
type Medida = { etiqueta: string; elementos: number; medidas: Record<string, { transicion: Hist; animacion: Hist }> };

/** Milisegundos de una duración computada («0.6s», «1e-05s», «150ms», o una lista «0s, 0.3s»): la mayor. */
const ms = (d: string) => Math.max(...d.split(",").map((x) => { const t = x.trim(); const n = parseFloat(t); return t.endsWith("ms") ? n : n * 1000; }));
const UNA_CENTESIMA = 0.0100001;

async function medir(base: string, urls: Urls, url: string, etiqueta: string): Promise<Medida> {
  const r = await instrumento("movimiento.mjs", [url, etiqueta], urls, base, 5);
  assert.equal(r.status, 0, `movimiento.mjs ${etiqueta}: exit ${r.status}\n${r.out.slice(-800)}`);
  return JSON.parse(r.stdout.trim().split(/\r?\n/).pop() ?? "{}") as Medida;
}
/** Las dos direcciones sobre una página: con reduced-motion ninguna transición pasa de 0,01 ms; sin ella, «slow» 600 y «fast» 150. */
function reglas(m: Medida) {
  for (const v of ["slow", "fast"]) {
    const largas = Object.entries(m.medidas[`reduce|${v}`].transicion).filter(([d]) => ms(d) > UNA_CENTESIMA);
    assert.deepEqual(largas, [], `${m.etiqueta}: con prefers-reduced-motion y data-gs-speed="${v}", ninguna transición pasa de 0,01 ms (hay ${largas.map(([d, n]) => `${n} con ${d}`).join(", ")})`);
  }
  // Sin la preferencia, las dos velocidades siguen actuando, sobre los mismos elementos. (No «todos»: medido sobre la plantilla A, el
  // selector `html[data-gs-speed] *` no alcanza al propio `<html>`, y 3 de 794 quedan con su duración: 791 con 600 ms y 791 con 150.)
  const cuantos = (v: string, esperado: number) => Object.entries(m.medidas[`no-preference|${v}`].transicion).filter(([d]) => Math.abs(ms(d) - esperado) <= 0.001).reduce((s, [, n]) => s + n, 0);
  const lentos = cuantos("slow", 600), rapidos = cuantos("fast", 150);
  assert.ok(lentos > 0 && lentos === rapidos, `${m.etiqueta}: sin reduced-motion, data-gs-speed="slow" da 600 ms y "fast" 150 ms a los mismos elementos (600 ms: ${lentos}; 150 ms: ${rapidos})`);
}
/** La firma sin reduced-motion: qué duraciones de transición y de animación hay, sin velocidad y con cada una. */
const firma = (m: Medida) => Object.fromEntries(Object.entries(m.medidas).filter(([k]) => k.startsWith("no-preference|")).map(([k, v]) => [k, { transicion: Object.keys(v.transicion).sort(), animacion: Object.keys(v.animacion).sort() }]));

test("la preferencia de menos movimiento del visitante gana sobre la velocidad de transiciones de la casilla: con `prefers-reduced-motion: reduce` y `<html data-gs-speed>` en «slow» o «fast», ningún elemento de la página —ni su `::before` ni su `::after`— tiene una transición de más de 0,01 ms, en la plantilla A y en barbería; sin esa preferencia, «slow» sigue dando 600 ms y «fast» 150 ms, a los mismos elementos; y en la home de los seis nichos de la flota sin esa preferencia las duraciones de transición y de animación, con cada velocidad y sin ninguna, son las mismas en el árbol del commit rojo que en HEAD", async () => {
  await conTemporalAsync(async (base) => {
    // (1) La plantilla A. Hoy, con reduced-motion y «slow», 600 ms: aquí está el rojo.
    const a = await conPlantillas(base, (u) => medir(base, u, u.a, "plantilla A"));
    reglas(a);
    // (2) Un nicho de la flota.
    reglas(await conNicho(ROOT, "barberia", base, (u) => medir(base, { a: u, c: u }, u, "barberia")));
    // (3) Los seis, sin reduced-motion: la misma firma en el árbol rojo y en HEAD.
    const rojo = rojoDeEstaOrden();
    assert.ok(rojo, "el commit rojo de esta orden (el último que añade su HOJA.md)");
    const clon = clonDe(base, "rojo", rojo);
    try {
      for (const nicho of SEIS) {
        const antes = firma(await conNicho(clon, nicho, base, (u) => medir(base, { a: u, c: u }, u, `${nicho} rojo`)));
        const ahora = firma(await conNicho(ROOT, nicho, base, (u) => medir(base, { a: u, c: u }, u, `${nicho} HEAD`)));
        assert.deepEqual(ahora, antes, `${nicho}: sin reduced-motion, las duraciones de transición y de animación son las mismas en el rojo (${rojo.slice(0, 7)}) que en HEAD`);
      }
    } finally { quitarEnlace(clon); }
  });
});
