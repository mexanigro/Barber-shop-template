/**
 * hero-v2.tsx — SPLIT EDITORIAL hero variant.
 *
 * Asymmetric two-column spread at lg+ (stacked on mobile): oversized
 * editorial typography column (eyebrow kicker, serif display headline with
 * italic highlight, subtitle, CTA pair, quiet stats strip) facing a tall
 * photographic column framed by a thin offset border — a high-end magazine
 * spread, not a SaaS hero.
 *
 * Selected via `hero.variant === "v2"` (see Hero.tsx dispatcher).
 */
import React from "react";
import { Calendar, ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import { siteConfig } from "../../../config/site";
import { localeConfig } from "../../../config/locale";
import {
  getNicheFlavor, NICHE_DURATION, NICHE_EASING, NICHE_STAGGER,
  textContainerVariants, textWordVariants,
  BUTTON_PRESS, EASE_OUT_STRONG,
} from "../../../lib/motion";

function scrollToServices() {
  document.getElementById("services")?.scrollIntoView({ behavior: "smooth" });
}

export function HeroV2({ onBookClick }: { onBookClick: (serviceId?: string) => void }) {
  const { hero, brand, features } = siteConfig;
  const niche = siteConfig.business.type;
  const flavor = getNicheFlavor(niche);
  const dur = NICHE_DURATION[flavor];
  const ease = NICHE_EASING[flavor];
  const step = NICHE_STAGGER[flavor];

  const eyebrow = hero.eyebrow || brand.tagline;
  const stats = features.showHeroStats !== false ? (hero.stats ?? []) : [];

  const words = (text: string, keyPrefix: string) =>
    text.trim()
      ? text.split(" ").map((word, i) => (
          <motion.span key={`${keyPrefix}-${i}`} variants={textWordVariants(niche)} className="inline-block">
            {word}&nbsp;
          </motion.span>
        ))
      : null;

  return (
    <section id="hero" className="relative flex min-h-[100dvh] items-center overflow-hidden bg-background">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-10 px-5 pb-14 pt-24 sm:px-6 sm:pt-28 lg:grid-cols-12 lg:gap-16 lg:px-8 lg:py-28">

        {/* ── Typography column ──────────────────────────────────────── */}
        <div className="min-w-0 lg:col-span-6">

          {/* Eyebrow kicker */}
          {eyebrow && (
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: dur, ease }}
              className="mb-5 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.3em] text-accent sm:mb-7 sm:text-xs"
            >
              <span className="h-px w-8 shrink-0 bg-accent/60" aria-hidden />
              {/* Wrap, don't truncate: at 375px the kicker was cutting off
                  mid-word ("…SANC…"); two tracked-out lines read fine. */}
              <span className="min-w-0 leading-relaxed">{eyebrow}</span>
            </motion.p>
          )}

          {/* Display headline — serif, italic highlight */}
          <motion.h1
            variants={textContainerVariants}
            initial="hidden"
            animate="visible"
            className="mb-6 font-serif text-[clamp(2.5rem,6.5vw,5.25rem)] font-medium leading-[1.04] tracking-tight text-foreground sm:mb-8"
          >
            {words(hero.titlePrefix, "p")}
            <em className="font-serif italic text-accent">
              {words(hero.titleHighlight, "h")}
            </em>
            {hero.titleSuffix.trim() ? <br /> : null}
            {words(hero.titleSuffix, "s")}
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: dur, ease, delay: step * 3 }}
            className="mb-8 max-w-md text-base leading-relaxed text-muted-foreground sm:mb-10 md:text-lg"
          >
            {hero.subtitle}
          </motion.p>

          {/* CTA pair */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: dur, ease, delay: step * 4 }}
            className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6"
          >
            {(features.showBooking || features.showInquiry) && (
              <motion.button
                type="button"
                onClick={() => onBookClick()}
                whileHover={{ y: BUTTON_PRESS[flavor].hoverY }}
                whileTap={{ scale: BUTTON_PRESS[flavor].scale }}
                transition={{ duration: BUTTON_PRESS[flavor].duration, ease: EASE_OUT_STRONG }}
                className="inline-flex min-h-[48px] items-center justify-center gap-2.5 rounded-full bg-primary px-8 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg hover:bg-accent-light focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 sm:text-base [transition:background-color_0.3s_cubic-bezier(0.23,1,0.32,1),box-shadow_0.3s_cubic-bezier(0.23,1,0.32,1)]"
              >
                <Calendar size={17} className="shrink-0" />
                <span className="truncate">{hero.ctaPrimary}</span>
              </motion.button>
            )}
            {features.showServices && (
              <motion.button
                type="button"
                onClick={scrollToServices}
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.16, ease: EASE_OUT_STRONG }}
                className="group inline-flex min-h-[44px] items-center justify-center gap-1.5 text-sm font-semibold text-foreground underline-offset-8 hover:text-accent hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 sm:text-base [transition:color_0.3s_cubic-bezier(0.23,1,0.32,1)]"
              >
                <span>{hero.ctaSecondary}</span>
                <ArrowRight size={15} className="shrink-0 transition-transform duration-300 group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1" />
              </motion.button>
            )}
          </motion.div>

          {/* Quiet stats strip */}
          {stats.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: dur, ease, delay: step * 6 }}
              className="mt-10 flex flex-wrap gap-[var(--gs-gap)] border-t border-border pt-6 sm:mt-14 sm:gap-10 sm:pt-8"
            >
              {stats.map((s, i) => (
                <div key={`${s.label}-${i}`} className="min-w-0">
                  <p className="font-serif text-2xl font-medium leading-none text-foreground sm:text-3xl">{s.value}</p>
                  <p className="mt-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground sm:text-xs">{s.label}</p>
                </div>
              ))}
            </motion.div>
          )}
        </div>

        {/* ── Photographic column with offset frame ──────────────────── */}
        <div className="relative min-w-0 lg:col-span-6">
          {/* Offset frame detail behind the image */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: dur, ease, delay: step * 5 }}
            className="absolute inset-0 translate-x-4 translate-y-4 border border-accent/35 rtl:-translate-x-4 sm:translate-x-6 sm:translate-y-6 sm:rtl:-translate-x-6"
            aria-hidden
          />
          <motion.div
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: dur * 1.2, ease, delay: step * 2 }}
            className="gs-image relative aspect-[4/5] w-full lg:aspect-[3/4]"
          >
            <img
              src={hero.backgroundImage}
              alt={localeConfig.hero.backgroundAlt}
              className="h-full w-full object-cover"
              loading="eager"
              referrerPolicy="no-referrer"
            />
            {/* Soft tonal veil so the photo sits back behind the type */}
            <div className="pointer-events-none absolute inset-0 bg-black/10 dark:bg-black/20" aria-hidden />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
