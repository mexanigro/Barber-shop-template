/**
 * testimonials-v4.tsx — VIDEO TESTIMONIALS variant.
 *
 * Cards with a video thumbnail area: when `testimonial.videoUrl` exists the
 * card shows a <video> with a large play button (lucide Play, 64px circle);
 * clicking plays inline (native controls appear, any other playing video
 * pauses). When NO testimonial carries a videoUrl — the common case — the
 * section renders an elegant "spotlight" alternative: a 2-col grid of large
 * portrait-ish quote cards where the quote IS the hero. Mixed data renders
 * video cards and quote cards side by side in the same grid.
 *
 * Selected via `sections.testimonials.variant === "v4"` (Testimonials.tsx).
 */
import React from "react";
import { Play, Quote, Star } from "lucide-react";
import { motion } from "motion/react";
import type { Testimonial } from "../../../types";
import { localeConfig } from "../../../config/locale";
import { siteConfig } from "../../../config/site";
import {
  Y_SM, Y_MD, Y_LG, VIEWPORT_ONCE,
  getNicheFlavor, NICHE_DURATION, NICHE_EASING, NICHE_CARD_HOVER,
  staggerMasonry, EASE_OUT_STRONG,
} from "../../../lib/motion";

type Strings = {
  outOfFive: (rating: number) => string;
  play: (name: string) => string;
};

const STRINGS: Record<"en" | "he" | "ru" | "ar", Strings> = {
  en: {
    outOfFive: (r) => `${r} out of 5`,
    play: (name) => `Play video testimonial by ${name}`,
  },
  he: {
    outOfFive: (r) => `${r} מתוך 5`,
    play: (name) => `הפעלת המלצת וידאו של ${name}`,
  },
  ru: {
    outOfFive: (r) => `${r} из 5`,
    play: (name) => `Воспроизвести видеоотзыв: ${name}`,
  },
  ar: {
    outOfFive: (r) => `${r} من 5`,
    play: (name) => `تشغيل شهادة الفيديو من ${name}`,
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

function PersonRow({ review }: { review: Testimonial }) {
  return (
    <div className="flex items-center gap-3">
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
    </div>
  );
}

/** Card with an inline-playing <video>; only one video plays at a time. */
function VideoCard({
  review,
  playing,
  onPlay,
  t,
}: {
  review: Testimonial;
  playing: boolean;
  onPlay: () => void;
  t: Strings;
}) {
  const videoRef = React.useRef<HTMLVideoElement>(null);

  React.useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (playing) {
      void video.play().catch(() => {});
    } else if (!video.paused) {
      video.pause();
    }
  }, [playing]);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[var(--gs-card-radius)] border border-border bg-card shadow-elevated [transition:border-color_0.3s_cubic-bezier(0.23,1,0.32,1),background-color_0.3s_ease] hover:border-accent/20">
      <div className="relative aspect-[4/3] bg-muted">
        <video
          ref={videoRef}
          src={review.videoUrl}
          preload="metadata"
          playsInline
          controls={playing}
          onPlay={onPlay}
          className="h-full w-full object-cover"
        >
          <track kind="captions" />
        </video>
        {!playing && (
          <button
            type="button"
            onClick={onPlay}
            aria-label={t.play(review.name)}
            className="group absolute inset-0 flex items-center justify-center bg-black/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-inset [transition:background-color_0.3s_ease] lg:hover:bg-black/25"
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-background/90 text-foreground shadow-lg backdrop-blur-sm [transition:transform_0.25s_cubic-bezier(0.23,1,0.32,1)] group-active:scale-95 lg:group-hover:scale-105">
              {/* Play triangle is a universal symbol — intentionally not mirrored in RTL */}
              <Play size={24} className="ms-1" fill="currentColor" strokeWidth={0} aria-hidden />
            </span>
          </button>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-4 p-6">
        <StarRow rating={review.rating} label={t.outOfFive(clampRating(review.rating))} />
        <PersonRow review={review} />
      </div>
    </div>
  );
}

/** Spotlight quote card — the quote is the hero. Carries the layout when no videos exist. */
function SpotlightCard({ review, t }: { review: Testimonial; t: Strings }) {
  return (
    <div className="relative flex h-full flex-col rounded-[var(--gs-card-radius)] border border-border bg-card p-7 shadow-elevated sm:p-9 [transition:border-color_0.3s_cubic-bezier(0.23,1,0.32,1),background-color_0.3s_ease] hover:border-accent/20">
      <Quote
        size={72}
        aria-hidden
        fill="currentColor"
        strokeWidth={0}
        className="pointer-events-none absolute end-5 top-5 text-border/35 rtl:-scale-x-100"
      />
      <StarRow rating={review.rating} label={t.outOfFive(clampRating(review.rating))} />
      <blockquote className="relative mb-8 mt-6 flex-1 font-serif text-[clamp(1.125rem,1.9vw,1.5rem)] font-light italic leading-relaxed text-card-foreground/90">
        &ldquo;{review.text}&rdquo;
      </blockquote>
      <div className="mb-6 h-px bg-border" aria-hidden />
      <PersonRow review={review} />
    </div>
  );
}

export function TestimonialsV4() {
  const { testimonials, sections } = siteConfig;
  const { testimonials: sectionConfig } = sections;
  const niche = siteConfig.business.type;
  const flavor = getNicheFlavor(niche);
  const dur = NICHE_DURATION[flavor];
  const ease = NICHE_EASING[flavor];
  const t = STRINGS[localeConfig.lang] ?? STRINGS.en;

  // Index of the video currently playing (null = none). Only one at a time.
  const [playingIndex, setPlayingIndex] = React.useState<number | null>(null);

  const hasAnyVideo = testimonials.some((review) => Boolean(review.videoUrl));

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

        {/* ── Grid: video cards + spotlight quote cards coexist ───── */}
        <div className="grid grid-cols-1 items-stretch gap-[var(--gs-gap)] sm:grid-cols-2">
          {testimonials.map((review, i) => (
            <motion.div
              key={`testimonial-${review.name.slice(0, 15)}-${i}`}
              initial={{ opacity: 0, y: Y_LG }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={VIEWPORT_ONCE}
              transition={{
                delay: staggerMasonry(i, 2, niche),
                duration: dur,
                ease: EASE_OUT_STRONG,
              }}
              whileHover={{
                y: NICHE_CARD_HOVER[flavor].y,
                boxShadow: NICHE_CARD_HOVER[flavor].shadow,
              }}
              className="h-full rounded-[var(--gs-card-radius)]"
            >
              {hasAnyVideo && review.videoUrl ? (
                <VideoCard
                  review={review}
                  playing={playingIndex === i}
                  onPlay={() => setPlayingIndex(i)}
                  t={t}
                />
              ) : (
                <SpotlightCard review={review} t={t} />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
