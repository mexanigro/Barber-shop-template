/**
 * hero-seam.ts — costura hero → fondo (R20; SERVICES-02 S6, 2026-09-19).
 *
 * `dark` (actual): el scrim inferior del hero muere en el tono del pie del clip (`--hero-foot`) y la primera sección
 * arranca con esa banda. `light` (alternativa a prueba, sólo paleta clara): el pie del hero se aclara hacia `--surface`
 * (haze claro) y el texto del hero pasa a `--text` oscuro sobre ese velo; en paleta oscura siempre `dark`.
 * Fuente: `branding.heroSeam` del cliente; en dev, `?seam=light|dark` para comparar en captura. Liam elige en STOP 1.
 */
import { siteConfig } from "../config/site";
import { getNicheDefaultMode } from "./site-theme";

export type HeroSeam = "dark" | "light";

export function heroSeam(): HeroSeam {
  if (getNicheDefaultMode() === "dark") return "dark";
  const q = typeof location !== "undefined" ? new URLSearchParams(location.search).get("seam") : null;
  const v = (q === "light" || q === "dark" ? q : siteConfig.branding?.heroSeam) ?? "dark";
  return v === "light" ? "light" : "dark";
}
