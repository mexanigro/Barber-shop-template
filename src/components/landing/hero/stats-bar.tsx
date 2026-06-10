import React from "react";
import { motion, useReducedMotion } from "motion/react";
import { resolveLucideIcon } from "../../../lib/lucide-icons";
import { Sparkles } from "lucide-react";
import { siteConfig } from "../../../config/site";
import { resolveVariant } from "../../../lib/section-variants";

// Lazy variant modules — only fetched when `hero.statsBar.variant` selects them.
const VARIANT_MODULES = {
  v2: React.lazy(() => import("./stats-bar-v2").then((m) => ({ default: m.StatsBarV2 }))),
  v3: React.lazy(() => import("./stats-bar-v3").then((m) => ({ default: m.StatsBarV3 }))),
  v4: React.lazy(() => import("./stats-bar-v4").then((m) => ({ default: m.StatsBarV4 }))),
  v5: React.lazy(() => import("./stats-bar-v5").then((m) => ({ default: m.StatsBarV5 }))),
} as const;

/**
 * `<HeroStatsBar>` — full-width strip pinned to the bottom of the
 * Velvet Muse Hero. Carries 4 quick "why us" cells (Premium Products /
 * Expert Stylists / Personalized Experience / Luxury Always).
 *
 * Each cell fades in from the left with a 90 ms stagger, giving the
 * impression that the strip is "rolling out" under the hero copy on
 * load. Under reduced-motion, the strip appears at full opacity
 * instantly — no movement.
 *
 * Icons are resolved from Lucide by name (same registry the rest of
 * the template uses) so a hub-side editor can swap them without a
 * code change.
 */

export type HeroStat = {
  /** Lucide icon name. Default `"Sparkles"`. */
  icon?: string;
  /** Bold title shown next to the icon. */
  title: string;
  /** Muted one-liner under the title. */
  description: string;
};

type Props = {
  items?: HeroStat[];
  className?: string;
};

const DEFAULT_STATS: HeroStat[] = [
  { icon: "Flower2", title: "Premium Products", description: "Only the best." },
  { icon: "Scissors", title: "Expert Stylists", description: "Years of artistry." },
  { icon: "Gem", title: "Personalized Experience", description: "Tailored to you." },
  { icon: "Sparkles", title: "Luxury. Always.", description: "Because you deserve it." },
];

export function HeroStatsBar({ items, className }: Props) {
  const prefersReduced = useReducedMotion();

  // Variant dispatch — "v1" (or anything unknown) falls through to the
  // original strip below, untouched. Variants only render config-provided
  // items, so DEFAULT_STATS never reaches them.
  const variantCode = resolveVariant(siteConfig.hero.statsBar?.variant);
  if (variantCode !== "v1" && items && items.length > 0) {
    const VariantStatsBar = VARIANT_MODULES[variantCode];
    return (
      <React.Suspense fallback={null}>
        <VariantStatsBar items={items} className={className} />
      </React.Suspense>
    );
  }

  const stats = items && items.length > 0 ? items : DEFAULT_STATS;

  return (
    <motion.div
      // The bar itself fades in once — children handle their stagger via
      // delay-per-index. Two-tier animation keeps the bar feeling like a
      // single object that then "rolls open".
      initial={prefersReduced ? false : { opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className={[
        "relative rounded-[28px] border border-[#efe4d8] bg-white/75 px-4 py-4 shadow-[0_24px_60px_-30px_rgba(95,40,55,0.25)] backdrop-blur-xl",
        "md:px-6 md:py-5",
        className ?? "",
      ].join(" ")}
    >
      <div className="grid grid-cols-2 gap-x-4 gap-y-4 md:grid-cols-4 md:gap-x-6">
        {stats.map((stat, i) => {
          const Icon = resolveLucideIcon(stat.icon, Sparkles);
          return (
            <motion.div
              key={`${stat.title}-${i}`}
              initial={prefersReduced ? false : { opacity: 0, x: -16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{
                duration: 0.45,
                delay: 0.3 + i * 0.09,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="flex items-start gap-3"
            >
              <span
                className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#fff3e6] to-[#f4dcc6] text-[#c9a37a] shadow-inner"
                aria-hidden
              >
                <Icon size={18} strokeWidth={1.75} />
              </span>
              <div className="flex min-w-0 flex-col">
                <span className="line-clamp-2 font-serif text-[15px] font-medium leading-tight text-[#3b1820]">
                  {stat.title}
                </span>
                <span className="mt-0.5 line-clamp-1 text-[12px] leading-tight text-[#7a5965]">
                  {stat.description}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
