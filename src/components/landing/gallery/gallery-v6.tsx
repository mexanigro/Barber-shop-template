/**
 * gallery-v6.tsx — GALERIA-03 (2026-09-20, CONTRATOS § gallery v6/v7): selección de trabajos en la home, hermana de la
 * tarjeta de services v6. Dos variantes sobre el mismo núcleo (`GalleryCore`):
 *   · v6 «collage» (A, claro): mapa fijo de 6 celdas con tamaños/formas distintas en dos columnas con offset; las columnas
 *     se desplazan a velocidad distinta al scrollear (H-B, `--gal-dy` por rAF, ±6 %); 1280: tres columnas, la central quieta.
 *   · v7 «mosaico con relieve» (C, oscuro): rejilla 2 col (1:1 y 4:5 alternadas + una doble 16:9) sin desplazamiento de
 *     columnas; la pieza se levanta al tocar/hover (H-C: translateY −4 + sombra más larga) y la foto hace parallax interno.
 * Común: fondo-imagen que funciona como color (R21, `branding.texture`) disuelto arriba y abajo con máscara alfa (`--gal-fade`,
 * misma técnica que el hero); piezas con el relieve de la tarjeta (radio `--radius-ui`, sombra tonal, borde de acento en
 * oscuro), sin texto sobre la foto, SIN animación de aparición (D3), `reduced-motion` sin transform; título debajo (R23);
 * UN solo botón al final, sutil (`<a href="/galeria">`, SPA); lightbox propio (`<dialog>`: deslizar/flechas, Escape, foco de
 * vuelta). Sin foto no hay celda (se colapsa); < 3 piezas → la sección no se monta (aviso dev).
 */
import React from "react";
import { useReducedMotion } from "motion/react";
import { ArrowUpLeft, ArrowUpRight, ChevronLeft, ChevronRight, X } from "lucide-react";
import { localeConfig } from "../../../config/locale";
import { siteConfig } from "../../../config/site";
import { handleImgError } from "../../../lib/utils";

type Props = { onViewFull: () => void };
type Variant = "v6" | "v7";

/** Mapa fijo de 6 celdas (celda 1 = la grande). `col` es la columna en 375 (0/1), `ar` la relación de aspecto de la celda. */
const MAPA: Record<Variant, Array<{ col: 0 | 1; ar: string; span2?: boolean; size?: "l" | "m" | "s" }>> = {
  v6: [{ col: 0, ar: "4/5", size: "l" }, { col: 1, ar: "1/1", size: "s" }, { col: 0, ar: "1/1", size: "s" }, { col: 1, ar: "3/4", size: "m" }, { col: 0, ar: "3/4", size: "m" }, { col: 1, ar: "4/5", size: "l" }],
  v7: [{ col: 0, ar: "16/9", span2: true }, { col: 0, ar: "4/5" }, { col: 1, ar: "1/1" }, { col: 0, ar: "1/1" }, { col: 1, ar: "4/5" }, { col: 0, ar: "16/9", span2: true }],
};

/** H-B: las columnas se desplazan a velocidad distinta según la posición de la sección en el viewport (`--gal-dy` en px). */
function useColumnParallax(ref: React.RefObject<HTMLElement | null>, on: boolean) {
  React.useEffect(() => {
    const el = ref.current; if (!el || !on) return;
    let raf = 0;
    const tick = () => { raf = 0; const r = el.getBoundingClientRect(); const vh = window.innerHeight; const p = Math.max(-1, Math.min(1, (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2))); el.style.setProperty("--gal-dy", (p * 24).toFixed(1) + "px"); };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(tick); };
    tick(); window.addEventListener("scroll", onScroll, { passive: true }); window.addEventListener("resize", onScroll);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); cancelAnimationFrame(raf); };
  }, [ref, on]);
}

function Lightbox({ items, index, onClose, onIndex, alt }: { items: string[]; index: number; onClose: () => void; onIndex: (i: number) => void; alt: (i: number) => string }) {
  const ref = React.useRef<HTMLDialogElement>(null); const track = React.useRef<HTMLDivElement>(null);
  const isRtl = localeConfig.dir === "rtl";
  React.useEffect(() => { const d = ref.current; if (!d) return; if (!d.open) d.showModal(); const t = track.current; if (t) t.children[index] && (t.children[index] as HTMLElement).scrollIntoView({ inline: "center", block: "nearest" }); }, [index]);
  React.useEffect(() => { const t = track.current; if (!t) return; let raf = 0; const on = () => { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; const i = Math.round(t.scrollLeft / t.clientWidth); const n = Math.max(0, Math.min(items.length - 1, Math.abs(i))); if (n !== index) onIndex(n); }); }; t.addEventListener("scroll", on, { passive: true }); return () => t.removeEventListener("scroll", on); }, [index, items.length, onIndex]);
  const step = (d: number) => onIndex((index + d + items.length) % items.length);
  return (
    <dialog ref={ref} className="gal-lightbox" onClose={onClose} onCancel={(e) => { e.preventDefault(); onClose(); }} onClick={(e) => { if (e.target === ref.current) onClose(); }} onKeyDown={(e) => { if (e.key === "ArrowRight") step(isRtl ? -1 : 1); if (e.key === "ArrowLeft") step(isRtl ? 1 : -1); }} aria-label={localeConfig.nav.gallery}>
      <button type="button" className="gal-lb-close" onClick={onClose} aria-label={localeConfig.a11y.close}><X size={22} /></button>
      <div ref={track} className="gal-lb-track">
        {items.map((src, i) => (
          <figure key={src + i} className="gal-lb-slide"><img src={src} alt={alt(i)} loading={Math.abs(i - index) <= 1 ? "eager" : "lazy"} decoding="async" onError={handleImgError} /><figcaption>{alt(i)}</figcaption></figure>
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

let warned = false;
export function GalleryCore({ onViewFull, variant }: Props & { variant: Variant }) {
  const { gallery, sections } = siteConfig; const header = sections.gallery; const t = localeConfig.gallery;
  const reduced = useReducedMotion();
  const isRtl = localeConfig.dir === "rtl"; const Arrow = isRtl ? ArrowUpLeft : ArrowUpRight;
  const all = Array.isArray(gallery) ? gallery.filter(Boolean) : [];
  const sel = (header.selection?.length ? header.selection.map((i) => all[i]).filter(Boolean) : all).slice(0, 6);
  const [open, setOpen] = React.useState<number | null>(null); const opener = React.useRef<HTMLElement | null>(null);
  const secRef = React.useRef<HTMLElement>(null);
  useColumnParallax(secRef, !reduced); // v6: columnas; v7: inclinación de la rejilla + parallax interno (CSS por data-gallery)
  if (sel.length < 3) { if (import.meta.env.DEV && !warned) { warned = true; console.warn(`[copy] gallery: ${sel.length} fotos (< 3): la galería de la home no se monta.`); } return null; }
  const alt = (i: number) => t.portfolioAlt.replace("{n}", String(i + 1));
  const mapa = MAPA[variant];
  const close = () => { setOpen(null); requestAnimationFrame(() => opener.current?.focus()); };
  const cols: React.ReactNode[][] = [[], []];
  sel.forEach((src, i) => {
    const m = mapa[i]; const node = (
      <li key={src + i} className={"gal-cell" + (m.span2 ? " gal-cell-2" : "")} data-size={m.size} style={{ aspectRatio: m.ar }}>
        <button type="button" className="gal-piece" aria-label={alt(i)} onClick={(e) => { opener.current = e.currentTarget; setOpen(i); }}>
          <img src={src} alt="" loading="lazy" decoding="async" onError={handleImgError} className="gal-img" />
        </button>
      </li>
    ); cols[m.col].push(node);
  });
  return (
    <section ref={secRef} id="gallery" data-surface="textura" data-gallery={variant} aria-labelledby="gallery-title" className="gal text-foreground">
      <div className="gal-wall" aria-hidden="true" />
      <div className="gal-inner mx-auto max-w-6xl px-5 lg:px-10">
        <div className="gal-grid" data-cols="2">
          <ul className="gal-col gal-col-a">{cols[0]}</ul>
          <ul className="gal-col gal-col-b">{cols[1]}</ul>
        </div>
        <div className="gal-foot mt-5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-2">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 id="gallery-title" className="text-base font-medium leading-tight">{header.subtitle}</h2>
            <p className="text-xs text-muted-foreground">{header.title}</p>
          </div>
          <a href="/galeria" onClick={(e) => { e.preventDefault(); onViewFull(); }} className="gal-more inline-flex min-h-11 items-center gap-1.5 text-[15px] font-medium text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-strong)]">
            {t.explorePortfolio}<Arrow size={16} aria-hidden="true" />
          </a>
        </div>
      </div>
      {open !== null && <Lightbox items={sel} index={open} onClose={close} onIndex={setOpen} alt={alt} />}
    </section>
  );
}

export function GalleryV6(p: Props) { return <GalleryCore {...p} variant="v6" />; }
export function GalleryV7(p: Props) { return <GalleryCore {...p} variant="v7" />; }
