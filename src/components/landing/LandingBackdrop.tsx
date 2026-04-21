import React from "react";
import { siteConfig } from "../../config/site";

// ─── LandingBackdrop ──────────────────────────────────────────────────────────
//
// Wraps the Hero + Services sections with a shared background image that
// behaves like a "sticky canvas": it remains fixed at the top of the viewport
// as the user scrolls through both sections, then naturally scrolls away once
// the container block ends.
//
// HOW IT WORKS (sticky + negative-margin trick)
// ──────────────────────────────────────────────
//  Layer 1 — sticky image (z-[5]):
//    • position: sticky, top: 0, height: 100svh
//    • Occupies 100svh in the document flow.
//    • Stays pinned to the top while the outer container is in view.
//    • Once the outer container's bottom edge leaves the viewport, the sticky
//      releases and the image scrolls away — no `position: fixed` on the whole
//      page, so it naturally ends with the block.
//
//  Layer 2 — content (z-10, -mt-[100svh]):
//    • Negative margin pulls Hero + Services up to overlap Layer 1.
//    • Both sections render on top of the sticky image.
//    • Hero uses omitBackground={true} (no duplicate <img>).
//    • Services uses overFixedBackdrop={true} (semi-transparent + blur).
//
// IMPORTANT: Do NOT add overflow-hidden to the outer <div>; that would break
// sticky positioning. The sticky element's own overflow-hidden is fine.
// ─────────────────────────────────────────────────────────────────────────────

interface LandingBackdropProps {
  children: React.ReactNode;
}

export function LandingBackdrop({ children }: LandingBackdropProps) {
  const { hero } = siteConfig;

  return (
    <div className="relative">

      {/* ── Layer 1: Sticky background image ─────────────────────────────── */}
      <div
        aria-hidden="true"
        className="pointer-events-none sticky top-0 z-[5] h-[100svh] overflow-hidden"
      >
        <img
          src={hero.backgroundImage}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          loading="eager"
          referrerPolicy="no-referrer"
          draggable={false}
        />
        {/* Light top vignette for depth */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent" />
      </div>

      {/* ── Layer 2: Content overlapping the sticky slot ──────────────────── */}
      <div className="relative z-10 -mt-[100svh]">
        {children}
      </div>

    </div>
  );
}
