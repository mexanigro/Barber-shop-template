import React from "react";
import { motion } from "motion/react";
import type { SplashProps } from "./types";

const PARTICLE_COUNT = 8;

/**
 * Variant 5 — Vortex
 * Particles orbit in a circle, then contract inward and vanish as the logo
 * and brand name scale up from the center. Has a rotating, energetic feel.
 * Exit: everything explodes outward and fades.
 */
export function SplashVortex({ brand, logoSrc, Icon }: SplashProps) {
  const hasLogo = !!logoSrc;

  return (
    <motion.div
      key="splash"
      exit={{ scale: 1.15, opacity: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      role="dialog"
      aria-modal="true"
      aria-label={brand.name}
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-6 overflow-hidden bg-background"
    >
      <h1 className="sr-only">{brand.name}</h1>

      {/* Orbiting particles container */}
      <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
        {Array.from({ length: PARTICLE_COUNT }, (_, i) => {
          const angle = (i / PARTICLE_COUNT) * 360;
          const radius = 120;
          const size = i % 2 === 0 ? 6 : 4;
          const startX = Math.cos((angle * Math.PI) / 180) * radius;
          const startY = Math.sin((angle * Math.PI) / 180) * radius;

          return (
            <motion.div
              key={i}
              className="absolute rounded-full bg-accent-light"
              style={{ width: size, height: size }}
              initial={{
                x: startX,
                y: startY,
                opacity: 0,
                scale: 0,
              }}
              animate={{
                x: [startX, startX, 0],
                y: [startY, startY, 0],
                opacity: [0, 0.7, 0],
                scale: [0, 1, 0],
              }}
              transition={{
                duration: 1.2,
                delay: i * 0.04,
                times: [0, 0.5, 1],
                ease: [0.22, 1, 0.36, 1],
              }}
            />
          );
        })}

        {/* Rotating ring (visible briefly during orbit phase) */}
        <motion.div
          className="absolute h-60 w-60 rounded-full border border-accent-light/10"
          initial={{ scale: 0.8, opacity: 0, rotate: 0 }}
          animate={{
            scale: [0.8, 1, 0.3],
            opacity: [0, 0.3, 0],
            rotate: [0, 90, 180],
          }}
          transition={{
            duration: 1.4,
            times: [0, 0.5, 1],
            ease: [0.22, 1, 0.36, 1],
          }}
        />
      </div>

      {/* Logo / Icon — appears after particles converge */}
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.55, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        {hasLogo ? (
          <img
            src={logoSrc}
            alt=""
            draggable={false}
            className="h-18 w-auto object-contain md:h-22"
          />
        ) : (
          <div className="flex h-22 w-22 items-center justify-center rounded-full bg-accent-light/10">
            <Icon size={44} className="text-accent-light" />
          </div>
        )}
      </motion.div>

      {/* Brand name — slides up from below */}
      <motion.p
        dir="ltr"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="max-w-[min(90vw,36rem)] px-4 text-center font-serif text-3xl font-bold tracking-wide text-foreground md:text-4xl lg:text-5xl"
      >
        {brand.name}
      </motion.p>

      {/* Accent line */}
      <motion.div
        aria-hidden="true"
        className="h-0.5 w-20 rounded-full bg-accent-light/30"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.4, delay: 1.2 }}
      />
    </motion.div>
  );
}
