/**
 * palette.ts — derivación de la paleta (SISTEMA-COLOR § 5, pasos 2–4) del documento al código (PALETA-01).
 *
 * Entrada: un color fuente y su porqué. Salida: los seis roles + los tokens shadcn que `index.css`
 * consume bajo `data-niche="peluqueria"`, con los pares WCAG medidos y el porqué viajando con la paleta.
 *
 * Puro: sin DOM, sin dependencias; importable desde el hub (H, Node/Next) y desde `tools/paleta.mjs`.
 * La única dependencia es `./oklab.ts` (misma implementación que `tools/gama.mjs`).
 *
 * Procedimiento (literal de § 5):
 *   2. escala OKLCH de doce pasos con el H de la fuente; neutros C ≤ 0,015 (0,020 en texto/scrim);
 *      acentos con la C de la fuente recortada al gamut sRGB;
 *   3. asignación de roles por paso (constantes STEP_L, ancladas en los ejemplos aprobados A y B);
 *   4. pares WCAG comprobados; si un par falla se mueve L, nunca H, hasta cumplir; scrim nunca negro (R11).
 * Fuente negra/blanca/gris → error explícito: se elige con lógica (§ 5.1), no se deriva una paleta gris.
 */
import { clampChroma, contrastRatio, hexToLch, lchToHex, mixHex, overlay, type LCH } from "./oklab.ts";

export type PaletteOrigin = "logo" | "local" | "instagram" | "eleccion";

export interface PaletteInput {
  /** hex del color fuente (#rrggbb) */
  source: string;
  origin: PaletteOrigin;
  /** el porqué, texto libre obligatorio (mínimo una oración) */
  reason: string;
  /** nicho (la correspondencia de tokens es la de `index.css` para peluquería; otros nichos la heredan) */
  niche: string;
}

export const ROLE_KEYS = ["surface", "surfaceAlt", "text", "textMuted", "accent", "accentStrong", "accentForeground", "highlight", "highlightOnDark", "scrim"] as const;
export const SHADCN_KEYS = ["background", "foreground", "card", "cardForeground", "border", "muted", "mutedForeground", "primary", "primaryForeground", "secondary", "secondaryForeground", "accentLight", "surfaceDark"] as const;
export type RoleKey = (typeof ROLE_KEYS)[number];
export type PaletteColors = Record<RoleKey | (typeof SHADCN_KEYS)[number], string>;

export const CONTRAST_PAIRS = [
  "text/surface", "text/surfaceAlt", "textMuted/surface", "textMuted/surfaceAlt",
  "accentForeground/accentStrong", "highlight/surface", "highlightOnDark/scrim62", "white/scrim62",
] as const;
export type ContrastPair = (typeof CONTRAST_PAIRS)[number];

export interface PaletteMeta { source: string; origin: PaletteOrigin; reason: string; derivedAt: string; niche: string }
export interface PaletteResult { colors: PaletteColors; contrast: Record<ContrastPair, number>; meta: PaletteMeta }

/** Umbral WCAG 1.4.3 para todos los pares (el texto del botón mide 15 px). */
export const MIN_CONTRAST = 4.5;

/** Doce pasos de L (Radix-like [M1]), anclados en los ejemplos aprobados «Hadar» y «Lilach» (§ 5). */
export const STEP_L = [0.975, 0.944, 0.905, 0.865, 0.80, 0.75, 0.65, 0.55, 0.50, 0.44, 0.34, 0.22] as const;
/** Banda de L admitida para el acento decorativo (pasos 8–9 ampliados): fuera de ella se mueve L, no H. */
const ACCENT_L = { min: 0.44, max: 0.60 };
/** Fondo medio sobre el que se evalúa el scrim al 62 % (un fotograma medio; blanco pleno lo mide FUENTES-COLOR). */
const SCRIM_OVER = "#808080";
const SCRIM_ALPHA = 0.62;

const round = (v: number) => Math.round(v * 1000) / 1000;
const hexAt = (L: number, C: number, H: number): string => lchToHex(clampChroma({ L: round(L), C, H }));

/** Baja (o sube) L de `mover` hasta que contrast(mover, fijo) ≥ min. Devuelve el hex ajustado. */
function fitL(lch: LCH, fixed: string, direction: -1 | 1, min = MIN_CONTRAST): string {
  let L = lch.L;
  let hex = hexAt(L, lch.C, lch.H);
  for (let i = 0; i < 200 && contrastRatio(hex, fixed) < min; i++) {
    L += 0.005 * direction;
    if (L <= 0.02 || L >= 0.995) break;
    hex = hexAt(L, lch.C, lch.H);
  }
  return hex;
}

export function derivePalette(input: PaletteInput): PaletteResult {
  const { source, origin, reason, niche } = input;
  if (!reason || reason.trim().split(/\s+/).length < 3) throw new Error("reason obligatorio: el porqué de la paleta, al menos una oración");
  const src = hexToLch(source);
  // Negro, blanco y grises: sin croma no hay tono que derivar (un amarillo puro tiene L 0,97 pero C 0,21: sí sirve).
  if (src.C < 0.03) {
    throw new Error(`color fuente negro/blanco: elegir con lógica (§ 5.1) — ${source} tiene L ${src.L.toFixed(2)} y C ${src.C.toFixed(3)}; un neutro no fija tono`);
  }
  const H = src.H;
  // Croma por familia de rol, proporcional a la de la fuente y con tope (§ 5 paso 2).
  const cNeutral = Math.min(0.015, src.C * 0.25);
  const cText = Math.min(0.02, src.C * 0.25);
  const cMuted = Math.min(0.025, src.C * 0.3);
  const cScrim = Math.min(0.022, src.C * 0.22);
  const cAccent = src.C; // se recorta al gamut en hexAt

  // Paso 3 · roles por paso
  const surface = hexAt(STEP_L[0], Math.min(0.006, cNeutral), H);
  const surfaceAlt = hexAt(STEP_L[1], Math.min(0.011, cNeutral), H);
  const textBase: LCH = { L: STEP_L[11] + 0.01, C: cText, H };
  const mutedBase: LCH = { L: STEP_L[8], C: cMuted, H };
  const accentL = Math.min(ACCENT_L.max, Math.max(ACCENT_L.min, src.L));
  const accent = hexAt(accentL, cAccent, H);
  const accentStrongBase: LCH = { L: accentL - 0.05, C: cAccent, H };
  const highlightBase: LCH = { L: STEP_L[9], C: cAccent * 0.92, H };
  const highlightOnDarkBase: LCH = { L: STEP_L[3], C: Math.min(0.05, cAccent * 0.5), H };
  const scrim = hexAt(STEP_L[11] - 0.015, Math.max(0.01, cScrim), H); // nunca #000 (R11)
  const accentForeground = surface;

  // Paso 4 · pares WCAG: se mueve L, nunca H
  const text = fitL(textBase, surfaceAlt, -1);
  const textMuted0 = fitL(mutedBase, surface, -1);
  const textMuted = fitL(hexToLch(textMuted0), surfaceAlt, -1);
  const accentStrong = fitL(accentStrongBase, accentForeground, -1);
  const highlight = fitL(highlightBase, surface, -1);
  const scrim62 = overlay(scrim, SCRIM_ALPHA, SCRIM_OVER);
  const highlightOnDark = fitL(highlightOnDarkBase, scrim62, +1);

  const roles = { surface, surfaceAlt, text, textMuted, accent, accentStrong, accentForeground, highlight, highlightOnDark, scrim };
  // Tokens shadcn con la correspondencia de index.css (html.light[data-niche="peluqueria"])
  const colors: PaletteColors = {
    ...roles,
    background: surface,
    foreground: text,
    card: mixHex(surface, "#ffffff", 0.4), // --card: color-mix(in oklab, var(--surface) 60%, white)
    cardForeground: text,
    border: mixHex(surfaceAlt, text, 0.1), // --border: color-mix(in oklab, var(--surface-alt) 90%, var(--text))
    muted: surfaceAlt,
    mutedForeground: textMuted,
    primary: accentStrong,
    primaryForeground: accentForeground,
    secondary: surfaceAlt,
    secondaryForeground: text,
    accentLight: mixHex(accent, surface, 0.3), // --brand-accent-light: color-mix(in oklab, var(--brand-accent) 70%, var(--surface))
    surfaceDark: scrim, // --brand-surface-dark: var(--scrim)
  };
  const contrast: Record<ContrastPair, number> = {
    "text/surface": r(contrastRatio(text, surface)),
    "text/surfaceAlt": r(contrastRatio(text, surfaceAlt)),
    "textMuted/surface": r(contrastRatio(textMuted, surface)),
    "textMuted/surfaceAlt": r(contrastRatio(textMuted, surfaceAlt)),
    "accentForeground/accentStrong": r(contrastRatio(accentForeground, accentStrong)),
    "highlight/surface": r(contrastRatio(highlight, surface)),
    "highlightOnDark/scrim62": r(contrastRatio(highlightOnDark, scrim62)),
    "white/scrim62": r(contrastRatio("#ffffff", scrim62)),
  };
  return { colors, contrast, meta: { source: source.toLowerCase(), origin, reason: reason.trim(), derivedAt: new Date().toISOString(), niche } };
}

const r = (v: number) => Math.round(v * 100) / 100;

/** Pares que no llegan al mínimo (vacío = paleta válida). */
export function failingPairs(result: PaletteResult, min = MIN_CONTRAST): ContrastPair[] {
  return CONTRAST_PAIRS.filter((p) => result.contrast[p] < min);
}
