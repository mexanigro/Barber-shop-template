import React from "react";
import { ChevronRight, Calendar, Star, Users, Award, Clock } from "lucide-react";
import { motion } from "motion/react";
import { localeConfig } from "../../config/locale";
import { siteConfig } from "../../config/site";
import { DUR_HERO, Y_SM, Y_MD } from "../../lib/motion";

const STAT_DEFS = [
  { icon: Users, value: "500+", labelKey: "clientsServed" as const },
  { icon: Award, value: "10", labelKey: "yearsMastery" as const },
  { icon: Star, value: "5.0", labelKey: "avgRating" as const },
  { icon: Clock, value: "3", labelKey: "masterArtisans" as const },
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
  const isTattoo = siteConfig.business.type === "tattoo";
  const isNails = siteConfig.business.type === "nails";

  const heroBadgeShell = isNails
    ? "mb-8 inline-flex items-center gap-2.5 rounded-full border border-accent-light/35 bg-surface-dark/40 px-4 py-2 backdrop-blur-md"
    : "mb-8 inline-flex items-center gap-2.5 rounded-full border border-white/20 bg-black/30 px-4 py-2 backdrop-blur-md";

  return (
    <section className="relative flex min-h-screen items-end overflow-hidden pb-0">

      {/* ── Background ─────────────────────────────────────────────── */}
      <div className="absolute inset-0 z-0">
        {/* Image — omitted when LandingBackdrop provides the shared sticky layer */}
        {!omitBackground && (
          <img
            src={hero.backgroundImage}
            className="absolute inset-0 h-full w-full object-cover"
            alt={localeConfig.hero.backgroundAlt}
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
            initial={{ opacity: 0, y: Y_SM }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: DUR_HERO }}
            className={heroBadgeShell}
          >
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={12} className="text-accent-light" fill="currentColor" />
            ))}
            <span
              className={
                isTattoo
                  ? "ml-1 font-gothic text-sm text-white/90"
                  : isNails
                    ? "ml-1 font-script text-sm text-white/90"
                    : "ml-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/90"
              }
            >
              {siteConfig.brand.tagline}
            </span>
          </motion.div>

          {/* Headline — serif accent word mixed with sans */}
          <motion.h1
            initial={{ opacity: 0, y: Y_MD }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: DUR_HERO + 0.1, delay: 0.15 }}
            className={
              isTattoo
                ? "mb-6 text-5xl font-black leading-[1.05] tracking-wide text-white drop-shadow-[0_2px_24px_rgba(0,0,0,0.6)] sm:text-7xl md:text-8xl"
                : isNails
                  ? "mb-6 text-5xl font-black leading-[1.05] tracking-wide text-white drop-shadow-[0_2px_18px_rgba(111,74,86,0.38)] sm:text-7xl md:text-8xl"
                  : "mb-6 text-5xl font-black leading-[1] tracking-tighter text-white drop-shadow-[0_2px_24px_rgba(0,0,0,0.6)] sm:text-7xl md:text-8xl"
            }
          >
            {hero.titlePrefix}{" "}
            <em
              className={
                isTattoo
                  ? "not-italic font-gothic text-accent-light"
                  : isNails
                    ? "not-italic font-serif font-semibold text-accent-light"
                    : "not-italic font-serif font-light text-accent-light"
              }
            >
              {hero.titleHighlight}
            </em>
            <br />
            <span
              className={
                isTattoo || isNails
                  ? "text-3xl font-semibold tracking-wider text-white/75 sm:text-4xl md:text-5xl"
                  : "text-3xl font-semibold tracking-tight text-white/75 sm:text-4xl md:text-5xl"
              }
            >
              {hero.titleSuffix}
            </span>
          </motion.h1>

          {/* Decorative rule */}
          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ duration: DUR_HERO, delay: 0.4 }}
            className="mb-6 h-px w-24 origin-left bg-gradient-to-r from-accent-light to-transparent"
          />

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: Y_SM }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: DUR_HERO, delay: 0.5 }}
            className="mb-10 max-w-xl text-base font-light leading-relaxed text-white/75 md:text-lg"
          >
            {hero.subtitle}
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: Y_SM }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: DUR_HERO, delay: 0.65 }}
            className="flex flex-col gap-3 sm:flex-row sm:items-center"
          >
            {siteConfig.features.showBooking && (
              <button
                type="button"
                onClick={onBookClick}
                className={
                  isTattoo
                    ? "group flex items-center justify-center gap-2.5 bg-primary px-8 py-4 text-base font-bold text-primary-foreground shadow-xl shadow-black/30 transition-all duration-300 hover:bg-foreground hover:text-background hover:-translate-y-0.5 hover:shadow-2xl active:scale-95 active:translate-y-0"
                    : isNails
                      ? "group flex items-center justify-center gap-2.5 bg-primary px-8 py-4 text-base font-bold text-primary-foreground shadow-xl shadow-surface-dark/20 transition-all duration-300 hover:bg-foreground hover:text-background hover:-translate-y-0.5 hover:shadow-2xl active:scale-95 active:translate-y-0"
                      : "group flex items-center justify-center gap-2.5 rounded-2xl bg-primary px-8 py-4 text-base font-bold text-primary-foreground shadow-xl shadow-black/30 transition-all duration-300 hover:bg-accent-light hover:text-zinc-950 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-accent/30 active:scale-95 active:translate-y-0"
                }
              >
                <Calendar size={18} />
                <span>{hero.ctaPrimary}</span>
                <ChevronRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
              </button>
            )}
            {siteConfig.features.showServices && (
              <a
                href="#services"
                className={
                  isTattoo
                    ? "flex items-center justify-center gap-2 border border-white/30 bg-white/10 px-8 py-4 text-base font-semibold text-white backdrop-blur-md transition-all duration-300 hover:border-white/50 hover:bg-white/20 active:scale-95"
                    : isNails
                      ? "flex items-center justify-center gap-2 border border-accent-light/35 bg-surface-dark/45 px-8 py-4 text-base font-semibold text-white backdrop-blur-md transition-all duration-300 hover:border-accent-light/60 hover:bg-surface-dark/65 active:scale-95"
                      : "flex items-center justify-center gap-2 rounded-2xl border border-white/25 bg-white/10 px-8 py-4 text-base font-semibold text-white backdrop-blur-md transition-all duration-300 hover:border-white/40 hover:bg-white/20 active:scale-95"
                }
              >
                {hero.ctaSecondary}
              </a>
            )}
          </motion.div>
        </div>

        {/* ── Stats row ──────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: Y_MD }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: DUR_HERO, delay: 0.85 }}
          className={
            isNails
              ? "mt-16 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-accent-light/20 bg-surface-dark/35 backdrop-blur-md sm:grid-cols-4"
              : "mt-16 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 backdrop-blur-md sm:grid-cols-4"
          }
        >
          {STAT_DEFS.map(({ icon: Icon, value, labelKey }) => (
            <div
              key={labelKey}
              className={
                isNails
                  ? "flex flex-col items-center gap-1.5 bg-surface-dark/45 px-4 py-5 text-center transition-colors duration-200 hover:bg-surface-dark/60"
                  : "flex flex-col items-center gap-1.5 bg-black/20 px-4 py-5 text-center transition-colors duration-200 hover:bg-black/30"
              }
            >
              <Icon size={18} className="text-accent-light" />
              <span className="font-serif text-2xl font-bold text-white">{value}</span>
              <span className="text-xs font-medium uppercase tracking-widest text-white/55">
                {localeConfig.hero.stats[labelKey]}
              </span>
            </div>
          ))}
        </motion.div>
      </div>

      {/* ── Scroll indicator ───────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: DUR_HERO }}
        className="absolute bottom-8 end-8 z-20 hidden flex-col items-center gap-2 md:flex"
      >
        <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/40 [writing-mode:vertical-rl]">
          {localeConfig.hero.scrollHint}
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
