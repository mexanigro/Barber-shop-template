/**
 * gallery-page-v6.tsx — página /galeria de peluquería (GALERIA-04 D, 2026-09-20; CONTRATOS § página `/galeria`).
 * Galería completa con filtro por tipo del brief (píldoras `radiogroup`, orden fijo, «todo» primero; sólo los tipos con
 * piezas), rejilla 2 col 4:5 a sangre (4 px, sin radio: la textura asoma) / 3 col en 1280, lightbox compartido con la home
 * (etiqueta de tipo y «reservar este servicio» si la pieza tiene `serviceId`). Título y meta por locale; vuelta a la home;
 * fondo = textura del modo (R21). Sin entradas animadas (D3); `reduced-motion` sin transform. Ruta SPA /galeria.
 */
import React from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { siteConfig } from "../../config/site";
import { localeConfig } from "../../config/locale";
import { interpolate } from "../../lib/interpolate";
import { handleImgError } from "../../lib/utils";
import { galleryItems, typesPresent } from "../../lib/gallery";
import { GalleryLightbox } from "../landing/gallery/gallery-lightbox";
import type { GalleryItem, GalleryType } from "../../types";

export function GalleryPageV6({ onBack, onBookClick }: { onBack: () => void; onBookClick?: (serviceId?: string) => void }) {
  const { sections, brand } = siteConfig;
  const header = sections.gallery; const tp = localeConfig.galleryPage; const tg = localeConfig.gallery;
  const isRtl = localeConfig.dir === "rtl"; const Back = isRtl ? ArrowRight : ArrowLeft;
  const texture = siteConfig.branding?.texture;
  const all = galleryItems(siteConfig); // sin memo: el fixture/config del cliente puede llegar después del primer render
  const types = typesPresent(all);
  const [type, setType] = React.useState<GalleryType | "all">("all");
  const items = type === "all" ? all : all.filter((i) => i.type === type);
  const [open, setOpen] = React.useState<number | null>(null); const opener = React.useRef<HTMLElement | null>(null);
  const pills = React.useRef<HTMLDivElement>(null);
  const typeLabel = (t: GalleryType) => (tp.types as Record<string, string>)[t];
  const alt = (it: GalleryItem, i: number) => it.alt || (it.type ? typeLabel(it.type) : undefined) || tg.portfolioAlt.replace("{n}", String(i + 1));

  React.useEffect(() => {
    document.title = `${header.subtitle} · ${brand.name}`;
    const meta = document.querySelector('meta[name="description"]'); const prev = meta?.getAttribute("content");
    meta?.setAttribute("content", interpolate(tp.worksMeta, { count: all.length }));
    const root = document.documentElement; if (texture) root.style.setProperty("--texture-url", `url("${texture}")`);
    return () => { if (prev != null) meta?.setAttribute("content", prev); root.style.removeProperty("--texture-url"); };
  }, []);
  React.useEffect(() => { setOpen(null); }, [type]);

  // radiogroup: flechas mueven el foco y la selección (patrón WAI-ARIA), Home/End a los extremos
  const onPillKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const keys = ["ArrowRight", "ArrowLeft", "Home", "End"]; if (!keys.includes(e.key)) return;
    const opts: Array<GalleryType | "all"> = ["all", ...types]; const i = opts.indexOf(type); let n = i;
    const fwd = (e.key === "ArrowRight") !== isRtl;
    if (e.key === "Home") n = 0; else if (e.key === "End") n = opts.length - 1; else n = fwd ? (i + 1) % opts.length : (i - 1 + opts.length) % opts.length;
    e.preventDefault(); setType(opts[n]); (pills.current?.children[n] as HTMLElement | undefined)?.focus();
  };
  const close = () => { setOpen(null); requestAnimationFrame(() => opener.current?.focus()); };

  return (
    <section data-surface="textura" className="gal-page min-h-screen pb-20 pt-28 text-foreground">
      <div className="mx-auto max-w-6xl px-5 lg:px-10">
        <button type="button" onClick={onBack} className="inline-flex min-h-11 items-center gap-1.5 text-[15px] font-medium text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-strong)]">
          <Back size={16} aria-hidden="true" />
          {tp.backHome}
        </button>
        <h1 className="mt-6 text-3xl font-light leading-tight sm:text-4xl">{header.subtitle}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{interpolate(tp.worksMeta, { count: all.length })}</p>
        {types.length > 0 && (
          <div ref={pills} role="radiogroup" aria-label={tp.filterLabel} className="gal-pills mt-6 flex flex-wrap gap-2" onKeyDown={onPillKey}>
            {(["all", ...types] as Array<GalleryType | "all">).map((t) => (
              <button key={t} type="button" role="radio" aria-checked={type === t} tabIndex={type === t ? 0 : -1} className="gal-pill" onClick={() => setType(t)}>
                {t === "all" ? tp.all : typeLabel(t)}
              </button>
            ))}
          </div>
        )}
      </div>
      <ul className="gal-page-grid mx-auto mt-6 max-w-6xl lg:px-10" aria-label={tp.portfolioLabel}>
        {items.map((it, i) => (
          <li key={it.id} className="gal-page-cell">
            <button type="button" className="gal-page-piece" aria-label={alt(it, i)} onClick={(e) => { opener.current = e.currentTarget; setOpen(i); }}>
              <img src={it.src} alt="" loading={i < 4 ? "eager" : "lazy"} decoding="async" onError={handleImgError} />
            </button>
          </li>
        ))}
      </ul>
      {open !== null && <GalleryLightbox items={items} index={open} onClose={close} onIndex={setOpen} alt={alt} onBook={onBookClick ? (id) => { close(); onBookClick(id); } : undefined} />}
    </section>
  );
}
