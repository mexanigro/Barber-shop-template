import React from "react";
import { motion } from "motion/react";
import { ArrowRight, Images } from "lucide-react";
import { cn, handleImgError } from "../../lib/utils";
import { localeConfig } from "../../config/locale";
import { siteConfig } from "../../config/site";
import { interpolate } from "../../lib/interpolate";
import {
  Y_SM, Y_MD, Y_LG, X_IN, VIEWPORT_ONCE,
  getNicheFlavor, nicheStagger, NICHE_DURATION, NICHE_EASING,
  sectionTitleContainerVariants, textWordVariants,
  nicheScaleIn, staggerMasonry, EASE_OUT_STRONG, BUTTON_PRESS,
} from "../../lib/motion";

export function Gallery({ onViewFull }: { onViewFull: () => void }) {
  const { gallery, sections } = siteConfig;
  const { gallery: sectionConfig } = sections;
  const niche = siteConfig.business.type;
  const flavor = getNicheFlavor(niche);
  const stagger = nicheStagger(niche);
  const isTattoo = niche === "tattoo";
  const isNails = niche === "nails";
  const isEstetica = niche === "estetica";
  // Tattoo shows 8 images (varied portfolio), others show 6
  const safeGallery = gallery ?? [];
  const previewImages = safeGallery.slice(0, isTattoo ? 8 : 6);

  return (
    <section id="gallery" className="bg-card px-6 py-28 transition-colors duration-300">
      <div className="mx-auto max-w-7xl">

        {/* ── Section header ──────────────────────────────────────── */}
        <div className="mb-14 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <motion.p
              initial={{ opacity: 0, y: Y_SM }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={VIEWPORT_ONCE}
              className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-accent-light"
            >
              {sectionConfig.title}
            </motion.p>
            <motion.h2
              variants={sectionTitleContainerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={VIEWPORT_ONCE}
              className={
                isEstetica
                  ? "text-4xl font-normal tracking-wide text-card-foreground md:text-5xl"
                  : isNails
                    ? "text-4xl font-black uppercase tracking-wide text-card-foreground md:text-6xl"
                    : "text-4xl font-black uppercase tracking-tighter text-card-foreground md:text-6xl"
              }
            >
              {sectionConfig.subtitle.split(" ").map((word: string, i: number) => (
                <motion.span key={i} variants={textWordVariants(niche)} className="inline-block">
                  {word}&nbsp;
                </motion.span>
              ))}
            </motion.h2>
          </div>

          <motion.button
            initial={{ opacity: 0, x: X_IN }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={VIEWPORT_ONCE}
            transition={{ delay: 0.2 }}
            onClick={onViewFull}
            whileHover={{ y: BUTTON_PRESS[flavor].hoverY }}
            whileTap={{ scale: BUTTON_PRESS[flavor].scale }}
            className={cn(
              "group flex shrink-0 items-center gap-2.5 self-start border border-border bg-background px-5 py-3 text-sm font-semibold text-foreground transition-colors duration-300 hover:border-accent/30 hover:text-accent-light md:self-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
              isTattoo ? "rounded-lg" : isNails ? "rounded-2xl" : "rounded-xl",
            )}
          >
            <Images size={16} />
            <span>
              {interpolate(localeConfig.gallery.viewAllPhotos, { count: safeGallery.length })}
            </span>
            <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" />
          </motion.button>
        </div>

        {/* ── Preview grid ────────────────────────────────────────── */}
        {isTattoo ? (
          /* ── Tattoo: masonry-style 4-col grid with varied spans ──── */
          <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4 lg:gap-4">
            {previewImages.map((src, i) => {
              // Masonry pattern: items 0,3,5 are tall (span 2 rows)
              const isTall = i === 0 || i === 3 || i === 5;
              return (
                <motion.div
                  key={`gallery-${src.slice(-20)}-${i}`}
                  initial={{ opacity: 0, scale: 0.94 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={VIEWPORT_ONCE}
                  transition={{ delay: staggerMasonry(i, 4, niche), duration: NICHE_DURATION[flavor] * 1.1, ease: EASE_OUT_STRONG }}
                  onClick={onViewFull}
                  className={cn(
                    "group relative cursor-pointer overflow-hidden rounded-lg border border-border bg-muted/30 shadow-sm transition-shadow duration-200 hover:shadow-xl",
                    isTall && "row-span-2",
                  )}
                >
                  <div className={cn(isTall ? "aspect-[3/5] md:aspect-auto md:h-full" : "aspect-square", "bg-muted")}>
                    <img
                      src={src}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
                      alt={interpolate(localeConfig.gallery.portfolioAlt, { n: i + 1 })}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      onError={handleImgError}
                    />
                  </div>
                  {/* Sharp hover overlay — tattoo style */}
                  <div className="absolute inset-0 flex items-end justify-between bg-gradient-to-t from-black/80 via-black/10 to-transparent p-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-white/60">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="flex h-6 w-6 items-center justify-center border border-white/20 bg-black/40 backdrop-blur-sm">
                      <ArrowRight size={10} className="text-white" />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : isNails ? (
          /* ── Nails: square 1:1 Instagram-style grid ──────────────── */
          <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 lg:gap-4">
            {previewImages.map((src, i) => (
              <motion.div
                key={`gallery-${src.slice(-20)}-${i}`}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={VIEWPORT_ONCE}
                transition={{ delay: staggerMasonry(i, 3, niche), duration: NICHE_DURATION[flavor] * 1.1, ease: EASE_OUT_STRONG }}
                onClick={onViewFull}
                className="group relative cursor-pointer overflow-hidden rounded-3xl border border-border bg-muted/30 shadow-sm transition-shadow duration-500 hover:shadow-xl hover:shadow-accent/10"
              >
                <div className="aspect-square bg-muted">
                  <img
                    src={src}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                    alt={interpolate(localeConfig.gallery.portfolioAlt, { n: i + 1 })}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={handleImgError}
                  />
                </div>
                {/* Soft blur overlay — nails style */}
                <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/50 via-transparent to-transparent p-4 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                  <div className="flex w-full items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-white/80">
                      {interpolate(localeConfig.gallery.workNumber, {
                        n: String(i + 1).padStart(2, "0"),
                      })}
                    </span>
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 backdrop-blur-md">
                      <ArrowRight size={11} className="text-white" />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          /* ── Default (barbería / estética): clean 4:3 grid ────────── */
          <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 lg:gap-4">
            {previewImages.map((src, i) => (
              <motion.div
                key={`gallery-${src.slice(-20)}-${i}`}
                initial={{ opacity: 0, scale: 0.93 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={VIEWPORT_ONCE}
                transition={{ delay: staggerMasonry(i, 3, niche), duration: NICHE_DURATION[flavor] * 1.1, ease: EASE_OUT_STRONG }}
                whileHover={{ y: -4 }}
                onClick={onViewFull}
                className="group relative cursor-pointer overflow-hidden rounded-2xl border border-border bg-muted/30 shadow-sm transition-shadow duration-300 hover:shadow-xl lg:rounded-3xl"
              >
                <div className="aspect-[4/3] bg-muted">
                  <img
                    src={src}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.05]"
                    alt={interpolate(localeConfig.gallery.portfolioAlt, { n: i + 1 })}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={handleImgError}
                  />
                </div>
                {/* Hover overlay */}
                <div className="absolute inset-0 flex items-end justify-between bg-gradient-to-t from-black/70 via-transparent to-transparent p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-white/70">
                    {interpolate(localeConfig.gallery.workNumber, {
                      n: String(i + 1).padStart(2, "0"),
                    })}
                  </span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm">
                    <ArrowRight size={12} className="text-white" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* ── CTA row ─────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: Y_SM }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEWPORT_ONCE}
          transition={{ delay: 0.3 }}
          className="mt-10 flex justify-center"
        >
          <motion.button
            onClick={onViewFull}
            whileHover={{ y: BUTTON_PRESS[flavor].hoverY }}
            whileTap={{ scale: BUTTON_PRESS[flavor].scale }}
            transition={{ duration: BUTTON_PRESS[flavor].duration, ease: EASE_OUT_STRONG }}
            className="group flex items-center gap-3 rounded-2xl bg-primary px-10 py-4 text-sm font-bold text-primary-foreground shadow-md shadow-accent/20 transition-colors duration-300 hover:bg-accent-light hover:text-primary-foreground hover:shadow-lg hover:shadow-accent/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
          >
            <Images size={16} />
            <span>{localeConfig.gallery.explorePortfolio}</span>
            <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" />
          </motion.button>
        </motion.div>

      </div>
    </section>
  );
}
