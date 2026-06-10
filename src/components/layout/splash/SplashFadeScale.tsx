import React from "react";
import { motion, useReducedMotion } from "motion/react";
import { EASE_OUT_STRONG } from "../../../lib/motion";
import type { SplashProps } from "./types";

/**
 * Variant "v2" — Fade + Scale
 * Pure restraint: the brand mark fades in from opacity 0 / scale 0.92 with a
 * slow soft settle, holds, and a single hairline progress line fills across
 * `durationMs` underneath. Exit: the whole splash scales to 1.04 and fades.
 */
export function SplashFadeScale({ brand, durationMs, logoSrc, Icon, backgroundImage, color, themeVars, isExiting, onExitComplete }: SplashProps) {
  const hasLogo = !!logoSrc;
  const prefersReduced = useReducedMotion();

  const bgStyle = backgroundImage
    ? { backgroundImage: `url(${backgroundImage})`, backgroundSize: "cover" as const, backgroundPosition: "center" as const }
    : undefined;

  // Reduced motion: static centered brand, simple fade exit.
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
          <img src={logoSrc} alt="" draggable={false} className="h-40 w-auto max-w-none object-contain md:h-56" />
        ) : (
          <>
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-accent-light/15">
              <Icon size={40} className="text-accent-light" />
            </div>
            <p className="font-serif text-3xl font-bold tracking-wide text-foreground md:text-4xl lg:text-5xl">
              {brand.name}
            </p>
          </>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      key="splash"
      animate={isExiting ? { opacity: 0, scale: 1.04 } : { opacity: 1, scale: 1 }}
      transition={{ duration: 0.45, ease: EASE_OUT_STRONG }}
      onAnimationComplete={() => { if (isExiting) onExitComplete?.(); }}
      role="dialog"
      aria-modal="true"
      aria-label={brand.name}
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-10 bg-background"
      style={{ ...bgStyle, ...themeVars }}
    >
      {backgroundImage && <div className="absolute inset-0 bg-black/60" />}
      <h1 className="sr-only">{brand.name}</h1>

      {/* Brand mark — slow soft settle */}
      <motion.div
        aria-hidden="true"
        className="flex flex-col items-center gap-8"
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.9, ease: EASE_OUT_STRONG }}
      >
        {hasLogo ? (
          <img src={logoSrc} alt="" draggable={false} className="h-40 w-auto max-w-none object-contain md:h-56" />
        ) : (
          <>
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-accent-light/15">
              <Icon size={40} className="text-accent-light" />
            </div>
            <p dir="ltr" className="max-w-[min(90vw,36rem)] px-4 text-center font-serif text-3xl font-bold tracking-wide text-foreground md:text-4xl lg:text-5xl">
              {brand.name}
            </p>
          </>
        )}
      </motion.div>

      {/* Hairline progress line — fills across durationMs */}
      <div aria-hidden="true" dir="ltr" className="h-px w-40 max-w-[60vw] overflow-hidden bg-foreground/10">
        <motion.div
          className="h-full w-full origin-left bg-accent-light"
          style={color ? { backgroundColor: color } : undefined}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: durationMs / 1000, ease: "linear" }}
        />
      </div>
    </motion.div>
  );
}
