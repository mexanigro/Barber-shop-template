/**
 * hero-v5.tsx — PARALLAX LAYERS hero variant.
 *
 * Three depth layers driven by useScroll + useTransform: the background
 * photograph drifts slowest, a huge semi-transparent display word (the
 * title highlight, or the brand initial when it is too long) sits in the
 * mid-layer, and the content layer rises fastest. All parallax is gated
 * behind isParallaxEnabled() + prefers-reduced-motion — the static
 * fallback is a complete composition on its own.
 *
 * Selected via `hero.variant === "v5"` (see Hero.tsx dispatcher).
 */
import React from "react";
import { Calendar, ChevronRight } from "lucide-react";
import { motion, useScroll, useTransform, useReducedMotion } from "motion/react";
import { siteConfig } from "../../../config/site";
import { localeConfig } from "../../../config/locale";
import { isParallaxEnabled, getAnimationLevel, getOverlayOpacity } from "../../../lib/section-variants";
import {
  getNicheFlavor, NICHE_DURATION, NICHE_EASING, NICHE_STAGGER,
  PARALLAX_SPEED, BUTTON_PRESS, EASE_OUT_STRONG, SCROLL_INDICATOR_DELAY,
} from "../../../lib/motion";

function scrollToServices() {
  document.getElementById("services")?.scrollIntoView({ behavior: "smooth" });
}

export function HeroV5({ onBookClick }: { onBookClick: (serviceId?: string) => void }) {
  const { hero, brand, features } = siteConfig;
  const niche = siteConfig.business.type;
  const flavor = getNicheFlavor(niche);
  const dur = NICHE_DURATION[flavor];
  const ease = NICHE_EASING[flavor];
  const step = NICHE_STAGGER[flavor];
  const speed = PARALLAX_SPEED[flavor];

  const prefersReducedMotion = useReducedMotion();
  const parallaxOn =
    isParallaxEnabled() && getAnimationLevel() !== "none" && !prefersReducedMotion;

  const sectionRef = React.useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  /* Depth stack: background slowest → display word → content fastest. */
  const bgY = useTransform(scrollYProgress, [0, 1], [0, speed * 280]);
  const wordY = useTransform(scrollYProgress, [0, 1], [0, -speed * 600]);
  const contentY = useTransform(scrollYProgress, [0, 1], [0, -speed * 900]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.65], [1, 0]);

  const overlayOpacity = getOverlayOpacity(0.5);
  const eyebrow = hero.eyebrow || brand.tagline;
  const stats = features.showHeroStats !== false ? (hero.stats ?? []) : [];

  /* Mid-layer display word: title highlight, or brand initial when long. */
  const highlight = hero.titleHighlight.trim();
  const displayWord =
    highlight && highlight.length <= 14 ? highlight : brand.name.trim().charAt(0);

  return (
    <section
      ref={sectionRef}
      id="hero"
      className="relative flex min-h-[100dvh] items-center overflow-hidden"
    >
      {/* ── Layer 1: background photograph (slowest) ─────────────────── */}
      <motion.div
        className="absolute inset-0 z-0"
        style={parallaxOn ? { y: bgY } : undefined}
      >
        <img
          src={hero.backgroundImage}
          alt=""
          className="absolute inset-0 h-[120%] w-full object-cover"
          loading="eager" fetchPriority="high" decoding="async"
          referrerPolicy="no-referrer"
          aria-hidden
        />
      </motion.div>
      <div
        className="pointer-events-none absolute inset-0 z-[1] bg-black"
        style={{ opacity: overlayOpacity }}
        aria-hidden
      />
      <div
        className="gs-gradient pointer-events-none absolute inset-0 z-[2] bg-gradient-to-t from-black/50 via-transparent to-black/25"
        aria-hidden
      />

      {/* ── Layer 2: oversized display word (mid depth) ──────────────── */}
      <motion.div
        className="pointer-events-none absolute inset-0 z-[3] flex select-none items-center justify-center overflow-hidden"
        style={parallaxOn ? { y: wordY } : undefined}
        aria-hidden
      >
        <motion.span
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: dur * 1.4, ease }}
          className="whitespace-nowrap font-serif text-[clamp(6rem,24vw,22rem)] font-medium uppercase leading-none tracking-tight text-white/[0.07]"
        >
          {displayWord}
        </motion.span>
      </motion.div>

      {/* ── Layer 3: content (fastest) ───────────────────────────────── */}
      <motion.div
        className="relative z-10 mx-auto w-full max-w-7xl px-5 pb-24 pt-24 sm:px-6 lg:px-8"
        style={parallaxOn ? { y: contentY, opacity: contentOpacity } : undefined}
      >
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">

          {eyebrow && (
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: dur, ease }}
              className="mb-5 text-[11px] font-semibold uppercase tracking-[0.3em] text-accent-light sm:mb-6 sm:text-xs"
            >
              {eyebrow}
            </motion.p>
          )}

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: dur * 1.1, ease, delay: step }}
            className="mb-6 text-balance font-serif text-[clamp(2.5rem,7vw,5.25rem)] font-medium leading-[1.05] tracking-tight text-white drop-shadow-[0_2px_24px_rgba(0,0,0,0.5)] sm:mb-7"
          >
            {hero.titlePrefix}{" "}
            <em className="font-serif italic text-accent-light">{hero.titleHighlight}</em>
            {hero.titleSuffix.trim() ? <> {hero.titleSuffix}</> : null}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: dur, ease, delay: step * 2 }}
            className="mb-8 max-w-xl text-pretty text-base font-light leading-relaxed text-white/80 sm:mb-10 md:text-lg"
          >
            {hero.subtitle}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: dur, ease, delay: step * 3 }}
            className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center sm:gap-4"
          >
            {(features.showBooking || features.showInquiry) && (
              <motion.button
                type="button"
                onClick={() => onBookClick()}
                whileHover={{ y: BUTTON_PRESS[flavor].hoverY }}
                whileTap={{ scale: BUTTON_PRESS[flavor].scale }}
                transition={{ duration: BUTTON_PRESS[flavor].duration, ease: EASE_OUT_STRONG }}
                className="group inline-flex min-h-[48px] items-center justify-center gap-2.5 rounded-full bg-primary px-8 py-3.5 text-sm font-semibold text-primary-foreground shadow-xl shadow-black/30 hover:bg-accent-light focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 sm:text-base [transition:background-color_0.3s_cubic-bezier(0.23,1,0.32,1)]"
              >
                <Calendar size={17} className="shrink-0" />
                <span className="truncate">{hero.ctaPrimary}</span>
                <ChevronRight size={15} className="shrink-0 transition-transform duration-300 group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1" />
              </motion.button>
            )}
            {features.showServices && (
              <motion.button
                type="button"
                onClick={scrollToServices}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.16, ease: EASE_OUT_STRONG }}
                className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-white/30 bg-white/10 px-8 py-3.5 text-sm font-semibold text-white backdrop-blur-md hover:border-white/50 hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 sm:text-base [transition:border-color_0.3s_cubic-bezier(0.23,1,0.32,1),background-color_0.3s_cubic-bezier(0.23,1,0.32,1)]"
              >
                <span className="truncate">{hero.ctaSecondary}</span>
              </motion.button>
            )}
          </motion.div>

          {/* Minimal stats row */}
          {stats.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: dur, ease, delay: step * 5 }}
              className="mt-12 flex flex-wrap items-start justify-center gap-x-10 gap-y-5 border-t border-white/15 pt-7 sm:mt-14"
            >
              {stats.map((s, i) => (
                <div key={`${s.label}-${i}`} className="min-w-0 text-center">
                  {/* dir=ltr keeps "12+" from flipping to "+12" in RTL pages */}
                  <p dir="ltr" className="font-serif text-2xl font-medium leading-none tabular-nums text-white sm:text-3xl">{s.value}</p>
                  <p className="mt-1.5 text-[10px] font-medium uppercase tracking-[0.16em] text-white/60 sm:text-xs">{s.label}</p>
                </div>
              ))}
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* ── Scroll cue ───────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: SCROLL_INDICATOR_DELAY, duration: dur }}
        className="absolute bottom-7 left-1/2 z-10 hidden -translate-x-1/2 flex-col items-center gap-2 md:flex"
      >
        <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/50">
          {localeConfig.hero.scrollHint}
        </span>
        {parallaxOn ? (
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="h-10 w-px bg-gradient-to-b from-white/60 to-transparent"
            aria-hidden
          />
        ) : (
          <div className="h-10 w-px bg-gradient-to-b from-white/60 to-transparent" aria-hidden />
        )}
      </motion.div>
    </section>
  );
}
