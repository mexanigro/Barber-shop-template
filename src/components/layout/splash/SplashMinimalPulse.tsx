import React from "react";
import { motion, useReducedMotion } from "motion/react";
import { EASE_OUT_STRONG } from "../../../lib/motion";
import type { SplashProps } from "./types";

/**
 * Variant "v5" — Minimal Pulse
 * The most restrained of the family: a near-empty screen with a single small
 * dot at center and two soft expanding rings (scale 1→1.6, 1.2s loop). The
 * brand name appears quietly beneath after the first pulse.
 * Exit: instant-feeling fade (≤350ms).
 *
 * Note: `splash.image` is deliberately ignored here — a background photo
 * would defeat the near-empty minimal aesthetic this variant exists for.
 */
export function SplashMinimalPulse({ brand, logoSrc, color, themeVars, isExiting, onExitComplete }: SplashProps) {
  const hasLogo = !!logoSrc;
  const prefersReduced = useReducedMotion();

  const dotStyle = color ? { backgroundColor: color } : undefined;
  const ringStyle = color ? { borderColor: color } : undefined;

  // Reduced motion: static dot + name, simple fade exit.
  if (prefersReduced) {
    return (
      <motion.div
        key="splash"
        animate={isExiting ? { opacity: 0 } : { opacity: 1 }}
        transition={{ duration: 0.25 }}
        onAnimationComplete={() => { if (isExiting) onExitComplete?.(); }}
        role="dialog"
        aria-modal="true"
        aria-label={brand.name}
        className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-8 bg-background"
        style={themeVars}
      >
        <h1 className="sr-only">{brand.name}</h1>
        <div aria-hidden="true" className="h-2 w-2 rounded-full bg-accent-light" style={dotStyle} />
        {hasLogo ? (
          <img src={logoSrc} alt="" draggable={false} className="h-16 w-auto max-w-none object-contain md:h-20" />
        ) : (
          <p className="px-4 text-center font-serif text-xl font-semibold tracking-wide text-foreground md:text-2xl">
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
      transition={{ duration: 0.3, ease: EASE_OUT_STRONG }}
      onAnimationComplete={() => { if (isExiting) onExitComplete?.(); }}
      role="dialog"
      aria-modal="true"
      aria-label={brand.name}
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-background"
      style={themeVars}
    >
      <h1 className="sr-only">{brand.name}</h1>

      {/* Center pulse — one dot, two breathing rings */}
      <div aria-hidden="true" className="relative flex h-12 w-12 items-center justify-center">
        <motion.div
          className="h-2 w-2 rounded-full bg-accent-light"
          style={dotStyle}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: EASE_OUT_STRONG }}
        />
        {[0, 0.6].map((delay) => (
          <motion.div
            key={delay}
            className="absolute inset-0 rounded-full border border-accent-light/50"
            style={ringStyle}
            initial={{ scale: 1, opacity: 0 }}
            animate={{ scale: [1, 1.6], opacity: [0.5, 0] }}
            transition={{ duration: 1.2, delay: 0.4 + delay, ease: "easeOut", repeat: Infinity, repeatDelay: 0 }}
          />
        ))}
      </div>

      {/* Brand — appears quietly after the first pulse */}
      <motion.div
        aria-hidden="true"
        className="mt-8"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 1.2, ease: EASE_OUT_STRONG }}
      >
        {hasLogo ? (
          <img src={logoSrc} alt="" draggable={false} className="h-16 w-auto max-w-none object-contain md:h-20" />
        ) : (
          <p dir="ltr" className="max-w-[min(90vw,36rem)] px-4 text-center font-serif text-xl font-semibold tracking-wide text-foreground md:text-2xl">
            {brand.name}
          </p>
        )}
      </motion.div>
    </motion.div>
  );
}
