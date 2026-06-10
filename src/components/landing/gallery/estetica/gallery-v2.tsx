/**
 * gallery/estetica/gallery-v2.tsx — GLOW MASONRY (estética).
 *
 * Soft porcelain masonry: CSS-columns waterfall where the leading tiles wear
 * the arch crop and the rest stay on the clinical radius. Hovering lifts a
 * warm veil with the work number; row-aware stagger keeps the entrance calm.
 * Quietest of the estética gallery family — the imagery breathes, nothing
 * shouts.
 *
 * Selected when `sections.gallery.variant === "v2"` and niche is estética.
 */
import React from "react";
import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import { cn, handleImgError } from "../../../../lib/utils";
import { localeConfig } from "../../../../config/locale";
import { siteConfig } from "../../../../config/site";
import { interpolate } from "../../../../lib/interpolate";
import {
  Y_SM, Y_LG, VIEWPORT_ONCE,
  getNicheFlavor, NICHE_DURATION, NICHE_EASING, EASE_OUT_STRONG, BUTTON_PRESS,
} from "../../../../lib/motion";

export function EsteticaGalleryV2({ onViewFull }: { onViewFull: () => void }) {
  const { gallery, sections } = siteConfig;
  const sectionConfig = sections.gallery;
  const niche = siteConfig.business.type;
  const flavor = getNicheFlavor(niche);
  const dur = NICHE_DURATION[flavor];
  const ease = NICHE_EASING[flavor];

  const items = (Array.isArray(gallery) ? gallery : []).slice(0, 8);

  return (
    <section id="gallery" className="bg-background py-16 transition-colors duration-300 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">

        {/* ── Centered header ────────────────────────────────────────── */}
        <div className="mx-auto mb-12 max-w-2xl text-center sm:mb-16">
          <motion.p
            initial={{ opacity: 0, y: Y_SM }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT_ONCE}
            transition={{ duration: dur, ease }}
            className="mb-3 inline-flex items-center gap-3 text-[10px] font-medium uppercase tracking-[0.32em] text-accent-light sm:text-xs"
          >
            <span className="h-px w-7 bg-accent/50" aria-hidden />
            {sectionConfig.subtitle}
            <span className="h-px w-7 bg-accent/50" aria-hidden />
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

        {/* ── Masonry columns ────────────────────────────────────────── */}
        <div className="columns-2 gap-[var(--gs-gap)] md:columns-3 [&>*]:mb-[var(--gs-gap)]">
          {items.map((src, index) => {
            const isArch = index < 3 && index % 2 === 0;
            const tall = index % 3 === 0;
            return (
              <motion.figure
                key={`${src}-${index}`}
                initial={{ opacity: 0, y: Y_LG }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={VIEWPORT_ONCE}
                transition={{ duration: dur, ease, delay: Math.min(index * 0.07, 0.42) }}
                className={cn(
                  "group relative break-inside-avoid overflow-hidden",
                  isArch ? "rounded-t-[6.5rem] rounded-b-[0.5rem] sm:rounded-t-[9rem]" : "rounded-[0.5rem]",
                )}
              >
                <img
                  src={src}
                  alt={interpolate(localeConfig.gallery.portfolioAlt, { n: index + 1 })}
                  loading="lazy"
                  decoding="async"
                  onError={handleImgError}
                  referrerPolicy="no-referrer"
                  className={cn(
                    "w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-[1.045]",
                    tall ? "aspect-[3/4]" : "aspect-square",
                  )}
                />
                {/* Warm veil + work number on hover/focus */}
                <figcaption className="pointer-events-none absolute inset-0 flex items-end bg-gradient-to-t from-black/45 via-black/0 to-transparent p-4 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                  <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/90">
                    {interpolate(localeConfig.gallery.workNumber, { n: index + 1 })}
                  </span>
                </figcaption>
              </motion.figure>
            );
          })}
        </div>

        {/* ── View-all CTA ───────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: Y_SM }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEWPORT_ONCE}
          transition={{ delay: 0.15, duration: dur, ease }}
          className="mt-10 text-center sm:mt-14"
        >
          <motion.button
            type="button"
            onClick={onViewFull}
            whileHover={{ y: BUTTON_PRESS[flavor].hoverY }}
            whileTap={{ scale: BUTTON_PRESS[flavor].scale }}
            transition={{ duration: BUTTON_PRESS[flavor].duration, ease: EASE_OUT_STRONG }}
            className="group inline-flex min-h-[48px] items-center justify-center gap-2.5 rounded-full border border-accent/35 px-8 py-3.5 text-sm font-medium text-accent hover:border-accent hover:bg-accent hover:text-primary-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 [transition:background-color_0.35s_cubic-bezier(0.23,1,0.32,1),border-color_0.35s_cubic-bezier(0.23,1,0.32,1),color_0.35s_cubic-bezier(0.23,1,0.32,1)]"
          >
            <span className="truncate">{interpolate(localeConfig.gallery.viewAllPhotos, { count: (Array.isArray(gallery) ? gallery : []).length })}</span>
            <ArrowRight size={15} className="shrink-0 transition-transform duration-300 group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1" aria-hidden />
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
}
