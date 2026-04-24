import type { UiLanguage } from "./uiLanguage";
import { resolveUiLanguage } from "./uiLanguage";

export const env = {
  /** UI strings + `document.dir`: use `VITE_UI_LANGUAGE=he|en` per deployment */
  uiLanguage: resolveUiLanguage() as UiLanguage,
};
