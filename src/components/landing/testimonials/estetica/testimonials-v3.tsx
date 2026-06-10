/**
 * testimonials/estetica/testimonials-v3.tsx — POLAROID DRIFT (estética).
 *
 * Curated keepsakes: testimonial cards with gentle alternating rotations and
 * vertical offsets, italic serif quotes, monogram plates and tiny star rows,
 * drifting upright as they enter. Like thank-you notes pinned in the clinic.
 *
 * Selected when `sections.testimonials.variant === "v3"` and niche is estética.
 */
import React from "react";
import { Star } from "lucide-react";
import { motion } from "motion/react";
import { cn, handleImgError } from "../../../../lib/utils";
import { siteConfig } from "../../../../config/site";
import {
  Y_SM, Y_LG, VIEWPORT_ONCE,
  getNicheFlavor, NICHE_DURATION, NICHE_EASING,
} from "../../../../lib/motion";

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

const TILTS = ["-rotate-2", "rotate-1", "rotate-2", "-rotate-1", "rotate-1", "-rotate-2"];
const LIFTS = ["sm:mt-0", "sm:mt-10", "sm:mt-4", "sm:mt-12", "sm:mt-2", "sm:mt-8"];

export function EsteticaTestimonialsV3() {
  const { testimonials, sections } = siteConfig;
  const sectionConfig = sections.testimonials;
  const niche = siteConfig.business.type;
  const flavor = getNicheFlavor(niche);
  const dur = NICHE_DURATION[flavor];
  const ease = NICHE_EASING[flavor];

  const items = testimonials.slice(0, 6);

  return (
    <section id="testimonials" className="overflow-hidden bg-secondary/50 py-16 transition-colors duration-300 sm:py-24 lg:py-32 dark:bg-secondary/20">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">

        {/* ── Centered header ────────────────────────────────────────── */}
        <div className="mx-auto mb-12 max-w-2xl text-center sm:mb-20">
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

        {/* ── Drifting notes ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 sm:gap-[var(--gs-gap)] lg:grid-cols-3">
          {items.map((t, index) => (
            <motion.figure
              key={`${t.name}-${index}`}
              initial={{ opacity: 0, y: Y_LG, rotate: 0 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={VIEWPORT_ONCE}
              transition={{ duration: dur * 1.1, ease, delay: Math.min(index * 0.09, 0.4) }}
              className={cn(
                "flex flex-col rounded-[0.625rem] border border-border bg-card p-7 shadow-elevated transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] hover:rotate-0 sm:p-8",
                TILTS[index % TILTS.length],
                LIFTS[index % LIFTS.length],
              )}
            >
              <div className="mb-4 flex items-center gap-1" aria-label={`${t.rating}/5`}>
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={12}
                    className={i < t.rating ? "text-accent" : "text-border"}
                    fill={i < t.rating ? "currentColor" : "none"}
                    aria-hidden
                  />
                ))}
              </div>
              <blockquote className="flex-1 font-serif text-[17px] font-light italic leading-relaxed text-foreground/90">
                “{t.text}”
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-3 border-t border-border pt-5">
                {t.avatar ? (
                  <img
                    src={t.avatar}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    onError={handleImgError}
                    referrerPolicy="no-referrer"
                    className="h-10 w-10 rounded-full object-cover ring-1 ring-border"
                  />
                ) : (
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary font-serif text-sm text-accent" aria-hidden>
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
    </section>
  );
}
