import type { BusinessNiche, LandingSectionId, SiteTheme } from "../../types";

/* ═══════════════════════════════════════════════════════════════════════════
 * NICHE DEFAULTS
 *
 * The theme system (THEME_REGISTRY, ThemeDefinition, data-theme CSS blocks)
 * has been eliminated. Branding is now 100% client-configurable via
 * Firestore `config/{clientId}.branding`.
 *
 * This file keeps:
 *   - SiteTheme colour presets per niche (used by NichePreset.theme)
 *   - Section ordering constants (used by App.tsx)
 *   - Default Google Fonts URLs per niche
 * ═══════════════════════════════════════════════════════════════════════════ */

/* ── Legacy SiteTheme presets (still used by NichePreset.theme field) ──── */

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

export const presetThemeEmployment: SiteTheme = {
  accent: "#E8820C",
  accentLight: "#F5A623",
  surfaceDark: "#0C1222",
};

/* ── Section order constants ─────────────────────────────────────────── */

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

export const EMPLOYMENT_SECTION_ORDER: LandingSectionId[] = [
  "hero",
  "howItWorks",
  "jobCategories",
  "employmentForm",
  "whyChooseUs",
  "faq",
  "contactHub",
];

export const NICHE_DEFAULT_SECTION_ORDER: Record<BusinessNiche, LandingSectionId[]> = {
  barberia: DEFAULT_SECTION_ORDER,
  tattoo: DEFAULT_SECTION_ORDER,
  nails: DEFAULT_SECTION_ORDER,
  estetica: DEFAULT_SECTION_ORDER,
  cafeteria: CAFETERIA_SECTION_ORDER,
  remodelaciones: REMODELACIONES_SECTION_ORDER,
  employment: EMPLOYMENT_SECTION_ORDER,
};

/* ── Default Google Fonts URLs per niche ─────────────────────────────── */

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
const EMPLOYMENT_FONTS =
  "https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=Rubik:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&display=swap";

export const NICHE_DEFAULT_FONTS: Record<BusinessNiche, string> = {
  barberia: "",
  tattoo: TATTOO_FONTS,
  nails: NAILS_FONTS,
  estetica: ESTETICA_FONTS,
  cafeteria: CAFETERIA_FONTS,
  remodelaciones: REMODELACIONES_FONTS,
  employment: EMPLOYMENT_FONTS,
};
