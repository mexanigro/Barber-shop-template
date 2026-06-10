/**
 * testimonials-v5.tsx — RATING SUMMARY + LIST testimonials variant.
 *
 * Header block with the aggregate: huge serif average rating (computed from
 * the data), star row, "N reviews" count, and a per-star distribution bar
 * chart (real distribution, thin bg-accent bars on bg-muted tracks, animated
 * scaleX on view, origin mirrors in RTL). Beside it on lg+ (below on mobile):
 * a clean vertical review list — avatar/initial, name, stars, text, hairline
 * separators. Every number is computed from siteConfig.testimonials.
 *
 * Selected via `sections.testimonials.variant === "v5"` (Testimonials.tsx).
 */
import { Star } from "lucide-react";
import { motion } from "motion/react";
import { localeConfig } from "../../../config/locale";
import { siteConfig } from "../../../config/site";
import {
  Y_SM, Y_MD, VIEWPORT_ONCE,
  getNicheFlavor, NICHE_DURATION, NICHE_EASING, NICHE_STAGGER,
  EASE_OUT_STRONG,
} from "../../../lib/motion";

type Strings = {
  outOfFive: (rating: number | string) => string;
  reviewCount: (n: number) => string;
};

function ruPluralReviews(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "отзыв";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "отзыва";
  return "отзывов";
}

const STRINGS: Record<"en" | "he" | "ru" | "ar", Strings> = {
  en: {
    outOfFive: (r) => `${r} out of 5`,
    reviewCount: (n) => `${n} ${n === 1 ? "review" : "reviews"}`,
  },
  he: {
    outOfFive: (r) => `${r} מתוך 5`,
    reviewCount: (n) => (n === 1 ? "ביקורת אחת" : `${n} ביקורות`),
  },
  ru: {
    outOfFive: (r) => `${r} из 5`,
    reviewCount: (n) => `${n} ${ruPluralReviews(n)}`,
  },
  ar: {
    outOfFive: (r) => `${r} من 5`,
    reviewCount: (n) => {
      if (n === 1) return "تقييم واحد";
      if (n === 2) return "تقييمان";
      if (n >= 3 && n <= 10) return `${n} تقييمات`;
      return `${n} تقييمًا`;
    },
  },
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

function StarRow({ rating, label, size = 14 }: { rating: number; label: string; size?: number }) {
  const filled = clampRating(rating);
  return (
    <div className="flex gap-1" role="img" aria-label={label}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={size}
          aria-hidden
          className={i < filled ? "text-accent-light" : "text-muted-foreground/35"}
          fill={i < filled ? "currentColor" : "none"}
        />
      ))}
    </div>
  );
}

export function TestimonialsV5() {
  const { testimonials, sections } = siteConfig;
  const { testimonials: sectionConfig } = sections;
  const niche = siteConfig.business.type;
  const flavor = getNicheFlavor(niche);
  const dur = NICHE_DURATION[flavor];
  const ease = NICHE_EASING[flavor];
  const step = NICHE_STAGGER[flavor];
  const t = STRINGS[localeConfig.lang] ?? STRINGS.en;

  // ── Aggregate — every number computed from real data ─────────────
  const total = testimonials.length;
  const average =
    total > 0
      ? testimonials.reduce((sum, r) => sum + Math.max(0, Math.min(5, r.rating)), 0) / total
      : 0;
  const averageLabel = average.toFixed(1);
  const distribution = [5, 4, 3, 2, 1].map((stars) => {
    const count = testimonials.filter((r) => clampRating(r.rating) === stars).length;
    return { stars, count, share: total > 0 ? count / total : 0 };
  });

  return (
    <section
      id="testimonials"
      className="bg-background px-5 py-16 transition-colors duration-300 sm:px-6 sm:py-28"
    >
      <div className="mx-auto max-w-6xl">

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

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">

          {/* ── Aggregate summary ─────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: Y_MD }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT_ONCE}
            transition={{ duration: dur, ease, delay: 0.12 }}
            className="self-start lg:sticky lg:top-28"
          >
            <p className="font-serif text-[clamp(4.5rem,9vw,7rem)] font-medium leading-none tracking-tight text-foreground">
              {averageLabel}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <StarRow rating={average} label={t.outOfFive(averageLabel)} size={18} />
              <p className="text-sm text-muted-foreground">{t.reviewCount(total)}</p>
            </div>

            {/* Per-star distribution — real counts, animated bars.
                whileInView lives on the ROW, not the bar: at scaleX(0) the
                bar has zero area and in RTL the IntersectionObserver never
                reports it visible, leaving the chart permanently empty. The
                row always has real area, and the bar follows via variants. */}
            <div className="mt-8 flex flex-col gap-2.5">
              {distribution.map(({ stars, count, share }, rowIndex) => (
                <motion.div
                  key={`dist-${stars}`}
                  role="img"
                  aria-label={`${t.outOfFive(stars)} — ${t.reviewCount(count)}`}
                  className="flex items-center gap-3"
                  initial="hidden"
                  whileInView="show"
                  viewport={VIEWPORT_ONCE}
                >
                  <span
                    aria-hidden
                    className="flex w-7 shrink-0 items-center justify-end gap-1 text-xs font-semibold tabular-nums text-muted-foreground"
                  >
                    {stars}
                    <Star size={11} className="text-accent-light" fill="currentColor" />
                  </span>
                  <div aria-hidden className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <motion.div
                      variants={{
                        hidden: { scaleX: 0 },
                        show: {
                          scaleX: 1,
                          transition: {
                            duration: 0.6,
                            ease: EASE_OUT_STRONG,
                            delay: 0.2 + rowIndex * 0.06,
                          },
                        },
                      }}
                      style={{ width: `${Math.round(share * 100)}%` }}
                      className="h-full origin-left rounded-full bg-accent rtl:origin-right"
                    />
                  </div>
                  <span
                    aria-hidden
                    className="w-6 shrink-0 text-end text-xs tabular-nums text-muted-foreground"
                  >
                    {count}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* ── Review list ───────────────────────────────────────── */}
          <div>
            {testimonials.map((review, i) => (
              <motion.figure
                key={`testimonial-${review.name.slice(0, 15)}-${i}`}
                initial={{ opacity: 0, y: Y_MD }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={VIEWPORT_ONCE}
                transition={{
                  delay: Math.min(i * step, 0.4),
                  duration: dur,
                  ease: EASE_OUT_STRONG,
                }}
                className="border-b border-border py-7 first:pt-0 last:border-b-0 sm:py-8"
              >
                <figcaption className="mb-4 flex items-center gap-3">
                  {review.avatar ? (
                    <img
                      src={review.avatar}
                      alt=""
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="h-11 w-11 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-bold text-secondary-foreground">
                      {getInitials(review.name)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
                      <p className="truncate text-sm font-bold text-foreground">{review.name}</p>
                      <StarRow
                        rating={review.rating}
                        label={t.outOfFive(clampRating(review.rating))}
                      />
                    </div>
                    <p className="mt-0.5 truncate text-xs uppercase tracking-widest text-muted-foreground">
                      {review.title}
                    </p>
                  </div>
                </figcaption>
                <blockquote className="font-serif text-base font-light italic leading-relaxed text-foreground/85 sm:text-lg">
                  &ldquo;{review.text}&rdquo;
                </blockquote>
              </motion.figure>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
