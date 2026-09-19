// Lógica pura de services v6 «con precios» (SERVICES-02 fase 2): sin siteConfig, para probarla fuera de Vite.
import type { Service } from "../types";

export const FEATURED = 2; // historia (fase 2): hoy se muestran todas; `featured` es orden
type T = { fromPrice: string; byQuote: string; free: string };

export function priceLabel(s: Service, symbol: string, t: T): { main: string; prefix?: string } {
  // Se pinta en un span dir="ltr": en RTL un «120–350» suelto se reordena a «350–120».
  if (s.mode === "consulta") return s.price ? { prefix: t.fromPrice, main: `${symbol}${s.price}` } : { main: t.byQuote };
  if (!s.price && !s.priceMax) return { main: t.free };
  if (s.priceMax && s.priceMax > s.price) return { main: `${symbol}${s.price}–${s.priceMax}` };
  return { main: `${symbol}${s.price}` };
}

/** `sections.services.featured` (2 ids válidos) → si no, `popular` primero y luego los primeros del catálogo. */
export function pickFeatured(services: Service[], featured?: string[]): Service[] {
  const ids = (featured ?? []).filter((id, i, a) => a.indexOf(id) === i && services.some((s) => s.id === id)).slice(0, FEATURED);
  if (ids.length === FEATURED) return ids.map((id) => services.find((s) => s.id === id)!);
  const popular = services.filter((s) => s.popular);
  const rest = services.filter((s) => !s.popular);
  const chosen = new Set([...popular, ...rest].slice(0, FEATURED).map((s) => s.id));
  return services.filter((s) => chosen.has(s.id));
}


/** Fase 2b: `services.featured` es ORDEN, no cantidad — los ids válidos primero (en su orden), después el resto del catálogo. */
export function orderFeatured(services: Service[], featured?: string[]): Service[] {
  const ids = (featured ?? []).filter((id, i, a) => a.indexOf(id) === i && services.some((s) => s.id === id));
  const first = ids.map((id) => services.find((s) => s.id === id)!);
  return [...first, ...services.filter((s) => !ids.includes(s.id))];
}
