import { siteConfig } from "../config/site";
import type { HeroObjectConfig } from "../types";

/**
 * Resolve a 3D Impact slot from the active site config.
 *
 * Reads `siteConfig.heroObjects[slotName]`. When the requested slot is
 * missing but `"primary"` exists, falls back to primary. Returns null
 * when neither resolves — callers then render their fallback.
 *
 * The site config is a module-level singleton (see `src/config/site.ts`),
 * so this hook is intentionally synchronous and dependency-free. It does
 * not subscribe to runtime overrides — those are applied once during
 * bootstrap before the React tree mounts.
 */
export function useHeroObject(slotName: string = "primary"): HeroObjectConfig | null {
  const slots = siteConfig.heroObjects;
  if (!slots) return null;

  const direct = slots[slotName];
  if (direct?.src) return direct;

  if (slotName !== "primary") {
    const primary = slots["primary"];
    if (primary?.src) return primary;
  }

  return null;
}
