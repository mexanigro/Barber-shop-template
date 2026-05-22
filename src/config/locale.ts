import { env } from "./env";
import { messagesEn } from "./locales/en";
import { messagesHe } from "./locales/he";
import { messagesRu } from "./locales/ru";
import { messagesAr } from "./locales/ar";
import type { LocaleConfig } from "./localeTypes";
import type { UiLanguage } from "./uiLanguage";

export type { LocaleConfig };

const LOCALE_MAP: Record<UiLanguage, LocaleConfig> = {
  en: messagesEn,
  he: messagesHe,
  ru: messagesRu,
  ar: messagesAr,
};

function resolveInitialLocale(): LocaleConfig {
  return LOCALE_MAP[env.uiLanguage] ?? messagesEn;
}

export let localeConfig: LocaleConfig = resolveInitialLocale();

/** Swap the active locale at runtime. Consumers re-read on next render. */
export function setLocale(lang: UiLanguage): void {
  localeConfig = LOCALE_MAP[lang] ?? messagesEn;
}
