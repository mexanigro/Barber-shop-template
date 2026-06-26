import { stripEnvQuotes } from "./envQuotes";
import { readViteEnv } from "./viteEnv";

export type UiLanguage = "he" | "en" | "ru" | "ar";

/** Build-time UI language (`VITE_UI_LANGUAGE`). Default: `en` (template ships in English). */
export function resolveUiLanguage(): UiLanguage {
  const raw = stripEnvQuotes(
    (readViteEnv("VITE_UI_LANGUAGE") ?? "").trim(),
  ).toLowerCase();
  if (raw === "he") return "he";
  if (raw === "ru") return "ru";
  if (raw === "ar") return "ar";
  return "en";
}
