import { stripEnvQuotes } from "./envQuotes";

export type UiLanguage = "he" | "en" | "ru";

/** Build-time UI language (`VITE_UI_LANGUAGE`). Default: `en` (template ships in English). */
export function resolveUiLanguage(): UiLanguage {
  const raw = stripEnvQuotes(
    ((import.meta.env.VITE_UI_LANGUAGE as string | undefined) ?? "").trim(),
  ).toLowerCase();
  if (raw === "he") return "he";
  if (raw === "ru") return "ru";
  return "en";
}
