import React from "react";
import { motion, useReducedMotion } from "motion/react";
import type { SplashProps } from "./types";

function calcStagger(nameLength: number, durationMs: number): number {
  const NAME_DELAY = 0.45;
  const EXIT_BUFFER = 0.55;
  const available = durationMs / 1000 - NAME_DELAY - EXIT_BUFFER;
  const raw = nameLength > 1 ? available / (nameLength - 1) : available;
  return Math.min(0.07, Math.max(0.02, raw));
}

const letterVariants = {
  hidden: { opacity: 0, y: 8, rotate: -4 },
  visible: { opacity: 1, y: 0, rotate: 0 },
};

/**
 * Variant 1 — Classic
 * Logo clip-path reveal, staggered letter-by-letter brand name, accent bar fade.
 */
export function SplashClassic({ brand, durationMs, logoSrc, Icon, backgroundImage, themeVars, isExiting, onExitComplete }: SplashProps) {
  const hasLogo = !!logoSrc;
  const chars = brand.name.split("");
  const prefersReduced = useReducedMotion();

  // Derive all timings proportionally from durationMs
  const t = durationMs / 1000;
  const logoDelay = t * 0.05;
  const logoDur = t * 0.38;
  const nameDelay = t * 0.2;
  const letterDur = t * 0.13;
  const barDelay = t * 0.36;
  const barDur = t * 0.23;
  const stagger = calcStagger(chars.length, durationMs);

  const bgStyle = backgroundImage
    ? { backgroundImage: `url(${backgroundImage})`, backgroundSize: "cover" as const, backgroundPosition: "center" as const }
    : undefined;

  // Reduced motion: simple centered fade
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
      animate={isExiting ? { y: "-100%" } : { y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      onAnimationComplete={() => { if (isExiting) onExitComplete?.(); }}
      role="dialog"
      aria-modal="true"
      aria-label={brand.name}
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-8 bg-background"
      style={{ ...bgStyle, ...themeVars }}
    >
      {backgroundImage && <div className="absolute inset-0 bg-black/60" />}
      <h1 className="sr-only">{brand.name}</h1>

      <div aria-hidden="true">
        {hasLogo ? (
          <motion.img
            src={logoSrc}
            alt=""
            draggable={false}
            className="h-40 w-auto max-w-none object-contain md:h-56"
            initial={{ clipPath: "inset(0 100% 0 0)" }}
            animate={{ clipPath: "inset(0 0% 0 0)" }}
            transition={{ duration: logoDur, delay: logoDelay, ease: [0.25, 0.46, 0.45, 0.94] }}
          />
        ) : (
          <motion.div
            className="flex h-20 w-20 items-center justify-center rounded-2xl bg-accent-light/15 shadow-xl shadow-accent/20"
            initial={{ opacity: 0, scale: 0.75 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: logoDur * 0.65, delay: logoDelay, ease: [0.34, 1.56, 0.64, 1] }}
          >
            <Icon size={40} className="text-accent-light" />
          </motion.div>
        )}
      </div>

      {!hasLogo && (
        <motion.div
          aria-hidden="true"
          dir="ltr"
          className="flex max-w-[min(90vw,42rem)] flex-wrap items-baseline justify-center overflow-hidden px-4 text-center"
          variants={{
            hidden: {},
            visible: {
              transition: {
                staggerChildren: stagger,
                delayChildren: nameDelay,
              },
            },
          }}
          initial="hidden"
          animate="visible"
        >
          {chars.map((char, i) => (
            <motion.span
              key={i}
              variants={letterVariants}
              transition={{ duration: letterDur, ease: [0.22, 1, 0.36, 1] }}
              className="inline-block whitespace-pre font-serif text-3xl font-bold tracking-wide text-foreground md:text-4xl lg:text-5xl"
            >
              {char === " " ? " " : char}
            </motion.span>
          ))}
        </motion.div>
      )}

      <motion.div
        aria-hidden="true"
        className="h-0.5 w-32 max-w-[min(16rem,70vw)] rounded-full bg-gradient-to-r from-transparent from-10% via-accent-light/70 via-50% to-transparent to-90%"
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{ duration: barDur, delay: barDelay }}
      />
    </motion.div>
  );
}
