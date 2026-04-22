import { env } from "./env";
import { messagesEn } from "./locales/en";
import { messagesHe } from "./locales/he";
import type { LocaleConfig } from "./localeTypes";

export type { LocaleConfig };

export const localeConfig: LocaleConfig =
  env.uiLanguage === "he" ? messagesHe : messagesEn;
