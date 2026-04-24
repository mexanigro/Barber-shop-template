import type { BusinessNiche } from "../types";
import type { UiLanguage } from "./uiLanguage";
import { resolveUiLanguage } from "./uiLanguage";
import { resolveClientId } from "./tenant";

const NICHE_VALUES = ["barberia", "estetica", "abogado", "tattoo", "nails"] as const satisfies readonly BusinessNiche[];

/** Niche preset for this deployment (`VITE_ACTIVE_NICHE`). Build-time; default `barberia`. */
export function resolveActiveNiche(): BusinessNiche {
  const raw = (import.meta.env.VITE_ACTIVE_NICHE as string | undefined)?.trim().toLowerCase();
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
  /** Marketing preset: `barberia` | `estetica` | `abogado` | `tattoo` | `nails` — set `VITE_ACTIVE_NICHE` on Vercel per deployment */
  activeNiche: resolveActiveNiche(),
};
