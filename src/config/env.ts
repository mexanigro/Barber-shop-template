import type { UiLanguage } from "./uiLanguage";
import { resolveUiLanguage } from "./uiLanguage";
import { resolveClientId } from "./tenant";

export const env = {
  /** UI strings + `document.dir`: use `VITE_UI_LANGUAGE=he|en` per deployment */
  uiLanguage: resolveUiLanguage() as UiLanguage,
  /** Tenant/client identifier for multi-tenant data partitioning */
  clientId: resolveClientId(),
};
