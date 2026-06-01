import { siteConfig, getTenantThemeOverride } from "../config/site";
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

  // ── Default themes without their own CSS block: apply brand vars via JS ─
  if (theme.isDefault) {
    const t = siteConfig.theme;
    if (t) {
      root.style.setProperty("--brand-accent", t.accent);
      root.style.setProperty("--brand-accent-light", t.accentLight);
      root.style.setProperty("--brand-surface-dark", t.surfaceDark);
    }
  }

  // ── Custom typography from Firestore config ──
  applyCustomTypography();

  // ── Custom brand colors from Firestore config ──
  applyCustomBrandColors();
}

/**
 * If `siteConfig.typography` has display/body fonts, load them from Google Fonts
 * and override the CSS custom properties used by Tailwind utilities:
 *   typography.display → --font-serif  (font-serif utility, heading/display text)
 *   typography.body    → --font-sans   (font-sans utility, body/UI text)
 *
 * Inline style on <html> overrides both the Tailwind @theme block and the
 * niche-specific CSS selectors (html[data-niche="..."]) since inline styles
 * have the highest specificity in CSS.
 */
function applyCustomTypography(): void {
  const typo = (siteConfig as Record<string, unknown>).typography as
    | { display?: string; body?: string }
    | undefined;
  if (!typo) return;

  const root = document.documentElement;
  const families: string[] = [];

  if (typo.display) {
    root.style.setProperty("--font-serif", `"${typo.display}", serif`);
    families.push(typo.display.replace(/\s+/g, "+") + ":wght@400;500;600;700");
  }

  if (typo.body) {
    root.style.setProperty("--font-sans", `"${typo.body}", sans-serif`);
    families.push(typo.body.replace(/\s+/g, "+") + ":wght@300;400;500;600;700");
  }

  if (families.length > 0) {
    const url = `https://fonts.googleapis.com/css2?${families.map((f) => `family=${f}`).join("&")}&display=swap`;
    ensureThemeFonts(url, "custom-typography");
  }
}

/**
 * If the Firestore tenant config overrides brand colors (theme.accent, etc.),
 * apply them as inline styles on `<html>` so they beat any CSS selector
 * specificity. Also inject a `<style>` sheet with `!important` for semantic
 * aliases (`--primary`, `--background`) that niche CSS blocks hardcode
 * instead of referencing the brand tokens via `var()`.
 *
 * Only runs when Firestore actually provides color overrides — without them,
 * the niche CSS values remain untouched and light/dark mode switching works
 * normally.
 */
function applyCustomBrandColors(): void {
  const custom = getTenantThemeOverride();
  if (!custom) return;

  const root = document.documentElement;

  if (custom.accent) root.style.setProperty("--brand-accent", custom.accent);
  if (custom.accentLight) root.style.setProperty("--brand-accent-light", custom.accentLight);
  if (custom.surfaceDark) root.style.setProperty("--brand-surface-dark", custom.surfaceDark);

  const rules: string[] = [];

  if (custom.accent) {
    rules.push(`html { --primary: ${custom.accent} !important; }`);
    const fg = relativeLuminance(custom.accent) < 0.55 ? "#ffffff" : "#09090b";
    rules.push(`html { --primary-foreground: ${fg} !important; }`);
  }
  if (custom.surfaceDark) {
    rules.push(`html.dark { --background: ${custom.surfaceDark} !important; }`);
  }

  if (rules.length > 0) {
    const existing = document.querySelector("style[data-brand-overrides]");
    if (existing) existing.remove();
    const style = document.createElement("style");
    style.setAttribute("data-brand-overrides", "");
    style.textContent = rules.join("\n");
    document.head.appendChild(style);
  }
}

function relativeLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return 0.299 * r + 0.587 * g + 0.114 * b;
}
