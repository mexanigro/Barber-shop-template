import React, { useState, useEffect, useMemo } from "react";
import { motion } from "motion/react";
import type { SplashProps } from "./types";

/**
 * Variant 4 — Typewriter
 * Ultra-minimal. Black screen, brand name typed one character at a time
 * with a blinking cursor. Logo fades in above once typing finishes.
 * Exit: text slides up and fades out.
 */
export function SplashTypewriter({ brand, durationMs, logoSrc, Icon }: SplashProps) {
  const hasLogo = !!logoSrc;
  const chars = useMemo(() => brand.name.split(""), [brand.name]);

  // Typing budget: ~60% of duration for typing, rest for pause + logo reveal
  const typingBudgetMs = durationMs * 0.55;
  const charIntervalMs = Math.max(40, Math.min(100, typingBudgetMs / chars.length));

  const [visibleCount, setVisibleCount] = useState(0);
  const typingDone = visibleCount >= chars.length;

  useEffect(() => {
    if (typingDone) return;
    const timer = setTimeout(() => setVisibleCount((c) => c + 1), charIntervalMs);
    return () => clearTimeout(timer);
  }, [visibleCount, typingDone, charIntervalMs]);

  return (
    <motion.div
      key="splash"
      exit={{ y: "-50%", opacity: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      role="dialog"
      aria-modal="true"
      aria-label={brand.name}
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-8 bg-background"
    >
      <h1 className="sr-only">{brand.name}</h1>

      {/* Logo — fades in once typing completes */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={typingDone ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className={typingDone ? "" : "opacity-0"}
      >
        {hasLogo ? (
          <img
            src={logoSrc}
            alt=""
            draggable={false}
            className="h-14 w-auto object-contain md:h-16"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-accent-light/10">
            <Icon size={32} className="text-accent-light" />
          </div>
        )}
      </motion.div>

      {/* Typed text */}
      <div dir="ltr" className="flex items-baseline px-4" aria-hidden="true">
        <span className="font-mono text-2xl font-medium tracking-wider text-foreground md:text-3xl lg:text-4xl">
          {chars.slice(0, visibleCount).join("")}
        </span>
        {/* Blinking cursor */}
        <motion.span
          className="ml-0.5 inline-block h-[1.1em] w-[2px] translate-y-[0.1em] bg-accent-light"
          animate={{ opacity: [1, 1, 0, 0] }}
          transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
        />
      </div>

      {/* Subtle line that appears when typing is done */}
      <motion.div
        aria-hidden="true"
        className="h-px w-16 bg-muted-foreground/20"
        initial={{ scaleX: 0 }}
        animate={typingDone ? { scaleX: 1 } : {}}
        transition={{ duration: 0.4, delay: 0.2 }}
      />
    </motion.div>
  );
}
