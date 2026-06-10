/**
 * testimonials/estetica/testimonials-v2.tsx — GLOW QUOTE STAGE (estética).
 *
 * One voice at a time: an oversized italic serif quote crossfades on a calm
 * porcelain stage with a soft radial glow, monogram/avatar plate and a
 * delicate star row. Auto-advances gently (rich animation level only,
 * pauses on hover/focus) with dot navigation. Editorial and intimate.
 *
 * Selected when `sections.testimonials.variant === "v2"` and niche is estética.
 */
import React from "react";
import { Star } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { cn, handleImgError } from "../../../../lib/utils";
import { localeConfig } from "../../../../config/locale";
import { siteConfig } from "../../../../config/site";
import { getAnimationLevel } from "../../../../lib/section-variants";
import {
  Y_SM, Y_LG, VIEWPORT_ONCE,
  getNicheFlavor, NICHE_DURATION, NICHE_EASING, EASE_OUT_STRONG,
} from "../../../../lib/motion";

const STRINGS: Record<"en" | "he" | "ru" | "ar", { goTo: string; region: string }> = {
  en: { goTo: "Show testimonial {n}", region: "Client testimonials" },
  he: { goTo: "הצג המלצה {n}", region: "המלצות לקוחות" },
  ru: { goTo: "Показать отзыв {n}", region: "Отзывы клиентов" },
  ar: { goTo: "عرض الشهادة {n}", region: "شهادات العملاء" },
};

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

export function EsteticaTestimonialsV2() {
  const { testimonials, sections } = siteConfig;
  const sectionConfig = sections.testimonials;
  const niche = siteConfig.business.type;
  const flavor = getNicheFlavor(niche);
  const dur = NICHE_DURATION[flavor];
  const ease = NICHE_EASING[flavor];
  const S = STRINGS[localeConfig.lang] ?? STRINGS.en;
  const autoPlay = getAnimationLevel() === "rich";

  const [active, setActive] = React.useState(0);
  const [paused, setPaused] = React.useState(false);

  React.useEffect(() => {
    if (!autoPlay || paused || testimonials.length < 2) return;
    const t = setInterval(() => setActive((p) => (p + 1) % testimonials.length), 6500);
    return () => clearInterval(t);
  }, [autoPlay, paused, testimonials.length]);

  const current = testimonials[active];
  if (!current) return null;

  return (
    <section
      id="testimonials"
      className="relative overflow-hidden bg-background py-16 transition-colors duration-300 sm:py-24 lg:py-32"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      {/* Soft radial glow */}
      <div className="gs-gradient pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,var(--secondary),transparent_64%)] dark:opacity-40" aria-hidden />

      <div className="relative mx-auto max-w-4xl px-5 text-center sm:px-6">

        {/* ── Header ─────────────────────────────────────────────────── */}
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
          className="mb-12 font-serif text-3xl font-light leading-[1.08] text-balance text-foreground sm:mb-16 sm:text-4xl md:text-5xl"
        >
          {sectionConfig.title}
        </motion.h2>

        {/* ── Quote stage ────────────────────────────────────────────── */}
        <div role="region" aria-label={S.region} aria-live="polite" className="min-h-[18rem] sm:min-h-[16rem]">
          <AnimatePresence mode="wait" initial={false}>
            <motion.figure
              key={active}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.5, ease: EASE_OUT_STRONG }}
            >
              <div className="mb-6 flex items-center justify-center gap-1" aria-label={`${current.rating}/5`}>
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={14}
                    className={i < current.rating ? "text-accent" : "text-border"}
                    fill={i < current.rating ? "currentColor" : "none"}
                    aria-hidden
                  />
                ))}
              </div>
              <blockquote className="mx-auto max-w-3xl text-balance font-serif text-xl font-light italic leading-relaxed text-foreground sm:text-2xl md:text-[1.7rem]">
                “{current.text}”
              </blockquote>
              <figcaption className="mt-8 flex items-center justify-center gap-3.5">
                {current.avatar ? (
                  <img
                    src={current.avatar}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    onError={handleImgError}
                    referrerPolicy="no-referrer"
                    className="h-12 w-12 rounded-full object-cover ring-1 ring-border"
                  />
                ) : (
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary font-serif text-base text-accent" aria-hidden>
                    {getInitials(current.name)}
                  </span>
                )}
                <span className="text-start">
                  <span className="block text-sm font-medium text-foreground">{current.name}</span>
                  <span className="block text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">{current.title}</span>
                </span>
              </figcaption>
            </motion.figure>
          </AnimatePresence>
        </div>

        {/* ── Dots ───────────────────────────────────────────────────── */}
        {testimonials.length > 1 && (
          <div className="mt-10 flex items-center justify-center gap-2.5" role="tablist">
            {testimonials.map((_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === active}
                aria-label={S.goTo.replace("{n}", String(i + 1))}
                onClick={() => setActive(i)}
                className={cn(
                  "h-2 rounded-full transition-all duration-300",
                  i === active ? "w-7 bg-accent" : "w-2 bg-border hover:bg-accent/40",
                )}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
