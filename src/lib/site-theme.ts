import { siteConfig } from "../config/site";

const TATTOO_FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700;900&family=UnifrakturMaguntia&family=Montserrat+Alternates:ital,wght@0,300;0,400;0,500;0,600;0,700;0,900;1,400&display=swap";

function ensureTattooFontStylesheet(): void {
  if (typeof document === "undefined") return;
  if (document.querySelector('link[data-tattoo-fonts="1"]')) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = TATTOO_FONTS_HREF;
  link.setAttribute("data-tattoo-fonts", "1");
  document.head.appendChild(link);
}

/** Pushes preset `theme` into `--brand-*` for non-tattoo niches. Tattoo uses full token blocks in `index.css`. */
export function applySiteThemeCssVars(): void {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  root.setAttribute("data-niche", siteConfig.business.type);

  if (siteConfig.business.type === "tattoo") {
    ensureTattooFontStylesheet();
    return;
  }

  const t = siteConfig.theme;
  if (!t) return;

  root.style.setProperty("--brand-accent", t.accent);
  root.style.setProperty("--brand-accent-light", t.accentLight);
  root.style.setProperty("--brand-surface-dark", t.surfaceDark);
}
