/**
 * gallery-v5.tsx — PINTEREST-STYLE pin-board gallery variant.
 *
 * Dense masonry pin-board: 2/3/4 columns by breakpoint with a tighter gap
 * (60% of --gs-gap), uniform rounded card chrome on every pin, and a hover
 * overlay with a zoom-in affordance. Each pin opens a simple full-screen
 * lightbox (kept inside this file by design — no shared module). The
 * difference vs v2: denser, uniform interactive pins vs v2's pure
 * editorial wall. Selected via `sections.gallery.variant === "v5"`.
 */
import React from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, ChevronLeft, ChevronRight, Images, X, ZoomIn } from "lucide-react";
import { handleImgError, revealImg, revealImgIfCached } from "../../../lib/utils";
import { localeConfig } from "../../../config/locale";
import { siteConfig } from "../../../config/site";
import { interpolate } from "../../../lib/interpolate";
import { useModalA11y } from "../../../hooks/useModalA11y";
import { useSwipeNavigation } from "../../../hooks/useSwipeNavigation";
import {
  Y_SM, VIEWPORT_ONCE,
  getNicheFlavor, NICHE_DURATION, NICHE_EASING,
  sectionTitleContainerVariants, textWordVariants,
  staggerMasonry, EASE_OUT_STRONG, BUTTON_PRESS,
} from "../../../lib/motion";

type PinStrings = {
  openImage: string;
  closeLightbox: string;
  previousImage: string;
  nextImage: string;
  imageCounter: string;
};

const STRINGS: Record<"en" | "he" | "ru" | "ar", PinStrings> = {
  en: {
    openImage: "View image {n}",
    closeLightbox: "Close",
    previousImage: "Previous image",
    nextImage: "Next image",
    imageCounter: "Image {current} of {total}",
  },
  he: {
    openImage: "צפייה בתמונה {n}",
    closeLightbox: "סגירה",
    previousImage: "התמונה הקודמת",
    nextImage: "התמונה הבאה",
    imageCounter: "תמונה {current} מתוך {total}",
  },
  ru: {
    openImage: "Просмотр изображения {n}",
    closeLightbox: "Закрыть",
    previousImage: "Предыдущее изображение",
    nextImage: "Следующее изображение",
    imageCounter: "Изображение {current} из {total}",
  },
  ar: {
    openImage: "عرض الصورة {n}",
    closeLightbox: "إغلاق",
    previousImage: "الصورة السابقة",
    nextImage: "الصورة التالية",
    imageCounter: "صورة {current} من {total}",
  },
};

/** Aspect-ratio cycle so pins vary in height like a real pin-board. */
const PIN_ASPECTS = ["aspect-[3/4]", "aspect-square", "aspect-[4/5]", "aspect-[4/3]", "aspect-[3/4]", "aspect-square"] as const;

const MAX_IMAGES = 12;

/* ── Tiny lightbox, internal to this variant by design ──────────────────── */
function PinLightbox({
  images,
  index,
  altFor,
  isRtl,
  t,
  onClose,
  onNavigate,
}: {
  images: string[];
  index: number;
  altFor: (i: number) => string;
  isRtl: boolean;
  t: PinStrings;
  onClose: () => void;
  onNavigate: (next: number) => void;
}) {
  const total = images.length;
  const containerRef = useModalA11y(true, onClose);

  const goPrev = React.useCallback(
    () => onNavigate((index - 1 + total) % total),
    [index, total, onNavigate],
  );
  const goNext = React.useCallback(
    () => onNavigate((index + 1) % total),
    [index, total, onNavigate],
  );

  // Touch swipe — primary navigation on mobile; arrows stay as desktop fallback.
  const swipe = useSwipeNavigation({ onPrev: goPrev, onNext: goNext, isRtl, enabled: total > 1 });

  // Arrow keys, mirrored under RTL so key direction matches visual travel.
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        (isRtl ? goPrev : goNext)();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        (isRtl ? goNext : goPrev)();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isRtl, goPrev, goNext]);

  // Body scroll lock for the lightbox lifetime.
  React.useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: EASE_OUT_STRONG }}
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/90"
      onClick={onClose}
    >
      <motion.div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label={interpolate(t.imageCounter, { current: index + 1, total })}
        tabIndex={-1}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.18, ease: EASE_OUT_STRONG } }}
        transition={{ duration: 0.25, ease: EASE_OUT_STRONG }}
        className="relative flex h-full w-full items-center justify-center px-4 focus:outline-none sm:px-16"
        onClick={(e) => e.stopPropagation()}
        {...swipe.handlers}
        style={{ touchAction: "pan-y" }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={t.closeLightbox}
          className="absolute top-4 end-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors duration-200 hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          <X size={20} />
        </button>

        <span className="absolute top-5 start-1/2 z-10 -translate-x-1/2 text-sm font-semibold text-white/80 tabular-nums rtl:translate-x-1/2">
          {index + 1} / {total}
        </span>

        {total > 1 && (
          <button
            type="button"
            onClick={goPrev}
            aria-label={t.previousImage}
            className="absolute start-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors duration-200 hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:start-5 sm:h-12 sm:w-12"
          >
            <ChevronLeft size={22} className="rtl:-scale-x-100" />
          </button>
        )}

        {/* Plain wrapper carries the swipe drag-follow transform
            (the motion.img owns its own scale/opacity). */}
        <div
          ref={swipe.feedbackRef}
          className="flex min-w-0 max-h-full max-w-full items-center justify-center"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.img
              key={`pin-lightbox-${index}`}
              src={images[index]}
              alt={altFor(index)}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
              transition={{ duration: 0.25, ease: EASE_OUT_STRONG }}
              className="max-h-[85vh] max-w-full select-none object-contain"
              draggable={false}
              referrerPolicy="no-referrer"
              onError={handleImgError}
            />
          </AnimatePresence>
        </div>

        {total > 1 && (
          <button
            type="button"
            onClick={goNext}
            aria-label={t.nextImage}
            className="absolute end-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors duration-200 hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:end-5 sm:h-12 sm:w-12"
          >
            <ChevronRight size={22} className="rtl:-scale-x-100" />
          </button>
        )}
      </motion.div>
    </motion.div>
  );
}

export function GalleryV5({ onViewFull }: { onViewFull: () => void }) {
  const { gallery, sections, brand } = siteConfig;
  const sectionConfig = sections.gallery;
  const niche = siteConfig.business.type;
  const flavor = getNicheFlavor(niche);
  const dur = NICHE_DURATION[flavor];
  const ease = NICHE_EASING[flavor];

  const lang = localeConfig.lang as keyof typeof STRINGS;
  const t = STRINGS[lang] ?? STRINGS.en;
  const isRtl = lang === "he" || lang === "ar";

  const safeGallery = Array.isArray(gallery) ? gallery : [];
  const images = safeGallery.slice(0, MAX_IMAGES);

  const [lightboxIndex, setLightboxIndex] = React.useState<number | null>(null);
  const altFor = (i: number) => `${brand.name} — ${i + 1}`;

  return (
    <section
      id="gallery"
      className="bg-card px-5 py-16 transition-colors duration-300 sm:px-6 sm:py-28"
    >
      <div className="mx-auto max-w-7xl">

        {/* ── Section header ──────────────────────────────────────── */}
        <div className="mb-10 flex flex-col gap-6 sm:mb-12 md:flex-row md:items-end md:justify-between">
          <div>
            <motion.p
              initial={{ opacity: 0, y: Y_SM }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={VIEWPORT_ONCE}
              transition={{ duration: dur, ease }}
              className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-accent-light"
            >
              {sectionConfig.title}
            </motion.p>
            <motion.h2
              variants={sectionTitleContainerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={VIEWPORT_ONCE}
              className="text-3xl font-black uppercase tracking-tight text-card-foreground sm:text-4xl md:text-5xl"
            >
              {sectionConfig.subtitle.split(" ").map((word: string, i: number) => (
                <motion.span key={i} variants={textWordVariants(niche)} className="inline-block">
                  {word}&nbsp;
                </motion.span>
              ))}
            </motion.h2>
          </div>

          <motion.button
            type="button"
            initial={{ opacity: 0, y: Y_SM }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT_ONCE}
            transition={{ delay: 0.2, duration: dur, ease }}
            onClick={onViewFull}
            whileHover={{ y: BUTTON_PRESS[flavor].hoverY }}
            whileTap={{ scale: BUTTON_PRESS[flavor].scale }}
            className="group flex min-h-[44px] shrink-0 items-center gap-2.5 self-start rounded-xl border border-border bg-background px-5 py-3 text-sm font-semibold text-foreground hover:border-accent/30 hover:text-accent-light focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 md:self-auto [transition:border-color_0.25s_cubic-bezier(0.23,1,0.32,1),color_0.25s_cubic-bezier(0.23,1,0.32,1)]"
          >
            <Images size={16} className="shrink-0" />
            <span>{interpolate(localeConfig.gallery.viewAllPhotos, { count: safeGallery.length })}</span>
            <ArrowRight size={14} className="shrink-0 transition-transform duration-300 group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1" />
          </motion.button>
        </div>

        {/* ── Pin-board (dense masonry columns) ───────────────────── */}
        <div className="columns-2 [column-gap:calc(var(--gs-gap)*0.6)] md:columns-3 xl:columns-4">
          {images.map((src, i) => (
            <motion.button
              key={`pin-${src.slice(-24)}-${i}`}
              type="button"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={VIEWPORT_ONCE}
              transition={{
                delay: staggerMasonry(i, 4, niche),
                duration: dur,
                ease: EASE_OUT_STRONG,
              }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setLightboxIndex(i)}
              aria-label={interpolate(t.openImage, { n: i + 1 })}
              className="group relative mb-[calc(var(--gs-gap)*0.6)] block w-full cursor-zoom-in break-inside-avoid overflow-hidden rounded-[var(--gs-card-radius)] border border-border bg-muted/30 shadow-sm transition-shadow duration-300 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
            >
              <div className={`relative ${PIN_ASPECTS[i % PIN_ASPECTS.length]}`}>
                {/* Skeleton shimmer — covered once the bitmap fades in */}
                <div aria-hidden className="absolute inset-0 animate-pulse bg-foreground/5" />
                <img
                  src={src}
                  alt={altFor(i)}
                  ref={revealImgIfCached}
                  onLoad={revealImg}
                  className="relative h-full w-full object-cover opacity-0 transition duration-500 ease-out group-hover:scale-[1.04]"
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  onError={handleImgError}
                />
              </div>
              {/* Hover overlay — bottom gradient, zoom affordance, pin index */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/60 via-black/10 to-black/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden>
                <span className="flex h-11 w-11 scale-90 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition duration-300 group-hover:scale-100 group-focus-visible:scale-100">
                  <ZoomIn size={18} />
                </span>
                <span className="absolute bottom-3 start-3 translate-y-1 text-[10px] font-bold uppercase tracking-[0.25em] text-white/90 tabular-nums transition duration-300 ease-out group-hover:translate-y-0 group-focus-visible:translate-y-0">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
            </motion.button>
          ))}
        </div>

        {/* ── CTA ─────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: Y_SM }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEWPORT_ONCE}
          transition={{ delay: 0.25, duration: dur, ease }}
          className="mt-12 flex justify-center"
        >
          <motion.button
            type="button"
            onClick={onViewFull}
            whileHover={{ y: BUTTON_PRESS[flavor].hoverY }}
            whileTap={{ scale: BUTTON_PRESS[flavor].scale }}
            transition={{ duration: BUTTON_PRESS[flavor].duration, ease: EASE_OUT_STRONG }}
            className="group flex min-h-[48px] items-center gap-3 rounded-xl bg-primary px-9 py-4 text-sm font-bold text-primary-foreground shadow-md shadow-accent/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 [transition:background-color_0.3s_cubic-bezier(0.23,1,0.32,1),box-shadow_0.3s_cubic-bezier(0.23,1,0.32,1)]"
          >
            <Images size={16} className="shrink-0" />
            <span>{localeConfig.gallery.explorePortfolio}</span>
            <ArrowRight size={14} className="shrink-0 transition-transform duration-300 group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1" />
          </motion.button>
        </motion.div>
      </div>

      {/* ── Lightbox ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {lightboxIndex !== null && (
          <PinLightbox
            images={images}
            index={lightboxIndex}
            altFor={altFor}
            isRtl={isRtl}
            t={t}
            onClose={() => setLightboxIndex(null)}
            onNavigate={setLightboxIndex}
          />
        )}
      </AnimatePresence>
    </section>
  );
}
