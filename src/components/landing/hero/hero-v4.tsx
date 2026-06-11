/**
 * hero-v4.tsx — MINIMAL CENTERED hero variant.
 *
 * Radical whitespace on solid bg-background: tiny eyebrow, one massive
 * perfectly-set serif headline, one-line subtitle, a single primary CTA
 * plus a quiet text-link secondary, and an optional thin cinematic band
 * of the background image below. The restraint is the design — the work
 * happens in type hierarchy, tracking, and vertical rhythm.
 *
 * Selected via `hero.variant === "v4"` (see Hero.tsx dispatcher).
 */
import React from "react";
import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import { siteConfig } from "../../../config/site";
import { localeConfig } from "../../../config/locale";
import {
  getNicheFlavor, NICHE_DURATION, NICHE_EASING, NICHE_STAGGER,
  BUTTON_PRESS, EASE_OUT_STRONG,
} from "../../../lib/motion";

function scrollToServices() {
  document.getElementById("services")?.scrollIntoView({ behavior: "smooth" });
}

export function HeroV4({ onBookClick }: { onBookClick: (serviceId?: string) => void }) {
  const { hero, brand, features } = siteConfig;
  const niche = siteConfig.business.type;
  const flavor = getNicheFlavor(niche);
  const dur = NICHE_DURATION[flavor];
  const ease = NICHE_EASING[flavor];
  const step = NICHE_STAGGER[flavor];

  const eyebrow = hero.eyebrow || brand.tagline;

  const enter = (order: number) => ({
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: dur, ease, delay: order * step },
  });

  return (
    <section
      id="hero"
      className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-background px-5 pb-0 pt-28 sm:px-6 sm:py-28"
    >
      <div className="flex w-full max-w-5xl flex-col items-center text-center">

        {/* Tiny eyebrow */}
        {eyebrow && (
          <motion.p
            {...enter(0)}
            className="mb-7 text-[10px] font-semibold uppercase tracking-[0.4em] text-muted-foreground sm:mb-9 sm:text-[11px]"
          >
            {eyebrow}
          </motion.p>
        )}

        {/* One massive, perfectly-set headline */}
        <motion.h1
          {...enter(1)}
          className="mb-7 max-w-4xl text-balance font-serif text-[clamp(2.5rem,7.5vw,5.75rem)] font-medium leading-[1.05] tracking-tight text-foreground sm:mb-8"
        >
          {hero.titlePrefix}{" "}
          <em className="font-serif italic text-accent">{hero.titleHighlight}</em>
          {hero.titleSuffix.trim() ? <> {hero.titleSuffix}</> : null}
        </motion.h1>

        {/* One-line subtitle */}
        <motion.p
          {...enter(2)}
          className="mb-10 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:mb-12 md:text-lg"
        >
          {hero.subtitle}
        </motion.p>

        {/* Single primary CTA + quiet text-link secondary */}
        <motion.div {...enter(3)} className="flex flex-col items-center gap-5 sm:flex-row sm:gap-8">
          {(features.showBooking || features.showInquiry) && (
            <motion.button
              type="button"
              onClick={() => onBookClick()}
              whileHover={{ y: BUTTON_PRESS[flavor].hoverY }}
              whileTap={{ scale: BUTTON_PRESS[flavor].scale }}
              transition={{ duration: BUTTON_PRESS[flavor].duration, ease: EASE_OUT_STRONG }}
              className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-primary px-10 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg hover:bg-accent-light focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 sm:text-base [transition:background-color_0.3s_cubic-bezier(0.23,1,0.32,1),box-shadow_0.3s_cubic-bezier(0.23,1,0.32,1)]"
            >
              <span className="truncate">{hero.ctaPrimary}</span>
            </motion.button>
          )}
          {features.showServices && (
            <motion.button
              type="button"
              onClick={scrollToServices}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.16, ease: EASE_OUT_STRONG }}
              className="group inline-flex min-h-[44px] items-center justify-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 sm:text-base [transition:color_0.3s_cubic-bezier(0.23,1,0.32,1)]"
            >
              <span>{hero.ctaSecondary}</span>
              <ArrowRight size={15} className="shrink-0 transition-transform duration-300 group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1" />
            </motion.button>
          )}
        </motion.div>

        {/* Image band — full-bleed portrait drama on mobile, thin cinematic strip at sm+ */}
        {hero.backgroundImage && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: dur * 1.2, ease, delay: 5 * step }}
            className="relative mt-14 aspect-[4/5] w-screen max-w-none overflow-hidden rounded-none sm:mt-20 sm:aspect-[21/6] sm:w-full sm:max-w-4xl sm:rounded-[var(--gs-image-radius)]"
          >
            <img
              src={hero.backgroundImage}
              alt={localeConfig.hero.backgroundAlt}
              className="h-full w-full object-cover"
              loading="eager"
              referrerPolicy="no-referrer"
            />
            {/* Faint veil keeps the band quiet under the typography */}
            <div className="pointer-events-none absolute inset-0 bg-black/10 dark:bg-black/25" aria-hidden />
          </motion.div>
        )}
      </div>
    </section>
  );
}
