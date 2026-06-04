/**
 * BusinessTestimonials.tsx
 *
 * Company quotes. Editorial layout — first quote is "anchor" sized,
 * surrounded by two smaller pulled-quote tiles. Avoids identical-card
 * monotony while keeping rhythm. Quote glyph is a structural element,
 * not decorative.
 */

import { motion } from "motion/react";
import { Quote } from "lucide-react";
import { useBusinessLocale } from "./useBusinessLocale";

const EASE = [0.23, 1, 0.32, 1] as const;

export function BusinessTestimonials() {
  const data = useBusinessLocale().testimonials;
  const [anchor, ...others] = data.items;

  return (
    <section
      id="business-testimonials"
      className="relative overflow-hidden bg-background py-20 sm:py-28 md:py-32"
    >
      <div className="relative mx-auto max-w-6xl px-5 sm:px-8 lg:px-12">
        {/* ── Header ────────────────────────────────────────────────── */}
        <div className="mb-12 max-w-3xl sm:mb-16">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, ease: EASE }}
            className="mb-3 font-sans text-xs font-semibold uppercase tracking-[0.22em] text-[#F5A623]"
          >
            {data.eyebrow}
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, delay: 0.06, ease: EASE }}
            className="font-serif text-3xl font-black leading-tight tracking-tight text-foreground sm:text-4xl md:text-5xl"
            style={{ textWrap: "balance" } as React.CSSProperties}
          >
            {data.title}
          </motion.h2>
        </div>

        {/* ── Anchor quote ──────────────────────────────────────────── */}
        <motion.figure
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.65, ease: EASE }}
          className="relative mb-6 overflow-hidden rounded-3xl border border-border/60 bg-card/95 p-8 shadow-[0_30px_60px_-24px_rgba(232,130,12,0.18)] sm:p-12 md:p-14"
        >
          {/* Backdrop glyph */}
          <Quote
            aria-hidden
            className="pointer-events-none absolute -end-4 -top-4 h-32 w-32 text-[#E8820C]/8 rtl:-scale-x-100 md:h-44 md:w-44"
            strokeWidth={1.2}
          />

          <blockquote className="relative font-serif text-[1.55rem] font-medium leading-[1.35] tracking-tight text-foreground sm:text-[1.85rem] md:text-[2.1rem]"
            style={{ textWrap: "balance" } as React.CSSProperties}
          >
            &ldquo;{anchor.quote}&rdquo;
          </blockquote>

          <figcaption className="relative mt-7 flex items-center gap-4">
            {/* Initials disk */}
            <span
              aria-hidden
              className="flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(232,130,12,0.12)] font-sans text-base font-bold tracking-wide text-[#E8820C]"
            >
              {anchor.author
                .split(" ")
                .map((p) => p[0])
                .join("")
                .slice(0, 2)}
            </span>
            <div className="flex flex-col">
              <span className="font-sans text-sm font-bold text-foreground sm:text-base">
                {anchor.author}
              </span>
              <span className="text-xs text-muted-foreground sm:text-sm">
                {anchor.role}
              </span>
            </div>
          </figcaption>
        </motion.figure>

        {/* ── Two smaller pulled quotes ─────────────────────────────── */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {others.map((t, i) => (
            <motion.figure
              key={t.author}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.55, delay: 0.08 + i * 0.08, ease: EASE }}
              className="flex flex-col gap-5 rounded-2xl border border-border/60 bg-card/80 p-7 sm:p-8"
            >
              <Quote
                aria-hidden
                className="h-7 w-7 text-[#F5A623]/55 rtl:-scale-x-100"
                strokeWidth={1.6}
              />
              <blockquote
                className="text-[15px] font-medium leading-relaxed text-foreground/90 sm:text-base"
                style={{ textWrap: "pretty" } as React.CSSProperties}
              >
                {t.quote}
              </blockquote>
              <figcaption className="flex items-center gap-3 border-t border-border/50 pt-5">
                <span
                  aria-hidden
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(232,130,12,0.10)] font-sans text-[13px] font-bold tracking-wide text-[#E8820C]"
                >
                  {t.author
                    .split(" ")
                    .map((p) => p[0])
                    .join("")
                    .slice(0, 2)}
                </span>
                <div className="flex flex-col">
                  <span className="font-sans text-sm font-semibold text-foreground">
                    {t.author}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {t.role}
                  </span>
                </div>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  );
}

export default BusinessTestimonials;
