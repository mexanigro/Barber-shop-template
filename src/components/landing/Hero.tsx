import React from "react";
import { ChevronRight, Calendar, Star, Users, Award, Clock } from "lucide-react";
import { motion } from "motion/react";
import { siteConfig } from "../../config/site";

const STATS = [
  { icon: Users,  value: "500+",  label: "Clients Served"  },
  { icon: Award,  value: "10",    label: "Years of Mastery" },
  { icon: Star,   value: "5.0",   label: "Average Rating"  },
  { icon: Clock,  value: "3",     label: "Master Artisans" },
];

export function Hero({
  onBookClick,
  /**
   * Pass true when Hero is rendered inside LandingBackdrop, which already
   * provides the background image via a shared sticky layer. When true, the
   * <img> is not duplicated; only the gradient overlays are kept for text
   * contrast. The bottom anchor gradient is also omitted because Services
   * handles its own visual separation via overFixedBackdrop.
   */
  omitBackground = false,
}: {
  onBookClick: () => void;
  omitBackground?: boolean;
}) {
  const { hero } = siteConfig;

  return (
    <section className="relative flex min-h-screen items-end overflow-hidden pb-0">

      {/* ── Background ─────────────────────────────────────────────── */}
      <div className="absolute inset-0 z-0">
        {/* Image — omitted when LandingBackdrop provides the shared sticky layer */}
        {!omitBackground && (
          <img
            src={hero.backgroundImage}
            className="absolute inset-0 h-full w-full object-cover"
            alt="Barbershop atmosphere"
            loading="eager"
            referrerPolicy="no-referrer"
          />
        )}
        {/* Cinematic vignette — always kept for text contrast over the image */}
        <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-br from-black/60 via-black/30 to-black/60 dark:from-black/40 dark:via-black/15 dark:to-black/45" aria-hidden />
        {/* Bottom anchor — only when Hero has its own standalone image.
            When using LandingBackdrop, Services handles the visual separation. */}
        {!omitBackground && (
          <div className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-t from-background via-black/30 to-transparent" aria-hidden />
        )}
        {/* Subtle left shadow for left-aligned text contrast */}
        <div className="pointer-events-none absolute inset-0 z-[3] bg-gradient-to-r from-black/40 via-transparent to-transparent" aria-hidden />
      </div>

      {/* ── Content ─────────────────────────────────────────────────── */}
      <div className="relative z-20 mx-auto w-full max-w-7xl px-6 pb-24 pt-40 md:pb-32 md:pt-48">
        <div className="max-w-3xl">

          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-8 inline-flex items-center gap-2.5 rounded-full border border-white/20 bg-black/30 px-4 py-2 backdrop-blur-md"
          >
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={12} className="text-accent-light" fill="currentColor" />
            ))}
            <span className="ml-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/90">
              {siteConfig.brand.tagline}
            </span>
          </motion.div>

          {/* Headline — serif accent word mixed with sans */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15 }}
            className="mb-6 text-5xl font-black leading-[1] tracking-tighter text-white drop-shadow-[0_2px_24px_rgba(0,0,0,0.6)] sm:text-7xl md:text-8xl"
          >
            {hero.titlePrefix}{" "}
            <em className="not-italic font-serif font-light text-accent-light">
              {hero.titleHighlight}
            </em>
            <br />
            <span className="text-3xl font-semibold tracking-tight text-white/75 sm:text-4xl md:text-5xl">
              {hero.titleSuffix}
            </span>
          </motion.h1>

          {/* Decorative rule */}
          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mb-6 h-px w-24 origin-left bg-gradient-to-r from-accent-light to-transparent"
          />

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5 }}
            className="mb-10 max-w-xl text-base font-light leading-relaxed text-white/75 md:text-lg"
          >
            {hero.subtitle}
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.65 }}
            className="flex flex-col gap-3 sm:flex-row sm:items-center"
          >
            {siteConfig.features.showBooking && (
              <button
                type="button"
                onClick={onBookClick}
                className="group flex items-center justify-center gap-2.5 rounded-2xl bg-primary px-8 py-4 text-base font-bold text-primary-foreground shadow-xl shadow-black/30 transition-all duration-300 hover:bg-accent-light hover:text-zinc-950 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-accent/30 active:scale-95 active:translate-y-0"
              >
                <Calendar size={18} />
                <span>{hero.ctaPrimary}</span>
                <ChevronRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
              </button>
            )}
            {siteConfig.features.showServices && (
              <a
                href="#services"
                className="flex items-center justify-center gap-2 rounded-2xl border border-white/25 bg-white/10 px-8 py-4 text-base font-semibold text-white backdrop-blur-md transition-all duration-300 hover:border-white/40 hover:bg-white/20 active:scale-95"
              >
                {hero.ctaSecondary}
              </a>
            )}
          </motion.div>
        </div>

        {/* ── Stats row ──────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.85 }}
          className="mt-16 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 backdrop-blur-md sm:grid-cols-4"
        >
          {STATS.map(({ icon: Icon, value, label }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-1.5 bg-black/20 px-4 py-5 text-center transition-colors duration-200 hover:bg-black/30"
            >
              <Icon size={18} className="text-accent-light" />
              <span className="font-serif text-2xl font-bold text-white">{value}</span>
              <span className="text-xs font-medium uppercase tracking-widest text-white/55">{label}</span>
            </div>
          ))}
        </motion.div>
      </div>

      {/* ── Scroll indicator ───────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 0.6 }}
        className="absolute bottom-8 right-8 z-20 hidden flex-col items-center gap-2 md:flex"
      >
        <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/40 [writing-mode:vertical-rl]">
          Scroll
        </span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="h-10 w-px bg-gradient-to-b from-accent-light/70 to-transparent"
        />
      </motion.div>
    </section>
  );
}
