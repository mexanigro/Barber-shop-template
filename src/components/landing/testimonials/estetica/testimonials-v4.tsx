/**
 * testimonials/estetica/testimonials-v4.tsx — TRUST LEDGER (estética).
 *
 * Clinical proof panel: an aggregate column (oversized serif average, star
 * row, rating distribution as hairline bars that fill on reveal) facing a
 * quiet two-column wall of short quotes. Reads like audited evidence —
 * trust through numbers first, voices second.
 *
 * Selected when `sections.testimonials.variant === "v4"` and niche is estética.
 */
import React from "react";
import { Star } from "lucide-react";
import { motion } from "motion/react";
import { cn, handleImgError } from "../../../../lib/utils";
import { localeConfig } from "../../../../config/locale";
import { siteConfig } from "../../../../config/site";
import {
  Y_SM, Y_LG, VIEWPORT_ONCE,
  getNicheFlavor, NICHE_DURATION, NICHE_EASING, EASE_OUT_STRONG,
} from "../../../../lib/motion";

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

export function EsteticaTestimonialsV4() {
  const { testimonials, sections } = siteConfig;
  const sectionConfig = sections.testimonials;
  const niche = siteConfig.business.type;
  const flavor = getNicheFlavor(niche);
  const dur = NICHE_DURATION[flavor];
  const ease = NICHE_EASING[flavor];

  const avg = testimonials.length
    ? testimonials.reduce((acc, t) => acc + t.rating, 0) / testimonials.length
    : 0;
  const avgLabel = (Math.round(avg * 10) / 10).toFixed(1);

  // Distribution 5→1 stars.
  const dist = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: testimonials.filter((t) => Math.round(t.rating) === stars).length,
  }));
  const maxCount = Math.max(1, ...dist.map((d) => d.count));

  const quotes = testimonials.slice(0, 4);

  return (
    <section id="testimonials" className="bg-background py-16 transition-colors duration-300 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="mb-12 max-w-2xl sm:mb-16">
          <motion.p
            initial={{ opacity: 0, y: Y_SM }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT_ONCE}
            transition={{ duration: dur, ease }}
            className="mb-3 flex items-center gap-3 text-[10px] font-medium uppercase tracking-[0.32em] text-accent-light sm:text-xs"
          >
            <span className="h-px w-7 shrink-0 bg-accent/50" aria-hidden />
            {sectionConfig.subtitle}
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

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">

          {/* ── Aggregate panel ──────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: Y_LG }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT_ONCE}
            transition={{ duration: dur, ease }}
            className="lg:col-span-4"
          >
            <div className="rounded-[0.625rem] border border-border bg-secondary/60 p-8 dark:bg-secondary/30 sm:p-10">
              <p className="font-serif text-7xl font-light leading-none tabular-nums text-foreground sm:text-8xl">
                {avgLabel}
              </p>
              <div className="mt-4 flex items-center gap-1" aria-label={`${avgLabel}/5`}>
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={16}
                    className={i < Math.round(avg) ? "text-accent" : "text-border"}
                    fill={i < Math.round(avg) ? "currentColor" : "none"}
                    aria-hidden
                  />
                ))}
              </div>
              <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                {localeConfig.testimonials.averageRating}
              </p>

              {/* Distribution bars */}
              <ul className="mt-8 flex flex-col gap-2.5">
                {dist.map((d, i) => (
                  <li key={d.stars} className="flex items-center gap-3">
                    <span className="w-3 shrink-0 text-end font-serif text-sm tabular-nums text-muted-foreground">{d.stars}</span>
                    <Star size={10} className="shrink-0 text-accent-light" fill="currentColor" aria-hidden />
                    <span className="h-1 flex-1 overflow-hidden rounded-full bg-border">
                      <motion.span
                        initial={{ scaleX: 0 }}
                        whileInView={{ scaleX: d.count / maxCount }}
                        viewport={VIEWPORT_ONCE}
                        transition={{ duration: dur * 1.4, ease: EASE_OUT_STRONG, delay: 0.2 + i * 0.08 }}
                        className="block h-full w-full origin-left rounded-full bg-accent rtl:origin-right"
                      />
                    </span>
                    <span className="w-4 shrink-0 text-xs tabular-nums text-muted-foreground">{d.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>

          {/* ── Quote wall ───────────────────────────────────────────── */}
          <div className="grid grid-cols-1 content-start gap-x-12 gap-y-10 sm:grid-cols-2 lg:col-span-8">
            {quotes.map((t, index) => (
              <motion.figure
                key={`${t.name}-${index}`}
                initial={{ opacity: 0, y: Y_LG }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={VIEWPORT_ONCE}
                transition={{ duration: dur, ease, delay: Math.min(index * 0.09, 0.36) }}
                className={cn("border-t border-border pt-7", index % 2 === 1 && "sm:mt-12")}
              >
                <div className="mb-3.5 flex items-center gap-1" aria-label={`${t.rating}/5`}>
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
                <blockquote className="font-serif text-[16px] font-light italic leading-relaxed text-foreground/90">
                  “{t.text}”
                </blockquote>
                <figcaption className="mt-5 flex items-center gap-3">
                  {t.avatar ? (
                    <img
                      src={t.avatar}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      onError={handleImgError}
                      referrerPolicy="no-referrer"
                      className="h-9 w-9 rounded-full object-cover ring-1 ring-border"
                    />
                  ) : (
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary font-serif text-xs text-accent" aria-hidden>
                      {getInitials(t.name)}
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-foreground">{t.name}</span>
                    <span className="block truncate text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{t.title}</span>
                  </span>
                </figcaption>
              </motion.figure>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
