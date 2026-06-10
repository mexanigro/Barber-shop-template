import { motion, useReducedMotion } from "motion/react";
import { EASE_OUT_STRONG } from "../../../lib/motion";
import type { HeroStat } from "./stats-bar";

/**
 * `<StatsBarV5>` — MINIMAL INLINE TEXT.
 *
 * The quietest possible social proof: one small-caps typographic line with
 * stats joined by middot separators ("500+ clients · 12 years · 4.9★").
 * No icons, no borders, no cards — just a faint backdrop-blur scrim so the
 * line stays legible over hero imagery. Separators are interleaved flex
 * children, so RTL order mirrors automatically.
 *
 * When a title is purely numeric ("500+"), the description is appended
 * inline as its label ("500+ happy clients"); titles that already carry
 * words render alone to keep the line short.
 *
 * Same external contract as v1: single block-level strip, `items` + `className`.
 */

type Props = {
  items?: HeroStat[];
  className?: string;
};

/** "500+" / "4.9★" → needs its description as a label; "Expert Stylists" → doesn't. */
function segmentText(stat: HeroStat): string {
  const titleIsNumeric = /^\W*[\d.,]+\W*$/.test(stat.title.trim());
  return titleIsNumeric && stat.description
    ? `${stat.title} ${stat.description}`
    : stat.title;
}

export function StatsBarV5({ items, className }: Props) {
  const prefersReduced = useReducedMotion();
  const stats = items ?? [];
  if (stats.length === 0) return null;

  return (
    <motion.div
      initial={prefersReduced ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.55, delay: 0.25, ease: EASE_OUT_STRONG }}
      className={["flex justify-center", className ?? ""].join(" ")}
    >
      <p className="flex max-w-full flex-wrap items-baseline justify-center gap-x-3 gap-y-1 rounded-full bg-card/60 px-5 py-2.5 text-xs uppercase tracking-[0.18em] text-muted-foreground backdrop-blur-md">
        {stats.map((stat, i) => (
          <span key={`${stat.title}-${i}`} className="contents">
            {i > 0 && (
              <span aria-hidden className="select-none text-muted-foreground/60">
                ·
              </span>
            )}
            <span className="whitespace-nowrap">
              <span className="font-semibold tabular-nums text-foreground">
                {segmentText(stat)}
              </span>
            </span>
          </span>
        ))}
      </p>
    </motion.div>
  );
}
