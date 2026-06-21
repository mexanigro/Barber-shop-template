import type { BusinessNiche } from "../types";
import type { UiLanguage } from "./uiLanguage";
import { stripEnvQuotes } from "./envQuotes";
import { resolveUiLanguage } from "./uiLanguage";
import { resolveClientId } from "./tenant";
import { readViteEnv } from "./viteEnv";

const NICHE_VALUES = ["barberia", "estetica", "tattoo", "nails", "cafeteria", "remodelaciones", "employment"] as const satisfies readonly BusinessNiche[];

/** Niche preset for this deployment (`VITE_ACTIVE_NICHE`). Build-time; default `barberia`. */
export function resolveActiveNiche(): BusinessNiche {
  const raw = stripEnvQuotes(
    (readViteEnv("VITE_ACTIVE_NICHE") ?? "").trim(),
  ).toLowerCase();
  if (raw && (NICHE_VALUES as readonly string[]).includes(raw)) {
    return raw as BusinessNiche;
  }
  return "barberia";
}

export const env = {
  /** UI strings + `document.dir`: use `VITE_UI_LANGUAGE=he|en` per deployment */
  uiLanguage: resolveUiLanguage() as UiLanguage,
  /** Tenant/client identifier for multi-tenant data partitioning */
  clientId: resolveClientId(),
  /** Marketing preset: `barberia` | `estetica` | `tattoo` | `nails` — set `VITE_ACTIVE_NICHE` on Vercel per deployment */
  activeNiche: resolveActiveNiche(),
};
