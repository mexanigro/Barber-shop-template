import React from "react";
import { motion, useReducedMotion } from "motion/react";
import type { SplashProps } from "./types";

/**
 * Variant 2 — Curtain
 * Two solid panels sit over the brand. After a beat they split apart
 * (left goes left, right goes right) revealing logo + name underneath.
 * Exit: whole layer fades out.
 */
export function SplashCurtain({ brand, durationMs, logoSrc, Icon, backgroundImage }: SplashProps) {
  const hasLogo = !!logoSrc;
  const prefersReduced = useReducedMotion();

  // Derive all timings proportionally from durationMs
  const t = durationMs / 1000;
  const revealDelay = t * 0.16;
  const panelDuration = t * 0.32;
  const contentFadeDur = t * 0.23;

  const bgStyle = backgroundImage
    ? { backgroundImage: `url(${backgroundImage})`, backgroundSize: "cover" as const, backgroundPosition: "center" as const }
    : undefined;

  // Reduced motion: simple centered fade
  if (prefersReduced) {
    return (
      <motion.div
        key="splash"
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        role="dialog"
        aria-modal="true"
        aria-label={brand.name}
        className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-6 bg-background"
        style={bgStyle}
      >
        {backgroundImage && <div className="absolute inset-0 bg-black/60" />}
        <h1 className="sr-only">{brand.name}</h1>
        {hasLogo ? (
          <img src={logoSrc} alt="" draggable={false} className="h-40 w-auto max-w-none object-contain md:h-56" />
        ) : (
          <>
            <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-accent-light/12">
              <Icon size={48} className="text-accent-light" />
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
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      role="dialog"
      aria-modal="true"
      aria-label={brand.name}
      className="fixed inset-0 z-[200] overflow-hidden bg-background"
      style={bgStyle}
    >
      {backgroundImage && <div className="absolute inset-0 bg-black/60" />}
      <h1 className="sr-only">{brand.name}</h1>

      {/* Content layer — always rendered, revealed by curtain opening */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: contentFadeDur, delay: revealDelay + panelDuration * 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          {hasLogo ? (
            <img
              src={logoSrc}
              alt=""
              draggable={false}
              className="h-40 w-auto max-w-none object-contain md:h-56"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-accent-light/12 shadow-lg shadow-accent/15">
              <Icon size={48} className="text-accent-light" />
            </div>
          )}
        </motion.div>

        {!hasLogo && (
          <motion.p
            dir="ltr"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: contentFadeDur, delay: revealDelay + panelDuration * 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-[min(90vw,36rem)] px-4 text-center font-serif text-3xl font-bold tracking-wide text-foreground md:text-4xl lg:text-5xl"
          >
            {brand.name}
          </motion.p>
        )}

        <motion.div
          aria-hidden="true"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: contentFadeDur * 0.8, delay: revealDelay + panelDuration * 0.8 }}
          className="h-px w-24 bg-accent-light/40"
        />
      </div>

      {/* Left curtain panel */}
      <motion.div
        className="absolute inset-y-0 left-0 w-1/2 bg-card"
        initial={{ x: 0 }}
        animate={{ x: "-100%" }}
        transition={{ duration: panelDuration, delay: revealDelay, ease: [0.76, 0, 0.24, 1] }}
      >
        <div className="absolute inset-y-0 right-0 w-px bg-accent-light/20" />
      </motion.div>

      {/* Right curtain panel */}
      <motion.div
        className="absolute inset-y-0 right-0 w-1/2 bg-card"
        initial={{ x: 0 }}
        animate={{ x: "100%" }}
        transition={{ duration: panelDuration, delay: revealDelay, ease: [0.76, 0, 0.24, 1] }}
      >
        <div className="absolute inset-y-0 left-0 w-px bg-accent-light/20" />
      </motion.div>
    </motion.div>
  );
}
