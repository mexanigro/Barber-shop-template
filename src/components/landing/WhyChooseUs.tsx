import React from "react";
import { HelpCircle, Star, ChevronRight } from "lucide-react";
import { motion } from "motion/react";
import { localeConfig } from "../../config/locale";
import { resolveLucideIcon } from "../../lib/lucide-icons";
import { siteConfig } from "../../config/site";
import { cn, handleImgError } from "../../lib/utils";
import { interpolate } from "../../lib/interpolate";
import {
  Y_SM, Y_MD, X_IN, VIEWPORT_ONCE,
  getNicheFlavor, nicheStagger, nicheScaleIn, NICHE_DURATION, NICHE_EASING,
  sectionTitleContainerVariants, textWordVariants, EASE_OUT_STRONG,
} from "../../lib/motion";
import { WhyChooseUsIconGrid3D } from "./why-choose-us-icon-grid-3d";

const AuraWhyChooseUsModule = React.lazy(() => import("./aura/aura-why-choose-us").then(m => ({ default: m.AuraWhyChooseUs })));

let warnedMissingWhyChooseUs3DSlot = false;

export function WhyChooseUs({
  onNavigateToAbout,
}: {
  onNavigateToAbout?: () => void;
} = {}) {
  const { sections, brand } = siteConfig;
  const { whyChooseUs: sectionConfig } = sections;
  if (!sectionConfig || !sectionConfig.benefits) return null;

  /* ── 3D Impact: icon-grid-3d variant ──────────────────────────────
     Opt-in via `whyChooseUs.whyChooseUsVariant === "icon-grid-3d"`.
     Requires `heroObjects[heroObjectSlot]` (or `heroObjects.primary`
     as a fallback) in the active site config — otherwise we fall
     through to the legacy renderer below and warn once in dev so the
     misconfiguration surfaces during local testing.

     When `show3DObject === false` we still render the new variant —
     the component handles that branch by laying the cards out
     full-width without the side object. */
  if (sectionConfig.whyChooseUsVariant === "aura") {
    return (
      <React.Suspense fallback={null}>
        <AuraWhyChooseUsModule onNavigateToAbout={onNavigateToAbout} />
      </React.Suspense>
    );
  }
  if (sectionConfig.whyChooseUsVariant === "icon-grid-3d") {
    const requestedSlot = sectionConfig.heroObjectSlot ?? "secondary";
    const slots = siteConfig.heroObjects;
    const hasSlot = Boolean(
      slots?.[requestedSlot]?.src || slots?.primary?.src,
    );
    if (hasSlot || sectionConfig.show3DObject === false) {
      return <WhyChooseUsIconGrid3D />;
    }
    if (import.meta.env.DEV && !warnedMissingWhyChooseUs3DSlot) {
      warnedMissingWhyChooseUs3DSlot = true;
      // eslint-disable-next-line no-console
      console.warn(
        `[WhyChooseUs] whyChooseUsVariant="icon-grid-3d" but neither siteConfig.heroObjects.${requestedSlot} nor siteConfig.heroObjects.primary is configured — falling back to the default WhyChooseUs.`,
      );
    }
  }

  // Subtitle and title may reference `{brand}` (preset placeholder) so the
  // client's brand.name from Firestore flows through without each preset
  // needing to hard-code a default.
  const brandVars = { brand: brand?.name ?? "" };
  const resolvedSubtitle = sectionConfig.subtitle ? interpolate(sectionConfig.subtitle, brandVars) : "";
  const resolvedTitle = sectionConfig.title ? interpolate(sectionConfig.title, brandVars) : "";
  const niche = siteConfig.business.type;
  const flavor = getNicheFlavor(niche);
  const stagger = nicheStagger(niche);
  const isTattoo = niche === "tattoo";
  const isNails = niche === "nails";
  const isEstetica = niche === "estetica";
  const isRemodelaciones = niche === "remodelaciones";

  const mainImageOverlayClass = isNails
    ? "absolute inset-0 bg-gradient-to-t from-surface-dark/35 to-transparent"
    : "absolute inset-0 bg-gradient-to-t from-black/30 to-transparent";

  /* ── Estetica: compact teaser linking to dedicated about page ────────── */
  if (isEstetica) {
    return (
      <section id="why-choose-us" className="flex flex-col justify-center bg-background px-5 py-8 transition-colors duration-300 sm:px-6 sm:py-20 lg:block">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: Y_SM }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT_ONCE}
            className="mb-10 text-center"
          >
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-accent-light">
              {resolvedTitle}
            </p>
            <h2 className="font-serif text-3xl font-normal tracking-wide text-foreground md:text-4xl">
              {resolvedSubtitle}
            </h2>
          </motion.div>

          {/* Benefit highlights — horizontal row */}
          <div className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
            {sectionConfig.benefits.map((benefit, i) => {
              const IconComponent = resolveLucideIcon(benefit.iconName, HelpCircle);
              return (
                <motion.div
                  key={`benefit-${benefit.title.slice(0, 20)}-${i}`}
                  initial={{ opacity: 0, y: Y_SM }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={VIEWPORT_ONCE}
                  transition={{ delay: stagger(i), duration: NICHE_DURATION[flavor], ease: NICHE_EASING[flavor] }}
                  className="bg-card p-6 text-center lg:hover:bg-card/80 [transition:background-color_0.3s_cubic-bezier(0.23,1,0.32,1)]"
                >
                  <IconComponent className="mx-auto mb-3 text-accent-light" size={18} />
                  <h3 className="text-sm font-medium text-foreground">{benefit.title}</h3>
                </motion.div>
              );
            })}
          </div>

          {/* Link to full about page */}
          {onNavigateToAbout && (
            <motion.div
              initial={{ opacity: 0, y: Y_SM }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={VIEWPORT_ONCE}
              transition={{ delay: 0.3 }}
              className="mt-8 text-center"
            >
              <button
                type="button"
                onClick={onNavigateToAbout}
                className="inline-flex items-center gap-2 text-sm font-medium text-accent hover:text-accent-light active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 [transition:color_0.2s_cubic-bezier(0.23,1,0.32,1),transform_0.16s_cubic-bezier(0.23,1,0.32,1)]"
              >
                {localeConfig.services.learnMoreAboutUs}
                <ChevronRight size={14} className="rtl:rotate-180" />
              </button>
            </motion.div>
          )}
        </div>
      </section>
    );
  }

  /* ── Default layout (barberia / tattoo / nails / remodelaciones) ──────── */
  return (
    <section id="why-choose-us" className="flex flex-col justify-center bg-card px-5 py-12 transition-colors duration-300 sm:px-6 sm:py-28 lg:block">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 items-center gap-10 sm:gap-16 lg:grid-cols-2 lg:gap-24">

          {/* ── Image column ─────────────────────────────────────── */}
          <div className="relative">
            <motion.div
              {...nicheScaleIn(niche)}
              className={cn(
                "relative aspect-[4/5] overflow-hidden border border-border shadow-elevated",
                isTattoo ? "rounded-xl" : isRemodelaciones ? "rounded-2xl" : "rounded-3xl",
              )}
            >
              <img
                src={sectionConfig.mainImage}
                className="h-full w-full object-cover"
                alt={localeConfig.whyChooseUs.imageAlt}
                onError={handleImgError}
              />
              {/* Subtle darkening at bottom */}
              <div className={mainImageOverlayClass} />
            </motion.div>

            {/* Badge — floats bottom-end (logical: end = right in LTR, left in RTL) */}
            <motion.div
              initial={{ opacity: 0, rotate: 12, scale: 0.8 }}
              whileInView={{ opacity: 1, rotate: 6, scale: 1 }}
              viewport={VIEWPORT_ONCE}
              transition={{ delay: 0.3, duration: NICHE_DURATION[flavor], ease: NICHE_EASING[flavor] }}
              className={
                isTattoo
                  ? "absolute -bottom-6 -end-6 hidden w-52 overflow-hidden bg-primary p-7 shadow-xl shadow-black/30 hover:rotate-0 md:block [transition:transform_0.5s_cubic-bezier(0.23,1,0.32,1),box-shadow_0.4s_cubic-bezier(0.23,1,0.32,1)] lg:hover:shadow-[0_24px_60px_-12px_rgba(0,0,0,0.4)]"
                  : isNails
                    ? "absolute -bottom-6 -end-6 hidden w-52 overflow-hidden bg-primary p-7 shadow-xl shadow-surface-dark/35 hover:rotate-0 md:block [transition:transform_0.5s_cubic-bezier(0.23,1,0.32,1),box-shadow_0.4s_cubic-bezier(0.23,1,0.32,1)] lg:hover:shadow-[0_24px_60px_-12px_rgba(111,74,86,0.35)]"
                    : isRemodelaciones
                      ? "absolute -bottom-6 -end-6 hidden w-52 overflow-hidden rounded-2xl bg-accent p-7 shadow-xl shadow-accent/25 hover:rotate-0 md:block [transition:transform_0.5s_cubic-bezier(0.23,1,0.32,1),box-shadow_0.4s_cubic-bezier(0.23,1,0.32,1)] lg:hover:shadow-[0_24px_60px_-12px_rgba(59,130,246,0.3)]"
                      : "absolute -bottom-6 -end-6 hidden w-52 overflow-hidden rounded-3xl bg-accent-light p-7 shadow-xl shadow-accent/30 hover:rotate-0 md:block [transition:transform_0.5s_cubic-bezier(0.23,1,0.32,1),box-shadow_0.4s_cubic-bezier(0.23,1,0.32,1)] lg:hover:shadow-[0_24px_60px_-12px_rgba(0,0,0,0.25)]"
              }
            >
              <Star
                className={
                  "mb-3 text-primary-foreground"
                }
                size={32}
                fill="currentColor"
              />
              <p
                className={
                  isTattoo
                    ? "whitespace-pre-line font-gothic text-2xl leading-tight text-primary-foreground"
                    : isNails
                      ? "whitespace-pre-line font-script text-2xl leading-tight text-primary-foreground"
                      : "whitespace-pre-line font-serif text-2xl font-bold leading-tight text-primary-foreground"
                }
              >
                {sectionConfig.badge}
              </p>
            </motion.div>

            {/* Decorative corner bracket — geometric ornament */}
            <div className="pointer-events-none absolute -left-3 -top-3 h-10 w-10 border-t-2 border-accent-light/40 rounded-tl-lg" />
          </div>

          {/* ── Content column ───────────────────────────────────── */}
          <div>
            <motion.p
              initial={{ opacity: 0, y: Y_SM }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={VIEWPORT_ONCE}
              transition={{ duration: NICHE_DURATION[flavor], ease: NICHE_EASING[flavor] }}
              className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-accent-light"
            >
              {resolvedTitle}
            </motion.p>
            <motion.h2
              variants={sectionTitleContainerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={VIEWPORT_ONCE}
              className={
                isRemodelaciones
                  ? "mb-8 text-3xl font-extrabold tracking-tight text-card-foreground sm:mb-14 sm:text-4xl md:text-5xl"
                  : isNails
                    ? "mb-8 text-3xl font-black uppercase tracking-wide text-card-foreground sm:mb-14 sm:text-4xl md:text-6xl"
                    : "mb-8 text-3xl font-black uppercase tracking-tighter text-card-foreground sm:mb-14 sm:text-4xl md:text-6xl"
              }
            >
              {resolvedSubtitle.split(" ").map((word: string, i: number) => (
                <motion.span key={i} variants={textWordVariants(niche)} className="inline-block">
                  {word}&nbsp;
                </motion.span>
              ))}
            </motion.h2>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {sectionConfig.benefits.map((benefit, i) => {
                const IconComponent = resolveLucideIcon(benefit.iconName, HelpCircle);
                return (
                  <motion.div
                    key={`benefit-alt-${benefit.title.slice(0, 20)}-${i}`}
                    initial={{
                      opacity: 0,
                      x: i % 2 === 0 ? -X_IN : X_IN,
                    }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={VIEWPORT_ONCE}
                    transition={{ delay: stagger(i), duration: NICHE_DURATION[flavor], ease: NICHE_EASING[flavor] }}
                    whileHover={{ y: -4, boxShadow: "0 16px 32px -8px rgba(0,0,0,0.12)" }}
                    className={cn(
                      "group border border-border bg-background p-6 hover:border-accent/30 dark:bg-background/50 [transition:border-color_0.3s_cubic-bezier(0.23,1,0.32,1),background-color_0.3s_ease]",
                      isTattoo ? "rounded-lg" : isRemodelaciones ? "rounded-xl" : "rounded-2xl",
                    )}
                  >
                    <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-accent-light/10 transition-colors duration-300 group-hover:bg-accent-light/20">
                      <IconComponent className="text-accent-light" size={22} />
                    </div>
                    <h3 className="mb-2 text-base font-bold text-card-foreground">
                      {benefit.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {benefit.desc}
                    </p>
                    {/* Bottom accent */}
                    <div className="mt-5 h-px w-0 bg-gradient-to-r from-accent-light to-transparent transition-all duration-500 group-hover:w-full" />
                  </motion.div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
