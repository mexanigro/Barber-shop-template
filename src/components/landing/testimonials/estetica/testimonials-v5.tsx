/**
 * testimonials/estetica/testimonials-v5.tsx — WHISPER MARQUEE (estética).
 *
 * Two counter-drifting rows of soft quote plaques glide beneath the header —
 * a murmur of client voices rather than a wall. CSS keyframes drive the
 * marquee (off-main-thread), duplicated content is aria-hidden, hover pauses,
 * and reduced-motion / animationLevel "none|subtle" renders a static wrap.
 *
 * Selected when `sections.testimonials.variant === "v5"` and niche is estética.
 */
import React from "react";
import { Star } from "lucide-react";
import { motion } from "motion/react";
import { cn, handleImgError } from "../../../../lib/utils";
import { siteConfig } from "../../../../config/site";
import { getAnimationLevel } from "../../../../lib/section-variants";
import {
  Y_SM, Y_LG, VIEWPORT_ONCE,
  getNicheFlavor, NICHE_DURATION, NICHE_EASING,
} from "../../../../lib/motion";
import type { Testimonial } from "../../../../types";

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

function Plaque({ t }: { t: Testimonial }) {
  return (
    <figure className="flex w-[19rem] shrink-0 flex-col rounded-[0.625rem] border border-border bg-card p-6 shadow-elevated sm:w-[22rem]">
      <div className="mb-3 flex items-center gap-1" aria-label={`${t.rating}/5`}>
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            size={11}
            className={i < t.rating ? "text-accent" : "text-border"}
            fill={i < t.rating ? "currentColor" : "none"}
            aria-hidden
          />
        ))}
      </div>
      <blockquote className="line-clamp-4 flex-1 font-serif text-[15px] font-light italic leading-relaxed text-foreground/90">
        “{t.text}”
      </blockquote>
      <figcaption className="mt-4 flex items-center gap-2.5">
        {t.avatar ? (
          <img
            src={t.avatar}
            alt=""
            loading="lazy"
            decoding="async"
            onError={handleImgError}
            referrerPolicy="no-referrer"
            className="h-8 w-8 rounded-full object-cover ring-1 ring-border"
          />
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary font-serif text-[11px] text-accent" aria-hidden>
            {getInitials(t.name)}
          </span>
        )}
        <span className="min-w-0">
          <span className="block truncate text-[13px] font-medium text-foreground">{t.name}</span>
          <span className="block truncate text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{t.title}</span>
        </span>
      </figcaption>
    </figure>
  );
}

export function EsteticaTestimonialsV5() {
  const { testimonials, sections } = siteConfig;
  const sectionConfig = sections.testimonials;
  const niche = siteConfig.business.type;
  const flavor = getNicheFlavor(niche);
  const dur = NICHE_DURATION[flavor];
  const ease = NICHE_EASING[flavor];
  const marquee = getAnimationLevel() === "rich";

  if (testimonials.length === 0) return null;

  // Split into two rows; with few testimonials both rows share the pool.
  const mid = Math.ceil(testimonials.length / 2);
  const rowA = testimonials.slice(0, mid);
  const rowB = testimonials.length > 2 ? testimonials.slice(mid) : testimonials;

  const Row = ({ items, reverse }: { items: Testimonial[]; reverse?: boolean }) => (
    <div className="group relative overflow-hidden" dir="ltr">
      <div
        className={cn(
          "flex w-max gap-[var(--gs-gap)] pe-[var(--gs-gap)]",
          marquee && "motion-safe:animate-[estetica-marquee_46s_linear_infinite] group-hover:[animation-play-state:paused]",
          marquee && reverse && "motion-safe:[animation-direction:reverse]",
          !marquee && "w-full flex-wrap justify-center",
        )}
      >
        {items.map((t, i) => <Plaque key={`a-${t.name}-${i}`} t={t} />)}
        {marquee && (
          <span className="contents" aria-hidden>
            {items.map((t, i) => <Plaque key={`b-${t.name}-${i}`} t={t} />)}
          </span>
        )}
      </div>
    </div>
  );

  return (
    <section id="testimonials" className="overflow-hidden bg-secondary/50 py-16 transition-colors duration-300 sm:py-24 lg:py-32 dark:bg-secondary/20">
      {/* Local keyframes for the whisper drift */}
      <style>{`@keyframes estetica-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>

      {/* ── Centered header ──────────────────────────────────────────── */}
      <div className="mx-auto mb-12 max-w-2xl px-5 text-center sm:mb-16 sm:px-6">
        <motion.p
          initial={{ opacity: 0, y: Y_SM }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEWPORT_ONCE}
          transition={{ duration: dur, ease }}
          className="mb-3 inline-flex items-center gap-3 text-[10px] font-medium uppercase tracking-[0.32em] text-accent-light sm:text-xs"
        >
          <span className="h-px w-7 bg-accent/50" aria-hidden />
          {sectionConfig.subtitle}
          <span className="h-px w-7 bg-accent/50" aria-hidden />
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: Y_LG }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEWPORT_ONCE}
          transition={{ duration: dur, ease, delay: 0.08 }}
          className="font-serif text-3xl font-light leading-[1.08] text-balance text-foreground sm:text-4xl md:text-5xl"
        >
          {sectionConfig.title}
        </motion.h2>
      </div>

      {/* ── Counter-drifting rows ────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: Y_LG }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={VIEWPORT_ONCE}
        transition={{ duration: dur * 1.1, ease }}
        className="flex flex-col gap-[var(--gs-gap)]"
      >
        <Row items={rowA} />
        {rowB.length > 0 && <Row items={rowB} reverse />}
      </motion.div>

      {/* Edge fades so the drift dissolves instead of clipping */}
      <div className="pointer-events-none relative" aria-hidden>
        <div className="gs-gradient absolute -top-[28rem] start-0 h-[28rem] w-16 bg-gradient-to-r from-secondary/90 to-transparent sm:w-28 dark:from-background/80" />
        <div className="gs-gradient absolute -top-[28rem] end-0 h-[28rem] w-16 bg-gradient-to-l from-secondary/90 to-transparent sm:w-28 dark:from-background/80" />
      </div>
    </section>
  );
}
