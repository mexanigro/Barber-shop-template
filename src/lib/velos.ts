/**
 * El velo sobre la foto del local, por web (Liam 2026-10-10, web de Hair by Flo). Cada sección en velo lee `--veil-<id>` en
 * index.css (0,65 en claro, 0,20 en oscuro, para toda peluquería); con `sections.<id>.veil` (0–1, validado en H) el config de
 * una web lo pisa. Instagram usa el velo de team. Sin el dato no se escribe nada.
 */
export const VARIABLE_DE_VELO = {
  services: "--veil-services",
  team: "--veil-team",
  faq: "--veil-faq",
  contact: "--veil-contact",
} as const;

export function velosDeSecciones(sections: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!sections || typeof sections !== "object") return out;
  for (const [id, variable] of Object.entries(VARIABLE_DE_VELO)) {
    const veil = (sections as Record<string, { veil?: unknown } | undefined>)[id]?.veil;
    if (typeof veil === "number" && veil >= 0 && veil <= 1) out[variable] = String(veil);
  }
  return out;
}
