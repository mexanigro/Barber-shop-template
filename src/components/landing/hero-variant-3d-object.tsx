import { type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Calendar, ChevronRight } from "lucide-react";
import { siteConfig } from "../../config/site";
import { localeConfig } from "../../config/locale";
import { HeroObject3D } from "../3d-impact/hero-object-3d";
import { AmbientParticles } from "../3d-impact/ambient-particles";
import { CTAButton3D } from "../3d-impact/cta-button-3d";
import { SPLASH_HERO_LAYOUT_ID } from "../3d-impact/splash-impact-reveal-3d";
import {
  DUR_HERO,
  EASE_OUT_STRONG,
  Y_SM,
} from "../../lib/motion";

type Props = {
  onBookClick: () => void;
};

/**
 * `<HeroVariant3DObject>` — opt-in Hero variant (`heroVariant: "hero-3d-object"`).
 *
 * Aurea / Onyx-style two-column layout: text on the left, the protagonist
 * 3D hero object on the right. On <1024px the layout collapses into one
 * column with the object below the copy.
 *
 * Reads the same `siteConfig.hero` shape every other Hero variant uses,
 * plus a few optional fields the schema exposes for this variant:
 *
 *   • `hero.eyebrow`         — small kicker above the headline.
 *   • `hero.description`     — 1-2 extra lines under `hero.subtitle`.
 *   • `hero.ctaPrimaryHref`  — turns the booking CTA into an anchor.
 *   • `hero.ctaSecondaryHref`— turns the secondary CTA into an anchor.
 *
 * Renders an `<AmbientParticles>` layer behind the object when
 * `siteConfig.heroObjects.primary.particles` is set.
 *
 * When the splash is the `impact-reveal-3d` variant, the hero object
 * adopts the shared `layoutId` so Motion animates it continuously from
 * splash → hero on dismiss.
 */
export function HeroVariant3DObject({ onBookClick }: Props) {
  const { hero } = siteConfig;
  const prefersReduced = useReducedMotion();

  const splashVariant = siteConfig.splash?.variant;
  const sharedLayoutId =
    splashVariant === "impact-reveal-3d" ? SPLASH_HERO_LAYOUT_ID : undefined;

  const particles = siteConfig.heroObjects?.primary?.particles;

  const showBookingCta =
    siteConfig.features.showBooking || siteConfig.features.showInquiry;
  const primaryLabel = hero.ctaPrimary ?? localeConfig.hero.scrollHint;
  const secondaryLabel = hero.ctaSecondary;

  const titleNode: ReactNode = (
    <>
      {hero.titlePrefix && <span className="block">{hero.titlePrefix}</span>}
      {hero.titleHighlight && (
        <em className="block font-serif not-italic text-accent">
          {hero.titleHighlight}
        </em>
      )}
      {hero.titleSuffix && (
        <span className="block text-foreground/70">{hero.titleSuffix}</span>
      )}
    </>
  );

  return (
    <section
      id="hero"
      className="relative isolate flex min-h-[100svh] w-full items-center overflow-hidden bg-background"
    >
      {/* Soft radial glow behind the object so it pops on light + dark themes */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_75%_45%,var(--brand-accent)/0.10,transparent_55%)]"
      />

      <div className="mx-auto w-full max-w-7xl px-6 pb-20 pt-28 md:px-10 md:pb-28 md:pt-32 lg:py-32">
        <div className="grid w-full items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16 xl:gap-24">
          {/* ── Copy column (top on mobile, left on desktop) ───────────── */}
          <div className="order-1 flex flex-col items-start text-left">
            {hero.eyebrow && (
              <motion.p
                initial={prefersReduced ? false : { opacity: 0, y: Y_SM }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: DUR_HERO, delay: 0.05 }}
                className="mb-6 text-[11px] font-semibold uppercase tracking-[0.32em] text-accent"
              >
                {hero.eyebrow}
              </motion.p>
            )}

            <motion.h1
              initial={prefersReduced ? false : { opacity: 0, y: Y_SM }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: DUR_HERO, delay: 0.1 }}
              className="text-[clamp(2.5rem,5.5vw,4.75rem)] font-black leading-[1.02] tracking-tight text-foreground"
            >
              {titleNode}
            </motion.h1>

            {hero.subtitle && (
              <motion.p
                initial={prefersReduced ? false : { opacity: 0, y: Y_SM }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: DUR_HERO, delay: 0.25 }}
                className="mt-6 max-w-xl text-lg font-medium text-foreground/80 md:text-xl"
              >
                {hero.subtitle}
              </motion.p>
            )}

            {hero.description && (
              <motion.p
                initial={prefersReduced ? false : { opacity: 0, y: Y_SM }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: DUR_HERO, delay: 0.35 }}
                className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground"
              >
                {hero.description}
              </motion.p>
            )}

            <motion.div
              initial={prefersReduced ? false : { opacity: 0, y: Y_SM }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: DUR_HERO, delay: 0.45, ease: EASE_OUT_STRONG }}
              className="mt-10 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center"
            >
              {showBookingCta && primaryLabel && (
                hero.ctaPrimaryHref ? (
                  <CTAButton3D
                    variant="primary"
                    intensity="medium"
                    href={hero.ctaPrimaryHref}
                    className="w-full justify-center sm:w-auto"
                  >
                    <Calendar size={18} aria-hidden />
                    <span>{primaryLabel}</span>
                    <ChevronRight size={16} aria-hidden />
                  </CTAButton3D>
                ) : (
                  <CTAButton3D
                    variant="primary"
                    intensity="medium"
                    onClick={onBookClick}
                    className="w-full justify-center sm:w-auto"
                  >
                    <Calendar size={18} aria-hidden />
                    <span>{primaryLabel}</span>
                    <ChevronRight size={16} aria-hidden />
                  </CTAButton3D>
                )
              )}

              {secondaryLabel && (
                <CTAButton3D
                  variant="outline"
                  intensity="medium"
                  href={hero.ctaSecondaryHref ?? "#services"}
                  className="w-full justify-center sm:w-auto"
                >
                  {secondaryLabel}
                </CTAButton3D>
              )}
            </motion.div>
          </div>

          {/* ── Hero object column (bottom on mobile, right on desktop) ── */}
          <div className="relative order-2 flex w-full items-center justify-center lg:justify-end">
            {/* Ambient layer sits BEHIND the object container so the
                particles bloom out from around it without blocking pointer
                hit-testing on the object's tilt area. */}
            {particles && particles !== "none" && (
              <div className="pointer-events-none absolute inset-0 -z-10">
                <AmbientParticles type={particles} density="medium" />
              </div>
            )}

            <HeroObject3D
              slotName="primary"
              priority
              size="xl"
              alt={hero.titleHighlight || hero.titlePrefix || ""}
              layoutId={sharedLayoutId}
              fallback={
                /* Last-line safety: if no slot is configured at render time
                   (shouldn't happen — Hero.tsx falls back before reaching
                   us) we still keep the layout balanced with an empty box
                   so the copy column doesn't stretch full-width. */
                <div
                  aria-hidden
                  className="h-72 w-72 rounded-3xl bg-card/40 sm:h-96 sm:w-96"
                />
              }
            />
          </div>
        </div>
      </div>
    </section>
  );
}
