/**
 * why-choose-us/estetica/why-choose-us-v4.tsx — DIPTYCH FOLD (estética).
 *
 * Classic clinic diptych: the arch portrait (mainImage) on the start panel
 * with the badge plate overlapping its edge, facing a quiet list of
 * benefits — soft circular icon plates, serif titles, hairline separations.
 * The most figurative of the family; imagery and credentials share weight.
 *
 * Selected when `sections.whyChooseUs.variant === "v4"` and niche is estética.
 */
import React from "react";
import { HelpCircle } from "lucide-react";
import { motion } from "motion/react";
import { siteConfig } from "../../../../config/site";
import { interpolate } from "../../../../lib/interpolate";
import { handleImgError } from "../../../../lib/utils";
import { resolveLucideIcon } from "../../../../lib/lucide-icons";
import {
  Y_SM, Y_LG, VIEWPORT_ONCE,
  getNicheFlavor, NICHE_DURATION, NICHE_EASING,
} from "../../../../lib/motion";

export function EsteticaWhyChooseUsV4({ onNavigateToAbout: _onNavigateToAbout }: { onNavigateToAbout?: () => void }) {
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
    <section id="why-choose-us" className="bg-background py-16 transition-colors duration-300 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-20">

          {/* ── Arch portrait panel ──────────────────────────────────── */}
          {sectionConfig.mainImage ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={VIEWPORT_ONCE}
              transition={{ duration: dur * 1.2, ease }}
              className="relative mx-auto w-full max-w-sm lg:col-span-5 lg:max-w-none"
            >
              <div className="absolute -inset-x-3 -top-6 bottom-6 rounded-t-[11rem] border border-accent/25 sm:rounded-t-[14rem]" aria-hidden />
              <div className="relative aspect-[4/5] overflow-hidden rounded-t-[11rem] rounded-b-[0.5rem] sm:rounded-t-[14rem]">
                <img
                  src={sectionConfig.mainImage}
                  alt={heading}
                  loading="lazy"
                  decoding="async"
                  onError={handleImgError}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              </div>
              {sectionConfig.badge && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={VIEWPORT_ONCE}
                  transition={{ duration: dur, ease, delay: 0.2 }}
                  className="absolute bottom-8 -end-3 rounded-[0.625rem] border border-border bg-card/95 px-6 py-4 text-center shadow-elevated backdrop-blur-sm sm:-end-5"
                >
                  <p className="whitespace-pre-line font-serif text-base font-light leading-snug text-foreground">
                    {sectionConfig.badge}
                  </p>
                </motion.div>
              )}
            </motion.div>
          ) : null}

          {/* ── Credentials panel ────────────────────────────────────── */}
          <div className={sectionConfig.mainImage ? "min-w-0 lg:col-span-7" : "min-w-0 lg:col-span-12 lg:mx-auto lg:max-w-3xl"}>
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
              className="mb-9 font-serif text-3xl font-light leading-[1.08] text-balance text-foreground sm:mb-11 sm:text-4xl md:text-5xl"
            >
              {heading}
            </motion.h2>

            <ul className="divide-y divide-border">
              {benefits.map((benefit, i) => {
                const IconComponent = resolveLucideIcon(benefit.iconName, HelpCircle);
                return (
                  <motion.li
                    key={`${benefit.title.slice(0, 20)}-${i}`}
                    initial={{ opacity: 0, y: Y_SM }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={VIEWPORT_ONCE}
                    transition={{ duration: dur, ease, delay: Math.min(i * 0.08, 0.32) }}
                    className="flex gap-5 py-6 sm:gap-6 sm:py-7"
                  >
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary text-accent" aria-hidden>
                      <IconComponent size={19} strokeWidth={1.5} />
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-serif text-lg font-normal leading-snug text-foreground sm:text-xl">
                        {benefit.title}
                      </h3>
                      <p className="mt-1.5 max-w-lg text-[13px] font-light leading-relaxed text-muted-foreground sm:text-sm">
                        {benefit.desc}
                      </p>
                    </div>
                  </motion.li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
