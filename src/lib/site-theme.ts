import { siteConfig } from "../config/site";
import { NICHE_DEFAULT_FONTS } from "../config/presets/themes";

function ensureThemeFonts(url: string, key: string): void {
  if (typeof document === "undefined") return;
  const existing = document.querySelector(`link[data-theme-fonts="${key}"]`);
  if (existing) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = url;
  link.setAttribute("data-theme-fonts", key);
  document.head.appendChild(link);
}

const BRANDING_COLOR_MAP: Record<string, string> = {
  accent: "--brand-accent",
  accentLight: "--brand-accent-light",
  surfaceDark: "--brand-surface-dark",
  background: "--background",
  foreground: "--foreground",
  card: "--card",
  cardForeground: "--card-foreground",
  border: "--border",
  muted: "--muted",
  mutedForeground: "--muted-foreground",
  primary: "--primary",
  primaryForeground: "--primary-foreground",
  secondary: "--secondary",
  secondaryForeground: "--secondary-foreground",
};

const ALL_BRANDING_CSS_VARS = Object.values(BRANDING_COLOR_MAP);

// Maps raw CSS vars to their Tailwind v4 @theme aliases.
// Tailwind v4 resolves `bg-background` to `var(--color-background)`, not
// `var(--background)`.  The @theme aliases are computed once at :root and
// inherited as resolved values, so overriding `--background` on a child
// element alone won't propagate to Tailwind utilities.  We must also
// set the `--color-*` counterparts.
const THEME_COLOR_ALIAS: Record<string, string> = {
  "--background": "--color-background",
  "--foreground": "--color-foreground",
  "--muted": "--color-muted",
  "--muted-foreground": "--color-muted-foreground",
  "--card": "--color-card",
  "--card-foreground": "--color-card-foreground",
  "--border": "--color-border",
  "--primary": "--color-primary",
  "--primary-foreground": "--color-primary-foreground",
  "--secondary": "--color-secondary",
  "--secondary-foreground": "--color-secondary-foreground",
  "--brand-accent": "--color-accent",
  "--brand-accent-light": "--color-accent-light",
  "--brand-surface-dark": "--color-surface-dark",
};

const LIGHT_DEFAULT_NICHES = ["estetica", "nails"];

let _splashVars: Record<string, string> = {};

/**
 * Returns CSS variable overrides snapshotted from the niche's default mode.
 * Used by SplashScreen to render in the original branding colors regardless
 * of the user's dark/light toggle preference.
 */
export function getSplashVars(): Record<string, string> {
  return _splashVars;
}

/**
 * Returns the niche's default display mode.
 */
export function getNicheDefaultMode(): "dark" | "light" {
  return LIGHT_DEFAULT_NICHES.includes(siteConfig.business.type)
    ? "light"
    : "dark";
}

interface CachedTheme {
  accent: string;
  accentLight: string;
  surfaceDark: string;
}

let _cachedTheme: CachedTheme | null = null;
let _cachedBrandingColors: Record<string, string> | null = null;

/**
 * Sets `data-niche` on `<html>`, loads niche-default fonts, and applies
 * brand colour / typography overrides from `siteConfig.branding` (Firestore).
 *
 * Called once during bootstrap in `main.tsx`, after tenant config is merged.
 */
export function applySiteThemeCssVars(): void {
  if (typeof document === "undefined") return;

  const root = document.documentElement;

  root.setAttribute("data-niche", siteConfig.business.type);

  const nicheFonts = NICHE_DEFAULT_FONTS[siteConfig.business.type];
  if (nicheFonts) {
    ensureThemeFonts(nicheFonts, `niche-${siteConfig.business.type}`);
  }

  _cachedTheme = siteConfig.theme
    ? {
        accent: siteConfig.theme.accent,
        accentLight: siteConfig.theme.accentLight,
        surfaceDark: siteConfig.theme.surfaceDark,
      }
    : null;
  _cachedBrandingColors = siteConfig.branding?.colors
    ? { ...siteConfig.branding.colors }
    : null;

  const stored = (() => {
    try {
      return localStorage.getItem("vite-ui-theme");
    } catch {
      return null;
    }
  })();
  const nicheDefault = LIGHT_DEFAULT_NICHES.includes(siteConfig.business.type)
    ? "light"
    : "dark";
  const initialMode: "dark" | "light" =
    stored === "light" || stored === "dark" ? stored : nicheDefault;

  // Snapshot niche-default-mode CSS vars for splash screen isolation.
  // The splash must always render in the niche's original color scheme,
  // regardless of the user's dark/light toggle preference.
  const prevClass = root.classList.contains("dark")
    ? "dark"
    : root.classList.contains("light")
      ? "light"
      : null;
  root.classList.remove("light", "dark");
  root.classList.add(nicheDefault);
  syncBrandingToTheme(nicheDefault);
  const snap = getComputedStyle(root);
  _splashVars = {};
  for (const cssVar of ALL_BRANDING_CSS_VARS) {
    const val = snap.getPropertyValue(cssVar).trim();
    _splashVars[cssVar] = val;
    const alias = THEME_COLOR_ALIAS[cssVar];
    if (alias) _splashVars[alias] = val;
  }

  // Apply user's actual preference
  if (initialMode !== nicheDefault) {
    root.classList.remove(nicheDefault);
    root.classList.add(initialMode);
    syncBrandingToTheme(initialMode);
  } else if (prevClass && prevClass !== nicheDefault) {
    // Restore original class if it differed (index.html flash-prevention)
    root.classList.remove(nicheDefault);
    root.classList.add(prevClass);
  }

  const fonts =
    siteConfig.branding?.fonts ??
    ((siteConfig as Record<string, unknown>).typography as
      | { display?: string; body?: string; googleFontsUrl?: string }
      | undefined);
  if (fonts) applyCustomTypography(fonts);
}

/**
 * Re-applies branding CSS vars for the given mode.
 * Called from ThemeProvider when the user toggles dark/light.
 *
 * Default mode (dark for barberia/tattoo, light for nails/estetica):
 *   full Firestore branding overrides apply as inline styles.
 * Opposite mode:
 *   inline overrides cleared — CSS niche rules handle colours.
 *   Custom brand accent (if different from niche preset) persists.
 */
export function syncBrandingToTheme(mode: "dark" | "light"): void {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  const nicheDefault = LIGHT_DEFAULT_NICHES.includes(siteConfig.business.type)
    ? "light"
    : "dark";

  // Disable transitions so var()-based background-color updates immediately
  const disableStyle = document.createElement("style");
  disableStyle.setAttribute("data-theme-switch", "");
  disableStyle.textContent =
    "*,*::before,*::after{transition-duration:0s!important}";
  document.head.appendChild(disableStyle);

  for (const cssVar of ALL_BRANDING_CSS_VARS) {
    root.style.removeProperty(cssVar);
  }

  if (mode === nicheDefault) {
    if (_cachedTheme) {
      root.style.setProperty("--brand-accent", _cachedTheme.accent);
      root.style.setProperty("--brand-accent-light", _cachedTheme.accentLight);
      root.style.setProperty("--brand-surface-dark", _cachedTheme.surfaceDark);
    }

    if (_cachedBrandingColors) {
      for (const [key, cssVar] of Object.entries(BRANDING_COLOR_MAP)) {
        const val = _cachedBrandingColors[key];
        if (val) root.style.setProperty(cssVar, val);
      }

      if (_cachedBrandingColors.accent) {
        const fg =
          relativeLuminance(_cachedBrandingColors.accent) < 0.55
            ? "#ffffff"
            : "#09090b";
        root.style.setProperty("--primary", _cachedBrandingColors.accent);
        root.style.setProperty("--primary-foreground", fg);
      }
    }
  } else if (_cachedBrandingColors && _cachedTheme) {
    if (
      _cachedBrandingColors.accent &&
      _cachedBrandingColors.accent !== _cachedTheme.accent
    ) {
      root.style.setProperty("--brand-accent", _cachedBrandingColors.accent);
    }
    if (
      _cachedBrandingColors.accentLight &&
      _cachedBrandingColors.accentLight !== _cachedTheme.accentLight
    ) {
      root.style.setProperty(
        "--brand-accent-light",
        _cachedBrandingColors.accentLight,
      );
    }
    if (
      _cachedBrandingColors.surfaceDark &&
      _cachedBrandingColors.surfaceDark !== _cachedTheme.surfaceDark
    ) {
      root.style.setProperty(
        "--brand-surface-dark",
        _cachedBrandingColors.surfaceDark,
      );
    }
  }

  void root.offsetHeight;
  setTimeout(() => disableStyle.remove(), 50);
}

function applyCustomTypography(typo: {
  display?: string;
  body?: string;
  googleFontsUrl?: string;
}): void {
  const root = document.documentElement;

  if (typo.display) {
    root.style.setProperty("--font-serif", `"${typo.display}", serif`);
  }
  if (typo.body) {
    root.style.setProperty("--font-sans", `"${typo.body}", sans-serif`);
  }

  if (typo.googleFontsUrl) {
    ensureThemeFonts(typo.googleFontsUrl, "custom-typography");
    return;
  }

  const families: string[] = [];
  if (typo.display)
    families.push(
      typo.display.replace(/\s+/g, "+") + ":wght@400;500;600;700",
    );
  if (typo.body)
    families.push(
      typo.body.replace(/\s+/g, "+") + ":wght@300;400;500;600;700",
    );
  if (families.length > 0) {
    const url = `https://fonts.googleapis.com/css2?${families.map((f) => `family=${f}`).join("&")}&display=swap`;
    ensureThemeFonts(url, "custom-typography");
  }
}

function relativeLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return 0.299 * r + 0.587 * g + 0.114 * b;
}
