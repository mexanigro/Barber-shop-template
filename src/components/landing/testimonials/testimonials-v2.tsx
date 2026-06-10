/**
 * testimonials-v2.tsx — CAROUSEL testimonials variant.
 *
 * One testimonial at a time, center stage: oversized serif quote with a
 * quiet lucide Quote watermark behind it, name/title/stars below, prev/next
 * arrows + dot indicators. AnimatePresence directional slide+fade (enter
 * 300 ms, exit faster) whose direction follows navigation and mirrors in
 * RTL. Auto-advances every 8 s only when animationLevel === "rich" (pauses
 * on hover/focus-within, stops permanently on interaction, respects
 * prefers-reduced-motion). Swipe via motion drag="x" with momentum threshold.
 *
 * Selected via `sections.testimonials.variant === "v2"` (Testimonials.tsx).
 */
import React from "react";
import { ChevronLeft, ChevronRight, Quote, Star } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { PanInfo } from "motion/react";
import { cn } from "../../../lib/utils";
import { localeConfig } from "../../../config/locale";
import { siteConfig } from "../../../config/site";
import { getAnimationLevel } from "../../../lib/section-variants";
import {
  Y_SM, Y_MD, VIEWPORT_ONCE,
  getNicheFlavor, NICHE_DURATION, NICHE_EASING, EASE_OUT_STRONG,
} from "../../../lib/motion";

type Strings = {
  outOfFive: (rating: number) => string;
  previous: string;
  next: string;
  goTo: (n: number) => string;
};

const STRINGS: Record<"en" | "he" | "ru" | "ar", Strings> = {
  en: {
    outOfFive: (r) => `${r} out of 5`,
    previous: "Previous testimonial",
    next: "Next testimonial",
    goTo: (n) => `Go to testimonial ${n}`,
  },
  he: {
    outOfFive: (r) => `${r} מתוך 5`,
    previous: "ההמלצה הקודמת",
    next: "ההמלצה הבאה",
    goTo: (n) => `מעבר להמלצה ${n}`,
  },
  ru: {
    outOfFive: (r) => `${r} из 5`,
    previous: "Предыдущий отзыв",
    next: "Следующий отзыв",
    goTo: (n) => `Перейти к отзыву ${n}`,
  },
  ar: {
    outOfFive: (r) => `${r} من 5`,
    previous: "الشهادة السابقة",
    next: "الشهادة التالية",
    goTo: (n) => `الانتقال إلى الشهادة ${n}`,
  },
};

const SLIDE_X = 64;
const SWIPE_OFFSET = 80;
const SWIPE_VELOCITY = 400;
const AUTO_ADVANCE_MS = 8000;

function clampRating(rating: number) {
  return Math.max(0, Math.min(5, Math.round(rating)));
}

function StarRow({ rating, label, size = 16 }: { rating: number; label: string; size?: number }) {
  const filled = clampRating(rating);
  return (
    <div className="flex items-center justify-center gap-1" role="img" aria-label={label}>
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

const slideVariants = {
  enter: (enterX: number) => ({ opacity: 0, x: enterX }),
  center: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.3, ease: EASE_OUT_STRONG },
  },
  exit: (enterX: number) => ({
    opacity: 0,
    x: -enterX,
    transition: { duration: 0.2, ease: EASE_OUT_STRONG },
  }),
};

export function TestimonialsV2() {
  const { testimonials, sections } = siteConfig;
  const { testimonials: sectionConfig } = sections;
  const niche = siteConfig.business.type;
  const flavor = getNicheFlavor(niche);
  const dur = NICHE_DURATION[flavor];
  const ease = NICHE_EASING[flavor];
  const t = STRINGS[localeConfig.lang] ?? STRINGS.en;
  const isRTL = localeConfig.dir === "rtl";

  const count = testimonials.length;
  const [[index, direction], setSlide] = React.useState<[number, 1 | -1]>([0, 1]);
  const [paused, setPaused] = React.useState(false);
  const [interacted, setInteracted] = React.useState(false);

  const navigate = React.useCallback(
    (target: number, dir: 1 | -1) => {
      setInteracted(true);
      setSlide([((target % count) + count) % count, dir]);
    },
    [count],
  );

  // Auto-advance: rich animation level only, never after a manual interaction,
  // never while hovered/focused, never under prefers-reduced-motion.
  React.useEffect(() => {
    if (count < 2 || interacted || paused) return;
    if (getAnimationLevel() !== "rich") return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    const id = window.setInterval(() => {
      setSlide(([prev]) => [(prev + 1) % count, 1]);
    }, AUTO_ADVANCE_MS);
    return () => window.clearInterval(id);
  }, [count, interacted, paused]);

  function handleDragEnd(_event: unknown, info: PanInfo) {
    if (count < 2) return;
    const { offset, velocity } = info;
    if (Math.abs(offset.x) < SWIPE_OFFSET && Math.abs(velocity.x) < SWIPE_VELOCITY) return;
    // Swiping toward inline-start advances; the physical axis mirrors in RTL.
    const goesNext = isRTL ? offset.x > 0 : offset.x < 0;
    navigate(index + (goesNext ? 1 : -1), goesNext ? 1 : -1);
  }

  function handleBlur(e: React.FocusEvent<HTMLDivElement>) {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPaused(false);
  }

  const review = testimonials[index];
  // Visual slide direction: logical "next" enters from the inline-end side.
  const enterX = direction * (isRTL ? -1 : 1) * SLIDE_X;

  return (
    <section
      id="testimonials"
      className="bg-background px-5 py-16 transition-colors duration-300 sm:px-6 sm:py-28"
    >
      <div className="mx-auto max-w-4xl">

        {/* ── Section header ──────────────────────────────────────── */}
        <div className="mb-10 text-center sm:mb-14">
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

        {/* ── Center stage ────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: Y_MD }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEWPORT_ONCE}
          transition={{ duration: dur, ease, delay: 0.15 }}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocusCapture={() => setPaused(true)}
          onBlurCapture={handleBlur}
          className="relative"
        >
          {/* Quiet quote watermark */}
          <Quote
            size={120}
            aria-hidden
            className="pointer-events-none absolute -top-6 start-0 text-border/40 rtl:-scale-x-100 sm:-top-10"
            fill="currentColor"
            strokeWidth={0}
          />

          {/* Slide stage — aria-live announces slide changes */}
          <div aria-live="polite" className="relative overflow-hidden">
            <AnimatePresence mode="wait" initial={false} custom={enterX}>
              <motion.figure
                key={index}
                custom={enterX}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                drag={count > 1 ? "x" : false}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.15}
                onDragEnd={handleDragEnd}
                className={cn(
                  "mx-auto flex min-h-[280px] max-w-3xl flex-col items-center justify-center px-2 text-center sm:min-h-[320px] sm:px-8",
                  count > 1 && "cursor-grab active:cursor-grabbing",
                )}
              >
                {/* dir=auto: English reviews on RTL pages keep their quotes and
                    punctuation in logical order; Hebrew reviews still flow RTL. */}
                <blockquote dir="auto" className="mb-8 font-serif text-[clamp(1.375rem,3.4vw,2.25rem)] font-light italic leading-snug text-foreground sm:mb-10">
                  &ldquo;{review.text}&rdquo;
                </blockquote>
                <figcaption className="flex flex-col items-center gap-2.5">
                  <StarRow rating={review.rating} label={t.outOfFive(clampRating(review.rating))} />
                  <p dir="auto" className="text-sm font-bold text-foreground sm:text-base">{review.name}</p>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">
                    {review.title}
                  </p>
                </figcaption>
              </motion.figure>
            </AnimatePresence>
          </div>

          {/* ── Controls ──────────────────────────────────────────── */}
          {count > 1 && (
            <div className="mt-8 flex items-center justify-center gap-4 sm:mt-10">
              <button
                type="button"
                onClick={() => navigate(index - 1, -1)}
                aria-label={t.previous}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-muted-foreground active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 lg:hover:border-accent/30 lg:hover:text-foreground [transition:border-color_0.2s_cubic-bezier(0.23,1,0.32,1),color_0.2s_cubic-bezier(0.23,1,0.32,1),transform_0.12s_cubic-bezier(0.23,1,0.32,1)]"
              >
                <ChevronLeft size={16} className="rtl:-scale-x-100" />
              </button>

              <div className="flex items-center" role="group" aria-label={sectionConfig.title}>
                {testimonials.map((item, i) => (
                  <button
                    key={`dot-${item.name.slice(0, 12)}-${i}`}
                    type="button"
                    onClick={() => navigate(i, i > index ? 1 : -1)}
                    aria-label={t.goTo(i + 1)}
                    aria-current={i === index ? "true" : undefined}
                    className="flex h-11 w-11 items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "block h-1.5 rounded-full [transition:width_0.3s_cubic-bezier(0.23,1,0.32,1),background-color_0.3s_ease]",
                        i === index ? "w-6 bg-accent-light" : "w-1.5 bg-border",
                      )}
                    />
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => navigate(index + 1, 1)}
                aria-label={t.next}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-muted-foreground active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 lg:hover:border-accent/30 lg:hover:text-foreground [transition:border-color_0.2s_cubic-bezier(0.23,1,0.32,1),color_0.2s_cubic-bezier(0.23,1,0.32,1),transform_0.12s_cubic-bezier(0.23,1,0.32,1)]"
              >
                <ChevronRight size={16} className="rtl:-scale-x-100" />
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
}
