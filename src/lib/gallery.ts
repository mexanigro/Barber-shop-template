// gallery.ts — GALERIA-04 (2026-09-20, CONTRATOS § página `/galeria`): galería con tipo. `sections.gallery.items` es la fuente
// cuando existe; `gallery[]` (string[]) es el respaldo sin tipo. `selection` va por id (o por índice, histórico).
import type { GalleryItem, GalleryType, SiteConfig } from "../types";

/** Orden fijo del brief = orden de las píldoras de /galeria. */
export const GALLERY_TYPES: readonly GalleryType[] = ["color", "rizos", "liso", "recogidos", "novia", "cortes"];

export function galleryItems(cfg: Pick<SiteConfig, "gallery" | "sections">): GalleryItem[] {
  const items = cfg.sections?.gallery?.items;
  if (Array.isArray(items) && items.length) return items.filter((i) => i && typeof i.src === "string" && i.src);
  const flat = Array.isArray(cfg.gallery) ? cfg.gallery.filter(Boolean) : [];
  return flat.map((src, i) => ({ id: `g${i + 1}`, src }));
}

/** Las de la home: `selection` (ids de items, o índices de gallery[]) en su orden, o las 6 primeras. Máximo 6. */
export function homeSelection(items: GalleryItem[], selection?: Array<string | number>): GalleryItem[] {
  if (!selection?.length) return items.slice(0, 6);
  const byId = new Map(items.map((i) => [i.id, i]));
  return selection.map((s) => (typeof s === "number" ? items[s] : byId.get(s))).filter((i): i is GalleryItem => !!i).slice(0, 6);
}

/** Tipos presentes, en el orden fijo del brief (para las píldoras). */
export function typesPresent(items: GalleryItem[]): GalleryType[] {
  const set = new Set(items.map((i) => i.type).filter(Boolean));
  return GALLERY_TYPES.filter((t) => set.has(t));
}
