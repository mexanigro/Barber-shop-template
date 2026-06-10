/**
 * why-choose-us-v5.tsx — TESTIMONIAL HYBRID variant.
 *
 * Benefits interleaved with social proof: at lg+ the start column carries the
 * section header + a refined icon list of benefits, while the end column
 * elevates one testimonial (large serif italic quote, lucide Star rating,
 * name) over `mainImage`. With no testimonials the image stands alone with
 * the badge. When `getAnimationLevel() === "rich"` and more than one
 * testimonial exists, quotes rotate every ~7s with a crossfade — paused on
 * hover/focus and disabled entirely under prefers-reduced-motion.
 *
 * Selected via `sections.whyChooseUs.variant === "v5"` (WhyChooseUs.tsx
 * dispatcher).
 */
import { useEffect, useState } from "react";
import { ChevronRight, HelpCircle, Star } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { localeConfig } from "../../../config/locale";
import { siteConfig } from "../../../config/site";
import { interpolate } from "../../../lib/interpolate";
import { resolveLucideIcon } from "../../../lib/lucide-icons";
import { handleImgError } from "../../../lib/utils";
import { getAnimationLevel } from "../../../lib/section-variants";
import {
  Y_SM, Y_MD, VIEWPORT_ONCE,
  getNicheFlavor, nicheStagger, nicheScaleIn,
  NICHE_DURATION, NICHE_EASING, EASE_OUT_STRONG,
} from "../../../lib/motion";

const ROTATE_INTERVAL_MS = 7000;

function StarRating({ rating }: { rating: number }) {
  const clamped = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <div className="flex items-center gap-1" aria-label={`${clamped}/5`} role="img">
      {Array.from({ length: 5 }, (_, i) => {
        const filled = i < clamped;
        return (
          <Star
            key={i}
            size={14}
            aria-hidden="true"
            className={filled ? "text-accent-light" : "text-border"}
            fill={filled ? "currentColor" : "none"}
          />
        );
      })}
    </div>
  );
}

export function WhyChooseUsV5({
  onNavigateToAbout,
}: {
  onNavigateToAbout?: () => void;
} = {}) {
  const { sections, brand } = siteConfig;
  const sectionConfig = sections.whyChooseUs;
  const niche = siteConfig.business.type;
  const flavor = getNicheFlavor(niche);
  const dur = NICHE_DURATION[flavor];
  const ease = NICHE_EASING[flavor];
  const stagger = nicheStagger(niche);

  const reducedMotion = useReducedMotion();
  const testimonials = siteConfig.testimonials ?? [];
  const canRotate =
    !reducedMotion && getAnimationLevel() === "rich" && testimonials.length > 1;

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!canRotate || paused) return;
    const timer = window.setInterval(
      () => setIndex((i) => (i + 1) % testimonials.length),
      ROTATE_INTERVAL_MS,
    );
    return () => window.clearInterval(timer);
  }, [canRotate, paused, testimonials.length]);

  const active = testimonials.length > 0 ? testimonials[index % testimonials.length] : null;

  const brandVars = { brand: brand?.name ?? "" };
  const eyebrow = sectionConfig.title ? interpolate(sectionConfig.title, brandVars) : "";
  const heading = sectionConfig.subtitle ? interpolate(sectionConfig.subtitle, brandVars) : "";
  const benefits = sectionConfig.benefits;

  return (
    <section
      id="why-choose-us"
      className="bg-card px-5 py-14 transition-colors duration-300 sm:px-6 sm:py-[var(--gs-section-py)]"
    >
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-20">

          {/* ── Content column — header + refined benefit list ───────── */}
          <div>
            {eyebrow && (
              <motion.p
                initial={{ opacity: 0, y: Y_SM }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={VIEWPORT_ONCE}
                transition={{ duration: dur, ease }}
                className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-accent-light"
              >
                {eyebrow}
              </motion.p>
            )}
            {heading && (
              <motion.h2
                initial={{ opacity: 0, y: Y_MD }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={VIEWPORT_ONCE}
                transition={{ duration: dur, ease, delay: 0.08 }}
                className="mb-10 max-w-xl text-balance font-serif text-3xl leading-tight text-card-foreground sm:mb-12 sm:text-4xl md:text-5xl"
              >
                {heading}
              </motion.h2>
            )}

            <ul className="space-y-7 sm:space-y-8">
              {benefits.map((benefit, i) => {
                const IconComponent = resolveLucideIcon(benefit.iconName, HelpCircle);
                return (
                  <motion.li
                    key={`wcu-v5-${benefit.title.slice(0, 20)}-${i}`}
                    initial={{ opacity: 0, y: Y_MD }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={VIEWPORT_ONCE}
                    transition={{ delay: stagger(i), duration: dur, ease }}
                    className="flex items-start gap-4"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-light/10">
                      <IconComponent size={20} className="text-accent-light" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-balance text-base font-bold leading-snug text-card-foreground">{benefit.title}</h3>
                      <p className="mt-1 text-pretty text-sm leading-relaxed text-muted-foreground line-clamp-3">{benefit.desc}</p>
                    </div>
                  </motion.li>
                );
              })}
            </ul>

            {onNavigateToAbout && (
              <motion.div
                initial={{ opacity: 0, y: Y_SM }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={VIEWPORT_ONCE}
                transition={{ delay: 0.2, duration: dur, ease }}
                className="mt-9"
              >
                <button
                  type="button"
                  onClick={onNavigateToAbout}
                  className="inline-flex min-h-11 touch-manipulation items-center gap-2 text-sm font-medium text-accent hover:text-accent-light active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 [transition:color_0.2s_cubic-bezier(0.23,1,0.32,1),transform_0.16s_cubic-bezier(0.23,1,0.32,1)]"
                >
                  {localeConfig.services.learnMoreAboutUs}
                  <ChevronRight size={14} className="rtl:rotate-180" aria-hidden="true" />
                </button>
              </motion.div>
            )}
          </div>

          {/* ── Proof column — image + elevated testimonial ──────────── */}
          <div className="relative">
            <motion.div
              {...nicheScaleIn(niche)}
              className="gs-image relative aspect-[4/5] overflow-hidden border border-border bg-muted shadow-elevated"
            >
              {/* Pulse underlay reads as a skeleton until the lazy image paints over it */}
              <div className="absolute inset-0 animate-pulse bg-foreground/5" aria-hidden />
              <img
                src={sectionConfig.mainImage}
                alt={localeConfig.whyChooseUs.imageAlt}
                onError={handleImgError}
                className="relative h-full w-full object-cover"
                loading="lazy"
                decoding="async"
                draggable={false}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent" />

              {/* No testimonials → badge alone over the image */}
              {!active && sectionConfig.badge && (
                <div className="absolute bottom-5 start-5 flex items-center gap-3 pe-5 sm:bottom-8 sm:start-8">
                  <Star className="shrink-0 text-accent-light" size={20} fill="currentColor" aria-hidden="true" />
                  <p className="whitespace-pre-line font-serif text-xl leading-tight text-white sm:text-2xl">
                    {sectionConfig.badge}
                  </p>
                </div>
              )}
            </motion.div>

            {/* Elevated testimonial card — crossfades when rotating */}
            {active && (
              <motion.div
                initial={{ opacity: 0, y: Y_MD }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={VIEWPORT_ONCE}
                transition={{ duration: dur, ease: EASE_OUT_STRONG, delay: 0.15 }}
                onMouseEnter={() => setPaused(true)}
                onMouseLeave={() => setPaused(false)}
                onFocusCapture={() => setPaused(true)}
                onBlurCapture={() => setPaused(false)}
                className="absolute inset-x-4 bottom-4 rounded-2xl border border-border bg-card/95 p-5 shadow-elevated backdrop-blur-sm sm:inset-x-6 sm:bottom-6 sm:p-7"
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.figure
                    key={`wcu-v5-quote-${index}`}
                    initial={canRotate ? { opacity: 0 } : false}
                    animate={{ opacity: 1 }}
                    exit={canRotate ? { opacity: 0 } : undefined}
                    transition={{ duration: 0.45, ease: EASE_OUT_STRONG }}
                  >
                    <StarRating rating={active.rating} />
                    {/* dir=auto: English reviews on RTL pages keep their quotes and
                        punctuation in logical order; Hebrew reviews still flow RTL. */}
                    <blockquote dir="auto" className="mt-3 text-pretty font-serif text-lg italic leading-relaxed text-card-foreground sm:text-xl line-clamp-4">
                      &ldquo;{active.text}&rdquo;
                    </blockquote>
                    <figcaption className="mt-4 flex items-baseline gap-2">
                      <span dir="auto" className="text-sm font-bold text-card-foreground">{active.name}</span>
                      {active.title && (
                        <span className="truncate text-xs text-muted-foreground">{active.title}</span>
                      )}
                    </figcaption>
                  </motion.figure>
                </AnimatePresence>
              </motion.div>
            )}
          </div>

        </div>
      </div>
    </section>
  );
}
