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

/** Clinical spa teal. */
export const presetThemeEstetica: SiteTheme = {
  accent: "#0d9488",
  accentLight: "#5eead4",
  surfaceDark: "#050a09",
};

/** Trust / corporate blue. */
export const presetThemeAbogado: SiteTheme = {
  accent: "#1d4ed8",
  accentLight: "#93c5fd",
  surfaceDark: "#0a0f1a",
};
