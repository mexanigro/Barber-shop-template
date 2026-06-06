import { motion, useReducedMotion } from "motion/react";
import type { SplashProps } from "../layout/splash/types";
import { useSplashLogo } from "../layout/splash/use-splash-logo";

type Props = SplashProps & {
  splitDirection?: "horizontal" | "vertical";
};

/**
 * Splash — `impact-split`
 *
 * The viewport is masked by two half-panels that pull apart like a
 * theatrical curtain. A tiny overshoot at the tail of each panel's
 * trajectory adds a sense of weight (no aggressive bounce — just enough
 * elasticity so the motion feels mechanical and intentional).
 *
 *   • horizontal split (default): panels separate vertically — top half
 *     rises, bottom half drops. The brand sits centred behind.
 *   • vertical split: panels separate horizontally — left/right.
 *
 *   • Duration ~1.3 s.
 *   • Ease custom cubic for the main travel, then a small overshoot via
 *     keyframe at 88% of the journey.
 *
 * Reduced-motion: 200 ms simple opacity fade of the brand layer.
 */
export function SplashImpactSplit({
  brand,
  durationMs,
  logoSrc,
  fallbackLogoSrc,
  Icon,
  backgroundImage,
  splitDirection = "horizontal",
}: Props) {
  const { logoSrc: resolvedLogoSrc, hasLogo, onLogoError } = useSplashLogo(logoSrc, fallbackLogoSrc);
  const prefersReduced = useReducedMotion();
  const horizontal = splitDirection === "horizontal";

  const t = durationMs / 1000;
  const panelDelay = t * 0.18;
  const panelDur = t * 0.5;
  const contentDelay = panelDelay + panelDur * 0.35;
  const contentDur = t * 0.3;

  const bgStyle = backgroundImage
    ? { backgroundImage: `url(${backgroundImage})`, backgroundSize: "cover" as const, backgroundPosition: "center" as const }
    : undefined;

  if (prefersReduced) {
    return (
      <motion.div
        key="splash"
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        role="dialog"
        aria-modal="true"
        aria-label={brand.name}
        className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-6 bg-background"
        style={bgStyle}
      >
        {backgroundImage && <div className="absolute inset-0 bg-black/60" />}
        <h1 className="sr-only">{brand.name}</h1>
        {hasLogo ? (
          <img src={resolvedLogoSrc} alt="" draggable={false} onError={onLogoError} className="h-16 w-auto object-contain md:h-20" />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-accent-light/15">
            <Icon size={40} className="text-accent-light" />
          </div>
        )}
        <p className="font-serif text-3xl font-bold tracking-wide text-foreground md:text-4xl lg:text-5xl">
          {brand.name}
        </p>
      </motion.div>
    );
  }

  // Keyframe sequence: rapid acceleration out, then a tiny overshoot at the
  // very end. Total normalized travel reaches -105% (or 105%) past the edge.
  const negTravel = ["0%", "-90%", "-106%", "-105%"];
  const posTravel = ["0%", "90%", "106%", "105%"];
  const times = [0, 0.7, 0.92, 1];

  const firstPanelAnim = horizontal
    ? { y: negTravel }
    : { x: negTravel };
  const secondPanelAnim = horizontal
    ? { y: posTravel }
    : { x: posTravel };

  return (
    <motion.div
      key="splash"
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      role="dialog"
      aria-modal="true"
      aria-label={brand.name}
      className="fixed inset-0 z-[200] overflow-hidden bg-background"
      style={bgStyle}
    >
      {backgroundImage && <div className="absolute inset-0 bg-black/60" />}
      <h1 className="sr-only">{brand.name}</h1>

      {/* Brand content behind the panels */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: contentDur, delay: contentDelay, ease: [0.22, 1, 0.36, 1] }}
        >
          {hasLogo ? (
            <img src={resolvedLogoSrc} alt="" draggable={false} onError={onLogoError} className="h-16 w-auto object-contain md:h-20" />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-accent-light/15 shadow-xl shadow-accent/15">
              <Icon size={40} className="text-accent-light" />
            </div>
          )}
        </motion.div>

        <motion.p
          dir="ltr"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: contentDur, delay: contentDelay + 0.06, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-[min(90vw,36rem)] px-4 text-center font-serif text-3xl font-bold tracking-wide text-foreground md:text-4xl lg:text-5xl"
        >
          {brand.name}
        </motion.p>

        <motion.div
          aria-hidden="true"
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ duration: contentDur * 0.8, delay: contentDelay + 0.18 }}
          className="h-px w-24 bg-accent-light/40"
        />
      </div>

      {/* First panel — top (horizontal) or left (vertical) */}
      <motion.div
        aria-hidden="true"
        className={
          horizontal
            ? "absolute inset-x-0 top-0 h-1/2 bg-card shadow-2xl shadow-black/30"
            : "absolute inset-y-0 left-0 w-1/2 bg-card shadow-2xl shadow-black/30"
        }
        initial={horizontal ? { y: "0%" } : { x: "0%" }}
        animate={firstPanelAnim}
        transition={{
          duration: panelDur,
          delay: panelDelay,
          times,
          ease: [0.65, 0.0, 0.35, 1],
        }}
      >
        <div
          className={
            horizontal
              ? "absolute inset-x-0 bottom-0 h-px bg-accent-light/30"
              : "absolute inset-y-0 right-0 w-px bg-accent-light/30"
          }
        />
      </motion.div>

      {/* Second panel — bottom (horizontal) or right (vertical) */}
      <motion.div
        aria-hidden="true"
        className={
          horizontal
            ? "absolute inset-x-0 bottom-0 h-1/2 bg-card shadow-2xl shadow-black/30"
            : "absolute inset-y-0 right-0 w-1/2 bg-card shadow-2xl shadow-black/30"
        }
        initial={horizontal ? { y: "0%" } : { x: "0%" }}
        animate={secondPanelAnim}
        transition={{
          duration: panelDur,
          delay: panelDelay,
          times,
          ease: [0.65, 0.0, 0.35, 1],
        }}
      >
        <div
          className={
            horizontal
              ? "absolute inset-x-0 top-0 h-px bg-accent-light/30"
              : "absolute inset-y-0 left-0 w-px bg-accent-light/30"
          }
        />
      </motion.div>
    </motion.div>
  );
}
