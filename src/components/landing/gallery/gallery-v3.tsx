/**
 * gallery-v3.tsx — LIGHTBOX CAROUSEL gallery variant.
 *
 * A curated filmstrip: one large featured image (16/10) with a thumbnail
 * strip beneath. Clicking the featured image (or pressing Enter on it)
 * opens a full-screen lightbox — prev/next arrows, counter, Escape to
 * close, arrow keys to navigate, focus trapped via useModalA11y, body
 * scroll locked. Selected via `sections.gallery.variant === "v3"`.
 */
import React from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, ChevronLeft, ChevronRight, Expand, Images, X } from "lucide-react";
import { cn, handleImgError, revealImg, revealImgIfCached } from "../../../lib/utils";
import { localeConfig } from "../../../config/locale";
import { siteConfig } from "../../../config/site";
import { interpolate } from "../../../lib/interpolate";
import { useModalA11y } from "../../../hooks/useModalA11y";
import { useSwipeNavigation } from "../../../hooks/useSwipeNavigation";
import {
  Y_SM, VIEWPORT_ONCE,
  getNicheFlavor, NICHE_DURATION, NICHE_EASING,
  sectionTitleContainerVariants, textWordVariants,
  EASE_OUT_STRONG, BUTTON_PRESS,
} from "../../../lib/motion";

type LightboxStrings = {
  openLightbox: string;
  closeLightbox: string;
  previousImage: string;
  nextImage: string;
  imageCounter: string; // "{current} / {total}" semantics live in markup
  thumbnailOf: string;
};

const STRINGS: Record<"en" | "he" | "ru" | "ar", LightboxStrings> = {
  en: {
    openLightbox: "Open image in full screen",
    closeLightbox: "Close",
    previousImage: "Previous image",
    nextImage: "Next image",
    imageCounter: "Image {current} of {total}",
    thumbnailOf: "Show image {n}",
  },
  he: {
    openLightbox: "פתיחת תמונה במסך מלא",
    closeLightbox: "סגירה",
    previousImage: "התמונה הקודמת",
    nextImage: "התמונה הבאה",
    imageCounter: "תמונה {current} מתוך {total}",
    thumbnailOf: "הצגת תמונה {n}",
  },
  ru: {
    openLightbox: "Открыть изображение на весь экран",
    closeLightbox: "Закрыть",
    previousImage: "Предыдущее изображение",
    nextImage: "Следующее изображение",
    imageCounter: "Изображение {current} из {total}",
    thumbnailOf: "Показать изображение {n}",
  },
  ar: {
    openLightbox: "فتح الصورة في وضع ملء الشاشة",
    closeLightbox: "إغلاق",
    previousImage: "الصورة السابقة",
    nextImage: "الصورة التالية",
    imageCounter: "صورة {current} من {total}",
    thumbnailOf: "عرض الصورة {n}",
  },
};

const MAX_IMAGES = 12;

export function GalleryV3({ onViewFull }: { onViewFull: () => void }) {
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
  const total = images.length;

  const [index, setIndex] = React.useState(0);
  const [lightboxOpen, setLightboxOpen] = React.useState(false);

  const closeLightbox = React.useCallback(() => setLightboxOpen(false), []);
  const lightboxRef = useModalA11y(lightboxOpen, closeLightbox);

  const goPrev = React.useCallback(() => {
    setIndex((i) => (i - 1 + total) % total);
  }, [total]);
  const goNext = React.useCallback(() => {
    setIndex((i) => (i + 1) % total);
  }, [total]);

  // Touch swipe — primary navigation on mobile; arrows stay as desktop
  // fallback. Two instances because each surface has its own feedback node.
  const featuredSwipe = useSwipeNavigation({ onPrev: goPrev, onNext: goNext, isRtl, enabled: total > 1 });
  const lightboxSwipe = useSwipeNavigation({ onPrev: goPrev, onNext: goNext, isRtl, enabled: total > 1 });

  // Arrow-key navigation inside the lightbox. Mirrored under RTL so the
  // physical key direction always matches the visual travel direction.
  React.useEffect(() => {
    if (!lightboxOpen) return;
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
  }, [lightboxOpen, isRtl, goPrev, goNext]);

  // Body scroll lock while the lightbox is open.
  React.useEffect(() => {
    if (!lightboxOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [lightboxOpen]);

  // Keep the active thumbnail centered in the strip. Manual scroll math
  // instead of scrollIntoView, which can scroll ancestors. Uses visual rect
  // deltas, which are direction-agnostic — offsetLeft-based math left the
  // active thumb clipped against the strip edge in RTL.
  const stripRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    const strip = stripRef.current;
    const thumb = strip?.children[index] as HTMLElement | undefined;
    if (!strip || !thumb) return;
    if (strip.scrollWidth - strip.clientWidth <= 0) return;
    const stripRect = strip.getBoundingClientRect();
    const thumbRect = thumb.getBoundingClientRect();
    const delta =
      thumbRect.left + thumbRect.width / 2 - (stripRect.left + stripRect.width / 2);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // scrollLeft grows toward the visual right in both directions; the browser
    // clamps to the valid range (negative…0 in RTL) for us.
    strip.scrollTo({ left: strip.scrollLeft + delta, behavior: reduced ? "auto" : "smooth" });
  }, [index, isRtl]);

  if (total === 0) return null;
  const altFor = (i: number) => `${brand.name} — ${i + 1}`;

  return (
    <section
      id="gallery"
      className="bg-card px-5 py-16 transition-colors duration-300 sm:px-6 sm:py-28"
    >
      <div className="mx-auto max-w-6xl">

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

        {/* ── Featured image ──────────────────────────────────────── */}
        <div className="group relative">
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT_ONCE}
            transition={{ duration: dur * 1.1, ease: EASE_OUT_STRONG }}
            onClick={() => setLightboxOpen(true)}
            aria-label={t.openLightbox}
            {...featuredSwipe.handlers}
            style={{ touchAction: "pan-y" }}
            className="gs-image relative block w-full cursor-zoom-in overflow-hidden bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
          >
            <div ref={featuredSwipe.feedbackRef} className="relative aspect-[16/10]">
              {/* Skeleton shimmer — sits behind the bitmap */}
              <div aria-hidden className="absolute inset-0 animate-pulse bg-foreground/5" />
              <AnimatePresence mode="wait" initial={false}>
                <motion.img
                  key={`featured-${index}`}
                  src={images[index]}
                  alt={altFor(index)}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35, ease: EASE_OUT_STRONG }}
                  className="relative h-full w-full object-cover"
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  onError={handleImgError}
                />
              </AnimatePresence>
            </div>
            {/* Expand affordance + counter */}
            <div className="pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/15" aria-hidden />
            <div className="pointer-events-none absolute bottom-4 end-4 flex items-center gap-3" aria-hidden>
              {/* dir=ltr: bidi reorders "1 / 12" into "12 / 1" under RTL. */}
              <span dir="ltr" className="rounded-full bg-black/55 px-3 py-1.5 text-xs font-semibold text-white tabular-nums backdrop-blur-sm">
                {index + 1} / {total}
              </span>
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition-transform duration-300 group-hover:scale-110">
                <Expand size={16} />
              </span>
            </div>
          </motion.button>

          {/* Desktop hover arrows — pointer-events gated so touch devices
              keep swipe as the primary navigation (arrows never intercept). */}
          {total > 1 && (
            <>
              <button
                type="button"
                onClick={goPrev}
                aria-label={t.previousImage}
                className="pointer-events-none absolute start-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white opacity-0 backdrop-blur-sm transition-opacity duration-200 hover:bg-black/75 focus:outline-none focus-visible:pointer-events-auto focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-white/70 group-hover:pointer-events-auto group-hover:opacity-100 sm:start-4"
              >
                <ChevronLeft size={20} className="rtl:-scale-x-100" />
              </button>
              <button
                type="button"
                onClick={goNext}
                aria-label={t.nextImage}
                className="pointer-events-none absolute end-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white opacity-0 backdrop-blur-sm transition-opacity duration-200 hover:bg-black/75 focus:outline-none focus-visible:pointer-events-auto focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-white/70 group-hover:pointer-events-auto group-hover:opacity-100 sm:end-4"
              >
                <ChevronRight size={20} className="rtl:-scale-x-100" />
              </button>
            </>
          )}
        </div>

        {/* ── Thumbnail strip ─────────────────────────────────────── */}
        <motion.div
          ref={stripRef}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEWPORT_ONCE}
          transition={{ delay: 0.15, duration: dur, ease }}
          className="mt-[var(--gs-gap)] flex gap-[calc(var(--gs-gap)*0.5)] overflow-x-auto px-1 pb-2 pt-1"
        >
          {images.map((src, i) => (
            <button
              key={`thumb-${src.slice(-24)}-${i}`}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={interpolate(t.thumbnailOf, { n: i + 1 })}
              aria-current={i === index ? "true" : undefined}
              className={cn(
                "gs-image relative h-16 w-24 shrink-0 cursor-pointer overflow-hidden bg-muted transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 sm:h-20 sm:w-32",
                i === index
                  ? "ring-2 ring-accent ring-offset-2 ring-offset-card"
                  : "opacity-55 hover:opacity-100",
              )}
            >
              <img
                src={src}
                alt=""
                ref={revealImgIfCached}
                onLoad={revealImg}
                className="h-full w-full object-cover opacity-0 transition-opacity duration-500"
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                onError={handleImgError}
              />
            </button>
          ))}
        </motion.div>
      </div>

      {/* ── Full-screen lightbox ──────────────────────────────────── */}
      <AnimatePresence>
        {lightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: EASE_OUT_STRONG }}
            className="fixed inset-0 z-[90] flex items-center justify-center bg-black/90"
            onClick={closeLightbox}
          >
            <motion.div
              ref={lightboxRef}
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
              {...lightboxSwipe.handlers}
              style={{ touchAction: "pan-y" }}
            >
              {/* Close */}
              <button
                type="button"
                onClick={closeLightbox}
                aria-label={t.closeLightbox}
                className="absolute top-4 end-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors duration-200 hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                <X size={20} />
              </button>

              {/* Counter — dir=ltr: bidi reorders "1 / 12" into "12 / 1" in RTL. */}
              <span dir="ltr" className="absolute top-5 start-1/2 z-10 -translate-x-1/2 text-sm font-semibold text-white/80 tabular-nums rtl:translate-x-1/2">
                {index + 1} / {total}
              </span>

              {/* Prev (inline-start) */}
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

              {/* Image — plain wrapper carries the swipe drag-follow
                  transform (the motion.img owns its own scale/opacity). */}
              <div
                ref={lightboxSwipe.feedbackRef}
                className="flex min-w-0 max-h-full max-w-full items-center justify-center"
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.img
                    key={`lightbox-${index}`}
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

              {/* Next (inline-end) */}
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
        )}
      </AnimatePresence>
    </section>
  );
}
