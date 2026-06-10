/**
 * gallery/estetica/gallery-v3.tsx — FILMSTRIP SPOTLIGHT (estética).
 *
 * One serene featured frame (crossfading, with a porcelain caption plate and
 * counter) over a thumbnail filmstrip. Arrows + thumbnails + keyboard drive
 * the selection; everything stays inline — no modal. The filmstrip follows
 * the template rail contract (touch-pan-y, overflow-y-hidden) so it never
 * traps page scroll.
 *
 * Selected when `sections.gallery.variant === "v3"` and niche is estética.
 */
import React from "react";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { cn, handleImgError } from "../../../../lib/utils";
import { localeConfig } from "../../../../config/locale";
import { siteConfig } from "../../../../config/site";
import { interpolate } from "../../../../lib/interpolate";
import {
  Y_SM, Y_LG, VIEWPORT_ONCE,
  getNicheFlavor, NICHE_DURATION, NICHE_EASING, EASE_OUT_STRONG,
} from "../../../../lib/motion";

const STRINGS: Record<"en" | "he" | "ru" | "ar", { prev: string; next: string; thumbs: string }> = {
  en: { prev: "Previous photo", next: "Next photo", thumbs: "Gallery thumbnails" },
  he: { prev: "תמונה קודמת", next: "תמונה הבאה", thumbs: "תמונות ממוזערות" },
  ru: { prev: "Предыдущее фото", next: "Следующее фото", thumbs: "Миниатюры галереи" },
  ar: { prev: "الصورة السابقة", next: "الصورة التالية", thumbs: "مصغرات المعرض" },
};

export function EsteticaGalleryV3({ onViewFull }: { onViewFull: () => void }) {
  const { gallery, sections } = siteConfig;
  const sectionConfig = sections.gallery;
  const niche = siteConfig.business.type;
  const flavor = getNicheFlavor(niche);
  const dur = NICHE_DURATION[flavor];
  const ease = NICHE_EASING[flavor];
  const S = STRINGS[localeConfig.lang] ?? STRINGS.en;

  const items = Array.isArray(gallery) ? gallery : [];
  const [active, setActive] = React.useState(0);
  const thumbsRef = React.useRef<HTMLDivElement>(null);

  const go = React.useCallback((delta: 1 | -1) => {
    setActive((prev) => (prev + delta + items.length) % items.length);
  }, [items.length]);

  // Keep the active thumbnail in view.
  React.useEffect(() => {
    const rail = thumbsRef.current;
    const thumb = rail?.querySelector<HTMLElement>(`[data-thumb="${active}"]`);
    thumb?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [active]);

  if (items.length === 0) return null;

  const arrowClass = cn(
    "flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card/90 text-foreground backdrop-blur-sm",
    "transition-colors duration-200 hover:border-accent/50 hover:text-accent",
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
  );

  return (
    <section id="gallery" className="bg-secondary/50 py-16 transition-colors duration-300 sm:py-24 lg:py-32 dark:bg-secondary/20">
      <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">

        {/* ── Header row ─────────────────────────────────────────────── */}
        <div className="mb-10 flex flex-wrap items-end justify-between gap-6 sm:mb-14">
          <div className="min-w-0">
            <motion.p
              initial={{ opacity: 0, y: Y_SM }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={VIEWPORT_ONCE}
              transition={{ duration: dur, ease }}
              className="mb-3 flex items-center gap-3 text-[10px] font-medium uppercase tracking-[0.32em] text-accent-light sm:text-xs"
            >
              <span className="h-px w-7 shrink-0 bg-accent/50" aria-hidden />
              {sectionConfig.subtitle}
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: Y_LG }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={VIEWPORT_ONCE}
              transition={{ duration: dur, ease, delay: 0.08 }}
              className="font-serif text-3xl font-light leading-[1.08] text-balance text-foreground sm:text-4xl md:text-5xl"
            >
              {sectionConfig.title}
            </motion.h2>
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={VIEWPORT_ONCE}
            transition={{ duration: dur, delay: 0.2 }}
            className="shrink-0 font-serif text-base tabular-nums text-muted-foreground"
            aria-live="polite"
          >
            {interpolate(localeConfig.galleryPage.counterSlash, { current: active + 1, total: items.length })}
          </motion.p>
        </div>

        {/* ── Featured frame ─────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={VIEWPORT_ONCE}
          transition={{ duration: dur * 1.2, ease }}
          className="relative overflow-hidden rounded-[0.625rem]"
        >
          <div className="relative aspect-[4/3] w-full sm:aspect-[16/9]">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.img
                key={active}
                src={items[active]}
                alt={interpolate(localeConfig.gallery.portfolioAlt, { n: active + 1 })}
                initial={{ opacity: 0, scale: 1.03 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.55, ease: EASE_OUT_STRONG }}
                onError={handleImgError}
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                className="absolute inset-0 h-full w-full object-cover"
              />
            </AnimatePresence>
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" aria-hidden />
          </div>

          {/* Arrows */}
          <div className="absolute inset-y-0 start-0 end-0 flex items-center justify-between px-3 sm:px-4">
            <motion.button type="button" onClick={() => go(-1)} aria-label={S.prev} whileTap={{ scale: 0.95 }} className={arrowClass}>
              <ChevronLeft size={18} className="rtl:rotate-180" aria-hidden />
            </motion.button>
            <motion.button type="button" onClick={() => go(1)} aria-label={S.next} whileTap={{ scale: 0.95 }} className={arrowClass}>
              <ChevronRight size={18} className="rtl:rotate-180" aria-hidden />
            </motion.button>
          </div>

          {/* Caption plate */}
          <div className="pointer-events-none absolute bottom-4 start-4 rounded-[0.5rem] bg-card/90 px-4 py-2.5 shadow-elevated backdrop-blur-sm sm:bottom-5 sm:start-5">
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
              {localeConfig.galleryPage.portfolioLabel}
            </p>
            <p className="font-serif text-sm text-foreground sm:text-base">
              {interpolate(localeConfig.gallery.workNumber, { n: active + 1 })}
            </p>
          </div>
        </motion.div>

        {/* ── Thumbnail filmstrip ────────────────────────────────────── */}
        <div
          ref={thumbsRef}
          role="tablist"
          aria-label={S.thumbs}
          className={cn(
            "mt-5 flex touch-pan-y gap-3 overflow-x-auto overflow-y-hidden overscroll-x-contain pb-3 sm:mt-6",
            "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          )}
        >
          {items.map((src, index) => {
            const isActive = index === active;
            return (
              <button
                key={`${src}-${index}`}
                type="button"
                data-thumb={index}
                role="tab"
                aria-selected={isActive}
                aria-label={interpolate(localeConfig.gallery.portfolioAlt, { n: index + 1 })}
                onClick={() => setActive(index)}
                className={cn(
                  "relative h-16 w-20 shrink-0 overflow-hidden rounded-[0.375rem] sm:h-20 sm:w-28",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60",
                  "transition-opacity duration-300",
                  isActive ? "opacity-100 ring-1 ring-accent" : "opacity-55 hover:opacity-85",
                )}
              >
                <img
                  src={src}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  onError={handleImgError}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              </button>
            );
          })}
        </div>

        {/* ── View-all CTA ───────────────────────────────────────────── */}
        <div className="mt-8 text-center">
          <motion.button
            type="button"
            onClick={onViewFull}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.16, ease: EASE_OUT_STRONG }}
            className="group inline-flex min-h-[44px] items-center gap-2 text-sm font-medium text-accent hover:text-accent-light focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 [transition:color_0.3s_cubic-bezier(0.23,1,0.32,1)]"
          >
            {localeConfig.gallery.explorePortfolio}
            <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" aria-hidden />
          </motion.button>
        </div>
      </div>
    </section>
  );
}
