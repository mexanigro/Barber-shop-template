import React from "react";
import { ChevronRight, Calendar, Star } from "lucide-react";
import { motion } from "motion/react";
import { siteConfig } from "../../config/site";

export function Hero({ onBookClick }: { onBookClick: () => void }) {
  const { hero } = siteConfig;

  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden">
      {/* Background — same asset in both themes; overlays handle contrast */}
      <div className="absolute inset-0 z-0">
        <img
          src={hero.backgroundImage}
          className="absolute inset-0 h-full w-full scale-[1.03] object-cover saturate-[1.02]"
          alt="Salon atmosphere"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
        {/* Layer 1: cinematic wash — light mode keeps enough density for white type; dark mode lighter so the photo reads */}
        <div
          className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-br from-black/52 via-black/26 to-black/54 dark:from-black/26 dark:via-black/14 dark:to-black/36"
          aria-hidden
        />
        {/* Layer 2: anchor legibility at bottom + open sky at top */}
        <div
          className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-t from-black/[0.72] via-black/22 to-transparent dark:from-black/42 dark:via-black/14 dark:to-transparent"
          aria-hidden
        />
        {/* Layer 3: ultra-light uniform scrim */}
        <div
          className="pointer-events-none absolute inset-0 z-[3] bg-black/[0.08] dark:bg-black/[0.02]"
          aria-hidden
        />
      </div>

      <div className="relative z-20 mx-auto max-w-7xl px-6 pt-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/25 bg-black/25 px-4 py-2 shadow-sm backdrop-blur-md dark:bg-black/35"
        >
          <Star className="text-accent-light" size={16} fill="currentColor" />
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-white dark:text-white/95">
            {siteConfig.brand.tagline}
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mb-8 text-6xl font-black leading-[0.9] tracking-tighter text-white drop-shadow-[0_4px_32px_rgba(0,0,0,0.55)] md:text-9xl dark:drop-shadow-[0_4px_28px_rgba(0,0,0,0.35)]"
        >
          {hero.titlePrefix}{" "}
          <span className="text-accent-light">{hero.titleHighlight}</span>
          <br />
          {hero.titleSuffix}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mx-auto mb-12 max-w-2xl text-lg font-light leading-relaxed text-white/88 dark:text-white/82"
        >
          {hero.subtitle}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="flex flex-col items-center justify-center gap-6 sm:flex-row"
        >
          {siteConfig.features.showBooking && (
            <button
              type="button"
              onClick={onBookClick}
              className="group flex w-full items-center justify-center gap-3 rounded-full bg-primary px-10 py-5 text-lg font-black text-primary-foreground shadow-xl shadow-black/35 transition-all duration-300 hover:bg-accent-light hover:text-zinc-950 hover:shadow-lg"
            >
              <Calendar size={22} />
              <span>{hero.ctaPrimary}</span>
              <ChevronRight className="transition-transform group-hover:translate-x-1" />
            </button>
          )}
          {siteConfig.features.showServices && (
            <a
              href="#services"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/40 bg-white/15 px-10 py-5 text-lg font-bold text-white backdrop-blur-md transition-all duration-300 hover:border-white/55 hover:bg-white/25 dark:border-white/35 dark:bg-white/10 dark:hover:bg-white/18"
            >
              {hero.ctaSecondary}
            </a>
          )}
        </motion.div>
      </div>

      <div className="absolute bottom-12 left-1/2 flex -translate-x-1/2 animate-bounce opacity-50">
        <div className="h-12 w-1 rounded-full bg-gradient-to-b from-accent-light to-transparent" />
      </div>
    </section>
  );
}
