import { motion, useReducedMotion } from "motion/react";
import { Sparkles } from "lucide-react";
import { localeConfig } from "../../../config/locale";
import { resolveLucideIcon } from "../../../lib/lucide-icons";
import { EASE_OUT_STRONG } from "../../../lib/motion";
import type { HeroStat } from "./stats-bar";

/**
 * `<StatsBarV2>` — HORIZONTAL SCROLL stats strip.
 *
 * A marquee-less, user-driven scroll row of glass stat chips. Useful when a
 * client configures more items than fit in one row. Scroll-snap keeps chips
 * tidy, the scrollbar is hidden, and symmetric gradient edge masks hint at
 * overflow on both sides (symmetric → identical in RTL).
 *
 * Same external contract as v1: mounts in the same wrapper slot, receives
 * `items` + `className`, renders a single block-level strip.
 */

type Lang = "en" | "he" | "ru" | "ar";

const STRINGS: Record<Lang, { listLabel: string }> = {
  en: { listLabel: "Business highlights" },
  he: { listLabel: "נקודות הבולטות של העסק" },
  ru: { listLabel: "Преимущества" },
  ar: { listLabel: "أبرز مميزات العمل" },
};

type Props = {
  items?: HeroStat[];
  className?: string;
};

export function StatsBarV2({ items, className }: Props) {
  const prefersReduced = useReducedMotion();
  const t = STRINGS[localeConfig.lang as Lang] ?? STRINGS.en;
  const stats = items ?? [];
  if (stats.length === 0) return null;

  return (
    <motion.div
      initial={prefersReduced ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, delay: 0.2, ease: EASE_OUT_STRONG }}
      className={["relative", className ?? ""].join(" ")}
    >
      <div
        role="list"
        aria-label={t.listLabel}
        className={[
          "flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-6 py-1 scroll-ps-6",
          // Symmetric edge fade — direction-agnostic, so RTL needs no mirror.
          "[-webkit-mask-image:linear-gradient(to_right,transparent,#000_6%,#000_94%,transparent)] [mask-image:linear-gradient(to_right,transparent,#000_6%,#000_94%,transparent)]",
          "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        ].join(" ")}
      >
        {stats.map((stat, i) => {
          const Icon = resolveLucideIcon(stat.icon, Sparkles);
          return (
            <motion.div
              role="listitem"
              key={`${stat.title}-${i}`}
              initial={prefersReduced ? false : { opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.45, delay: 0.3 + i * 0.06, ease: EASE_OUT_STRONG }}
              className="flex shrink-0 snap-start items-center gap-3 rounded-full border border-border bg-card/80 py-2.5 pe-5 ps-3 shadow-sm backdrop-blur-md"
            >
              <span
                aria-hidden
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent"
              >
                <Icon size={16} strokeWidth={1.75} />
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="whitespace-nowrap text-sm font-semibold leading-tight tabular-nums text-foreground">
                  {stat.title}
                </span>
                {stat.description && (
                  <span className="max-w-[240px] truncate text-xs leading-tight text-muted-foreground">
                    {stat.description}
                  </span>
                )}
              </span>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
