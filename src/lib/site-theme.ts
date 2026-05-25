import { siteConfig } from "../config/site";
import { getActiveTheme } from "../config/presets/themes";

/**
 * Loads a Google Fonts stylesheet if not already present.
 * Uses a data attribute keyed by theme ID to avoid duplicate injections.
 */
function ensureThemeFonts(url: string, themeId: string): void {
  if (typeof document === "undefined") return;
  const existing = document.querySelector(`link[data-theme-fonts="${themeId}"]`);
  if (existing) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = url;
  link.setAttribute("data-theme-fonts", themeId);
  document.head.appendChild(link);
}

/**
 * Sets `data-niche` (always) and optionally `data-theme` (non-default themes)
 * on `<html>`, loads required Google Fonts, and applies brand CSS custom
 * properties where needed.
 *
 * Called once during bootstrap in `main.tsx`, after tenant config is merged.
 */
export function applySiteThemeCssVars(): void {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  const theme = getActiveTheme(siteConfig.activeTheme);

  // Always set niche — component logic + default CSS blocks depend on it
  root.setAttribute("data-niche", siteConfig.business.type);

  // ── Niches without theme system — legacy JS brand vars ──
  if (!theme) {
    const t = siteConfig.theme;
    if (t) {
      root.style.setProperty("--brand-accent", t.accent);
      root.style.setProperty("--brand-accent-light", t.accentLight);
      root.style.setProperty("--brand-surface-dark", t.surfaceDark);
    }
    return;
  }

  // ── Non-default themes activate their CSS block via data-theme ─────────
  if (!theme.isDefault) {
    root.setAttribute("data-theme", theme.id);
  }

  // ── Load fonts (both defaults and non-defaults may need runtime loading) ─
  if (theme.googleFontsUrl) {
    ensureThemeFonts(theme.googleFontsUrl, theme.id);
  }

  // ── Default barberia: no CSS block exists for it, apply brand vars via JS ─
  if (theme.isDefault && siteConfig.business.type === "barberia") {
    const t = siteConfig.theme;
    if (t) {
      root.style.setProperty("--brand-accent", t.accent);
      root.style.setProperty("--brand-accent-light", t.accentLight);
      root.style.setProperty("--brand-surface-dark", t.surfaceDark);
    }
  }

  // ── Custom typography from Firestore config ──
  applyCustomTypography();
}

/**
 * If `siteConfig.typography` has display/body fonts, load them from Google Fonts
 * and override the CSS custom properties --at-serif / --at-sans.
 */
function applyCustomTypography(): void {
  const typo = (siteConfig as Record<string, unknown>).typography as
    | { display?: string; body?: string }
    | undefined;
  if (!typo) return;

  const root = document.documentElement;
  const families: string[] = [];

  if (typo.display) {
    root.style.setProperty("--at-serif", `"${typo.display}", serif`);
    families.push(typo.display.replace(/\s+/g, "+") + ":wght@400;500;600;700");
  }

  if (typo.body) {
    root.style.setProperty("--at-sans", `"${typo.body}", sans-serif`);
    families.push(typo.body.replace(/\s+/g, "+") + ":wght@300;400;500;600;700");
  }

  if (families.length > 0) {
    const url = `https://fonts.googleapis.com/css2?${families.map((f) => `family=${f}`).join("&")}&display=swap`;
    ensureThemeFonts(url, "custom-typography");
  }
}
