/**
 * why-choose-us/estetica/why-choose-us-v2.tsx — THE METHOD (estética).
 *
 * The clinic's standard told as a numbered journey: serif numerals and
 * benefit steps descending beside a scroll-fed hairline, with the arch
 * portrait (mainImage + badge) standing sticky on the end column. Reads
 * like a treatment protocol — ordered, calm, trustworthy.
 *
 * Selected when `sections.whyChooseUs.variant === "v2"` and niche is estética.
 */
import React from "react";
import { motion, useScroll, useSpring, useReducedMotion } from "motion/react";
import { siteConfig } from "../../../../config/site";
import { interpolate } from "../../../../lib/interpolate";
import { handleImgError } from "../../../../lib/utils";
import { getAnimationLevel } from "../../../../lib/section-variants";
import {
  Y_SM, Y_LG, VIEWPORT_ONCE,
  getNicheFlavor, NICHE_DURATION, NICHE_EASING,
} from "../../../../lib/motion";

export function EsteticaWhyChooseUsV2({ onNavigateToAbout: _onNavigateToAbout }: { onNavigateToAbout?: () => void }) {
  const { sections, brand } = siteConfig;
  const sectionConfig = sections.whyChooseUs;
  const niche = siteConfig.business.type;
  const flavor = getNicheFlavor(niche);
  const dur = NICHE_DURATION[flavor];
  const ease = NICHE_EASING[flavor];

  const reducedMotion = useReducedMotion();
  const lineAnimated = !reducedMotion && getAnimationLevel() !== "none";
  const listRef = React.useRef<HTMLOListElement>(null);
  const { scrollYProgress } = useScroll({ target: listRef, offset: ["start 0.8", "end 0.55"] });
  const scaleY = useSpring(scrollYProgress, { stiffness: 90, damping: 28, mass: 0.6 });

  const brandVars = { brand: brand?.name ?? "" };
  const eyebrow = sectionConfig.title ? interpolate(sectionConfig.title, brandVars) : "";
  const heading = sectionConfig.subtitle ? interpolate(sectionConfig.subtitle, brandVars) : "";
  const benefits = sectionConfig.benefits ?? [];
  if (benefits.length === 0) return null;

  return (
    <section id="why-choose-us" className="bg-background py-16 transition-colors duration-300 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="mb-12 max-w-2xl sm:mb-16">
          <motion.p
            initial={{ opacity: 0, y: Y_SM }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT_ONCE}
            transition={{ duration: dur, ease }}
            className="mb-3 flex items-center gap-3 text-[10px] font-medium uppercase tracking-[0.32em] text-accent-light sm:text-xs"
          >
            <span className="h-px w-7 shrink-0 bg-accent/50" aria-hidden />
            {eyebrow}
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

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">

          {/* ── Numbered journey ─────────────────────────────────────── */}
          <div className="relative min-w-0 lg:col-span-7">
            {/* Scroll-fed hairline */}
            <div className="absolute inset-y-2 start-[1.05rem] w-px bg-border sm:start-[1.35rem]" aria-hidden>
              {lineAnimated && (
                <motion.div style={{ scaleY }} className="h-full w-full origin-top bg-accent" />
              )}
            </div>

            <ol ref={listRef} className="flex flex-col gap-11 sm:gap-14">
              {benefits.map((benefit, i) => (
                <motion.li
                  key={`${benefit.title.slice(0, 20)}-${i}`}
                  initial={{ opacity: 0, y: Y_LG }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={VIEWPORT_ONCE}
                  transition={{ duration: dur, ease, delay: Math.min(i * 0.07, 0.3) }}
                  className="relative flex gap-6 ps-0 sm:gap-8"
                >
                  <span className="relative z-10 flex h-[2.1rem] w-[2.1rem] shrink-0 items-center justify-center rounded-full border border-accent/40 bg-background font-serif text-sm tabular-nums text-accent sm:h-[2.7rem] sm:w-[2.7rem] sm:text-base" aria-hidden>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0 pt-1">
                    <h3 className="font-serif text-xl font-normal leading-snug text-foreground sm:text-2xl">
                      {benefit.title}
                    </h3>
                    <p className="mt-2.5 max-w-lg text-[14px] font-light leading-relaxed text-muted-foreground sm:text-[15px]">
                      {benefit.desc}
                    </p>
                  </div>
                </motion.li>
              ))}
            </ol>
          </div>

          {/* ── Sticky arch portrait + badge ─────────────────────────── */}
          {sectionConfig.mainImage && (
            <div className="min-w-0 lg:col-span-5">
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={VIEWPORT_ONCE}
                transition={{ duration: dur * 1.2, ease }}
                className="relative mx-auto max-w-sm lg:sticky lg:top-28 lg:max-w-none"
              >
                <div className="relative aspect-[4/5] overflow-hidden rounded-t-[10rem] rounded-b-[0.5rem] sm:rounded-t-[13rem]">
                  <img
                    src={sectionConfig.mainImage}
                    alt={heading}
                    loading="lazy"
                    decoding="async"
                    onError={handleImgError}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" aria-hidden />
                </div>
                {sectionConfig.badge && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={VIEWPORT_ONCE}
                    transition={{ duration: dur, ease, delay: 0.2 }}
                    className="absolute -bottom-5 start-5 rounded-[0.625rem] border border-border bg-card/95 px-6 py-4 text-center shadow-elevated backdrop-blur-sm"
                  >
                    <p className="whitespace-pre-line font-serif text-base font-light leading-snug text-foreground">
                      {sectionConfig.badge}
                    </p>
                  </motion.div>
                )}
              </motion.div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
