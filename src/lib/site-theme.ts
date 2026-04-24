import { siteConfig } from "../config/site";

const TATTOO_FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700;900&family=UnifrakturMaguntia&family=Montserrat+Alternates:ital,wght@0,300;0,400;0,500;0,600;0,700;0,900;1,400&display=swap";

const NAILS_FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500;1,600;1,700&family=Great+Vibes&family=Lato:ital,wght@0,300;0,400;0,700;1,300;1,400;1,700&display=swap";

function ensureTattooFontStylesheet(): void {
  if (typeof document === "undefined") return;
  if (document.querySelector('link[data-tattoo-fonts="1"]')) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = TATTOO_FONTS_HREF;
  link.setAttribute("data-tattoo-fonts", "1");
  document.head.appendChild(link);
}

function ensureNailsFontStylesheet(): void {
  if (typeof document === "undefined") return;
  if (document.querySelector('link[data-nails-fonts="1"]')) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = NAILS_FONTS_HREF;
  link.setAttribute("data-nails-fonts", "1");
  document.head.appendChild(link);
}

/**
 * Sets `data-niche` and optional font sheets. Tattoo/nails use full token blocks in `index.css`;
 * other niches get `--brand-*` from the preset `theme` object.
 */
export function applySiteThemeCssVars(): void {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  root.setAttribute("data-niche", siteConfig.business.type);

  if (siteConfig.business.type === "tattoo") {
    ensureTattooFontStylesheet();
    return;
  }

  if (siteConfig.business.type === "nails") {
    ensureNailsFontStylesheet();
    return;
  }

  const t = siteConfig.theme;
  if (!t) return;

  root.style.setProperty("--brand-accent", t.accent);
  root.style.setProperty("--brand-accent-light", t.accentLight);
  root.style.setProperty("--brand-surface-dark", t.surfaceDark);
}
