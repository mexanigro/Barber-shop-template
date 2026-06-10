/**
 * testimonials-v3.tsx — MASONRY CARDS testimonials variant.
 *
 * CSS-columns masonry (1/2/3 cols, gap var(--gs-gap), break-inside-avoid)
 * of quote cards whose natural height variance comes from the text itself —
 * no line clamping. Each card: stars row, quote, hairline divider, then
 * avatar circle (image or initial monogram) + name + title. staggerMasonry
 * entrances, NICHE_CARD_HOVER lift.
 *
 * Selected via `sections.testimonials.variant === "v3"` (Testimonials.tsx).
 */
import { Star } from "lucide-react";
import { motion } from "motion/react";
import { localeConfig } from "../../../config/locale";
import { siteConfig } from "../../../config/site";
import {
  Y_SM, Y_MD, Y_LG, VIEWPORT_ONCE,
  getNicheFlavor, NICHE_DURATION, NICHE_EASING, NICHE_CARD_HOVER,
  staggerMasonry, EASE_OUT_STRONG,
} from "../../../lib/motion";

type Strings = {
  outOfFive: (rating: number) => string;
};

const STRINGS: Record<"en" | "he" | "ru" | "ar", Strings> = {
  en: { outOfFive: (r) => `${r} out of 5` },
  he: { outOfFive: (r) => `${r} מתוך 5` },
  ru: { outOfFive: (r) => `${r} из 5` },
  ar: { outOfFive: (r) => `${r} من 5` },
};

function clampRating(rating: number) {
  return Math.max(0, Math.min(5, Math.round(rating)));
}

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

function StarRow({ rating, label }: { rating: number; label: string }) {
  const filled = clampRating(rating);
  return (
    <div className="flex gap-1" role="img" aria-label={label}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={14}
          aria-hidden
          className={i < filled ? "text-accent-light" : "text-muted-foreground/35"}
          fill={i < filled ? "currentColor" : "none"}
        />
      ))}
    </div>
  );
}

export function TestimonialsV3() {
  const { testimonials, sections } = siteConfig;
  const { testimonials: sectionConfig } = sections;
  const niche = siteConfig.business.type;
  const flavor = getNicheFlavor(niche);
  const dur = NICHE_DURATION[flavor];
  const ease = NICHE_EASING[flavor];
  const t = STRINGS[localeConfig.lang] ?? STRINGS.en;

  return (
    <section
      id="testimonials"
      className="bg-background px-5 py-16 transition-colors duration-300 sm:px-6 sm:py-28"
    >
      <div className="mx-auto max-w-7xl">

        {/* ── Section header ──────────────────────────────────────── */}
        <div className="mb-10 max-w-2xl sm:mb-14">
          <motion.p
            initial={{ opacity: 0, y: Y_SM }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT_ONCE}
            transition={{ duration: dur, ease }}
            className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-accent-light"
          >
            {sectionConfig.title}
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: Y_MD }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT_ONCE}
            transition={{ duration: dur, ease, delay: 0.08 }}
            className="font-serif text-3xl font-medium tracking-tight text-foreground sm:text-4xl md:text-5xl"
          >
            {sectionConfig.subtitle}
          </motion.h2>
        </div>

        {/* ── Masonry columns ─────────────────────────────────────── */}
        <div className="columns-1 gap-[var(--gs-gap)] sm:columns-2 lg:columns-3">
          {testimonials.map((review, i) => (
            <motion.figure
              key={`testimonial-${review.name.slice(0, 15)}-${i}`}
              initial={{ opacity: 0, y: Y_LG }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={VIEWPORT_ONCE}
              transition={{
                delay: staggerMasonry(i, 3, niche),
                duration: dur,
                ease: EASE_OUT_STRONG,
              }}
              whileHover={{
                y: NICHE_CARD_HOVER[flavor].y,
                boxShadow: NICHE_CARD_HOVER[flavor].shadow,
              }}
              className="mb-[var(--gs-gap)] break-inside-avoid rounded-[var(--gs-card-radius)] border border-border bg-card p-6 shadow-elevated sm:p-7 [transition:border-color_0.3s_cubic-bezier(0.23,1,0.32,1),background-color_0.3s_ease] hover:border-accent/20"
            >
              <StarRow rating={review.rating} label={t.outOfFive(clampRating(review.rating))} />

              <blockquote className="mt-5 font-serif text-base font-light italic leading-relaxed text-card-foreground/85 sm:text-lg">
                &ldquo;{review.text}&rdquo;
              </blockquote>

              <div className="my-6 h-px bg-border" aria-hidden />

              <figcaption className="flex items-center gap-3">
                {review.avatar ? (
                  <img
                    src={review.avatar}
                    alt=""
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="h-10 w-10 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-bold text-secondary-foreground">
                    {getInitials(review.name)}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-card-foreground">{review.name}</p>
                  <p className="truncate text-xs uppercase tracking-widest text-muted-foreground">
                    {review.title}
                  </p>
                </div>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  );
}
