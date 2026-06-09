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

const BRAND_IDENTITY_KEYS: Record<string, string> = {
  accent: "--brand-accent",
  accentLight: "--brand-accent-light",
  surfaceDark: "--brand-surface-dark",
};

const THEME_SCOPED_KEYS: Record<string, string> = {
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

  const t = siteConfig.theme;
  if (t) {
    root.style.setProperty("--brand-accent", t.accent);
    root.style.setProperty("--brand-accent-light", t.accentLight);
    root.style.setProperty("--brand-surface-dark", t.surfaceDark);
  }

  const branding = siteConfig.branding;
  if (branding?.colors) {
    for (const [key, cssVar] of Object.entries(BRAND_IDENTITY_KEYS)) {
      const val = branding.colors[key];
      if (val) root.style.setProperty(cssVar, val);
    }

    if (branding.colors.accent) {
      root.style.setProperty("--brand-accent", branding.colors.accent);
      root.style.setProperty("--brand-accent-light", branding.colors.accentLight || branding.colors.accent);
    }

    const themeClass = root.classList.contains("dark") ? ".dark" : ".light";
    const scopedRules: string[] = [];
    for (const [key, cssVar] of Object.entries(THEME_SCOPED_KEYS)) {
      const val = branding.colors[key];
      if (val) scopedRules.push(`${cssVar}: ${val};`);
    }
    if (branding.colors.accent) {
      const fg = relativeLuminance(branding.colors.accent) < 0.55 ? "#ffffff" : "#09090b";
      scopedRules.push(`--primary: ${branding.colors.accent};`);
      scopedRules.push(`--primary-foreground: ${fg};`);
    }
    if (scopedRules.length > 0) {
      let styleEl = document.getElementById("branding-overrides") as HTMLStyleElement | null;
      if (!styleEl) {
        styleEl = document.createElement("style");
        styleEl.id = "branding-overrides";
        document.head.appendChild(styleEl);
      }
      styleEl.textContent = `html${themeClass} { ${scopedRules.join(" ")} }`;
    }
  }

  const fonts = branding?.fonts ?? (siteConfig as Record<string, unknown>).typography as
    | { display?: string; body?: string; googleFontsUrl?: string }
    | undefined;
  if (fonts) applyCustomTypography(fonts);
}

function applyCustomTypography(typo: { display?: string; body?: string; googleFontsUrl?: string }): void {
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
  if (typo.display) families.push(typo.display.replace(/\s+/g, "+") + ":wght@400;500;600;700");
  if (typo.body) families.push(typo.body.replace(/\s+/g, "+") + ":wght@300;400;500;600;700");
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
