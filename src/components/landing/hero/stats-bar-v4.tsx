import { motion, useReducedMotion } from "motion/react";
import { Sparkles } from "lucide-react";
import { siteConfig } from "../../../config/site";
import { resolveLucideIcon } from "../../../lib/lucide-icons";
import { EASE_OUT_STRONG, NICHE_CARD_HOVER, getNicheFlavor } from "../../../lib/motion";
import type { HeroStat } from "./stats-bar";

/**
 * `<StatsBarV4>` — ICON + NUMBER CARDS.
 *
 * Compact card row: 2 columns on mobile, 4 on lg. Each card carries a small
 * Lucide icon (resolved by name, same registry as v1), a bold title and a
 * muted description on a `bg-card` glass surface that respects the client's
 * `--gs-card-radius` token. Hover uses the niche-tuned NICHE_CARD_HOVER lift.
 *
 * Same external contract as v1: single block-level strip, `items` + `className`.
 */

type Props = {
  items?: HeroStat[];
  className?: string;
};

export function StatsBarV4({ items, className }: Props) {
  const prefersReduced = useReducedMotion();
  const hover = NICHE_CARD_HOVER[getNicheFlavor(siteConfig.business.type)];
  const stats = items ?? [];
  if (stats.length === 0) return null;

  return (
    <div className={["grid grid-cols-2 gap-3 lg:grid-cols-4", className ?? ""].join(" ")}>
      {stats.map((stat, i) => {
        const Icon = resolveLucideIcon(stat.icon, Sparkles);
        return (
          <motion.div
            key={`${stat.title}-${i}`}
            initial={prefersReduced ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5, delay: 0.2 + i * 0.07, ease: EASE_OUT_STRONG }}
            whileHover={
              prefersReduced
                ? undefined
                : { y: hover.y, scale: hover.scale, boxShadow: hover.shadow }
            }
            className="flex flex-col items-start gap-2.5 rounded-[var(--gs-card-radius)] border border-border bg-card/85 p-4 shadow-sm backdrop-blur-md md:p-5"
          >
            <span
              aria-hidden
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent"
            >
              <Icon size={15} strokeWidth={1.75} />
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="line-clamp-2 text-sm font-bold leading-tight text-foreground md:text-base">
                {stat.title}
              </span>
              {stat.description && (
                <span className="mt-0.5 line-clamp-2 text-xs leading-tight text-muted-foreground">
                  {stat.description}
                </span>
              )}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}
