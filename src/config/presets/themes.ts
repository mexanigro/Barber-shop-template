import type { BusinessNiche, LandingSectionId, SiteTheme, ThemeDefinition, ThemeId } from "../../types";
import { env } from "../env";

/* ═══════════════════════════════════════════════════════════════════════════
 * THEME REGISTRY
 *
 * 12 visual themes across 4 niches (3 per niche). The first theme in each
 * niche is the "default" — it matches the pre-theme visual identity and does
 * NOT set `data-theme` on <html>. Non-default themes set `data-theme` so
 * their CSS token blocks in index.css activate.
 *
 *
 * Each theme stores only metadata + a Google Fonts URL for runtime loading.
 * All visual tokens (colors, headings, radius, shadows) live in index.css.
 * ═══════════════════════════════════════════════════════════════════════════ */

/* ── Legacy SiteTheme presets (still used by NichePreset.theme field) ──── */

/** Warm metal / amber — matches legacy `index.css` defaults. */
export const presetThemeBarberia: SiteTheme = {
  accent: "#d97706",
  accentLight: "#f59e0b",
  surfaceDark: "#09090b",
};

export const presetThemeTattoo: SiteTheme = {
  accent: "#ededed",
  accentLight: "#ffffff",
  surfaceDark: "#050505",
};

export const presetThemeNails: SiteTheme = {
  accent: "#dca2ac",
  accentLight: "#edc2c9",
  surfaceDark: "#6f4a56",
};

export const presetThemeEstetica: SiteTheme = {
  accent: "#b08d79",
  accentLight: "#d4b5a5",
  surfaceDark: "#1a1410",
};

export const presetThemeCafeteria: SiteTheme = {
  accent: "#D4A574",
  accentLight: "#c49468",
  surfaceDark: "#2C1810",
};

export const presetThemeRemodelaciones: SiteTheme = {
  accent: "#3b82f6",
  accentLight: "#60a5fa",
  surfaceDark: "#0f172a",
};

/* ── Default section order (matches the hardcoded order pre-theme) ────── */
export const CAFETERIA_SECTION_ORDER: LandingSectionId[] = [
  "hero",
  "philosophy",
  "menu",
  "process",
  "ambience",
  "team",
  "testimonials",
  "faq",
  "instagram",
  "contactHub",
];

export const REMODELACIONES_SECTION_ORDER: LandingSectionId[] = [
  "hero",
  "services",
  "portfolio",
  "process",
  "whyChooseUs",
  "testimonials",
  "faq",
  "contactHub",
];

export const DEFAULT_SECTION_ORDER: LandingSectionId[] = [
  "hero",
  "services",
  "whyChooseUs",
  "team",
  "gallery",
  "testimonials",
  "faq",
  "instagram",
  "contactHub",
];

/* ── Google Fonts URLs ────────────────────────────────────────────────── */

// Default niche fonts (already loaded by niche CSS or JS)
const TATTOO_FONTS =
  "https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700;900&family=UnifrakturMaguntia&family=Montserrat+Alternates:ital,wght@0,300;0,400;0,500;0,600;0,700;0,900;1,400&display=swap";
const NAILS_FONTS =
  "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500;1,600;1,700&family=Great+Vibes&family=Lato:ital,wght@0,300;0,400;0,700;1,300;1,400;1,700&display=swap";
const ESTETICA_FONTS =
  "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap";

const CAFETERIA_FONTS =
  "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;0,9..144,700;1,9..144,300;1,9..144,400&family=Outfit:wght@200;300;400;500;600;700&display=swap";
const REMODELACIONES_FONTS =
  "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Poppins:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&display=swap";

// Non-default theme fonts
const BARBERIA_URBAN_FONTS =
  "https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Space+Grotesk:wght@400;500;600;700&display=swap";
const BARBERIA_VINTAGE_FONTS =
  "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,800;1,400&family=Source+Sans+3:ital,wght@0,300;0,400;0,600;0,700;1,400&display=swap";
const TATTOO_NEO_FONTS =
  "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap";
const TATTOO_FINELINE_FONTS =
  "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&family=Outfit:wght@200;300;400;500;600;700&display=swap";
const NAILS_LAVENDER_FONTS =
  "https://fonts.googleapis.com/css2?family=Italiana&family=Raleway:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap";
const NAILS_NOIR_FONTS =
  "https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,wght@0,400;0,700;1,400&family=Montserrat:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap";
const ESTETICA_FROST_FONTS =
  "https://fonts.googleapis.com/css2?family=Nunito+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=Tenor+Sans&display=swap";
const ESTETICA_BOTANICAL_FONTS =
  "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,600;0,9..144,700;1,9..144,400&family=Outfit:wght@200;300;400;500;600&display=swap";

/* ── Theme Definitions ────────────────────────────────────────────────── */

export const THEME_REGISTRY: Record<ThemeId, ThemeDefinition> = {
  /* ── Barbería ──────────────────────────────────────────────────────── */
  "barberia-classic": {
    id: "barberia-classic",
    name: "Classic",
    niche: "barberia",
    isDefault: true,
    googleFontsUrl: "", // Inter + Cormorant in CSS @import
    sectionOrder: DEFAULT_SECTION_ORDER,
  },
  "barberia-urban": {
    id: "barberia-urban",
    name: "Urban",
    niche: "barberia",
    isDefault: false,
    googleFontsUrl: BARBERIA_URBAN_FONTS,
    sectionOrder: [
      "hero", "team", "services", "testimonials",
      "whyChooseUs", "gallery", "instagram",
      "contactHub",
    ],
  },
  "barberia-vintage": {
    id: "barberia-vintage",
    name: "Vintage",
    niche: "barberia",
    isDefault: false,
    googleFontsUrl: BARBERIA_VINTAGE_FONTS,
    sectionOrder: [
      "hero", "services", "team", "gallery",
      "whyChooseUs", "testimonials", "instagram",
      "contactHub",
    ],
  },

  /* ── Tattoo ────────────────────────────────────────────────────────── */
  "tattoo-ink": {
    id: "tattoo-ink",
    name: "Ink",
    niche: "tattoo",
    isDefault: true,
    googleFontsUrl: TATTOO_FONTS,
    sectionOrder: DEFAULT_SECTION_ORDER,
  },
  "tattoo-neo-traditional": {
    id: "tattoo-neo-traditional",
    name: "Neo-Traditional",
    niche: "tattoo",
    isDefault: false,
    googleFontsUrl: TATTOO_NEO_FONTS,
    sectionOrder: [
      "hero", "services", "team", "gallery",
      "testimonials", "whyChooseUs", "instagram",
      "contactHub",
    ],
  },
  "tattoo-fine-line": {
    id: "tattoo-fine-line",
    name: "Fine Line",
    niche: "tattoo",
    isDefault: false,
    googleFontsUrl: TATTOO_FINELINE_FONTS,
    sectionOrder: [
      "hero", "team", "services", "gallery",
      "whyChooseUs", "testimonials", "instagram",
      "contactHub",
    ],
  },

  /* ── Nails ─────────────────────────────────────────────────────────── */
  "nails-rose": {
    id: "nails-rose",
    name: "Rosé",
    niche: "nails",
    isDefault: true,
    googleFontsUrl: NAILS_FONTS,
    sectionOrder: DEFAULT_SECTION_ORDER,
  },
  "nails-lavender": {
    id: "nails-lavender",
    name: "Lavender",
    niche: "nails",
    isDefault: false,
    googleFontsUrl: NAILS_LAVENDER_FONTS,
    sectionOrder: [
      "hero", "services", "team", "gallery",
      "testimonials", "whyChooseUs", "instagram",
      "contactHub",
    ],
  },
  "nails-noir": {
    id: "nails-noir",
    name: "Noir",
    niche: "nails",
    isDefault: false,
    googleFontsUrl: NAILS_NOIR_FONTS,
    sectionOrder: [
      "hero", "services", "whyChooseUs", "team",
      "testimonials", "gallery", "instagram",
      "contactHub",
    ],
  },

  /* ── Estética ──────────────────────────────────────────────────────── */
  "estetica-lumiere": {
    id: "estetica-lumiere",
    name: "Lumière",
    niche: "estetica",
    isDefault: true,
    googleFontsUrl: ESTETICA_FONTS,
    sectionOrder: DEFAULT_SECTION_ORDER,
  },
  "estetica-frost": {
    id: "estetica-frost",
    name: "Frost",
    niche: "estetica",
    isDefault: false,
    googleFontsUrl: ESTETICA_FROST_FONTS,
    sectionOrder: [
      "hero", "services", "team", "whyChooseUs",
      "gallery", "testimonials", "instagram",
      "contactHub",
    ],
  },
  "estetica-botanical": {
    id: "estetica-botanical",
    name: "Botanical",
    niche: "estetica",
    isDefault: false,
    googleFontsUrl: ESTETICA_BOTANICAL_FONTS,
    sectionOrder: [
      "hero", "services", "whyChooseUs", "team",
      "gallery", "testimonials", "instagram",
      "contactHub",
    ],
  },

  /* ── Cafetería ───────────────────────────────────────────────────── */
  "cafeteria-warm": {
    id: "cafeteria-warm",
    name: "Warm",
    niche: "cafeteria",
    isDefault: true,
    googleFontsUrl: CAFETERIA_FONTS,
    sectionOrder: CAFETERIA_SECTION_ORDER,
  },
  "cafeteria-matcha": {
    id: "cafeteria-matcha",
    name: "Matcha",
    niche: "cafeteria",
    isDefault: false,
    googleFontsUrl: CAFETERIA_FONTS,
    sectionOrder: CAFETERIA_SECTION_ORDER,
  },
  "cafeteria-mocha": {
    id: "cafeteria-mocha",
    name: "Mocha",
    niche: "cafeteria",
    isDefault: false,
    googleFontsUrl: CAFETERIA_FONTS,
    sectionOrder: CAFETERIA_SECTION_ORDER,
  },

  /* ── Remodelaciones ──────────────────────────────────────────────── */
  "remodelaciones-pro": {
    id: "remodelaciones-pro",
    name: "Pro",
    niche: "remodelaciones",
    isDefault: true,
    googleFontsUrl: REMODELACIONES_FONTS,
    sectionOrder: REMODELACIONES_SECTION_ORDER,
  },
  "remodelaciones-slate": {
    id: "remodelaciones-slate",
    name: "Slate",
    niche: "remodelaciones",
    isDefault: false,
    googleFontsUrl: REMODELACIONES_FONTS,
    sectionOrder: REMODELACIONES_SECTION_ORDER,
  },
  "remodelaciones-earth": {
    id: "remodelaciones-earth",
    name: "Earth",
    niche: "remodelaciones",
    isDefault: false,
    googleFontsUrl: REMODELACIONES_FONTS,
    sectionOrder: REMODELACIONES_SECTION_ORDER,
  },
};

/** Maps each niche to its default ThemeId. */
const DEFAULT_THEME_IDS: Partial<Record<BusinessNiche, ThemeId>> = {
  barberia: "barberia-classic",
  tattoo: "tattoo-ink",
  nails: "nails-rose",
  estetica: "estetica-lumiere",
  cafeteria: "cafeteria-warm",
  remodelaciones: "remodelaciones-pro",
};

/**
 * Returns the active theme definition.
 *
 * Priority: `VITE_THEME` env var  →  `configTheme` (from `siteConfig.activeTheme`)  →  niche default.
 * The env var is a dev/testing override; production deployments set the theme
 * in code (`BASE_CONFIG.activeTheme` in site.ts) or via Firestore
 * (`config/{clientId}.activeTheme`).
 *
 * Returns `undefined` for niches without a theme system.
 */
export function getActiveTheme(configTheme?: string): ThemeDefinition | undefined {
  const niche = env.activeNiche;
  // env var wins (dev override), then code/Firestore config
  const themeId = env.activeTheme ?? configTheme;

  // Explicit theme selection — validate niche match
  if (themeId && themeId in THEME_REGISTRY) {
    const theme = THEME_REGISTRY[themeId as ThemeId];
    if (theme.niche === niche) {
      return theme;
    }
    if (typeof console !== "undefined") {
      console.warn(
        `[theme] "${themeId}" belongs to niche "${theme.niche}" but active niche is "${niche}". Falling back to default.`,
      );
    }
  }

  // Default theme for this niche
  const defaultId = DEFAULT_THEME_IDS[niche];
  if (defaultId) {
    return THEME_REGISTRY[defaultId];
  }

  // No theme system for this niche
  return undefined;
}

/** Returns all theme definitions for a given niche. */
export function getThemesForNiche(niche: BusinessNiche): ThemeDefinition[] {
  return Object.values(THEME_REGISTRY).filter((t) => t.niche === niche);
}
