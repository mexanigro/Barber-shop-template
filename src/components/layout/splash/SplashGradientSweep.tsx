import React from "react";
import { motion, useReducedMotion } from "motion/react";
import { EASE_OUT_STRONG } from "../../../lib/motion";
import type { SplashProps } from "./types";

/**
 * Variant "v4" â€” Gradient Sweep
 * A soft diagonal sheen of brand accent light sweeps across the surface
 * behind the centered wordmark, which reveals via a clip-path inset wipe.
 * The text stays SOLID â€” the gradient is a decorative light layer only
 * (className "gs-gradient" so the global gradient kill-switch applies).
 * Exit: the sheen blooms to fill, then the whole splash fades.
 */
export function SplashGradientSweep({ brand, logoSrc, backgroundImage, color, themeVars, isExiting, onExitComplete }: SplashProps) {
  const hasLogo = !!logoSrc;
  const prefersReduced = useReducedMotion();

  const accent = color ?? "var(--color-accent-light)";
  const sheen = `linear-gradient(115deg, transparent 38%, color-mix(in oklab, ${accent} 9%, transparent) 46%, color-mix(in oklab, ${accent} 20%, transparent) 50%, color-mix(in oklab, ${accent} 9%, transparent) 54%, transparent 62%)`;

  const bgStyle = backgroundImage
    ? { backgroundImage: `url(${backgroundImage})`, backgroundSize: "cover" as const, backgroundPosition: "center" as const }
    : undefined;

  // Reduced motion: static centered brand, no sweep.
  if (prefersReduced) {
    return (
      <motion.div
        key="splash"
        animate={isExiting ? { opacity: 0 } : { opacity: 1 }}
        transition={{ duration: 0.3 }}
        onAnimationComplete={() => { if (isExiting) onExitComplete?.(); }}
        role="dialog"
        aria-modal="true"
        aria-label={brand.name}
        className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-8 bg-background"
        style={{ ...bgStyle, ...themeVars }}
      >
        {backgroundImage && <div className="absolute inset-0 bg-black/60" />}
        <h1 className="sr-only">{brand.name}</h1>
        {hasLogo ? (
          <img src={logoSrc} alt="" draggable={false} className="h-40 w-auto max-w-[min(85vw,40rem)] object-contain md:h-56" />
        ) : (
          <p className="px-4 text-center font-serif text-3xl font-bold tracking-wide text-foreground md:text-4xl lg:text-5xl">
            {brand.name}
          </p>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      key="splash"
      animate={isExiting ? { opacity: 0 } : {}}
      transition={{ duration: 0.45, delay: isExiting ? 0.05 : 0, ease: EASE_OUT_STRONG }}
      onAnimationComplete={() => { if (isExiting) onExitComplete?.(); }}
      role="dialog"
      aria-modal="true"
      aria-label={brand.name}
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-8 overflow-hidden bg-background"
      style={{ ...bgStyle, ...themeVars }}
    >
      {backgroundImage && <div className="absolute inset-0 bg-black/60" />}
      <h1 className="sr-only">{brand.name}</h1>

      {/* Diagonal accent sheen â€” oversized layer translating across.
          On exit it blooms to fill the surface before the splash fades. */}
      <motion.div
        aria-hidden="true"
        className="gs-gradient pointer-events-none absolute -inset-[40%]"
        style={{ background: sheen }}
        animate={
          isExiting
            ? { x: "0%", scale: 2.4, opacity: 1 }
            : { x: ["-30%", "30%"] }
        }
        transition={
          isExiting
            ? { duration: 0.35, ease: EASE_OUT_STRONG }
            : { duration: 1.6, ease: "easeInOut", repeat: Infinity, repeatType: "mirror" }
        }
      />

      {/* Wordmark â€” clip-path inset wipe reveal, solid color (no gradient text) */}
      <div aria-hidden="true" className="relative">
        {hasLogo ? (
          <motion.img
            src={logoSrc}
            alt=""
            draggable={false}
            className="h-40 w-auto max-w-[min(85vw,40rem)] object-contain md:h-56"
            initial={{ clipPath: "inset(0 100% 0 0)", opacity: 1 }}
            animate={{ clipPath: "inset(0 0% 0 0)" }}
            transition={{ duration: 0.9, delay: 0.25, ease: EASE_OUT_STRONG }}
          />
        ) : (
          <motion.p
            dir="ltr"
            className="max-w-[min(90vw,42rem)] px-4 text-center font-serif text-3xl font-bold tracking-wide text-foreground md:text-4xl lg:text-5xl"
            initial={{ clipPath: "inset(0 100% 0 0)" }}
            animate={{ clipPath: "inset(0 0% 0 0)" }}
            transition={{ duration: 0.9, delay: 0.25, ease: EASE_OUT_STRONG }}
          >
            {brand.name}
          </motion.p>
        )}
      </div>

      {/* Hairline base accent under the wordmark */}
      <motion.div
        aria-hidden="true"
        dir="ltr"
        className="h-px w-24 origin-left bg-accent-light/40"
        style={color ? { backgroundColor: color, opacity: 0.4 } : undefined}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.7, delay: 0.6, ease: EASE_OUT_STRONG }}
      />
    </motion.div>
  );
}
