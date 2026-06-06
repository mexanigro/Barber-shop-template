import React from "react";
import { motion, useReducedMotion } from "motion/react";
import type { SplashProps } from "./types";
import { useSplashLogo } from "./use-splash-logo";

/**
 * Variant 7 — Remodelaciones
 * Clean horizontal wipe reveal with bold typography.
 * Two-tone split (dark/accent) evokes the before/after transformation.
 */
export function SplashRemodelaciones({ brand, durationMs, logoSrc, fallbackLogoSrc }: SplashProps) {
  const prefersReduced = useReducedMotion();
  const { logoSrc: resolvedLogoSrc, hasLogo, onLogoError } = useSplashLogo(logoSrc, fallbackLogoSrc);

  if (prefersReduced) {
    return (
      <motion.div
        key="splash"
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        role="dialog"
        aria-modal="true"
        aria-label={brand.name}
        className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950"
      >
        <h1 className="sr-only">{brand.name}</h1>
        <div className="flex flex-col items-center gap-5" aria-hidden="true">
          {hasLogo ? (
            <img src={resolvedLogoSrc} alt="" draggable={false} onError={onLogoError} className="h-40 w-auto max-w-none object-contain md:h-56" />
          ) : (
            <p className="text-4xl font-extrabold tracking-tight text-white md:text-5xl">
              {brand.name}
            </p>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      key="splash"
      exit={{ clipPath: "inset(0 0 100% 0)" }}
      transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
      role="dialog"
      aria-modal="true"
      aria-label={brand.name}
      className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden bg-slate-950 will-change-transform"
    >
      <h1 className="sr-only">{brand.name}</h1>

      {/* Accent stripe wipe — from left */}
      <motion.div
        className="absolute inset-y-0 left-0 bg-accent"
        initial={{ width: "0%" }}
        animate={{ width: "100%" }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.23, 1, 0.32, 1] }}
      />

      {/* Second wipe — dark over accent */}
      <motion.div
        className="absolute inset-y-0 left-0 bg-slate-950"
        initial={{ width: "0%" }}
        animate={{ width: "100%" }}
        transition={{ duration: 0.5, delay: 0.4, ease: [0.23, 1, 0.32, 1] }}
      />

      {/* Brand */}
      <div className="relative z-10 flex flex-col items-center gap-6 text-center" aria-hidden="true">
        {hasLogo ? (
          <motion.img
            src={resolvedLogoSrc}
            alt=""
            draggable={false}
            onError={onLogoError}
            className="h-40 w-auto max-w-none object-contain md:h-56"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.55, ease: [0.23, 1, 0.32, 1] }}
          />
        ) : (
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6, ease: [0.23, 1, 0.32, 1] }}
            className="text-4xl font-extrabold tracking-tight text-white md:text-5xl lg:text-6xl"
          >
            {brand.name}
          </motion.p>
        )}

        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.4, delay: 0.95, ease: [0.23, 1, 0.32, 1] }}
          className="mx-auto h-0.5 w-16 origin-left bg-accent"
        />
      </div>
    </motion.div>
  );
}
