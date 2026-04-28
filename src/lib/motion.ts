/**
 * motion.ts — Normalized motion constants for the landing page.
 *
 * Three tiers:
 *   instant  — immediate UI feedback (hover, press). Pure CSS, no JS.
 *   micro    — 150–200 ms. Subtle state changes (toggle, badge).
 *   entrance — 300–500 ms. Section/card reveals via whileInView.
 *
 * All whileInView animations share: viewport={{ once: true }}
 * prefers-reduced-motion is handled globally by MotionConfig in main.tsx.
 */

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
