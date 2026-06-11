import { siteConfig } from "../config/site";
import { localeConfig } from "../config/locale";

const SYMBOLS: Record<string, string> = {
  ILS: "₪",
  USD: "$",
  EUR: "€",
  GBP: "£",
  RUB: "₽",
};

/**
 * Currency symbol for displayed prices. The tenant's `payment.currency` is
 * the source of truth (a US-branded demo must not show ₪ just because the
 * locale file defaults to shekels); the locale symbol is only a fallback.
 */
export function currencySymbol(): string {
  const code = siteConfig.payment?.currency?.toUpperCase();
  return (code && SYMBOLS[code]) || localeConfig.currency.symbol;
}
