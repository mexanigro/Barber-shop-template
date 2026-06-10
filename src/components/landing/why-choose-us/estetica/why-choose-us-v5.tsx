/**
 * why-choose-us/estetica/why-choose-us-v5.tsx — THE PLEDGE (estética).
 *
 * A centered typographic vow over a faint veiled trace of the mainImage:
 * each benefit set as an oversized serif statement that ascends from the
 * porcelain, its supporting line whispered beneath, separated by accent
 * dots. No cards, no icons, no grid — the clinic's standard as poetry.
 *
 * Selected when `sections.whyChooseUs.variant === "v5"` and niche is estética.
 */
import React from "react";
import { motion } from "motion/react";
import { siteConfig } from "../../../../config/site";
import { interpolate } from "../../../../lib/interpolate";
import { getOverlayOpacity } from "../../../../lib/section-variants";
import {
  Y_SM, Y_LG, VIEWPORT_ONCE,
  getNicheFlavor, NICHE_DURATION, NICHE_EASING,
} from "../../../../lib/motion";

export function EsteticaWhyChooseUsV5({ onNavigateToAbout: _onNavigateToAbout }: { onNavigateToAbout?: () => void }) {
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
    <section id="why-choose-us" className="relative overflow-hidden py-16 transition-colors duration-300 sm:py-24 lg:py-36">
      {/* ── Faint veiled imagery ─────────────────────────────────────── */}
      <div className="absolute inset-0" aria-hidden>
        {sectionConfig.mainImage && (
          <img
            src={sectionConfig.mainImage}
            alt=""
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover"
            draggable={false}
          />
        )}
        <div className="absolute inset-0 bg-background" style={{ opacity: getOverlayOpacity(0.93) }} />
        <div className="gs-gradient absolute inset-0 bg-[radial-gradient(ellipse_at_50%_20%,var(--secondary),transparent_70%)] opacity-60 dark:opacity-25" />
      </div>

      <div className="relative mx-auto max-w-3xl px-5 text-center sm:px-6">

        {/* ── Header ─────────────────────────────────────────────────── */}
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

        {/* ── Vows ───────────────────────────────────────────────────── */}
        <div className="mt-14 flex flex-col items-center sm:mt-20">
          {benefits.map((benefit, i) => (
            <React.Fragment key={`${benefit.title.slice(0, 20)}-${i}`}>
              {i > 0 && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.4 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={VIEWPORT_ONCE}
                  transition={{ duration: dur, ease }}
                  className="my-9 h-1.5 w-1.5 rounded-full bg-accent/60 sm:my-12"
                  aria-hidden
                />
              )}
              <motion.div
                initial={{ opacity: 0, y: Y_LG }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={VIEWPORT_ONCE}
                transition={{ duration: dur * 1.1, ease }}
                className="max-w-2xl"
              >
                <h3 className="text-balance font-serif text-[1.7rem] font-light italic leading-snug text-foreground sm:text-4xl">
                  {benefit.title}
                </h3>
                <p className="mx-auto mt-4 max-w-lg text-pretty text-[14px] font-light leading-relaxed text-muted-foreground sm:text-[15px]">
                  {benefit.desc}
                </p>
              </motion.div>
            </React.Fragment>
          ))}
        </div>

        {/* ── Closing signature ──────────────────────────────────────── */}
        {brand?.name && (
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={VIEWPORT_ONCE}
            transition={{ duration: dur * 1.3, ease, delay: 0.15 }}
            className="mt-14 text-[11px] font-medium uppercase tracking-[0.34em] text-accent-light sm:mt-20"
          >
            — {brand.name} —
          </motion.p>
        )}
      </div>
    </section>
  );
}
