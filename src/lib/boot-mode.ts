/**
 * D17 / TRANSICION-02: pone en <html> la clase del modo real (`branding.mode` vía getNicheDefaultMode) salvo que el
 * visitante tenga una preferencia guardada (`vite-ui-theme`, nichos con toggle). Módulo sin siteConfig para poder probarlo fuera de Vite (tests/modo-paleta.test.ts).
 */
export function applyBootMode(root: { classList: { remove: (...c: string[]) => void; add: (c: string) => void } }, mode: "dark" | "light", stored: string | null): "dark" | "light" | null {
  if (stored === "dark" || stored === "light") return null;
  root.classList.remove("dark", "light");
  root.classList.add(mode);
  return mode;
}
