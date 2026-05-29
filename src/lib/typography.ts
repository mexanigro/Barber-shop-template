/**
 * typography.ts — Multi-language font stacks for the Velvet Muse Hero
 * and other rich-typography surfaces.
 *
 * Each language ships with a paired (serif, sans) duet that respects the
 * script's tradition AND keeps the same editorial cadence:
 *
 *   • en / ru → Cormorant Garamond + Inter   (Latin / Cyrillic both supported)
 *   • he      → Frank Ruhl Libre + Heebo     (Hebrew)
 *   • ar      → Amiri + Cairo                (Arabic)
 *
 * Cormorant Garamond carries Latin and Cyrillic natively, so en + ru share
 * the same stack — no need to swap families for Russian. Hebrew + Arabic
 * each get a dedicated stack because Cormorant has no glyph coverage for
 * those scripts (you'd get Times-fallback rendering, which kills the
 * editorial feel).
 *
 * Usage:
 *
 *   const fonts = getTypography(localeConfig.lang);
 *   // → { serifFamily: '"Cormorant Garamond", serif', sansFamily: '"Inter", …' }
 *
 * Or apply via CSS variables on a wrapper:
 *
 *   <div style={{ '--font-serif-hero': fonts.serifFamily, … }}>
 *
 * The Hero variant reads these variables to render the title + eyebrow in
 * the correct family per language without conditionals in the JSX.
 *
 * NOTE: the actual `<link>` tags that load Frank Ruhl Libre, Heebo, Amiri
 * and Cairo from Google Fonts live in `index.html`. Cormorant + Inter
 * are already imported via `src/index.css`.
 */

import type { CSSProperties } from "react";
import type { UiLanguage } from "../config/uiLanguage";

export type LanguageFontStack = {
  /** Full CSS `font-family` value for the editorial serif used in titles. */
  serifFamily: string;
  /** Full CSS `font-family` value for the body sans used in copy + UI. */
  sansFamily: string;
  /** Optional italic family override (some scripts need a different family for italics). */
  italicFamily?: string;
  /**
   * Used to tune title sizes per script — Hebrew/Arabic often render larger
   * x-heights, so a multiplier <1 keeps optical balance. 1 = no change.
   */
  titleSizeMultiplier: number;
};

const STACKS: Record<UiLanguage, LanguageFontStack> = {
  en: {
    serifFamily: '"Cormorant Garamond", "Times New Roman", serif',
    sansFamily: '"Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
    titleSizeMultiplier: 1,
  },
  ru: {
    // Cormorant Garamond supports Cyrillic — keeps the Latin/Cyrillic cadence consistent.
    serifFamily: '"Cormorant Garamond", "Times New Roman", serif',
    sansFamily: '"Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
    titleSizeMultiplier: 1,
  },
  he: {
    // Frank Ruhl Libre = the editorial Hebrew serif; Heebo = modern Hebrew sans.
    serifFamily: '"Frank Ruhl Libre", "David", "Times New Roman", serif',
    sansFamily: '"Heebo", "Arial Hebrew", -apple-system, sans-serif',
    // Hebrew has no true italic — slight tracking variation handled in component.
    titleSizeMultiplier: 0.92,
  },
  ar: {
    // Amiri = classical Arabic serif; Cairo = modern Arabic sans.
    serifFamily: '"Amiri", "Traditional Arabic", "Times New Roman", serif',
    sansFamily: '"Cairo", "Tahoma", -apple-system, sans-serif',
    titleSizeMultiplier: 0.92,
  },
};

/** Look up the font stack for the active UI language. Defaults to `en`. */
export function getTypography(language: UiLanguage | string | undefined): LanguageFontStack {
  if (!language) return STACKS.en;
  return STACKS[language as UiLanguage] ?? STACKS.en;
}

/**
 * Returns inline CSS variables you can spread onto any wrapper element so
 * its descendants pick up the correct serif/sans/italic families via
 * `font-family: var(--font-serif-hero)` / `var(--font-sans-hero)`.
 *
 * Kept as a function (not a hook) because it has no React state and can
 * be called from server/SSR contexts as well as event handlers.
 */
export function getTypographyCssVars(language: UiLanguage | string | undefined): CSSProperties {
  const fonts = getTypography(language);
  return {
    // Cast through `unknown` so React's CSSProperties accepts custom props.
    ...(({
      "--font-serif-hero": fonts.serifFamily,
      "--font-sans-hero": fonts.sansFamily,
      "--font-italic-hero": fonts.italicFamily ?? fonts.serifFamily,
      "--hero-title-scale": String(fonts.titleSizeMultiplier),
    } as unknown) as CSSProperties),
  };
}
