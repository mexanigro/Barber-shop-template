/**
 * hero/estetica/hero-v3.tsx — PORCELAIN VEIL immersive hero (estética).
 *
 * Full-bleed treatment photography under a warm porcelain veil that lifts
 * with scroll: the image breathes (slow scale) while a bottom-anchored
 * editorial block — hairline eyebrow, serif display, one-line subtitle and
 * a single CTA — sits on the brightened lower band. Scroll-driven opacity
 * hands the section over to the page; calm, spa-light and feminine.
 *
 * Selected when `hero.variant === "v3"` and `business.type === "estetica"`.
 */
import React from "react";
import { Calendar } from "lucide-react";
import { motion, useScroll, useTransform } from "motion/react";
import { siteConfig } from "../../../../config/site";
import { localeConfig } from "../../../../config/locale";
import { isParallaxEnabled } from "../../../../lib/section-variants";
import {
  getNicheFlavor, NICHE_DURATION, NICHE_EASING, NICHE_STAGGER,
  textContainerVariants, textWordVariants,
  BUTTON_PRESS, EASE_OUT_STRONG, HERO_SCROLL_FX, SCROLL_INDICATOR_DELAY,
} from "../../../../lib/motion";

export function EsteticaHeroV3({ onBookClick }: { onBookClick: (serviceId?: string) => void }) {
  const { hero, brand, features } = siteConfig;
  const niche = siteConfig.business.type;
  const flavor = getNicheFlavor(niche);
  const dur = NICHE_DURATION[flavor];
  const ease = NICHE_EASING[flavor];
  const step = NICHE_STAGGER[flavor];
  const fx = HERO_SCROLL_FX[flavor];
  const parallax = isParallaxEnabled();

  const sectionRef = React.useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end start"] });
  const imageScale = useTransform(scrollYProgress, [0, 1], parallax ? fx.scaleRange : [1, 1]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.55], [1, 0]);
  const contentY = useTransform(scrollYProgress, [0, 1], parallax ? [0, 90] : [0, 0]);
  const scrollHintOpacity = useTransform(scrollYProgress, [0, 0.12], [1, 0]);

  const eyebrow = hero.eyebrow || brand.tagline;

  const words = (text: string, keyPrefix: string) =>
    text.trim()
      ? text.split(" ").map((word, i) => (
          <motion.span key={`${keyPrefix}-${i}`} variants={textWordVariants(niche)} className="inline-block">
            {word}&nbsp;
          </motion.span>
        ))
      : null;

  return (
    <section ref={sectionRef} id="hero" className="relative flex min-h-[100dvh] items-end overflow-hidden">
      {/* ── Breathing full-bleed photography ─────────────────────────── */}
      <div className="absolute inset-0 z-0">
        <motion.img
          style={{ scale: imageScale }}
          src={hero.backgroundImage}
          alt={localeConfig.hero.backgroundAlt}
          className="absolute inset-0 h-full w-full object-cover"
          loading="eager" fetchPriority="high" decoding="async"
          referrerPolicy="no-referrer"
        />
        {/* Porcelain veil: warm light wash instead of the usual dark scrim */}
        <div className="gs-gradient pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-background via-background/55 to-background/10 dark:from-background dark:via-background/60 dark:to-black/20" aria-hidden />
        <div className="gs-gradient pointer-events-none absolute inset-0 z-[2] bg-[radial-gradient(ellipse_at_50%_110%,var(--secondary),transparent_60%)] opacity-80 dark:opacity-30" aria-hidden />
      </div>

      {/* ── Bottom-anchored editorial block ──────────────────────────── */}
      <motion.div
        style={{ opacity: contentOpacity, y: contentY }}
        className="relative z-10 mx-auto w-full max-w-4xl px-5 pb-20 pt-36 text-center sm:px-6 sm:pb-24"
      >
        {eyebrow && (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: dur, ease, delay: step }}
            className="mb-5 inline-flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.34em] text-foreground/70 sm:mb-7 sm:text-xs"
          >
            <span className="h-px w-8 bg-accent/60" aria-hidden />
            <span>{eyebrow}</span>
            <span className="h-px w-8 bg-accent/60" aria-hidden />
          </motion.p>
        )}

        <motion.h1
          variants={textContainerVariants}
          initial="hidden"
          animate="visible"
          className="mx-auto mb-6 max-w-3xl text-balance font-serif text-[clamp(2.5rem,8vw,5.75rem)] font-light leading-[1.04] text-foreground sm:mb-8"
        >
          {words(hero.titlePrefix, "p")}
          <em className="font-serif italic text-accent">{words(hero.titleHighlight, "h")}</em>
          {hero.titleSuffix.trim() ? " " : null}
          {words(hero.titleSuffix, "s")}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: dur, ease, delay: step * 4 }}
          className="mx-auto mb-9 max-w-lg text-pretty text-[15px] font-light leading-relaxed text-foreground/75 sm:mb-11 md:text-lg"
        >
          {hero.subtitle}
        </motion.p>

        {(features.showBooking || features.showInquiry) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: dur, ease, delay: step * 5 }}
          >
            <motion.button
              type="button"
              onClick={() => onBookClick()}
              whileHover={{ y: BUTTON_PRESS[flavor].hoverY }}
              whileTap={{ scale: BUTTON_PRESS[flavor].scale }}
              transition={{ duration: BUTTON_PRESS[flavor].duration, ease: EASE_OUT_STRONG }}
              className="group inline-flex min-h-[52px] items-center justify-center gap-2.5 rounded-full bg-primary px-10 py-4 text-sm font-medium text-primary-foreground shadow-elevated hover:bg-accent-light focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 sm:text-[15px] [transition:background-color_0.4s_cubic-bezier(0.23,1,0.32,1),box-shadow_0.4s_cubic-bezier(0.23,1,0.32,1)]"
            >
              <Calendar size={17} className="shrink-0" />
              <span className="truncate">{hero.ctaPrimary}</span>
            </motion.button>
          </motion.div>
        )}

        {features.showServices && (
          <motion.a
            href="#services"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: dur, ease, delay: step * 7 }}
            className="group mt-5 inline-flex min-h-[44px] items-center justify-center gap-1.5 text-sm font-medium text-foreground/55 hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 sm:mt-6 [transition:color_0.4s_cubic-bezier(0.23,1,0.32,1)]"
          >
            {hero.ctaSecondary}
          </motion.a>
        )}
      </motion.div>

      {/* ── Scroll hint ──────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: SCROLL_INDICATOR_DELAY, duration: dur }}
        style={{ opacity: scrollHintOpacity }}
        className="absolute bottom-7 start-1/2 z-20 hidden -translate-x-1/2 flex-col items-center gap-2 rtl:translate-x-1/2 md:flex"
      >
        <motion.div
          animate={{ y: [0, 7, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          className="h-10 w-px bg-gradient-to-b from-accent/70 to-transparent"
        />
      </motion.div>
    </section>
  );
}
