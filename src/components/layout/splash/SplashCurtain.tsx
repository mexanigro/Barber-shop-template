import React from "react";
import { motion } from "motion/react";
import type { SplashProps } from "./types";

/**
 * Variant 2 — Curtain
 * Two solid panels sit over the brand. After a beat they split apart
 * (left goes left, right goes right) revealing logo + name underneath.
 * Exit: both panels slam shut then the whole layer slides down.
 */
export function SplashCurtain({ brand, durationMs, logoSrc, Icon }: SplashProps) {
  const hasLogo = !!logoSrc;
  const revealDelay = 0.35;
  const panelDuration = 0.7;

  return (
    <motion.div
      key="splash"
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      role="dialog"
      aria-modal="true"
      aria-label={brand.name}
      className="fixed inset-0 z-[200] overflow-hidden bg-background"
    >
      <h1 className="sr-only">{brand.name}</h1>

      {/* Content layer — always rendered, revealed by curtain opening */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: revealDelay + panelDuration * 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          {hasLogo ? (
            <img
              src={logoSrc}
              alt=""
              draggable={false}
              className="h-20 w-auto object-contain md:h-24"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-accent-light/12 shadow-lg shadow-accent/15">
              <Icon size={48} className="text-accent-light" />
            </div>
          )}
        </motion.div>

        <motion.p
          dir="ltr"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: revealDelay + panelDuration * 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-[min(90vw,36rem)] px-4 text-center font-serif text-3xl font-bold tracking-wide text-foreground md:text-4xl lg:text-5xl"
        >
          {brand.name}
        </motion.p>

        <motion.div
          aria-hidden="true"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.4, delay: revealDelay + panelDuration * 0.8 }}
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
        {/* Vertical edge accent */}
        <div className="absolute inset-y-0 right-0 w-px bg-accent-light/20" />
      </motion.div>

      {/* Right curtain panel */}
      <motion.div
        className="absolute inset-y-0 right-0 w-1/2 bg-card"
        initial={{ x: 0 }}
        animate={{ x: "100%" }}
        transition={{ duration: panelDuration, delay: revealDelay, ease: [0.76, 0, 0.24, 1] }}
      >
        {/* Vertical edge accent */}
        <div className="absolute inset-y-0 left-0 w-px bg-accent-light/20" />
      </motion.div>
    </motion.div>
  );
}
