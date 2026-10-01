/**
 * TEAM-RESENAS-01 (D-130, D-177): una variante de reseñas que no pinta la nota «como Google» no puede mostrar una traducción sin
 * marcar. Desde IDIOMAS-01 el overlay entrega la reseña traducida como `{ text: <traducción>, originalText, originalLang,
 * translated: true }`: estas variantes pintan el original con su idioma, como reseñas v1; sin traducción, el texto de siempre.
 */
type Resena = { text: string; originalText?: string; originalLang?: string; translated?: boolean };

/** El texto que se pinta: el original si la reseña llegó traducida. */
export const textoResena = (r: Resena) => (r.translated && r.originalText ? r.originalText : r.text);
/** El `lang` del texto pintado: el del original si la reseña llegó traducida; si no, el de la página. */
export const langResena = (r: Resena) => (r.translated && r.originalText ? r.originalLang : undefined);
