import { useReducedMotion } from "motion/react";
import type { Transition } from "motion/react";

/**
 * Intensity of the paper-feel spring.
 *
 *   - `"subtle"`  — gentler, slower, almost no overshoot. Use for body
 *     copy reveals, micro state changes, contexts where the motion
 *     should be felt, not seen.
 *   - `"medium"`  — the default. Cards drop in with a perceptible
 *     micro-overshoot, then settle. Balances "weighted paper" against
 *     "doesn't feel sluggish" — the right call for service tiles.
 *   - `"strong"`  — heavier mass, lower stiffness. The card asserts
 *     itself with a touch more drama; useful for hero cards or single
 *     featured items where extra weight reads as intent, not noise.
 */
export type PaperSpringIntensity = "subtle" | "medium" | "strong";

const PAPER_SPRINGS: Record<PaperSpringIntensity, Transition> = {
  // Mass kept under 1 across all tiers — anything heavier reads as
  // syrup. Damping ratio tuned so we get a single micro-overshoot, not
  // a visible bounce. Stiffness controls "snappiness of settle".
  subtle: {
    type: "spring",
    stiffness: 320,
    damping: 28,
    mass: 0.65,
    restDelta: 0.001,
    restSpeed: 0.001,
  },
  medium: {
    type: "spring",
    stiffness: 280,
    damping: 24,
    mass: 0.8,
    restDelta: 0.001,
    restSpeed: 0.001,
  },
  strong: {
    type: "spring",
    stiffness: 240,
    damping: 22,
    mass: 0.95,
    restDelta: 0.001,
    restSpeed: 0.001,
  },
};

/** Fallback for users who opted out of motion. */
const REDUCED_MOTION_FALLBACK: Transition = {
  type: "tween",
  duration: 0.2,
  ease: "easeOut",
};

/**
 * Returns a Framer Motion transition tuned to feel like a piece of paper
 * settling into place: a touch of initial acceleration, a quick
 * deceleration with a barely-there micro-overshoot, and a clean settle.
 *
 * Under `prefers-reduced-motion`, returns a quick tween instead so the
 * motion still has a defined endpoint but doesn't bounce.
 *
 * Stable across renders (returns module-level constants) so it's safe
 * to spread directly into a `transition={…}` prop without memoisation
 * concerns.
 */
export function usePaperSpring(intensity: PaperSpringIntensity = "medium"): Transition {
  const prefersReduced = useReducedMotion();
  if (prefersReduced) return REDUCED_MOTION_FALLBACK;
  return PAPER_SPRINGS[intensity];
}
