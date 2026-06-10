/**
 * gallery-v2.tsx — MASONRY editorial wall gallery variant.
 *
 * CSS-columns masonry (2 cols, 3 at lg) with naturally varied aspect
 * ratios cycling 4/5 → 1/1 → 3/4 → 4/3 so the wall feels organic, like
 * a printed contact sheet. Pure editorial: no card chrome, no overlay
 * icons — just photography breathing inside `.gs-image` frames with a
 * slow zoom on hover. Selected via `sections.gallery.variant === "v2"`.
 */
import React from "react";
import { motion } from "motion/react";
import { ArrowRight, Images } from "lucide-react";
import { handleImgError } from "../../../lib/utils";
import { localeConfig } from "../../../config/locale";
import { siteConfig } from "../../../config/site";
import { interpolate } from "../../../lib/interpolate";
import {
  Y_SM, VIEWPORT_ONCE,
  getNicheFlavor, NICHE_DURATION, NICHE_EASING,
  sectionTitleContainerVariants, textWordVariants,
  staggerMasonry, EASE_OUT_STRONG, BUTTON_PRESS,
} from "../../../lib/motion";

/** Aspect-ratio cycle that keeps the column flow organic. */
const ASPECTS = ["aspect-[4/5]", "aspect-square", "aspect-[3/4]", "aspect-[4/3]"] as const;

const MAX_IMAGES = 9;

export function GalleryV2({ onViewFull }: { onViewFull: () => void }) {
  const { gallery, sections, brand } = siteConfig;
  const sectionConfig = sections.gallery;
  const niche = siteConfig.business.type;
  const flavor = getNicheFlavor(niche);
  const dur = NICHE_DURATION[flavor];
  const ease = NICHE_EASING[flavor];

  const safeGallery = Array.isArray(gallery) ? gallery : [];
  const images = safeGallery.slice(0, MAX_IMAGES);

  return (
    <section
      id="gallery"
      className="bg-card px-5 py-16 transition-colors duration-300 sm:px-6 sm:py-28"
    >
      <div className="mx-auto max-w-7xl">

        {/* ── Section header ──────────────────────────────────────── */}
        <div className="mb-10 max-w-2xl sm:mb-14">
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

        {/* ── Masonry wall (CSS columns) ──────────────────────────── */}
        <div className="columns-2 [column-gap:var(--gs-gap)] lg:columns-3">
          {images.map((src, i) => (
            <motion.div
              key={`gallery-v2-${src.slice(-24)}-${i}`}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={VIEWPORT_ONCE}
              transition={{
                delay: staggerMasonry(i, 3, niche),
                duration: dur,
                ease: EASE_OUT_STRONG,
              }}
              onClick={onViewFull}
              className="group mb-[var(--gs-gap)] cursor-pointer break-inside-avoid"
            >
              <div className={`gs-image relative overflow-hidden bg-muted ${ASPECTS[i % ASPECTS.length]}`}>
                <img
                  src={src}
                  alt={`${brand.name} — ${i + 1}`}
                  className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  onError={handleImgError}
                />
                {/* Quiet index marker — editorial caption, no chrome */}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-end bg-gradient-to-t from-black/45 to-transparent p-3 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-white/75 tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
              </div>
            </motion.div>
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
            <span>{interpolate(localeConfig.gallery.viewAllPhotos, { count: safeGallery.length })}</span>
            <ArrowRight size={14} className="shrink-0 transition-transform duration-300 group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1" />
          </motion.button>
        </motion.div>

      </div>
    </section>
  );
}
