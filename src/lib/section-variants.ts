/**
 * section-variants.ts — resolution helpers for the 5-variant section system.
 *
 * Every landing section reads a `variant` field from its Firestore-merged
 * config slice and dispatches to `{section}-v{N}.tsx`. "v1" always means
 * "render the original component untouched", so a missing/unknown value
 * must degrade to "v1" — that is the backwards-compatibility contract for
 * every client deployed before this system existed.
 */

import type { GlobalStyleConfig, SectionVariantValue } from "../types";
import { siteConfig } from "../config/site";

const VALID_VARIANTS: ReadonlySet<string> = new Set([
  "v1",
  "v2",
  "v3",
  "v4",
  "v5",
]);

/**
 * Returns the first candidate that is a valid `SectionVariantValue`,
 * falling back to "v1". Accepts anything (legacy variant strings, numeric
 * splash codes, undefined) so callers can pass raw config fields directly:
 *
 *   const variant = resolveVariant(cfg.variant, cfg.servicesVariant);
 */
export function resolveVariant(
  ...candidates: Array<string | number | undefined | null>
): SectionVariantValue {
  for (const candidate of candidates) {
    if (typeof candidate === "string" && VALID_VARIANTS.has(candidate)) {
      return candidate as SectionVariantValue;
    }
  }
  return "v1";
}

/** The merged global style flags, or an empty object when the client has none. */
export function getGlobalStyle(): GlobalStyleConfig {
  return siteConfig.global ?? {};
}

/**
 * Whether scroll-parallax effects should run. Variants with parallax layers
 * (hero v5, etc.) must check this before wiring scroll listeners. Defaults
 * to true; `prefers-reduced-motion` is handled separately by MotionConfig.
 */
export function isParallaxEnabled(): boolean {
  return siteConfig.global?.parallaxEnabled !== false;
}

/**
 * Whether decorative gradient layers should render. Defaults to true.
 * CSS-only consumers can use `html[data-gs-gradient="false"]` instead.
 */
export function isGradientEnabled(): boolean {
  return siteConfig.global?.gradientEnabled !== false;
}

/**
 * Animation richness for JS-driven effects (auto-scroll carousels, counters).
 * CSS transitions are governed by `data-gs-anim` rules in index.css.
 */
export function getAnimationLevel(): "none" | "subtle" | "rich" {
  return siteConfig.global?.animationLevel ?? "rich";
}

/**
 * Overlay opacity (0–1) for imagery overlays in section variants. Clamped;
 * defaults to the variant's own design value when unset (pass it in).
 */
export function getOverlayOpacity(fallback: number): number {
  const v = siteConfig.global?.overlayOpacity;
  if (typeof v !== "number" || Number.isNaN(v)) return fallback;
  return Math.min(1, Math.max(0, v));
}
