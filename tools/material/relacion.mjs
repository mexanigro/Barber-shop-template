/**
 * relacion.mjs — CONEXION-09 (D-92 (2)): la aritmética de la transición hero → fondo (R19, SISTEMA-COLOR § 3), pura y sola.
 * Estaba dentro de `transicion.mjs`, que para medir el material levanta Chromium; aquí no hay medida, sólo los números, así que
 * el guard `tests/transicion.test.ts` puede correr en la fase concurrente `test:unit` (D-57). Los umbrales y los redondeos son
 * los mismos, sin tocar un dígito.
 *
 *   same-hue                 ΔH ≤ 10° y ΔL ≤ 0,10   → veil-from-first-pixel
 *   same-hue-different-light ΔH ≤ 10° y ΔL > 0,10   → scrim-dies-into-photo
 *   adjacent-hue             ΔH ≤ 35°               → veil-from-first-pixel
 *   —                        fuera de los tres casos: `relation` es null y el clip y la foto no valen juntos (D-92 (3): no se
 *                            inventa ninguna relación; `transicion.mjs --escribir` no escribe nada y sale 1).
 *
 * Con croma < 0,01 en el pie o en la foto el tono no se juzga: `neutro` y ΔH 0.
 */
import { lchToHex } from "../../src/lib/oklab.ts";

/** Croma por debajo del cual un tono no se juzga. */
export const NEUTRO_C = 0.01;
/** Los dos umbrales de tono y el de luz (CONTRATOS-HUECOS § Transición hero → fondo). */
export const MISMO_TONO = 10, TONO_VECINO = 35, MISMA_LUZ = 0.1;

/** Media de dos medidas OKLCH del mismo pie, redondeada como la escribe el fixture (L y C a 3, H el del primer fotograma). */
export const medioLch = (a, b) => ({ L: +((a.L + b.L) / 2).toFixed(3), C: +((a.C + b.C) / 2).toFixed(3), H: a.H });
/** `{ hex, L, C, H }` de una medida OKLCH: lo que `foot` y `footPortrait` guardan.
 *  @param {{ L: number, C: number, H: number }} m @returns {{ hex: string, L: number, C: number, H: number }} */
export const pieDe = (m) => ({ hex: lchToHex(m), ...m });

/**
 * @typedef {{ L: number, C: number, H: number }} Lch   medida OKLCH de una superficie
 * @typedef {{ hex: string, L: number, C: number, H: number }} Pie   lo que `foot` y `footPortrait` guardan
 */
/**
 * Relación entre el pie del clip del hero y el tono dominante de la foto del local.
 * @param {Lch} pie medida OKLCH del pie del clip 16:9 (media de los dos fotogramas)
 * @param {Lch} foto medida OKLCH de la foto del local
 * @param {Lch} [piePortrait] medida OKLCH del pie del clip 9:16, si lo hay
 * @returns {{ dH: number, dL: number, neutro: boolean, relation: string|null, mechanism: string, foot: Pie, footPortrait: Pie|null }}
 */
export function relacionHeroFondo(pie, foto, piePortrait) {
  const dHraw = Math.abs(((pie.H - foto.H + 540) % 360) - 180);
  const neutro = pie.C < NEUTRO_C || foto.C < NEUTRO_C;
  const dH = neutro ? 0 : +dHraw.toFixed(0);
  const dL = +Math.abs(pie.L - foto.L).toFixed(3);
  const relation = dH <= MISMO_TONO ? (dL <= MISMA_LUZ ? "same-hue" : "same-hue-different-light") : dH <= TONO_VECINO ? "adjacent-hue" : null;
  const mechanism = relation === "same-hue-different-light" ? "scrim-dies-into-photo" : "veil-from-first-pixel";
  return { dH, dL, neutro, relation, mechanism, foot: pieDe(pie), footPortrait: piePortrait ? pieDe(piePortrait) : null };
}
