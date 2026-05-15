import React from "react";
import { motion, useReducedMotion } from "motion/react";
import type { SplashProps } from "./types";

/**
 * Variant 3 — Pulse
 * A ring of accent color expands from the center, leaving behind the logo
 * and brand name that fade in as the ring passes through them.
 * Exit: everything collapses inward and fades.
 */
export function SplashPulse({ brand, durationMs, logoSrc, Icon, backgroundImage }: SplashProps) {
  const hasLogo = !!logoSrc;
  const prefersReduced = useReducedMotion();

  // Derive all timings proportionally from durationMs
  const t = durationMs / 1000;
  const ringDur = t * 0.64;
  const ring1Delay = t * 0.07;
  const ring2Delay = t * 0.16;
  const glowDelay = t * 0.02;
  const glowDur = t * 0.27;
  const logoDelay = t * 0.23;
  const logoDur = t * 0.27;
  const nameDelay = t * 0.3;
  const nameDur = t * 0.32;
  const dotsDelay = t * 0.5;
  const dotDur = t * 0.11;
  const dotStagger = t * 0.04;

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
        className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-7 bg-background"
        style={bgStyle}
      >
        {backgroundImage && <div className="absolute inset-0 bg-black/60" />}
        <h1 className="sr-only">{brand.name}</h1>
        {hasLogo ? (
          <img src={logoSrc} alt="" draggable={false} className="h-16 w-auto object-contain md:h-20" />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent-light/10">
            <Icon size={40} className="text-accent-light" />
          </div>
        )}
        <p className="font-serif text-3xl font-bold text-foreground md:text-4xl lg:text-5xl">
          {brand.name}
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      key="splash"
      exit={{ scale: 0.9, opacity: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      role="dialog"
      aria-modal="true"
      aria-label={brand.name}
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-7 overflow-hidden bg-background"
      style={bgStyle}
    >
      {backgroundImage && <div className="absolute inset-0 bg-black/60" />}
      <h1 className="sr-only">{brand.name}</h1>

      {/* Expanding ring */}
      <motion.div
        aria-hidden="true"
        className="absolute rounded-full border-2 border-accent-light/30"
        initial={{ width: 0, height: 0, opacity: 1 }}
        animate={{ width: "200vmax", height: "200vmax", opacity: 0 }}
        transition={{ duration: ringDur, delay: ring1Delay, ease: [0.22, 1, 0.36, 1] }}
        style={{ position: "absolute" }}
      />

      {/* Second ring, slightly delayed */}
      <motion.div
        aria-hidden="true"
        className="absolute rounded-full border border-accent-light/15"
        initial={{ width: 0, height: 0, opacity: 1 }}
        animate={{ width: "200vmax", height: "200vmax", opacity: 0 }}
        transition={{ duration: ringDur, delay: ring2Delay, ease: [0.22, 1, 0.36, 1] }}
        style={{ position: "absolute" }}
      />

      {/* Glow dot at center */}
      <motion.div
        aria-hidden="true"
        className="absolute h-3 w-3 rounded-full bg-accent-light"
        initial={{ scale: 0, opacity: 1 }}
        animate={{ scale: [0, 1, 0], opacity: [1, 1, 0] }}
        transition={{ duration: glowDur, delay: glowDelay, ease: [0.22, 1, 0.36, 1] }}
      />

      {/* Logo / Icon */}
      <motion.div
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: logoDur, delay: logoDelay, ease: [0.22, 1, 0.36, 1] }}
      >
        {hasLogo ? (
          <img
            src={logoSrc}
            alt=""
            draggable={false}
            className="h-16 w-auto object-contain md:h-20"
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent-light/10">
            <Icon size={40} className="text-accent-light" />
          </div>
        )}
      </motion.div>

      {/* Brand name */}
      <motion.p
        dir="ltr"
        initial={{ opacity: 0, letterSpacing: "0.3em" }}
        animate={{ opacity: 1, letterSpacing: "0.15em" }}
        transition={{ duration: nameDur, delay: nameDelay, ease: [0.22, 1, 0.36, 1] }}
        className="max-w-[min(90vw,36rem)] px-4 text-center font-serif text-3xl font-bold text-foreground md:text-4xl lg:text-5xl"
      >
        {brand.name}
      </motion.p>

      {/* Subtle underline dot trio */}
      <motion.div
        aria-hidden="true"
        className="flex gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: dotDur, delay: dotsDelay }}
      >
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="h-1 w-1 rounded-full bg-accent-light/50"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: dotDur, delay: dotsDelay + i * dotStagger }}
          />
        ))}
      </motion.div>
    </motion.div>
  );
}
