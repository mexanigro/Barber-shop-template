/**
 * why-choose-us-v2.tsx — VERTICAL TIMELINE variant.
 *
 * Benefits rendered as a vertical journey: a thin structural line (start-
 * aligned on mobile, centered at lg+) that draws progressively as the user
 * scrolls, with each benefit anchored to a circular icon node on the line.
 * Nodes alternate sides at lg+ (all on one side on mobile) and the layout
 * mirrors automatically under dir="rtl" via logical utilities + grid flow.
 * `mainImage` closes the journey as a quiet full-width band with the badge.
 *
 * Selected via `sections.whyChooseUs.variant === "v2"` (WhyChooseUs.tsx
 * dispatcher). Scroll-linked line is gated by prefers-reduced-motion and
 * `global.animationLevel === "none"`.
 */
import { useRef } from "react";
import { ChevronRight, HelpCircle, Star } from "lucide-react";
import { motion, useReducedMotion, useScroll, useSpring } from "motion/react";
import { localeConfig } from "../../../config/locale";
import { siteConfig } from "../../../config/site";
import { interpolate } from "../../../lib/interpolate";
import { resolveLucideIcon } from "../../../lib/lucide-icons";
import { handleImgError } from "../../../lib/utils";
import { getAnimationLevel } from "../../../lib/section-variants";
import {
  Y_SM, Y_MD, VIEWPORT_ONCE,
  getNicheFlavor, nicheStagger, NICHE_DURATION, NICHE_EASING,
} from "../../../lib/motion";

export function WhyChooseUsV2({
  onNavigateToAbout,
}: {
  onNavigateToAbout?: () => void;
} = {}) {
  const { sections, brand } = siteConfig;
  const sectionConfig = sections.whyChooseUs;
  const niche = siteConfig.business.type;
  const flavor = getNicheFlavor(niche);
  const dur = NICHE_DURATION[flavor];
  const ease = NICHE_EASING[flavor];
  const stagger = nicheStagger(niche);

  const reducedMotion = useReducedMotion();
  const lineAnimated = !reducedMotion && getAnimationLevel() !== "none";

  const timelineRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: timelineRef,
    offset: ["start 0.8", "end 0.55"],
  });
  const scaleY = useSpring(scrollYProgress, { stiffness: 90, damping: 28, mass: 0.6 });

  const brandVars = { brand: brand?.name ?? "" };
  const eyebrow = sectionConfig.title ? interpolate(sectionConfig.title, brandVars) : "";
  const heading = sectionConfig.subtitle ? interpolate(sectionConfig.subtitle, brandVars) : "";
  const benefits = sectionConfig.benefits;

  return (
    <section
      id="why-choose-us"
      className="bg-background px-5 py-14 transition-colors duration-300 sm:px-6 sm:py-[var(--gs-section-py)]"
    >
      <div className="mx-auto max-w-5xl">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="mb-14 text-center sm:mb-20">
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
              className="mx-auto max-w-2xl font-serif text-3xl leading-tight text-foreground sm:text-4xl md:text-5xl"
            >
              {heading}
            </motion.h2>
          )}
        </div>

        {/* ── Timeline ───────────────────────────────────────────────── */}
        <div ref={timelineRef} className="relative">
          {/* Track — structural centered/start line (NOT a card accent stripe) */}
          <div
            aria-hidden="true"
            className="absolute bottom-0 top-0 start-6 w-px bg-border lg:start-auto lg:left-1/2"
          />
          {/* Progress line — draws with scroll (origin-top scaleY) */}
          <motion.div
            aria-hidden="true"
            style={lineAnimated ? { scaleY } : undefined}
            className="absolute bottom-0 top-0 start-6 w-px origin-top bg-accent-light lg:start-auto lg:left-1/2"
          />

          <ol className="space-y-14 lg:space-y-20">
            {benefits.map((benefit, i) => {
              const IconComponent = resolveLucideIcon(benefit.iconName, HelpCircle);
              const onStartSide = i % 2 === 0;
              return (
                <motion.li
                  key={`wcu-v2-${benefit.title.slice(0, 20)}-${i}`}
                  initial={{ opacity: 0, y: Y_MD }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={VIEWPORT_ONCE}
                  transition={{ delay: stagger(i), duration: dur, ease }}
                  className="relative min-h-12 ps-20 lg:grid lg:grid-cols-2 lg:gap-x-24 lg:ps-0"
                >
                  {/* Node — circular icon anchored on the line.
                      left-1/2 + -translate-x-1/2 is symmetric, so it stays
                      centered under RTL too. */}
                  <span className="absolute start-0 top-0 flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card shadow-sm lg:start-auto lg:left-1/2 lg:-translate-x-1/2">
                    <IconComponent className="text-accent-light" size={20} aria-hidden="true" />
                  </span>

                  {/* Content — alternates columns at lg+; grid columns follow
                      direction so the alternation mirrors under RTL. */}
                  <div
                    className={
                      onStartSide
                        ? "lg:col-start-1 lg:text-end"
                        : "lg:col-start-2 lg:text-start"
                    }
                  >
                    <h3 className="mb-2 font-serif text-xl leading-snug text-foreground sm:text-2xl">
                      {benefit.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                      {benefit.desc}
                    </p>
                  </div>
                </motion.li>
              );
            })}
          </ol>
        </div>

        {/* ── Closing image band — quiet backdrop with the badge ──────── */}
        {sectionConfig.mainImage && (
          <motion.div
            initial={{ opacity: 0, y: Y_MD }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT_ONCE}
            transition={{ duration: dur * 1.1, ease }}
            className="gs-image relative mt-16 overflow-hidden sm:mt-24"
          >
            <img
              src={sectionConfig.mainImage}
              alt={localeConfig.whyChooseUs.imageAlt}
              onError={handleImgError}
              className="h-56 w-full object-cover sm:h-72 lg:h-80"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
            {sectionConfig.badge && (
              <div className="absolute bottom-5 start-5 flex items-center gap-3 pe-5 sm:bottom-8 sm:start-8">
                <Star className="shrink-0 text-accent-light" size={20} fill="currentColor" aria-hidden="true" />
                <p className="whitespace-pre-line font-serif text-xl leading-tight text-white sm:text-2xl">
                  {sectionConfig.badge}
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* ── About affordance (estetica passes onNavigateToAbout) ────── */}
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
              className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-accent hover:text-accent-light active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 [transition:color_0.2s_cubic-bezier(0.23,1,0.32,1),transform_0.16s_cubic-bezier(0.23,1,0.32,1)]"
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
