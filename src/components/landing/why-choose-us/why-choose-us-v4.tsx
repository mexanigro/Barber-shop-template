/**
 * why-choose-us-v4.tsx — ANIMATED COUNTERS variant.
 *
 * Stats-led editorial design: huge serif numerals separated by hairlines
 * (no metric boxes/cards), counting up on first view. Data comes from
 * `siteConfig.hero.stats` when present; when absent we NEVER invent numbers —
 * benefits render instead as large index-numbered editorial rows. With stats
 * present, benefits follow as a compact two-column icon list.
 *
 * Counting is gated behind `getAnimationLevel() !== "none"` and
 * prefers-reduced-motion (final value shown instantly). Numbers keep any
 * non-numeric prefix/suffix ("+", "%", "★") and announce the full value via
 * aria-label.
 *
 * Selected via `sections.whyChooseUs.variant === "v4"` (WhyChooseUs.tsx
 * dispatcher).
 */
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, HelpCircle } from "lucide-react";
import { animate, motion, useInView, useReducedMotion } from "motion/react";
import { localeConfig } from "../../../config/locale";
import { siteConfig } from "../../../config/site";
import { interpolate } from "../../../lib/interpolate";
import { resolveLucideIcon } from "../../../lib/lucide-icons";
import { getAnimationLevel } from "../../../lib/section-variants";
import {
  Y_SM, Y_MD, VIEWPORT_ONCE,
  getNicheFlavor, nicheStagger, NICHE_DURATION, NICHE_EASING,
  COUNTER_DURATION, COUNTER_EASING,
} from "../../../lib/motion";

/* ── Stat value parsing ──────────────────────────────────────────────────
   "500+" → { prefix:"", target:500, suffix:"+" }; "98%" → 98 + "%".
   Returns null when no numeric part exists (value rendered as-is). */
function parseStatValue(raw: string): {
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

/** Counts up when scrolled into view; renders the final value instantly when
 *  animation is disabled. Announces the full original value to AT. */
function CountUpValue({ raw, animated }: { raw: string; animated: boolean }) {
  const parsed = useMemo(() => parseStatValue(raw), [raw]);
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

export function WhyChooseUsV4({
  onNavigateToAbout,
}: {
  onNavigateToAbout?: () => void;
} = {}) {
  const { sections, brand, hero } = siteConfig;
  const sectionConfig = sections.whyChooseUs;
  const niche = siteConfig.business.type;
  const flavor = getNicheFlavor(niche);
  const dur = NICHE_DURATION[flavor];
  const ease = NICHE_EASING[flavor];
  const stagger = nicheStagger(niche);

  const reducedMotion = useReducedMotion();
  const countersAnimated = !reducedMotion && getAnimationLevel() !== "none";

  const brandVars = { brand: brand?.name ?? "" };
  const eyebrow = sectionConfig.title ? interpolate(sectionConfig.title, brandVars) : "";
  const heading = sectionConfig.subtitle ? interpolate(sectionConfig.subtitle, brandVars) : "";
  const benefits = sectionConfig.benefits;
  // Real stats only — never invent numbers. Empty → numbered-benefits layout.
  const stats = (hero.stats ?? []).filter((s) => s.value && s.label);
  const hasStats = stats.length > 0;

  return (
    <section
      id="why-choose-us"
      className="bg-background px-5 py-14 transition-colors duration-300 sm:px-6 sm:py-[var(--gs-section-py)]"
    >
      <div className="mx-auto max-w-6xl">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="mb-12 text-center sm:mb-16">
          {eyebrow && (
            <motion.p
              initial={{ opacity: 0, y: Y_SM }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={VIEWPORT_ONCE}
              transition={{ duration: dur, ease }}
              className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-accent-light"
            >
              {eyebrow}
            </motion.p>
          )}
          {heading && (
            <motion.h2
              initial={{ opacity: 0, y: Y_MD }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={VIEWPORT_ONCE}
              transition={{ duration: dur, ease, delay: 0.08 }}
              className="mx-auto max-w-2xl text-balance font-serif text-3xl leading-tight text-foreground sm:text-4xl md:text-5xl"
            >
              {heading}
            </motion.h2>
          )}
        </div>

        {hasStats ? (
          <>
            {/* ── Counters — hairline-separated editorial numerals ────── */}
            <div className="flex flex-col items-stretch sm:flex-row sm:justify-center">
              {stats.map((stat, i) => (
                <Fragment key={`wcu-v4-stat-${stat.label.slice(0, 20)}-${i}`}>
                  {i > 0 && (
                    <span
                      aria-hidden="true"
                      className="mx-auto my-2 h-px w-16 bg-border sm:mx-8 sm:my-0 sm:h-auto sm:w-px sm:self-stretch lg:mx-12"
                    />
                  )}
                  <motion.div
                    initial={{ opacity: 0, y: Y_MD }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={VIEWPORT_ONCE}
                    transition={{ delay: stagger(i), duration: dur, ease }}
                    className="flex flex-1 flex-col items-center px-2 py-6 text-center sm:py-2"
                  >
                    {/* clamp(): fluid numeral scale between the old 5xl and 7xl stops */}
                    <span className="font-serif text-[clamp(3rem,2rem+4vw,4.5rem)] leading-none text-foreground">
                      <CountUpValue raw={stat.value} animated={countersAnimated} />
                    </span>
                    <span className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      {stat.label}
                    </span>
                  </motion.div>
                </Fragment>
              ))}
            </div>

            {/* ── Benefits — compact two-column icon list ─────────────── */}
            <div className="mt-14 grid grid-cols-1 gap-[var(--gs-gap)] sm:mt-20 sm:grid-cols-2">
              {benefits.map((benefit, i) => {
                const IconComponent = resolveLucideIcon(benefit.iconName, HelpCircle);
                return (
                  <motion.div
                    key={`wcu-v4-benefit-${benefit.title.slice(0, 20)}-${i}`}
                    initial={{ opacity: 0, y: Y_MD }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={VIEWPORT_ONCE}
                    transition={{ delay: stagger(i), duration: dur, ease }}
                    className="flex items-start gap-4"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-light/10">
                      <IconComponent size={20} className="text-accent-light" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-balance text-base font-bold leading-snug text-foreground">{benefit.title}</h3>
                      <p className="mt-1 text-pretty text-sm leading-relaxed text-muted-foreground line-clamp-3">{benefit.desc}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </>
        ) : (
          /* ── No stats configured — large numbered editorial rows.
                Index numbers are ordinal labels, not invented metrics. ── */
          <ol className="border-t border-border">
            {benefits.map((benefit, i) => {
              const IconComponent = resolveLucideIcon(benefit.iconName, HelpCircle);
              return (
                <motion.li
                  key={`wcu-v4-row-${benefit.title.slice(0, 20)}-${i}`}
                  initial={{ opacity: 0, y: Y_MD }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={VIEWPORT_ONCE}
                  transition={{ delay: stagger(i), duration: dur, ease }}
                  className="grid grid-cols-[auto_1fr] items-start gap-x-6 border-b border-border py-8 sm:gap-x-12 sm:py-10"
                >
                  <span
                    aria-hidden="true"
                    className="font-serif text-4xl leading-none text-accent-light/60 tabular-nums sm:text-6xl"
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <IconComponent size={20} className="shrink-0 text-accent-light" aria-hidden="true" />
                      <h3 className="text-balance font-serif text-xl leading-snug text-foreground sm:text-2xl">{benefit.title}</h3>
                    </div>
                    <p className="mt-2 max-w-2xl text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
                      {benefit.desc}
                    </p>
                  </div>
                </motion.li>
              );
            })}
          </ol>
        )}

        {/* ── About affordance ───────────────────────────────────────── */}
        {onNavigateToAbout && (
          <motion.div
            initial={{ opacity: 0, y: Y_SM }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT_ONCE}
            transition={{ delay: 0.2, duration: dur, ease }}
            className="mt-10 text-center sm:mt-12"
          >
            <button
              type="button"
              onClick={onNavigateToAbout}
              className="inline-flex min-h-11 touch-manipulation items-center gap-2 text-sm font-medium text-accent hover:text-accent-light active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 [transition:color_0.2s_cubic-bezier(0.23,1,0.32,1),transform_0.16s_cubic-bezier(0.23,1,0.32,1)]"
            >
              {localeConfig.services.learnMoreAboutUs}
              <ChevronRight size={14} className="rtl:rotate-180" aria-hidden="true" />
            </button>
          </motion.div>
        )}

      </div>
    </section>
  );
}
