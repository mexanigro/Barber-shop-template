import { localeConfig } from "../config/locale";

/** La cantidad con el plural del idioma de la página (Intl.PluralRules): `formas` por categoría (zero, one, two, few, many, other)
 *  con `{n}` en el lugar del número. Ruso «3 отзыва», árabe «8 أعمال», hebreo «עבודה אחת» (revisión de idiomas, 2026-10-09). */
export function plural(formas: Record<string, string>, n: number): string {
  const f = new Intl.PluralRules(localeConfig.lang).select(n);
  return (formas[f] ?? formas.other ?? "").replace(/\{n\}/g, String(n));
}
