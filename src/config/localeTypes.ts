import type { messagesEn } from "./locales/en";
import type { messagesHe } from "./locales/he";
import type { messagesRu } from "./locales/ru";
import type { messagesAr } from "./locales/ar";

export type LocaleConfig = typeof messagesEn | typeof messagesHe | typeof messagesRu | typeof messagesAr;
