/**
 * motion.ts — Motion constants, helpers, and niche-aware animation system.
 *
 * Three tiers:
 *   instant  — immediate UI feedback (hover, press). Pure CSS, no JS.
 *   micro    — 150–200 ms. Subtle state changes (toggle, badge).
 *   entrance — 300–500 ms. Section/card reveals via whileInView.
 *
 * All whileInView animations share: viewport={{ once: true }}
 * prefers-reduced-motion is handled globally by MotionConfig in main.tsx.
 */

import type { BusinessNiche } from "../types";

// ─── Entrance y-offsets ──────────────────────────────────────────────────────
/** Small labels, eyebrows — barely moves. */
export const Y_SM = 12;
/** Standard element entrance — headings, paragraphs, CTAs. */
export const Y_MD = 20;
/** Card grids — needs more travel to feel weighted. */
export const Y_LG = 24;

// ─── Horizontal slide offset ─────────────────────────────────────────────────
/** Right-entry elements (counters, buttons on right side of header). */
export const X_IN = 20;

// ─── Durations ───────────────────────────────────────────────────────────────
/** Hero animate() calls — slightly longer, page-load context. */
export const DUR_HERO = 0.55;
/** Standard whileInView entrance. */
export const DUR_ENTER = 0.45;
/** Scale/rotate reveal (images, badges). */
export const DUR_SCALE = 0.5;

// ─── Stagger helpers ─────────────────────────────────────────────────────────
/** Grid cards (services, gallery, benefits) — 80 ms per item, capped. */
export const staggerGrid = (i: number) => Math.min(i * 0.08, 0.4);
/** Team cards — 100 ms per item, capped (portrait cards are taller). */
export const staggerTeam = (i: number) => Math.min(i * 0.1, 0.4);
/** List rows (day rows in BusinessHours) — 50 ms per row. */
export const staggerRow = (i: number) => Math.min(i * 0.05, 0.3);

// ─── Shared viewport config ──────────────────────────────────────────────────
/** Pass as `viewport` prop on every whileInView motion element. */
export const VIEWPORT_ONCE = { once: true } as const;

// ─── Reusable variant objects ─────────────────────────────────────────────────
/** Fade + slide up — standard entrance. */
export const fadeUp = (y = Y_MD) => ({
  initial: { opacity: 0, y },
  whileInView: { opacity: 1, y: 0 },
  viewport: VIEWPORT_ONCE,
});

/** Fade + slide in from right — header counters / right-column CTAs. */
export const fadeRight = (x = X_IN) => ({
  initial: { opacity: 0, x },
  whileInView: { opacity: 1, x: 0 },
  viewport: VIEWPORT_ONCE,
});

// ─── Modal / overlay durations ────────────────────────────────────────────────
/** Overlay backdrop fade in/out. */
export const DUR_OVERLAY = 0.2;
/** Modal panel enter — slightly longer than backdrop for sequencing feel. */
export const DUR_MODAL_ENTER = 0.22;
/** Modal panel exit — snappy, never lingers. */
export const DUR_MODAL_EXIT = 0.15;

// ═══════════════════════════════════════════════════════════════════════════════
// NICHE-AWARE ANIMATION SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Niche animation flavors ─────────────────────────────────────────────────

export type NicheFlavor = "bold" | "sharp" | "soft" | "clinical";

const NICHE_FLAVOR_MAP: Record<BusinessNiche, NicheFlavor> = {
  barberia: "bold",
  tattoo: "sharp",
  nails: "soft",
  estetica: "clinical",
  cafeteria: "soft",
  remodelaciones: "bold",
  employment: "bold",
};

export function getNicheFlavor(niche: BusinessNiche): NicheFlavor {
  return NICHE_FLAVOR_MAP[niche] ?? "bold";
}

/** Easing curves tuned per niche personality (Framer Motion tuple format). */
export const NICHE_EASING: Record<NicheFlavor, [number, number, number, number]> = {
  bold: [0.25, 0.46, 0.45, 0.94],     // confident, slightly bouncy
  sharp: [0.16, 1, 0.3, 1],            // aggressive snap
  soft: [0.37, 0, 0.63, 1],            // gentle ease-in-out
  clinical: [0.4, 0, 0.2, 1],          // clean, measured
};

/** Niche-tuned entrance durations (seconds). */
export const NICHE_DURATION: Record<NicheFlavor, number> = {
  bold: 0.5,
  sharp: 0.35,
  soft: 0.65,
  clinical: 0.45,
};

/** Niche-tuned stagger intervals (seconds). */
export const NICHE_STAGGER: Record<NicheFlavor, number> = {
  bold: 0.08,
  sharp: 0.05,
  soft: 0.1,
  clinical: 0.07,
};

/**
 * Niche-aware fadeUp with tuned duration and easing.
 */
export function nicheFadeUp(niche: BusinessNiche, y = Y_MD) {
  const flavor = getNicheFlavor(niche);
  return {
    initial: { opacity: 0, y },
    whileInView: { opacity: 1, y: 0 },
    transition: { duration: NICHE_DURATION[flavor], ease: NICHE_EASING[flavor] },
    viewport: VIEWPORT_ONCE,
  };
}

/**
 * Niche-aware stagger helper.
 */
export function nicheStagger(niche: BusinessNiche) {
  const interval = NICHE_STAGGER[getNicheFlavor(niche)];
  return (i: number) => Math.min(i * interval, 0.5);
}

// ─── Counter animation ──────────────────────────────────────────────────────

/**
 * Animate a number from 0 to target.
 * Use with useMotionValue + useTransform + useInView.
 *
 * Example:
 *   const count = useCountUp(500, isInView)
 *   <motion.span>{count}</motion.span>
 */
export const COUNTER_DURATION = 2; // seconds
export const COUNTER_EASING = [0.16, 1, 0.3, 1] as const;

// ─── Text reveal ────────────────────────────────────────────────────────────

/**
 * Variants for word-by-word or character-by-character text reveal.
 *
 * Usage:
 *   <motion.h1 variants={textContainerVariants} initial="hidden" whileInView="visible" viewport={{ once: true }}>
 *     {words.map((word, i) => (
 *       <motion.span key={i} variants={textWordVariants(niche)} className="inline-block">
 *         {word}&nbsp;
 *       </motion.span>
 *     ))}
 *   </motion.h1>
 */
export const textContainerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06 },
  },
};

export function textWordVariants(niche: BusinessNiche) {
  const flavor = getNicheFlavor(niche);
  const configs: Record<NicheFlavor, { y: number; blur: number }> = {
    bold: { y: 20, blur: 0 },           // solid entrance, no blur
    sharp: { y: 0, blur: 0 },            // clip reveal (handled via CSS)
    soft: { y: 12, blur: 4 },            // soft bloom from below
    clinical: { y: 8, blur: 0 },         // measured slide
  };
  const c = configs[flavor];
  return {
    hidden: {
      opacity: 0,
      y: c.y,
      filter: c.blur ? `blur(${c.blur}px)` : "none",
    },
    visible: {
      opacity: 1,
      y: 0,
      filter: "none",
      transition: { duration: NICHE_DURATION[flavor], ease: NICHE_EASING[flavor] },
    },
  };
}

// ─── Parallax scroll ────────────────────────────────────────────────────────

/**
 * Parallax speed multiplier per niche.
 * Use with useScroll + useTransform:
 *
 *   const { scrollYProgress } = useScroll({ target: ref })
 *   const y = useTransform(scrollYProgress, [0, 1], [0, -speed * 100])
 */
export const PARALLAX_SPEED: Record<NicheFlavor, number> = {
  bold: 0.15,      // noticeable but grounded
  sharp: 0.08,     // minimal — sharp things don't float
  soft: 0.2,       // dreamy, floating feel
  clinical: 0.1,   // subtle, controlled
};

// ─── Scale reveal ───────────────────────────────────────────────────────────

/** Image/card scale-in variants per niche. */
export function nicheScaleIn(niche: BusinessNiche) {
  const flavor = getNicheFlavor(niche);
  const configs: Record<NicheFlavor, { scale: number; rotate: number }> = {
    bold: { scale: 0.92, rotate: 0 },
    sharp: { scale: 0.98, rotate: 0 },
    soft: { scale: 0.95, rotate: 1 },
    clinical: { scale: 0.96, rotate: 0 },
  };
  const c = configs[flavor];
  return {
    initial: { opacity: 0, scale: c.scale, rotate: c.rotate },
    whileInView: { opacity: 1, scale: 1, rotate: 0 },
    transition: { duration: NICHE_DURATION[flavor] * 1.2, ease: NICHE_EASING[flavor] },
    viewport: VIEWPORT_ONCE,
  };
}

// ─── Clip-path reveal (tattoo specialty) ────────────────────────────────────

/** Horizontal wipe reveal — ink-like for tattoo, clean for others. */
export function nicheClipReveal(niche: BusinessNiche) {
  const flavor = getNicheFlavor(niche);
  return {
    initial: { clipPath: "inset(0 100% 0 0)" },
    whileInView: { clipPath: "inset(0 0% 0 0)" },
    transition: { duration: NICHE_DURATION[flavor] * 1.5, ease: NICHE_EASING[flavor] },
    viewport: VIEWPORT_ONCE,
  };
}

// ─── Shimmer effect (nails specialty) ───────────────────────────────────────

/**
 * CSS keyframe class for shimmer effect.
 * Add `animate-shimmer` class + configure in index.css.
 */
export const SHIMMER_DURATION = "2s";

// ─── Hover presets per niche ────────────────────────────────────────────────

export const NICHE_CARD_HOVER: Record<NicheFlavor, {
  y: number; scale: number; shadow: string;
}> = {
  bold: { y: -6, scale: 1, shadow: "0 20px 40px -12px rgba(0,0,0,0.15)" },
  sharp: { y: -2, scale: 1, shadow: "0 4px 20px -4px rgba(0,0,0,0.4)" },
  soft: { y: -4, scale: 1.01, shadow: "0 16px 32px -8px rgba(111,74,86,0.12)" },
  clinical: { y: -3, scale: 1, shadow: "0 8px 24px -6px rgba(0,0,0,0.08)" },
};

// ═══════════════════════════════════════════════════════════════════════════════
// ENHANCED ANIMATION PRIMITIVES
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Strong easing curves (Emil Kowalski) ──────────────────────────────────
export const EASE_OUT_STRONG: [number, number, number, number] = [0.23, 1, 0.32, 1];
export const EASE_IN_OUT_STRONG: [number, number, number, number] = [0.77, 0, 0.175, 1];

// ─── Scroll-driven hero config ──────────────────────────────────────────────
export const HERO_SCROLL_FX: Record<NicheFlavor, {
  scaleRange: [number, number];
  opacityRange: [number, number];
  overlayRange: [number, number];
}> = {
  bold:     { scaleRange: [1, 1.12], opacityRange: [1, 0], overlayRange: [0.3, 0.7] },
  sharp:    { scaleRange: [1, 1.06], opacityRange: [1, 0], overlayRange: [0.4, 0.8] },
  soft:     { scaleRange: [1, 1.15], opacityRange: [1, 0], overlayRange: [0.25, 0.65] },
  clinical: { scaleRange: [1, 1.08], opacityRange: [1, 0], overlayRange: [0.3, 0.7] },
};

// ─── Button microinteraction presets ────────────────────────────────────────
export const BUTTON_PRESS: Record<NicheFlavor, {
  scale: number; duration: number; hoverY: number;
}> = {
  bold:     { scale: 0.95, duration: 0.16, hoverY: -3 },
  sharp:    { scale: 0.97, duration: 0.12, hoverY: -2 },
  soft:     { scale: 0.97, duration: 0.18, hoverY: -2 },
  clinical: { scale: 0.97, duration: 0.15, hoverY: -2 },
};

// ─── Section title text reveal ──────────────────────────────────────────────
export const sectionTitleContainerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.045 } },
};

// ─── Fade from left ─────────────────────────────────────────────────────────
export function nicheFadeLeft(niche: BusinessNiche, x = -X_IN) {
  const flavor = getNicheFlavor(niche);
  return {
    initial: { opacity: 0, x },
    whileInView: { opacity: 1, x: 0 },
    transition: { duration: NICHE_DURATION[flavor], ease: NICHE_EASING[flavor] },
    viewport: VIEWPORT_ONCE,
  };
}

// ─── Fade from right ────────────────────────────────────────────────────────
export function nicheFadeRight(niche: BusinessNiche, x = X_IN) {
  const flavor = getNicheFlavor(niche);
  return {
    initial: { opacity: 0, x },
    whileInView: { opacity: 1, x: 0 },
    transition: { duration: NICHE_DURATION[flavor], ease: NICHE_EASING[flavor] },
    viewport: VIEWPORT_ONCE,
  };
}

// ─── Scale-in from center ───────────────────────────────────────────────────
export function nicheScaleCenter(niche: BusinessNiche) {
  const flavor = getNicheFlavor(niche);
  const configs: Record<NicheFlavor, number> = {
    bold: 0.92, sharp: 0.96, soft: 0.94, clinical: 0.95,
  };
  return {
    initial: { opacity: 0, scale: configs[flavor] },
    whileInView: { opacity: 1, scale: 1 },
    transition: { duration: NICHE_DURATION[flavor] * 1.1, ease: EASE_OUT_STRONG },
    viewport: VIEWPORT_ONCE,
  };
}

// ─── Row-stagger by grid position ───────────────────────────────────────────
export function staggerMasonry(index: number, cols: number, niche: BusinessNiche) {
  const flavor = getNicheFlavor(niche);
  const row = Math.floor(index / cols);
  const col = index % cols;
  const rowDelay = row * 0.12;
  const colDelay = col * NICHE_STAGGER[flavor];
  return Math.min(rowDelay + colDelay, 0.6);
}

// ─── Scroll indicator ───────────────────────────────────────────────────────
export const SCROLL_INDICATOR_DELAY = 1.8;

// ─── Section divider variants ───────────────────────────────────────────────
export function nicheDivider(niche: BusinessNiche) {
  const flavor = getNicheFlavor(niche);

  switch (flavor) {
    case "bold":
      return {
        initial: { scaleX: 0, opacity: 0 },
        whileInView: { scaleX: 1, opacity: 1 },
        transition: { duration: 0.6, ease: NICHE_EASING.bold },
        viewport: VIEWPORT_ONCE,
      };
    case "sharp":
      return {
        initial: { clipPath: "inset(0 100% 0 0)" },
        whileInView: { clipPath: "inset(0 0% 0 0)" },
        transition: { duration: 0.5, ease: NICHE_EASING.sharp },
        viewport: VIEWPORT_ONCE,
      };
    case "soft":
      return {
        initial: { opacity: 0, scaleX: 0.3 },
        whileInView: { opacity: 0.5, scaleX: 1 },
        transition: { duration: 0.8, ease: NICHE_EASING.soft },
        viewport: VIEWPORT_ONCE,
      };
    case "clinical":
    default:
      return {
        initial: { opacity: 0 },
        whileInView: { opacity: 0.4 },
        transition: { duration: 0.5, ease: NICHE_EASING.clinical },
        viewport: VIEWPORT_ONCE,
      };
  }
}
