import { useEffect, useMemo, useRef, useState } from "react";
import { animate, motion, useInView, useReducedMotion } from "motion/react";
import { COUNTER_DURATION, COUNTER_EASING, EASE_OUT_STRONG } from "../../../lib/motion";
import { getAnimationLevel } from "../../../lib/section-variants";
import type { HeroStat } from "./stats-bar";

/**
 * `<StatsBarV3>` — ANIMATED COUNTERS.
 *
 * Numeric parts of `item.title` count up on first view (large serif,
 * tabular-nums); the description sits beneath as a muted caption. Stats are
 * separated by thin vertical hairlines (logical `border-s` → RTL-safe), not
 * boxes. Counting is gated behind `getAnimationLevel() !== "none"` and
 * `prefers-reduced-motion` — when disabled, final values render instantly.
 * Items whose title has no number simply fade in as-is.
 *
 * Same external contract as v1: glass container, `items` + `className`.
 */

type Props = {
  items?: HeroStat[];
  className?: string;
};

/* ── Title parsing ───────────────────────────────────────────────────────────
   "500+ clients" → { prefix:"", target:500, suffix:"+ clients" };
   "4.9★"         → 4.9 + "★". Returns null when no numeric part exists. */
function parseStatTitle(raw: string): {
  prefix: string;
  target: number;
  suffix: string;
  decimals: number;
  grouped: boolean;
} | null {
  const match = raw.trim().match(/^(\D*)([\d.,]+)(.*)$/);
  if (!match) return null;
  const numStr = match[2];
  const normalized = numStr.replace(/,/g, "");
  const target = Number(normalized);
  if (!Number.isFinite(target)) return null;
  const decimals = normalized.includes(".") ? (normalized.split(".")[1]?.length ?? 0) : 0;
  return {
    prefix: match[1],
    target,
    suffix: match[3],
    decimals,
    grouped: numStr.includes(","),
  };
}

function formatCount(value: number, decimals: number, grouped: boolean): string {
  if (decimals > 0) return value.toFixed(decimals);
  const rounded = Math.round(value);
  return grouped ? rounded.toLocaleString("en-US") : String(rounded);
}

/** Counts the numeric part of a stat title up from 0 on first view.
 *  Announces the full original title to AT; renders the final value
 *  instantly when animation is disabled. */
function CountUpTitle({ raw, animated }: { raw: string; animated: boolean }) {
  const parsed = useMemo(() => parseStatTitle(raw), [raw]);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });
  const [current, setCurrent] = useState(() =>
    animated && parsed ? 0 : (parsed?.target ?? 0),
  );

  useEffect(() => {
    if (!animated || !parsed || !isInView) return;
    const controls = animate(0, parsed.target, {
      duration: COUNTER_DURATION,
      ease: [...COUNTER_EASING],
      onUpdate: (v) => setCurrent(v),
    });
    return () => controls.stop();
  }, [animated, parsed, isInView]);

  if (!parsed) return <span ref={ref}>{raw}</span>;

  return (
    <span ref={ref} aria-label={raw} className="tabular-nums">
      <span aria-hidden="true">
        {parsed.prefix}
        {formatCount(current, parsed.decimals, parsed.grouped)}
        {parsed.suffix}
      </span>
    </span>
  );
}

export function StatsBarV3({ items, className }: Props) {
  const prefersReduced = useReducedMotion();
  const animated = getAnimationLevel() !== "none" && !prefersReduced;
  const stats = items ?? [];
  if (stats.length === 0) return null;

  return (
    <motion.div
      initial={prefersReduced ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, delay: 0.2, ease: EASE_OUT_STRONG }}
      className={[
        "rounded-[var(--gs-card-radius)] border border-border bg-card/80 px-4 py-5 backdrop-blur-xl md:px-8 md:py-6",
        className ?? "",
      ].join(" ")}
    >
      <div className="grid grid-cols-2 gap-y-6 md:flex md:items-stretch md:justify-center">
        {stats.map((stat, i) => {
          // Hairlines between stats: between columns on the 2-col mobile
          // grid, between every stat on the md+ row. Logical `border-s`
          // mirrors automatically in RTL.
          const separators = [
            i % 2 === 1 ? "border-s border-border" : "",
            i > 0 && i % 2 === 0 ? "md:border-s md:border-border" : "",
          ].join(" ");
          return (
            <motion.div
              key={`${stat.title}-${i}`}
              initial={prefersReduced ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: 0.3 + i * 0.07, ease: EASE_OUT_STRONG }}
              className={`flex flex-col items-center justify-center px-3 text-center md:flex-1 md:px-8 ${separators}`}
            >
              <span className="font-serif text-3xl font-medium leading-none text-foreground md:text-4xl">
                <CountUpTitle raw={stat.title} animated={animated} />
              </span>
              {stat.description && (
                <span className="mt-2 text-xs leading-tight text-muted-foreground">
                  {stat.description}
                </span>
              )}
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
