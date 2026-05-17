import React from "react";
import { ChevronRight, Calendar, Star, Users, Award, Clock } from "lucide-react";
import { motion, useScroll, useTransform, useMotionValue, useInView, animate } from "motion/react";
import { localeConfig } from "../../config/locale";
import { siteConfig } from "../../config/site";
import {
  DUR_HERO, Y_SM, Y_MD,
  getNicheFlavor, NICHE_EASING, NICHE_DURATION,
  textContainerVariants, textWordVariants,
  PARALLAX_SPEED, BUTTON_PRESS, EASE_OUT_STRONG,
  SCROLL_INDICATOR_DELAY, nicheStagger,
} from "../../lib/motion";

const STAT_DEFS = [
  { icon: Users, numericValue: 500, suffix: "+", labelKey: "clientsServed" as const },
  { icon: Award, numericValue: 10, suffix: "", labelKey: "yearsMastery" as const },
  { icon: Star, numericValue: 5.0, suffix: "", decimals: 1, labelKey: "avgRating" as const },
  { icon: Clock, numericValue: 3, suffix: "", labelKey: "masterArtisans" as const },
];

/** Animated counter — counts from 0 to target when in view. */
function CountUp({ target, suffix = "", decimals = 0 }: { target: number; suffix?: string; decimals?: number }) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const count = useMotionValue(0);

  React.useEffect(() => {
    if (!isInView) return;
    const controls = animate(count, target, {
      duration: 2,
      ease: [0.16, 1, 0.3, 1],
    });
    const unsub = count.on("change", (v) => {
      if (ref.current) {
        ref.current.textContent = (decimals > 0 ? v.toFixed(decimals) : Math.round(v).toString()) + suffix;
      }
    });
    return () => { controls.stop(); unsub(); };
  }, [isInView, target, suffix, decimals, count]);

  return <span ref={ref}>0{suffix}</span>;
}

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
  const niche = siteConfig.business.type;
  const isTattoo = niche === "tattoo";
  const isNails = niche === "nails";
  const isEstetica = niche === "estetica";

  // Parallax scroll
  const sectionRef = React.useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end start"] });
  const flavor = getNicheFlavor(niche);
  const parallaxY = useTransform(scrollYProgress, [0, 1], [0, -PARALLAX_SPEED[flavor] * 300]);
  const scrollIndicatorOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);

  const heroBadgeShell = isEstetica
    ? "mb-8 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-5 py-2.5 backdrop-blur-md"
    : isNails
      ? "mb-8 inline-flex items-center gap-2.5 rounded-full border border-accent-light/35 bg-surface-dark/40 px-4 py-2 backdrop-blur-md"
      : "mb-8 inline-flex items-center gap-2.5 rounded-full border border-white/20 bg-black/30 px-4 py-2 backdrop-blur-md";

  return (
    <section ref={sectionRef} id="hero" className="relative flex min-h-screen items-end overflow-hidden pb-0">

      {/* ── Background ─────────────────────────────────────────────── */}
      <div className="absolute inset-0 z-0">
        {/* Image — omitted when LandingBackdrop provides the shared sticky layer */}
        {!omitBackground && (
          <motion.img
            style={{ y: parallaxY }}
            src={hero.backgroundImage}
            className="absolute inset-0 h-[115%] w-full object-cover"
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
            {!isEstetica && [...Array(5)].map((_, i) => (
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

          {/* Headline — word-by-word text reveal */}
          <motion.h1
            variants={textContainerVariants}
            initial="hidden"
            animate="visible"
            className={
              isTattoo
                ? "mb-6 text-5xl font-black leading-[1.05] tracking-wide text-white drop-shadow-[0_2px_24px_rgba(0,0,0,0.6)] sm:text-7xl md:text-8xl"
                : isNails
                  ? "mb-6 text-5xl font-black leading-[1.05] tracking-wide text-white drop-shadow-[0_2px_18px_rgba(111,74,86,0.38)] sm:text-7xl md:text-8xl"
                  : isEstetica
                    ? "mb-6 text-5xl font-normal leading-[1.05] tracking-wide text-white drop-shadow-[0_2px_20px_rgba(0,0,0,0.4)] sm:text-7xl md:text-8xl"
                    : "mb-6 text-5xl font-black leading-[1] tracking-tighter text-white drop-shadow-[0_2px_24px_rgba(0,0,0,0.6)] sm:text-7xl md:text-8xl"
            }
          >
            {hero.titlePrefix.split(" ").map((word, i) => (
              <motion.span key={`p-${i}`} variants={textWordVariants(niche)} className="inline-block">
                {word}&nbsp;
              </motion.span>
            ))}
            <em
              className={
                isTattoo
                  ? "not-italic font-gothic text-accent-light"
                  : isNails
                    ? "not-italic font-serif font-semibold text-accent-light"
                    : "not-italic font-serif font-light text-accent-light"
              }
            >
              {hero.titleHighlight.split(" ").map((word, i) => (
                <motion.span key={`h-${i}`} variants={textWordVariants(niche)} className="inline-block">
                  {word}&nbsp;
                </motion.span>
              ))}
            </em>
            <br />
            <span
              className={
                isTattoo || isNails
                  ? "text-3xl font-semibold tracking-wider text-white/75 sm:text-4xl md:text-5xl"
                  : "text-3xl font-semibold tracking-tight text-white/75 sm:text-4xl md:text-5xl"
              }
            >
              {hero.titleSuffix.split(" ").map((word, i) => (
                <motion.span key={`s-${i}`} variants={textWordVariants(niche)} className="inline-block">
                  {word}&nbsp;
                </motion.span>
              ))}
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
              <motion.button
                type="button"
                onClick={onBookClick}
                whileHover={{ y: BUTTON_PRESS[flavor].hoverY }}
                whileTap={{ scale: BUTTON_PRESS[flavor].scale }}
                transition={{ duration: BUTTON_PRESS[flavor].duration, ease: EASE_OUT_STRONG }}
                className={
                  isEstetica
                    ? "group flex items-center justify-center gap-2.5 rounded-2xl border border-white/15 bg-primary px-8 py-4 text-base font-medium text-primary-foreground shadow-lg transition-colors duration-300 hover:bg-accent-light hover:text-primary-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                    : isTattoo
                      ? "group flex items-center justify-center gap-2.5 bg-primary px-8 py-4 text-base font-bold text-primary-foreground shadow-xl shadow-black/30 transition-colors duration-300 hover:bg-foreground hover:text-background focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                      : isNails
                        ? "group flex items-center justify-center gap-2.5 bg-primary px-8 py-4 text-base font-bold text-primary-foreground shadow-xl shadow-surface-dark/20 transition-colors duration-300 hover:bg-foreground hover:text-background focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                        : "group flex items-center justify-center gap-2.5 rounded-2xl bg-primary px-8 py-4 text-base font-bold text-primary-foreground shadow-xl shadow-black/30 transition-colors duration-300 hover:bg-accent-light hover:text-primary-foreground hover:shadow-accent/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                }
              >
                <Calendar size={18} />
                <span>{hero.ctaPrimary}</span>
                <ChevronRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
              </motion.button>
            )}
            {siteConfig.features.showServices && !isEstetica && (
              <motion.a
                href="#services"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.16, ease: EASE_OUT_STRONG }}
                className={
                  isTattoo
                    ? "flex items-center justify-center gap-2 border border-white/30 bg-white/10 px-8 py-4 text-base font-semibold text-white backdrop-blur-md transition-colors duration-300 hover:border-white/50 hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                    : isNails
                      ? "flex items-center justify-center gap-2 border border-accent-light/35 bg-surface-dark/45 px-8 py-4 text-base font-semibold text-white backdrop-blur-md transition-colors duration-300 hover:border-accent-light/60 hover:bg-surface-dark/65 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                      : "flex items-center justify-center gap-2 rounded-2xl border border-white/25 bg-white/10 px-8 py-4 text-base font-semibold text-white backdrop-blur-md transition-colors duration-300 hover:border-white/40 hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                }
              >
                {hero.ctaSecondary}
              </motion.a>
            )}
          </motion.div>
        </div>

        {/* ── Stats row (hidden for estetica — clinical luxury doesn't use metric badges) ── */}
        {!isEstetica && (
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
          {STAT_DEFS.map(({ icon: Icon, numericValue, suffix, decimals, labelKey }, i) => (
            <motion.div
              key={labelKey}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.9 + i * 0.08, ease: EASE_OUT_STRONG }}
              className={
                isNails
                  ? "flex flex-col items-center gap-1.5 bg-surface-dark/45 px-4 py-5 text-center transition-colors duration-200 hover:bg-surface-dark/60"
                  : "flex flex-col items-center gap-1.5 bg-black/20 px-4 py-5 text-center transition-colors duration-200 hover:bg-black/30"
              }
            >
              <Icon size={18} className="text-accent-light" />
              <span className="font-serif text-2xl font-bold text-white">
                <CountUp target={numericValue} suffix={suffix} decimals={decimals} />
              </span>
              <span className="text-xs font-medium uppercase tracking-widest text-white/55">
                {localeConfig.hero.stats[labelKey]}
              </span>
            </motion.div>
          ))}
        </motion.div>
        )}
      </div>

      {/* ── Scroll indicator — fades out as user scrolls ────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: SCROLL_INDICATOR_DELAY, duration: DUR_HERO }}
        style={{ opacity: scrollIndicatorOpacity }}
        className="absolute bottom-8 end-8 z-20 hidden flex-col items-center gap-2 md:flex"
      >
        <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/40 [writing-mode:vertical-rl]">
          {localeConfig.hero.scrollHint}
        </span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          className="h-12 w-px bg-gradient-to-b from-accent-light/70 to-transparent"
        />
      </motion.div>
    </section>
  );
}
