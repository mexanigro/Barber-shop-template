export type UiLanguage = "he" | "en";

/** Build-time UI language (`VITE_UI_LANGUAGE`). Default: `en` (template ships in English). */
export function resolveUiLanguage(): UiLanguage {
  const raw = (
    import.meta.env.VITE_UI_LANGUAGE as string | undefined
  )
    ?.trim()
    .toLowerCase();
  if (raw === "he") return "he";
  return "en";
}
