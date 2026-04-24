/** Strips accidental wrapping quotes from `.env` / dashboard values (`"tattoo"` → `tattoo`). */
export function stripEnvQuotes(value: string): string {
  const t = value.trim();
  if (t.length >= 2) {
    const a = t[0];
    const b = t[t.length - 1];
    if ((a === '"' && b === '"') || (a === "'" && b === "'")) {
      return t.slice(1, -1).trim();
    }
  }
  return t;
}
