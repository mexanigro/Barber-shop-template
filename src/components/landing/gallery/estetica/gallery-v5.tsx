/**
 * gallery/estetica/gallery-v5.tsx — EDITORIAL COLLAGE (estética).
 *
 * Curated scatter: five frames of unequal sizes overlap an oversized ghost
 * serif word and drift apart on gentle scroll parallax (gated by the global
 * parallax flag). One arch crop, one offset hairline frame, asymmetric grid
 * placement — a beauty-magazine moodboard rather than a uniform grid.
 *
 * Selected when `sections.gallery.variant === "v5"` and niche is estética.
 */
import React from "react";
import { ArrowRight } from "lucide-react";
import { motion, useScroll, useTransform } from "motion/react";
import { cn, handleImgError } from "../../../../lib/utils";
import { localeConfig } from "../../../../config/locale";
import { siteConfig } from "../../../../config/site";
import { interpolate } from "../../../../lib/interpolate";
import { isParallaxEnabled } from "../../../../lib/section-variants";
import {
  Y_SM, Y_LG, VIEWPORT_ONCE,
  getNicheFlavor, NICHE_DURATION, NICHE_EASING, PARALLAX_SPEED, EASE_OUT_STRONG, BUTTON_PRESS,
} from "../../../../lib/motion";

export function EsteticaGalleryV5({ onViewFull }: { onViewFull: () => void }) {
  const { gallery, sections } = siteConfig;
  const sectionConfig = sections.gallery;
  const niche = siteConfig.business.type;
  const flavor = getNicheFlavor(niche);
  const dur = NICHE_DURATION[flavor];
  const ease = NICHE_EASING[flavor];
  const parallax = isParallaxEnabled();

  const sectionRef = React.useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start end", "end start"] });
  const speed = PARALLAX_SPEED[flavor];
  const driftUp = useTransform(scrollYProgress, [0, 1], parallax ? [speed * 140, -speed * 140] : [0, 0]);
  const driftDown = useTransform(scrollYProgress, [0, 1], parallax ? [-speed * 100, speed * 100] : [0, 0]);
  const ghostX = useTransform(scrollYProgress, [0, 1], parallax ? [40, -40] : [0, 0]);

  const items = (Array.isArray(gallery) ? gallery : []).slice(0, 5);
  if (items.length === 0) return null;

  // Ghost word: first word of the section title, oversized behind the collage.
  const ghostWord = (sectionConfig.title || "").split(" ")[0] ?? "";

  return (
    <section ref={sectionRef} id="gallery" className="relative overflow-hidden bg-background py-16 transition-colors duration-300 sm:py-24 lg:py-36">
      {/* ── Ghost serif word ─────────────────────────────────────────── */}
      {ghostWord && (
        <motion.span
          style={{ x: ghostX }}
          className="pointer-events-none absolute top-[44%] start-0 w-full select-none whitespace-nowrap text-center font-serif text-[22vw] font-light italic leading-none text-accent/[0.07] dark:text-accent/[0.05]"
          aria-hidden
        >
          {ghostWord}
        </motion.span>
      )}

      <div className="relative mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="mb-12 max-w-2xl sm:mb-20">
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

        {/* ── Collage canvas ─────────────────────────────────────────── */}
        <div className="grid grid-cols-12 gap-y-10 sm:gap-y-0">

          {/* Frame 1 — large arch, drifts up */}
          <motion.div style={{ y: driftUp }} className="col-span-12 sm:col-span-5 sm:row-start-1">
            <motion.figure
              initial={{ opacity: 0, y: Y_LG }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={VIEWPORT_ONCE}
              transition={{ duration: dur * 1.1, ease }}
              className="group relative overflow-hidden rounded-t-[9rem] rounded-b-[0.5rem] sm:rounded-t-[13rem]"
            >
              <img
                src={items[0]}
                alt={interpolate(localeConfig.gallery.portfolioAlt, { n: 1 })}
                loading="lazy"
                decoding="async"
                onError={handleImgError}
                referrerPolicy="no-referrer"
                className="aspect-[3/4] w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-[1.04]"
              />
            </motion.figure>
          </motion.div>

          {/* Frame 2 — landscape, overlapping from the end side */}
          {items[1] && (
            <motion.div style={{ y: driftDown }} className="col-span-12 sm:col-span-6 sm:col-start-7 sm:row-start-1 sm:mt-24">
              <motion.figure
                initial={{ opacity: 0, y: Y_LG }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={VIEWPORT_ONCE}
                transition={{ duration: dur * 1.1, ease, delay: 0.1 }}
                className="group relative overflow-hidden rounded-[0.5rem] shadow-elevated"
              >
                <img
                  src={items[1]}
                  alt={interpolate(localeConfig.gallery.portfolioAlt, { n: 2 })}
                  loading="lazy"
                  decoding="async"
                  onError={handleImgError}
                  referrerPolicy="no-referrer"
                  className="aspect-[4/3] w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-[1.04]"
                />
              </motion.figure>
            </motion.div>
          )}

          {/* Frame 3 — small square with offset hairline frame */}
          {items[2] && (
            <motion.div style={{ y: driftUp }} className="col-span-7 mt-2 sm:col-span-3 sm:col-start-2 sm:row-start-2 sm:-mt-10">
              <motion.figure
                initial={{ opacity: 0, y: Y_LG }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={VIEWPORT_ONCE}
                transition={{ duration: dur * 1.1, ease, delay: 0.15 }}
                className="group relative"
              >
                <span className="absolute -inset-2.5 rounded-[0.625rem] border border-accent/30" aria-hidden />
                <span className="relative block overflow-hidden rounded-[0.5rem]">
                  <img
                    src={items[2]}
                    alt={interpolate(localeConfig.gallery.portfolioAlt, { n: 3 })}
                    loading="lazy"
                    decoding="async"
                    onError={handleImgError}
                    referrerPolicy="no-referrer"
                    className="aspect-square w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-[1.05]"
                  />
                </span>
              </motion.figure>
            </motion.div>
          )}

          {/* Frame 4 — tall portrait, center column */}
          {items[3] && (
            <motion.div style={{ y: driftDown }} className="col-span-5 mt-10 sm:col-span-4 sm:col-start-6 sm:row-start-2 sm:mt-6">
              <motion.figure
                initial={{ opacity: 0, y: Y_LG }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={VIEWPORT_ONCE}
                transition={{ duration: dur * 1.1, ease, delay: 0.2 }}
                className="group relative overflow-hidden rounded-[0.5rem] shadow-elevated"
              >
                <img
                  src={items[3]}
                  alt={interpolate(localeConfig.gallery.portfolioAlt, { n: 4 })}
                  loading="lazy"
                  decoding="async"
                  onError={handleImgError}
                  referrerPolicy="no-referrer"
                  className="aspect-[3/4] w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-[1.04]"
                />
              </motion.figure>
            </motion.div>
          )}

          {/* Frame 5 — small, end side */}
          {items[4] && (
            <motion.div style={{ y: driftUp }} className="col-span-8 col-start-4 mt-6 sm:col-span-3 sm:col-start-10 sm:row-start-2 sm:mt-20">
              <motion.figure
                initial={{ opacity: 0, y: Y_LG }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={VIEWPORT_ONCE}
                transition={{ duration: dur * 1.1, ease, delay: 0.25 }}
                className="group relative overflow-hidden rounded-t-[5rem] rounded-b-[0.5rem]"
              >
                <img
                  src={items[4]}
                  alt={interpolate(localeConfig.gallery.portfolioAlt, { n: 5 })}
                  loading="lazy"
                  decoding="async"
                  onError={handleImgError}
                  referrerPolicy="no-referrer"
                  className="aspect-[4/5] w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-[1.05]"
                />
              </motion.figure>
            </motion.div>
          )}
        </div>

        {/* ── View-all CTA ───────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: Y_SM }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEWPORT_ONCE}
          transition={{ delay: 0.15, duration: dur, ease }}
          className="mt-14 text-center sm:mt-20"
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
