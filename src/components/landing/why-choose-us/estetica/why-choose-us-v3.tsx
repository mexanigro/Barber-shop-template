/**
 * why-choose-us/estetica/why-choose-us-v3.tsx — STANDARD LEDGER (estética).
 *
 * The standard written down, not illustrated: each benefit is a full-width
 * hairline row — serif numeral, oversized serif claim, supporting line on
 * the end column. No icons, no cards; the typography carries the authority,
 * like the house rules engraved on porcelain.
 *
 * Selected when `sections.whyChooseUs.variant === "v3"` and niche is estética.
 */
import React from "react";
import { motion } from "motion/react";
import { siteConfig } from "../../../../config/site";
import { interpolate } from "../../../../lib/interpolate";
import {
  Y_SM, Y_LG, VIEWPORT_ONCE,
  getNicheFlavor, NICHE_DURATION, NICHE_EASING,
} from "../../../../lib/motion";

export function EsteticaWhyChooseUsV3({ onNavigateToAbout: _onNavigateToAbout }: { onNavigateToAbout?: () => void }) {
  const { sections, brand } = siteConfig;
  const sectionConfig = sections.whyChooseUs;
  const niche = siteConfig.business.type;
  const flavor = getNicheFlavor(niche);
  const dur = NICHE_DURATION[flavor];
  const ease = NICHE_EASING[flavor];

  const brandVars = { brand: brand?.name ?? "" };
  const eyebrow = sectionConfig.title ? interpolate(sectionConfig.title, brandVars) : "";
  const heading = sectionConfig.subtitle ? interpolate(sectionConfig.subtitle, brandVars) : "";
  const benefits = sectionConfig.benefits ?? [];
  if (benefits.length === 0) return null;

  return (
    <section id="why-choose-us" className="bg-secondary/50 py-16 transition-colors duration-300 sm:py-24 lg:py-32 dark:bg-secondary/20">
      <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">

        {/* ── Centered header ────────────────────────────────────────── */}
        <div className="mx-auto mb-14 max-w-2xl text-center sm:mb-20">
          <motion.p
            initial={{ opacity: 0, y: Y_SM }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT_ONCE}
            transition={{ duration: dur, ease }}
            className="mb-3 inline-flex items-center gap-3 text-[10px] font-medium uppercase tracking-[0.32em] text-accent-light sm:text-xs"
          >
            <span className="h-px w-7 bg-accent/50" aria-hidden />
            {eyebrow}
            <span className="h-px w-7 bg-accent/50" aria-hidden />
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: Y_LG }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT_ONCE}
            transition={{ duration: dur, ease, delay: 0.08 }}
            className="font-serif text-3xl font-light leading-[1.08] text-balance text-foreground sm:text-4xl md:text-5xl"
          >
            {heading}
          </motion.h2>
        </div>

        {/* ── Ledger rows ────────────────────────────────────────────── */}
        <ul className="border-t border-border">
          {benefits.map((benefit, i) => (
            <motion.li
              key={`${benefit.title.slice(0, 20)}-${i}`}
              initial={{ opacity: 0, y: Y_LG }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={VIEWPORT_ONCE}
              transition={{ duration: dur, ease, delay: Math.min(i * 0.07, 0.3) }}
              className="grid grid-cols-1 gap-3 border-b border-border py-8 sm:grid-cols-12 sm:items-baseline sm:gap-8 sm:py-10"
            >
              <span className="font-serif text-sm tabular-nums text-accent-light sm:col-span-1" aria-hidden>
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="font-serif text-2xl font-light leading-snug text-foreground sm:col-span-6 sm:text-3xl md:text-4xl">
                {benefit.title}
              </h3>
              <p className="max-w-md text-[14px] font-light leading-relaxed text-muted-foreground sm:col-span-5 sm:text-[15px]">
                {benefit.desc}
              </p>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
}
