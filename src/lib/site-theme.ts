import { siteConfig } from "../config/site";

/** Pushes preset / tenant `theme` into CSS variables consumed by Tailwind (`accent`, `primary`, surfaces). */
export function applySiteThemeCssVars(): void {
  if (typeof document === "undefined") return;

  const t = siteConfig.theme;
  if (!t) return;

  const root = document.documentElement;
  root.style.setProperty("--brand-accent", t.accent);
  root.style.setProperty("--brand-accent-light", t.accentLight);
  root.style.setProperty("--brand-surface-dark", t.surfaceDark);
  root.setAttribute("data-niche", siteConfig.business.type);
}
