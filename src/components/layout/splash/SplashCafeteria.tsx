import React from "react";
import { motion, useReducedMotion } from "motion/react";
import type { SplashProps } from "./types";

/**
 * Variant 6 — Cafeteria
 * Warm mocha background, two-line serif title with italic caramel accent.
 * Slide-up exit matching the original cafeteria template.
 */
export function SplashCafeteria({ brand, durationMs, logoSrc }: SplashProps) {
  const prefersReduced = useReducedMotion();
  const hasLogo = !!logoSrc;
  const [line1, line2] = splitBrandName(brand.name);

  if (prefersReduced) {
    return (
      <motion.div
        key="splash"
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        role="dialog"
        aria-modal="true"
        aria-label={brand.name}
        className="fixed inset-0 z-[200] flex items-center justify-center"
        style={{ backgroundColor: "#2C1810" }}
      >
        <h1 className="sr-only">{brand.name}</h1>
        <div className="flex flex-col items-center gap-6 text-center" aria-hidden="true">
          {hasLogo ? (
            <img src={logoSrc} alt="" draggable={false} className="h-40 w-auto max-w-none object-contain md:h-56" />
          ) : (
            <p className="font-serif text-5xl leading-[0.95] md:text-7xl" style={{ color: "#F5E6D3" }}>
              {line1}
              <span className="block italic" style={{ color: "#D4A574" }}>{line2}</span>
            </p>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      key="splash"
      exit={{ y: "-100%" }}
      transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
      role="dialog"
      aria-modal="true"
      aria-label={brand.name}
      className="fixed inset-0 z-[200] flex items-center justify-center will-change-transform"
      style={{ backgroundColor: "#2C1810" }}
    >
      <h1 className="sr-only">{brand.name}</h1>
      <div className="flex flex-col items-center gap-7 text-center" aria-hidden="true">
        {hasLogo ? (
          <>
            <motion.img
              src={logoSrc}
              alt=""
              draggable={false}
              className="h-40 w-auto max-w-none object-contain md:h-56"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.1, ease: [0.23, 1, 0.32, 1] }}
            />
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.55, ease: [0.23, 1, 0.32, 1] }}
              className="text-xs tracking-[8px] uppercase"
              style={{ color: "rgba(212, 165, 116, 0.7)" }}
            >
              Specialty Coffee
            </motion.p>
          </>
        ) : (
          <>
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15, ease: [0.23, 1, 0.32, 1] }}
              className="text-xs tracking-[8px] uppercase"
              style={{ color: "rgba(212, 165, 116, 0.7)" }}
            >
              Specialty Coffee
            </motion.p>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.35, ease: [0.23, 1, 0.32, 1] }}
              className="font-serif text-6xl leading-[0.95] md:text-8xl"
              style={{ color: "#F5E6D3" }}
            >
              {line1}
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.65, ease: [0.23, 1, 0.32, 1] }}
                className="block italic"
                style={{ color: "#D4A574" }}
              >
                {line2}
              </motion.span>
            </motion.p>
          </>
        )}
      </div>
    </motion.div>
  );
}

function splitBrandName(name: string): [string, string] {
  const words = name.trim().split(/\s+/);
  if (words.length <= 1) return [name, ""];
  const mid = Math.ceil(words.length / 2);
  return [words.slice(0, mid).join(" "), words.slice(mid).join(" ")];
}
