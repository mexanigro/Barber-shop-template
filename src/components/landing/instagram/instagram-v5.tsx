/**
 * instagram-v5.tsx — AUTO-SCROLL CAROUSEL Instagram variant.
 *
 * Infinite marquee rail of square tiles drifting horizontally: a CSS
 * translateX keyframe loop (~40s linear) over a duplicated track, paused
 * on hover/focus-within, mirrored under RTL via animation-direction, and
 * fully disabled (static scrollable rail) when the user prefers reduced
 * motion or `getAnimationLevel() !== "rich"`. A centered overlay chip
 * carries the handle and is the single accessible link out.
 *
 * Selected via `sections.instagram.variant === "v5"` (see the dispatcher
 * in InstagramTeaser.tsx / InstagramFeed.tsx).
 */
import React from "react";
import { Instagram } from "lucide-react";
import { motion } from "motion/react";
import { siteConfig } from "../../../config/site";
import { handleImgError } from "../../../lib/utils";
import { getAnimationLevel } from "../../../lib/section-variants";
import {
  Y_SM, Y_MD, VIEWPORT_ONCE,
  getNicheFlavor, NICHE_DURATION, NICHE_EASING,
} from "../../../lib/motion";

const MARQUEE_CSS = `
@keyframes igv5-drift {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}
.igv5-track {
  animation: igv5-drift 40s linear infinite;
}
[dir="rtl"] .igv5-track {
  animation-direction: reverse;
}
.igv5-rail:hover .igv5-track,
.igv5-rail:focus-within .igv5-track {
  animation-play-state: paused;
}
@media (prefers-reduced-motion: reduce) {
  .igv5-track { animation: none !important; }
}
`;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function InstagramV5() {
  const ig = siteConfig.sections.instagram;
  if (!ig || !ig.url || !ig.images || ig.images.length === 0) return null;

  const flavor = getNicheFlavor(siteConfig.business.type);
  const dur = NICHE_DURATION[flavor];
  const ease = NICHE_EASING[flavor];

  const marquee = getAnimationLevel() === "rich" && !prefersReducedMotion();
  const handleLabel = ig.handle.startsWith("@") ? ig.handle : `@${ig.handle}`;

  /**
   * One set of tiles. In marquee mode spacing lives on each tile
   * (margin-inline-end) so the duplicated track's -50% translate lands
   * exactly one set-width away — a seamless loop. The duplicated set is
   * aria-hidden with empty alts so screen readers hear each post once.
   */
  const renderTiles = (hidden: boolean) =>
    ig.images.map((src, i) => (
      <span
        key={`${hidden ? "dup" : "main"}-${i}`}
        className={
          marquee
            ? "gs-image relative block aspect-square w-44 shrink-0 bg-muted me-[var(--gs-gap)] sm:w-52"
            : "gs-image relative block aspect-square w-44 shrink-0 snap-start bg-muted sm:w-52"
        }
      >
        <img
          src={src}
          alt={hidden ? "" : `Instagram — ${ig.handle}`}
          loading="lazy"
          onError={handleImgError}
          className="h-full w-full object-cover"
        />
      </span>
    ));

  const chip = (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
      <a
        href={ig.url}
        target="_blank"
        rel="noopener noreferrer"
        className="pointer-events-auto inline-flex min-h-[48px] items-center gap-2.5 rounded-full border border-border bg-background/85 px-6 text-sm font-semibold text-foreground shadow-lg backdrop-blur transition-colors duration-300 hover:border-accent/40 hover:text-accent-light focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
      >
        <Instagram size={16} className="text-accent-light" aria-hidden />
        <span className="max-w-[14rem] truncate">{handleLabel}</span>
      </a>
    </div>
  );

  return (
    <section className="bg-background py-24 transition-colors duration-300">

      {/* ── Header: section title ───────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: Y_SM }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={VIEWPORT_ONCE}
        transition={{ duration: dur, ease }}
        className="mx-auto mb-10 max-w-5xl px-6 text-center"
      >
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-accent-light">
          {ig.title}
        </p>
      </motion.div>

      {/* ── Rail ────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: Y_MD }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={VIEWPORT_ONCE}
        transition={{ duration: dur, ease, delay: 0.1 }}
        className="relative"
      >
        {marquee ? (
          <div className="igv5-rail relative overflow-hidden" dir="ltr">
            <style>{MARQUEE_CSS}</style>
            <div className="igv5-track flex w-max">
              {renderTiles(false)}
              <span aria-hidden className="contents">{renderTiles(true)}</span>
            </div>

            {/* Edge fades — decorative, honor the gradient flag */}
            <div
              className="gs-gradient pointer-events-none absolute inset-y-0 left-0 z-[5] w-12 bg-gradient-to-r from-background to-transparent sm:w-20"
              aria-hidden
            />
            <div
              className="gs-gradient pointer-events-none absolute inset-y-0 right-0 z-[5] w-12 bg-gradient-to-l from-background to-transparent sm:w-20"
              aria-hidden
            />
            {chip}
          </div>
        ) : (
          /* Static fallback: plain scrollable, snap-aligned rail */
          <div className="relative">
            <div className="snap-x snap-mandatory overflow-x-auto px-6 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex w-max gap-[var(--gs-gap)]">
                {renderTiles(false)}
              </div>
            </div>
            {chip}
          </div>
        )}
      </motion.div>
    </section>
  );
}
