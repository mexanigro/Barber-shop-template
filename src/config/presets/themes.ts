import type { SiteTheme } from "../../types";

/** Warm metal / amber — matches legacy `index.css` defaults. */
export const presetThemeBarberia: SiteTheme = {
  accent: "#d97706",
  accentLight: "#f59e0b",
  surfaceDark: "#09090b",
};

/**
 * Editorial monochrome (dark-mode values) — matches Tattoo-template-main;
 * live UI tokens for tattoo are applied via `index.css` `html.dark[data-niche="tattoo"]`.
 */
export const presetThemeTattoo: SiteTheme = {
  accent: "#ededed",
  accentLight: "#ffffff",
  surfaceDark: "#050505",
};

/**
 * Rose quartz / plum (light-mode accents) — matches Nails-template-main;
 * full UI tokens live in `index.css` under `html.*[data-niche="nails"]`.
 */
export const presetThemeNails: SiteTheme = {
  accent: "#dca2ac",
  accentLight: "#edc2c9",
  surfaceDark: "#6f4a56",
};

/** Nude rosé — luxury medical aesthetics. */
export const presetThemeEstetica: SiteTheme = {
  accent: "#b08d79",
  accentLight: "#d4b5a5",
  surfaceDark: "#1a1410",
};

/** Trust / corporate blue. */
export const presetThemeAbogado: SiteTheme = {
  accent: "#1d4ed8",
  accentLight: "#93c5fd",
  surfaceDark: "#0a0f1a",
};
