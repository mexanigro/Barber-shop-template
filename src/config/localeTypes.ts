import type { messagesEn } from "./locales/en";
import type { messagesHe } from "./locales/he";

export type LocaleConfig = typeof messagesEn | typeof messagesHe;
