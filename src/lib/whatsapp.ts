/**
 * Número para `https://wa.me/{n}`: sólo dígitos con prefijo de país.
 * Los teléfonos israelíes se escriben "03-612-4477" / "052-…": el 0 inicial
 * se cambia por 972 (wa.me sin país no abre). Un número con "+" o que ya
 * empieza por el país se respeta. Devuelve "" si no hay número.
 */
export function toWhatsAppNumber(raw: string | undefined | null, defaultCountry = "972"): string {
  if (!raw) return "";
  const hasPlus = raw.trim().startsWith("+");
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  if (hasPlus) return digits;
  if (digits.startsWith("0")) return defaultCountry + digits.slice(1);
  return digits;
}
