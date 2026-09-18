/** Recorta a `max` palabras (reglas duras de copy de BLOQUE-04); avisa en dev si recorta. */
export function clampWords(text: string | undefined, max: number, field: string): string {
  if (!text) return "";
  const words = text.trim().split(/\s+/);
  if (words.length <= max) return text.trim();
  if (import.meta.env.DEV) console.warn(`[copy] ${field} tiene ${words.length} palabras; el patrón admite ${max}. Se recorta.`);
  return words.slice(0, max).join(" ") + "…";
}

/** Primera(s) frase(s) completas que caben en `max` palabras; si la primera ya se pasa, recorta por palabras. */
export function leadSentences(text: string | undefined, max: number, field: string): string {
  if (!text) return "";
  const sentences = text.trim().split(/(?<=[.!?…])\s+/);
  let out = "";
  for (const s of sentences) {
    const next = out ? `${out} ${s}` : s;
    if (next.split(/\s+/).length > max) break;
    out = next;
  }
  return out || clampWords(text, max, field);
}
