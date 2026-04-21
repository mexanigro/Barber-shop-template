import React from "react";
import * as Icons from "lucide-react";
import { motion } from "motion/react";
import { siteConfig } from "../../config/site";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Calculates the per-character stagger so that the last letter finishes
 * animating well before the exit curtain fires.
 *
 * Budget: from nameDelay until (durationMs - exitBuffer), divided by char count.
 * Capped between 0.02 s (very long names) and 0.07 s (short names).
 */
function calcStagger(nameLength: number, durationMs: number): number {
  const NAME_DELAY   = 0.45; // seconds after mount when name animation starts
  const EXIT_BUFFER  = 0.55; // seconds before exit to ensure name is fully visible
  const available    = durationMs / 1000 - NAME_DELAY - EXIT_BUFFER;
  const raw          = nameLength > 1 ? available / (nameLength - 1) : available;
  return Math.min(0.07, Math.max(0.02, raw));
}

// ─── Letter variants ──────────────────────────────────────────────────────────
const letterVariants = {
  hidden:  { opacity: 0, y: 6, rotate: -10 },
  visible: { opacity: 1, y: 0, rotate:   0 },
};

// ─── Component ────────────────────────────────────────────────────────────────
/**
 * SplashScreen
 *
 * Shown once per page load (session tracked by splash-session.ts).
 * - Logo defined  → clip-path horizontal reveal (inset draw effect).
 * - No logo       → Lucide icon with fade/scale.
 * - Brand name    → Caveat font, letter-by-letter staggered animation.
 * - No user-dismissal: exits only after siteConfig.splash.durationMs.
 * - Exit animation: translateY('-100%') — curtain rising upwards.
 */
export function SplashScreen() {
  const { brand, splash } = siteConfig;
  const logo     = brand.logo;
  const logoDark = brand.logoDark;
  const hasLogo  = !!logo || !!logoDark;
  const logoSrc  = logoDark ?? logo;

  const Icon = (Icons as any)[brand.logoIconName || "Scissors"] || Icons.Scissors;
  const chars = brand.name.split("");
  const stagger = calcStagger(chars.length, splash.durationMs);

  return (
    <motion.div
      key="splash"
      // ── Exit: full-height curtain rises off the top ─────────────────────
      exit={{ y: "-100%" }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      // ── Accessibility ────────────────────────────────────────────────────
      role="dialog"
      aria-modal="true"
      aria-label={brand.name}
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-8 bg-black"
    >
      {/* Screen-reader-only heading — accessible name */}
      <h1 className="sr-only">{brand.name}</h1>

      {/* ── Logo / Icon ──────────────────────────────────────────────────── */}
      <div aria-hidden="true">
        {hasLogo ? (
          /* Clip-path draw: reveals from left → right */
          <motion.img
            src={logoSrc}
            alt=""
            draggable={false}
            className="h-16 w-auto object-contain md:h-20"
            initial={{ clipPath: "inset(0 100% 0 0)" }}
            animate={{ clipPath: "inset(0 0% 0 0)" }}
            transition={{ duration: 0.85, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
          />
        ) : (
          /* Icon fallback: fade + scale */
          <motion.div
            className="flex h-20 w-20 items-center justify-center rounded-2xl bg-accent-light shadow-xl shadow-accent/30"
            initial={{ opacity: 0, scale: 0.75 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.55, delay: 0.1, ease: [0.34, 1.56, 0.64, 1] }}
          >
            <Icon size={40} className="text-zinc-950" />
          </motion.div>
        )}
      </div>

      {/* ── Brand name — Caveat, letter-by-letter ────────────────────────── */}
      <motion.div
        aria-hidden="true"
        className="flex flex-wrap items-baseline justify-center overflow-hidden"
        variants={{
          hidden:  {},
          visible: {
            transition: {
              staggerChildren: stagger,
              delayChildren:   0.45,
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
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            // Non-breaking space so whitespace characters occupy width
            className="inline-block whitespace-pre text-4xl font-semibold tracking-wide text-white md:text-5xl"
            style={{ fontFamily: "'Caveat', cursive" }}
          >
            {char === " " ? "\u00A0" : char}
          </motion.span>
        ))}
      </motion.div>

      {/* ── Subtle accent line beneath the name ──────────────────────────── */}
      <motion.div
        aria-hidden="true"
        className="h-px w-16 bg-gradient-to-r from-transparent via-accent-light to-transparent"
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.8 }}
      />
    </motion.div>
  );
}
