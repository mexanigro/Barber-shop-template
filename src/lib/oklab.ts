/**
 * oklab.ts — conversiones sRGB ↔ OKLab/OKLCH y contraste WCAG. Una sola implementación
 * (Björn Ottosson, FUENTES-COLOR [M7]) para `palette.ts` (T y H) y `tools/gama.mjs`.
 * Puro: sin DOM, sin dependencias.
 */

export type RGB = [number, number, number]; // 0–255
export type Lab = [number, number, number]; // L 0–1, a, b
export interface LCH { L: number; C: number; H: number } // H en grados 0–360

export function hexToRgb(hex: string): RGB {
  const h = hex.trim().replace(/^#/, "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) throw new Error(`hex inválido: ${hex}`);
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex([r, g, b]: RGB): string {
  const c = (v: number) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

const lin = (v: number): number => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const unlin = (v: number): number => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055) * 255;

export function rgbToOklab([r, g, b]: RGB): Lab {
  const R = lin(r), G = lin(g), B = lin(b);
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

/** OKLab → sRGB lineal (sin recortar): permite comprobar el gamut. */
function oklabToLinear([L, a, b]: Lab): [number, number, number] {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

export function oklabInGamut(lab: Lab): boolean {
  return oklabToLinear(lab).every((v) => v >= -0.0005 && v <= 1.0005);
}

export function oklabToRgb(lab: Lab): RGB {
  return oklabToLinear(lab).map((v) => Math.min(255, Math.max(0, unlin(Math.min(1, Math.max(0, v)))))) as RGB;
}

export const hexToOklab = (hex: string): Lab => rgbToOklab(hexToRgb(hex));
export const oklabToHex = (lab: Lab): string => rgbToHex(oklabToRgb(lab));

export function labToLch([L, a, b]: Lab): LCH {
  return { L, C: Math.hypot(a, b), H: ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360 };
}
export function lchToLab({ L, C, H }: LCH): Lab {
  const r = (H * Math.PI) / 180;
  return [L, C * Math.cos(r), C * Math.sin(r)];
}
export const hexToLch = (hex: string): LCH => labToLch(hexToOklab(hex));
export const lchToHex = (lch: LCH): string => oklabToHex(lchToLab(lch));

/** Recorta C hasta que el color entre en sRGB (H y L intactos). */
export function clampChroma(lch: LCH): LCH {
  let C = lch.C;
  while (C > 0 && !oklabInGamut(lchToLab({ ...lch, C }))) C -= 0.002;
  return { ...lch, C: Math.max(0, C) };
}

/** Distancia perceptual ΔE en OKLab (euclídea). */
export const deltaE = (x: Lab, y: Lab): number => Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);

/** Diferencia de tono en grados (0–180). */
export function deltaHue(h1: number, h2: number): number {
  const d = Math.abs(h1 - h2) % 360;
  return d > 180 ? 360 - d : d;
}

/** Mezcla en OKLab: t = 0 → a, t = 1 → b (equivale a `color-mix(in oklab, a (1−t)*100%, b)`). */
export function mixOklab(a: Lab, b: Lab, t: number): Lab {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}
export const mixHex = (a: string, b: string, t: number): string => oklabToHex(mixOklab(hexToOklab(a), hexToOklab(b), t));

// ── WCAG 2.x ──────────────────────────────────────────────────────────────────
export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a), lb = relativeLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}
/** Color resultante de `color` con opacidad `alpha` sobre `over` (mezcla en sRGB, como el navegador). */
export function overlay(color: string, alpha: number, over: string): string {
  const c = hexToRgb(color), o = hexToRgb(over);
  return rgbToHex([0, 1, 2].map((i) => c[i] * alpha + o[i] * (1 - alpha)) as RGB);
}
