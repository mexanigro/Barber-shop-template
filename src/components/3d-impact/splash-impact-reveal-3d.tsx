import { motion, useReducedMotion } from "motion/react";
import type { AmbientParticleType } from "../../types";
import type { SplashProps } from "../layout/splash/types";
import { useHeroObject } from "../../hooks/use-hero-object";
import { AmbientParticles } from "./ambient-particles";

type Props = SplashProps & {
  /** Optional ambient particle layer rendered behind the hero object. */
  ambientParticles?: AmbientParticleType;
};

/**
 * Shared-layout id used to connect the splash's hero object with the
 * hero section's `<HeroObject3D>` so they animate as one element when
 * the splash dismisses. Hard-coded so consumers don't have to wire it.
 */
export const SPLASH_HERO_LAYOUT_ID = "hero-3d-object-primary";

/**
 * Splash — `impact-reveal-3d`
 *
 * The hero object configured in `siteConfig.heroObjects.primary` emerges
 * from depth: it starts smaller and slightly rotated on the Y-axis, scales
 * up past 1.0 with a soft overshoot, and lands at rest while opacity
 * resolves to 1. Brand text and the accent rule emerge staggered after.
 *
 *   • Hero object: scale 0.6 → 1.15 → 1.0, rotateY 15° → 0°, opacity 0 → 1.
 *   • Brand name + tagline-style underline staggered ~200 ms apart.
 *   • Optional ambient particle layer (bubbles / smoke / sparkles).
 *
 * If `heroObjects.primary` is not configured, the splash falls back to
 * showing the brand logo + name only (still with the depth-reveal feel
 * applied to the logo block). This keeps the variant safe to set even
 * before a hero object exists.
 *
 * Reduced-motion: opacity fade-in only, no scale or rotation.
 */
export function SplashImpactReveal3D({
  brand,
  durationMs,
  logoSrc,
  Icon,
  backgroundImage,
  ambientParticles,
}: Props) {
  const hero = useHeroObject("primary");
  const hasHeroObject = !!hero?.src;
  const hasLogo = !!logoSrc;
  const prefersReduced = useReducedMotion();

  const t = durationMs / 1000;
  const objectDelay = t * 0.05;
  const objectDur = t * 0.4;
  const brandDelay = objectDelay + objectDur * 0.55;
  const brandDur = t * 0.28;
  const underlineDelay = brandDelay + 0.1;

  const bgStyle = backgroundImage
    ? { backgroundImage: `url(${backgroundImage})`, backgroundSize: "cover" as const, backgroundPosition: "center" as const }
    : undefined;

  if (prefersReduced) {
    return (
      <motion.div
        key="splash"
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        role="dialog"
        aria-modal="true"
        aria-label={brand.name}
        className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-6 bg-background"
        style={bgStyle}
      >
        {backgroundImage && <div className="absolute inset-0 bg-black/60" />}
        <h1 className="sr-only">{brand.name}</h1>

        {hasHeroObject ? (
          <motion.img
            src={hero.src}
            alt=""
            draggable={false}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="h-40 w-40 select-none object-contain md:h-48 md:w-48"
          />
        ) : hasLogo ? (
          <motion.img
            src={logoSrc}
            alt=""
            draggable={false}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="h-16 w-auto object-contain md:h-20"
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-accent-light/15">
            <Icon size={40} className="text-accent-light" />
          </div>
        )}
        <p className="font-serif text-3xl font-bold tracking-wide text-foreground md:text-4xl lg:text-5xl">
          {brand.name}
        </p>
      </motion.div>
    );
  }

  // When a hero object is present and a destination `<HeroObject3D layoutId>` is
  // armed, Motion runs a 700ms shared-layout transition on the <motion.img>
  // below. The parent's exit fades opacity, and since `layoutId` does NOT
  // portal the element out of its parent, the object inherits that fade — so
  // a 450ms parent exit would drag the object's opacity to 0 a full 250ms
  // before its layout transition lands. Match the parent exit to the layout
  // duration in that branch; keep the snappier 450ms for the logo/icon paths
  // where there's no shared-layout transition to coordinate with.
  const rootExitDuration = hasHeroObject ? 0.7 : 0.45;

  return (
    <motion.div
      key="splash"
      exit={{ opacity: 0 }}
      transition={{ duration: rootExitDuration, ease: [0.22, 1, 0.36, 1] }}
      role="dialog"
      aria-modal="true"
      aria-label={brand.name}
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-8 overflow-hidden bg-background"
      style={{ ...bgStyle, perspective: "1500px" }}
    >
      {backgroundImage && <div className="absolute inset-0 bg-black/60" />}

      {/* Ambient particle layer — sits behind everything. */}
      {ambientParticles && ambientParticles !== "none" && (
        <AmbientParticles type={ambientParticles} density="medium" />
      )}

      <h1 className="sr-only">{brand.name}</h1>

      {/* Hero object / logo block. */}
      <motion.div
        className="relative z-10 flex items-center justify-center"
        initial={{ opacity: 0, scale: 0.6, rotateY: 15 }}
        animate={{ opacity: 1, scale: [0.6, 1.15, 1], rotateY: [15, -4, 0] }}
        transition={{
          duration: objectDur,
          delay: objectDelay,
          times: [0, 0.65, 1],
          ease: [0.22, 1, 0.36, 1],
        }}
        style={{ transformStyle: "preserve-3d" }}
      >
        {hasHeroObject ? (
          // `layoutId` is the bridge: when this splash unmounts, a
          // `<HeroObject3D layoutId={SPLASH_HERO_LAYOUT_ID}>` mounted in
          // the hero section claims ownership and Motion animates the
          // image from this rect to the hero's rect — one continuous
          // "object travels into the hero" beat instead of a crossfade.
          //
          // The parent's scale/rotateY entry still drives the splash
          // reveal because Motion measures *screen-space* for layoutId,
          // so the parent transform is baked into the source rect.
          <motion.img
            layoutId={SPLASH_HERO_LAYOUT_ID}
            initial={false}
            src={hero.src}
            alt=""
            draggable={false}
            transition={{ layout: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } }}
            className="h-40 w-40 select-none object-contain drop-shadow-[0_18px_36px_rgba(0,0,0,0.45)] md:h-56 md:w-56 lg:h-72 lg:w-72"
          />
        ) : hasLogo ? (
          <img
            src={logoSrc}
            alt=""
            draggable={false}
            className="h-20 w-auto object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,0.4)] md:h-24"
          />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-accent-light/15 shadow-2xl shadow-accent/30">
            <Icon size={56} className="text-accent-light" />
          </div>
        )}
      </motion.div>

      {/* Brand name. Emerges with a small lift after the object. */}
      <motion.p
        dir="ltr"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: brandDur, delay: brandDelay, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 max-w-[min(90vw,42rem)] px-4 text-center font-serif text-3xl font-bold tracking-wide text-foreground md:text-4xl lg:text-5xl"
      >
        {brand.name}
      </motion.p>

      {/* Tagline rule. */}
      <motion.div
        aria-hidden="true"
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ duration: brandDur * 0.8, delay: underlineDelay }}
        className="relative z-10 h-0.5 w-32 max-w-[min(16rem,70vw)] rounded-full bg-gradient-to-r from-transparent from-10% via-accent-light/70 via-50% to-transparent to-90%"
      />
    </motion.div>
  );
}
