import type { HeroObjectConfig, HeroObjectIntensity } from "../types";

/** Linear interpolation between two values. */
export function lerp(start: number, end: number, factor: number): number {
  return start + (end - start) * factor;
}

/** Clamp a value into [min, max]. */
export function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/**
 * Resolve a shadow color.
 *
 *   • `undefined` (default) → black with intensity-driven alpha.
 *     A saturated brand accent on every hero object is too loud, so the
 *     baseline is a neutral drop shadow. Magnitude scales with intensity.
 *   • `"auto"`               → derives from the CSS variable `--brand-accent`.
 *     Opt-in tint for clients who want a branded shadow (e.g. Aurea).
 *   • Any other string       → treated as an explicit CSS color.
 *
 * Returns a CSS color string suitable for embedding inside `drop-shadow`
 * or `box-shadow`.
 */
export function getShadowColor(
  config: HeroObjectConfig | null | undefined,
  intensity?: HeroObjectIntensity,
): string {
  const raw = config?.shadowColor;
  if (raw === "auto") return "var(--brand-accent, rgba(0, 0, 0, 0.45))";
  if (raw) return raw;
  const { shadowAlpha } = getIntensityScales(intensity);
  return `rgba(0, 0, 0, ${shadowAlpha})`;
}

/** Intensity → magnitudes used across HeroObject3D + CTAButton3D. */
export type IntensityScales = {
  /** Max tilt in degrees on each axis. */
  tiltDeg: number;
  /** Levitation amplitude in pixels. */
  levitatePx: number;
  /** Dynamic shadow blur radius in pixels. */
  shadowBlur: number;
  /** Dynamic shadow offset multiplier (px translated per unit of pointer delta). */
  shadowOffsetPx: number;
  /** Drop-shadow alpha (0..1) applied to the shadow color. */
  shadowAlpha: number;
};

const INTENSITY_SCALES: Record<HeroObjectIntensity, IntensityScales> = {
  subtle: {
    tiltDeg: 3,
    levitatePx: 2,
    shadowBlur: 18,
    shadowOffsetPx: 6,
    shadowAlpha: 0.15,
  },
  medium: {
    tiltDeg: 6,
    levitatePx: 4,
    shadowBlur: 28,
    shadowOffsetPx: 10,
    shadowAlpha: 0.25,
  },
  strong: {
    tiltDeg: 8,
    levitatePx: 5,
    shadowBlur: 40,
    shadowOffsetPx: 14,
    shadowAlpha: 0.4,
  },
};

export function getIntensityScales(
  intensity: HeroObjectIntensity | undefined,
): IntensityScales {
  return INTENSITY_SCALES[intensity ?? "medium"];
}
