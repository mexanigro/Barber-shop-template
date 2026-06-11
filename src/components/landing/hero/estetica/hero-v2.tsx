/**
 * hero/estetica/hero-v2.tsx — ARCH EDITORIAL SPLIT (estética).
 *
 * Porcelain-light editorial spread: oversized Cormorant display column with
 * hairline eyebrow, italic accent line and quiet stats, facing an arch-cropped
 * portrait column with a floating "signature ritual" chip. The arch silhouette
 * and warm tinted backdrop are the estética signature — feminine facial-care
 * luxury, not a generic SaaS split.
 *
 * Selected when `hero.variant === "v2"` and `business.type === "estetica"`.
 */
import React from "react";
import { Calendar, ArrowRight, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { siteConfig } from "../../../../config/site";
import { localeConfig } from "../../../../config/locale";
import {
  getNicheFlavor, NICHE_DURATION, NICHE_EASING, NICHE_STAGGER,
  textContainerVariants, textWordVariants,
  BUTTON_PRESS, EASE_OUT_STRONG,
} from "../../../../lib/motion";

function scrollToServices() {
  document.getElementById("services")?.scrollIntoView({ behavior: "smooth" });
}

export function EsteticaHeroV2({ onBookClick }: { onBookClick: (serviceId?: string) => void }) {
  const { hero, brand, features } = siteConfig;
  const niche = siteConfig.business.type;
  const flavor = getNicheFlavor(niche);
  const dur = NICHE_DURATION[flavor];
  const ease = NICHE_EASING[flavor];
  const step = NICHE_STAGGER[flavor];

  const eyebrow = hero.eyebrow || brand.tagline;
  const stats = features.showHeroStats !== false ? (hero.stats ?? []).slice(0, 3) : [];
  const ritual = siteConfig.services[0];

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
      {/* Warm tinted wash behind the photographic column */}
      <div
        className="gs-gradient pointer-events-none absolute inset-y-0 end-0 hidden w-[44%] bg-[radial-gradient(ellipse_at_70%_35%,var(--secondary),transparent_75%)] lg:block"
        aria-hidden
      />

      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-12 px-5 pb-16 pt-28 sm:px-6 sm:pt-32 lg:grid-cols-12 lg:gap-10 lg:px-8 lg:py-32">

        {/* ── Typography column ──────────────────────────────────────── */}
        <div className="relative z-10 min-w-0 lg:col-span-6">
          {eyebrow && (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: dur, ease }}
              className="mb-6 flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.32em] text-accent-light sm:mb-8 sm:text-xs"
            >
              <span className="h-px w-10 shrink-0 bg-accent/50" aria-hidden />
              <span className="min-w-0 leading-relaxed">{eyebrow}</span>
            </motion.p>
          )}

          <motion.h1
            variants={textContainerVariants}
            initial="hidden"
            animate="visible"
            className="mb-7 text-balance font-serif text-[clamp(2.6rem,7vw,5.5rem)] font-light leading-[1.02] text-foreground sm:mb-9"
          >
            {words(hero.titlePrefix, "p")}
            <em className="font-serif italic text-accent">
              {words(hero.titleHighlight, "h")}
            </em>
            {hero.titleSuffix.trim() ? <br /> : null}
            {words(hero.titleSuffix, "s")}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: dur, ease, delay: step * 3 }}
            className="mb-9 max-w-md text-pretty text-[15px] font-light leading-relaxed text-muted-foreground sm:mb-11 md:text-lg"
          >
            {hero.subtitle}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: dur, ease, delay: step * 4 }}
            className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-7"
          >
            {(features.showBooking || features.showInquiry) && (
              <motion.button
                type="button"
                onClick={() => onBookClick()}
                whileHover={{ y: BUTTON_PRESS[flavor].hoverY }}
                whileTap={{ scale: BUTTON_PRESS[flavor].scale }}
                transition={{ duration: BUTTON_PRESS[flavor].duration, ease: EASE_OUT_STRONG }}
                className="group inline-flex min-h-[50px] items-center justify-center gap-2.5 rounded-full bg-primary px-9 py-3.5 text-sm font-medium text-primary-foreground shadow-elevated hover:bg-accent-light focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 sm:text-[15px] [transition:background-color_0.4s_cubic-bezier(0.23,1,0.32,1),box-shadow_0.4s_cubic-bezier(0.23,1,0.32,1)]"
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
                className="group inline-flex min-h-[44px] items-center justify-center gap-2 text-sm font-medium text-foreground/80 underline-offset-8 hover:text-accent hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 sm:text-[15px] [transition:color_0.4s_cubic-bezier(0.23,1,0.32,1)]"
              >
                <span>{hero.ctaSecondary}</span>
                <ArrowRight size={15} className="shrink-0 transition-transform duration-300 group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1" />
              </motion.button>
            )}
          </motion.div>

          {stats.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: dur, ease, delay: step * 6 }}
              className="mt-12 flex flex-wrap gap-[var(--gs-gap)] border-t border-border pt-7 sm:mt-16 sm:gap-12 sm:pt-9"
            >
              {stats.map((s, i) => (
                <div key={`${s.label}-${i}`} className="min-w-0">
                  <p className="font-serif text-3xl font-light leading-none tabular-nums text-foreground sm:text-4xl">{s.value}</p>
                  <p className="mt-2 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground sm:text-[11px]">{s.label}</p>
                </div>
              ))}
            </motion.div>
          )}
        </div>

        {/* ── Arch portrait column ───────────────────────────────────── */}
        <div className="relative mx-auto w-full max-w-md min-w-0 lg:col-span-6 lg:max-w-none lg:ps-10">
          {/* Hairline arch echo behind the photo */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: dur * 1.4, ease, delay: step * 5 }}
            className="absolute -inset-x-3 -top-6 bottom-6 rounded-t-[12rem] border border-accent/25 sm:-inset-x-5 sm:-top-8 sm:bottom-8 sm:rounded-t-[16rem]"
            aria-hidden
          />
          <motion.div
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: dur * 1.3, ease, delay: step * 2 }}
            className="relative aspect-[4/5] w-full overflow-hidden rounded-t-[12rem] rounded-b-[0.5rem] sm:rounded-t-[16rem] lg:aspect-[5/6]"
          >
            <img
              src={hero.backgroundImage}
              alt={localeConfig.hero.backgroundAlt}
              className="h-full w-full object-cover"
              loading="eager" fetchPriority="high" decoding="async"
              referrerPolicy="no-referrer"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-transparent" aria-hidden />
          </motion.div>

          {/* Floating signature-ritual chip */}
          {ritual && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: dur, ease, delay: step * 7 }}
              className="absolute -bottom-5 start-1/2 flex w-[88%] max-w-xs -translate-x-1/2 items-center gap-3.5 rounded-[0.625rem] border border-border bg-card/95 px-5 py-4 shadow-elevated rtl:translate-x-1/2 sm:start-auto sm:end-2 sm:w-auto sm:translate-x-0 sm:rtl:translate-x-0 lg:end-0"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-accent" aria-hidden>
                <Sparkles size={17} />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  {siteConfig.sections.services.subtitle}
                </p>
                <p className="truncate font-serif text-base text-foreground sm:text-lg">{ritual.name}</p>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
}
