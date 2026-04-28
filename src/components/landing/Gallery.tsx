import React from "react";
import { motion } from "motion/react";
import { ArrowRight, Images } from "lucide-react";
import { localeConfig } from "../../config/locale";
import { siteConfig } from "../../config/site";
import { interpolate } from "../../lib/interpolate";
import { Y_SM, Y_MD, Y_LG, X_IN, staggerGrid, VIEWPORT_ONCE } from "../../lib/motion";

export function Gallery({ onViewFull }: { onViewFull: () => void }) {
  const { gallery, sections } = siteConfig;
  const { gallery: sectionConfig } = sections;
  const previewImages = gallery.slice(0, 6);

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
              initial={{ opacity: 0, y: Y_MD }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={VIEWPORT_ONCE}
              transition={{ delay: 0.1 }}
              className="text-4xl font-black uppercase tracking-tighter text-card-foreground md:text-6xl"
            >
              {sectionConfig.subtitle}
            </motion.h2>
          </div>

          <motion.button
            initial={{ opacity: 0, x: X_IN }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={VIEWPORT_ONCE}
            transition={{ delay: 0.2 }}
            onClick={onViewFull}
            className="group flex shrink-0 items-center gap-2.5 self-start rounded-xl border border-border bg-background px-5 py-3 text-sm font-semibold text-foreground transition-all duration-300 hover:border-accent/30 hover:text-accent-light md:self-auto"
          >
            <Images size={16} />
            <span>
              {interpolate(localeConfig.gallery.viewAllPhotos, { count: gallery.length })}
            </span>
            <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" />
          </motion.button>
        </div>

        {/* ── Preview grid ────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-4">
          {previewImages.map((src, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: Y_LG }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={VIEWPORT_ONCE}
              transition={{ delay: staggerGrid(i) }}
              onClick={onViewFull}
              className="group relative cursor-pointer overflow-hidden rounded-2xl border border-border bg-muted/30 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl lg:rounded-3xl"
            >
              <div className="aspect-[4/3]">
                <img
                  src={src}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.05]"
                  alt={interpolate(localeConfig.gallery.portfolioAlt, { n: i + 1 })}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              </div>
              {/* Hover overlay */}
              <div className="absolute inset-0 flex items-end justify-between bg-gradient-to-t from-black/70 via-transparent to-transparent p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/70">
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

        {/* ── CTA row ─────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: Y_SM }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEWPORT_ONCE}
          transition={{ delay: 0.3 }}
          className="mt-10 flex justify-center"
        >
          <button
            onClick={onViewFull}
            className="group flex items-center gap-3 rounded-2xl bg-primary px-10 py-4 text-sm font-bold text-primary-foreground shadow-md shadow-accent/20 transition-all duration-300 hover:bg-accent-light hover:text-zinc-950 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-accent/30 active:scale-95"
          >
            <Images size={16} />
            <span>{localeConfig.gallery.explorePortfolio}</span>
            <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" />
          </button>
        </motion.div>

      </div>
    </section>
  );
}
