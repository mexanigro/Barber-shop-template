/**
 * gallery-lightbox.tsx — GALERIA-03/04: lightbox compartido por la galería de la home (v6/v7) y la página /galeria.
 * `<dialog>` modal (el foco queda dentro por el propio showModal), pista con snap (deslizar), ← → (escritorio y teclado),
 * Escape / clic fuera cierran y el foco vuelve a la pieza que lo abrió. Pie: `alt` de la pieza, etiqueta de tipo (hueco 9)
 * y «reservar este servicio» si la pieza tiene `serviceId` (hueco 10). Sin animación de aparición (D3).
 */
import React from "react";
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";
import { localeConfig } from "../../../config/locale";
import { handleImgError } from "../../../lib/utils";
import type { GalleryItem } from "../../../types";

type Props = { items: GalleryItem[]; index: number; onClose: () => void; onIndex: (i: number) => void; alt: (item: GalleryItem, i: number) => string; onBook?: (serviceId: string) => void };

export function GalleryLightbox({ items, index, onClose, onIndex, alt, onBook }: Props) {
  const ref = React.useRef<HTMLDialogElement>(null); const track = React.useRef<HTMLDivElement>(null);
  const isRtl = localeConfig.dir === "rtl"; const tp = localeConfig.galleryPage;
  React.useEffect(() => { const d = ref.current; if (!d) return; if (!d.open) d.showModal(); const t = track.current; if (t) t.children[index] && (t.children[index] as HTMLElement).scrollIntoView({ inline: "center", block: "nearest" }); }, [index]);
  React.useEffect(() => { const t = track.current; if (!t) return; let raf = 0; const on = () => { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; const i = Math.round(t.scrollLeft / t.clientWidth); const n = Math.max(0, Math.min(items.length - 1, Math.abs(i))); if (n !== index) onIndex(n); }); }; t.addEventListener("scroll", on, { passive: true }); return () => t.removeEventListener("scroll", on); }, [index, items.length, onIndex]);
  const step = (d: number) => onIndex((index + d + items.length) % items.length);
  const typeLabel = (it: GalleryItem) => (it.type ? (tp.types as Record<string, string>)[it.type] : undefined);
  return (
    <dialog ref={ref} className="gal-lightbox" onClose={onClose} onCancel={(e) => { e.preventDefault(); onClose(); }} onClick={(e) => { if (e.target === ref.current) onClose(); }} onKeyDown={(e) => { if (e.key === "ArrowRight") step(isRtl ? -1 : 1); if (e.key === "ArrowLeft") step(isRtl ? 1 : -1); }} aria-label={localeConfig.nav.gallery}>
      <button type="button" className="gal-lb-close" onClick={onClose} aria-label={localeConfig.a11y.close}><X size={22} /></button>
      <div ref={track} className="gal-lb-track">
        {items.map((it, i) => (
          <figure key={it.id + i} className="gal-lb-slide">
            <img src={it.src} alt={alt(it, i)} loading={Math.abs(i - index) <= 1 ? "eager" : "lazy"} decoding="async" onError={handleImgError} />
            <figcaption className="gal-lb-foot">
              <span className="gal-lb-alt">{alt(it, i)}</span>
              {typeLabel(it) && <span className="gal-lb-type">{typeLabel(it)}</span>}
              {it.serviceId && onBook && (
                <button type="button" className="gal-lb-book" onClick={() => onBook(it.serviceId!)}><Calendar size={14} aria-hidden="true" />{tp.bookThis}</button>
              )}
            </figcaption>
          </figure>
        ))}
      </div>
      {items.length > 1 && (
        <>
          <button type="button" className="gal-lb-arrow gal-lb-prev" onClick={() => step(-1)} aria-label={localeConfig.a11y.previous}>{isRtl ? <ChevronRight size={22} /> : <ChevronLeft size={22} />}</button>
          <button type="button" className="gal-lb-arrow gal-lb-next" onClick={() => step(1)} aria-label={localeConfig.a11y.next}>{isRtl ? <ChevronLeft size={22} /> : <ChevronRight size={22} />}</button>
        </>
      )}
    </dialog>
  );
}
