/**
 * hero/estetica/hero-v4.tsx — MANIFESTO TYPE hero (estética).
 *
 * Type-led porcelain hero with no dominant photograph: an oversized serif
 * manifesto where small circular image cameos sit inline between words
 * (2026 editorial beauty trope), over a soft radial glow. A hairline-divided
 * stats row grounds the claim. The photography whispers; the words carry.
 *
 * Selected when `hero.variant === "v4"` and `business.type === "estetica"`.
 */
import React from "react";
import { Calendar, ArrowDown } from "lucide-react";
import { motion } from "motion/react";
import { siteConfig } from "../../../../config/site";
import { localeConfig } from "../../../../config/locale";
import {
  getNicheFlavor, NICHE_DURATION, NICHE_EASING, NICHE_STAGGER,
  BUTTON_PRESS, EASE_OUT_STRONG,
} from "../../../../lib/motion";

/** Inline circular photo cameo nested inside the headline. */
function Cameo({ src, delay, dur, ease }: { src: string; delay: number; dur: number; ease: [number, number, number, number] }) {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: dur, ease, delay }}
      className="mx-1.5 inline-block h-[0.72em] w-[1.35em] overflow-hidden rounded-full align-[-0.12em] sm:mx-2.5"
      aria-hidden
    >
      <img src={src} alt="" className="h-full w-full object-cover" loading="eager" referrerPolicy="no-referrer" />
    </motion.span>
  );
}

export function EsteticaHeroV4({ onBookClick }: { onBookClick: (serviceId?: string) => void }) {
  const { hero, brand, features } = siteConfig;
  const niche = siteConfig.business.type;
  const flavor = getNicheFlavor(niche);
  const dur = NICHE_DURATION[flavor];
  const ease = NICHE_EASING[flavor];
  const step = NICHE_STAGGER[flavor];

  const eyebrow = hero.eyebrow || brand.tagline;
  const stats = features.showHeroStats !== false ? (hero.stats ?? []) : [];

  // Cameo imagery: dedicated service images first, hero photo as fallback.
  const serviceImages = siteConfig.sections.services?.images ?? [];
  const cameoA = serviceImages[0] ?? hero.backgroundImage;
  const cameoB = serviceImages[1] ?? hero.backgroundImage;

  const lineReveal = (delay: number) => ({
    initial: { opacity: 0, y: 26 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: dur * 1.1, ease, delay },
  });

  return (
    <section id="hero" className="relative flex min-h-[100dvh] items-center overflow-hidden bg-background">
      {/* Soft radial glow behind the manifesto */}
      <div className="gs-gradient pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_28%,var(--secondary),transparent_62%)] dark:opacity-40" aria-hidden />

      <div className="relative z-10 mx-auto w-full max-w-6xl px-5 pb-16 pt-28 text-center sm:px-6 sm:pt-32">
        {eyebrow && (
          <motion.p
            {...lineReveal(step)}
            className="mb-8 text-[11px] font-medium uppercase tracking-[0.34em] text-accent-light sm:mb-12 sm:text-xs"
          >
            {eyebrow}
          </motion.p>
        )}

        {/* ── Manifesto headline with inline cameos ─────────────────── */}
        <h1 className="mx-auto mb-9 max-w-5xl font-serif font-light leading-[1.07] text-foreground sm:mb-12">
          <motion.span {...lineReveal(step * 2)} className="block text-[clamp(2.4rem,7.5vw,6rem)]">
            {hero.titlePrefix}
            <Cameo src={cameoA} delay={step * 6} dur={dur} ease={ease} />
          </motion.span>
          <motion.span {...lineReveal(step * 3.5)} className="block text-[clamp(2.4rem,7.5vw,6rem)]">
            <em className="italic text-accent">{hero.titleHighlight}</em>
            {hero.titleSuffix.trim() ? <Cameo src={cameoB} delay={step * 8} dur={dur} ease={ease} /> : null}
            {hero.titleSuffix}
          </motion.span>
        </h1>

        <motion.p
          {...lineReveal(step * 5)}
          className="mx-auto mb-10 max-w-xl text-pretty text-[15px] font-light leading-relaxed text-muted-foreground sm:mb-12 md:text-lg"
        >
          {hero.subtitle}
        </motion.p>

        {/* ── CTA pair ──────────────────────────────────────────────── */}
        <motion.div {...lineReveal(step * 6)} className="flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6">
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
            <motion.a
              href="#services"
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.16, ease: EASE_OUT_STRONG }}
              className="group inline-flex min-h-[44px] items-center justify-center gap-2 text-sm font-medium text-foreground/75 hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 sm:text-[15px] [transition:color_0.4s_cubic-bezier(0.23,1,0.32,1)]"
            >
              <span>{hero.ctaSecondary}</span>
              <ArrowDown size={15} className="shrink-0 transition-transform duration-300 group-hover:translate-y-0.5" />
            </motion.a>
          )}
        </motion.div>

        {/* ── Hairline stats row ────────────────────────────────────── */}
        {stats.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: dur * 1.2, ease, delay: step * 8 }}
            className="mx-auto mt-14 grid max-w-3xl grid-cols-2 gap-y-8 border-t border-border pt-8 sm:mt-20 sm:pt-10 md:grid-cols-4"
            style={{ gridTemplateColumns: stats.length < 4 ? `repeat(${stats.length}, minmax(0, 1fr))` : undefined }}
          >
            {stats.map((s, i) => (
              <motion.div
                key={`${s.label}-${i}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: dur, ease, delay: step * (9 + i) }}
                className="min-w-0 px-2"
              >
                <p className="font-serif text-2xl font-light leading-none tabular-nums text-foreground sm:text-3xl">{s.value}</p>
                <p className="mt-2 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground sm:text-[11px]">{s.label}</p>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* Decorative hero alt text for SEO/screen readers (photo is decorative here) */}
      <span className="sr-only">{localeConfig.hero.backgroundAlt}</span>
    </section>
  );
}
