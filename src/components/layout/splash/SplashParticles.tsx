import React, { useMemo } from "react";
import { motion, useReducedMotion } from "motion/react";
import { EASE_OUT_STRONG } from "../../../lib/motion";
import type { SplashProps } from "./types";

const PARTICLE_COUNT = 30;

/** Deterministic pseudo-random in [0, 1) — stable across renders, no Math.random. */
function seeded(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

type Particle = {
  x: number;      // start offset px
  y: number;
  size: number;   // px
  opacity: number;
  duration: number; // s
  delay: number;    // s
};

const letterVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

/**
 * Variant "v3" — Particles
 * A quiet field of small accent sparks drifts gently toward the centered
 * brand name (display serif, letters staggering in). Transform/opacity only;
 * CSS keyframes with per-particle randomized delays/durations.
 * Exit: the whole field fades.
 */
export function SplashParticles({ brand, logoSrc, backgroundImage, color, themeVars, isExiting, onExitComplete }: SplashProps) {
  const hasLogo = !!logoSrc;
  const prefersReduced = useReducedMotion();
  const chars = brand.name.split("");

  const particles = useMemo<Particle[]>(() => {
    return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
      const angle = seeded(i) * Math.PI * 2;
      const radius = 140 + seeded(i + 100) * 220; // 140–360px from center
      return {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius * 0.7, // slightly flattened field
        size: 2 + Math.round(seeded(i + 200) * 3), // 2–5px
        opacity: 0.2 + seeded(i + 300) * 0.35,     // 0.2–0.55
        duration: 2.4 + seeded(i + 400) * 2.2,     // 2.4–4.6s
        delay: seeded(i + 500) * 1.6,              // 0–1.6s
      };
    });
  }, []);

  const bgStyle = backgroundImage
    ? { backgroundImage: `url(${backgroundImage})`, backgroundSize: "cover" as const, backgroundPosition: "center" as const }
    : undefined;

  // Reduced motion: static centered name, no particles.
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
      transition={{ duration: 0.45, ease: EASE_OUT_STRONG }}
      onAnimationComplete={() => { if (isExiting) onExitComplete?.(); }}
      role="dialog"
      aria-modal="true"
      aria-label={brand.name}
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-8 overflow-hidden bg-background"
      style={{ ...bgStyle, ...themeVars }}
    >
      {backgroundImage && <div className="absolute inset-0 bg-black/60" />}
      <h1 className="sr-only">{brand.name}</h1>

      {/* Per-particle drift keyframes: born at an outer offset, glide ~85% of
          the way toward center while fading — converging, never colliding. */}
      <style>{`
        @keyframes splash-v3-drift {
          0%   { transform: translate3d(var(--sp-x), var(--sp-y), 0) scale(0.6); opacity: 0; }
          25%  { opacity: var(--sp-o); }
          75%  { opacity: var(--sp-o); }
          100% { transform: translate3d(calc(var(--sp-x) * 0.15), calc(var(--sp-y) * 0.15), 0) scale(1); opacity: 0; }
        }
      `}</style>

      {/* Particle field */}
      <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
        {particles.map((p, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-accent-light"
            style={{
              width: p.size,
              height: p.size,
              ...(color ? { backgroundColor: color } : null),
              opacity: 0,
              ["--sp-x" as string]: `${p.x.toFixed(1)}px`,
              ["--sp-y" as string]: `${p.y.toFixed(1)}px`,
              ["--sp-o" as string]: p.opacity.toFixed(2),
              animation: `splash-v3-drift ${p.duration.toFixed(2)}s ${p.delay.toFixed(2)}s cubic-bezier(0.23, 1, 0.32, 1) infinite`,
            }}
          />
        ))}
      </div>

      {/* Brand mark — logo when available, staggered serif name otherwise */}
      {hasLogo ? (
        <motion.img
          aria-hidden="true"
          src={logoSrc}
          alt=""
          draggable={false}
          className="relative h-40 w-auto max-w-none object-contain md:h-56"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.25, ease: EASE_OUT_STRONG }}
        />
      ) : (
        <motion.div
          aria-hidden="true"
          dir="ltr"
          className="relative flex max-w-[min(90vw,42rem)] flex-wrap items-baseline justify-center px-4 text-center"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.04, delayChildren: 0.35 } },
          }}
          initial="hidden"
          animate="visible"
        >
          {chars.map((char, i) => (
            <motion.span
              key={i}
              variants={letterVariants}
              transition={{ duration: 0.55, ease: EASE_OUT_STRONG }}
              className="inline-block whitespace-pre font-serif text-3xl font-bold tracking-wide text-foreground md:text-4xl lg:text-5xl"
            >
              {char === " " ? " " : char}
            </motion.span>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}
