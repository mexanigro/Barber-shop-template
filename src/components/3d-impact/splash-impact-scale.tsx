import { motion, useReducedMotion } from "motion/react";
import { useMemo } from "react";
import type { SplashProps } from "../layout/splash/types";

type Props = SplashProps & {
  bandCount?: number;
  bandDirection?: "horizontal" | "vertical";
};

/**
 * Splash — `impact-scale`
 *
 * The viewport is divided into N parallel bands (default 7). Bands stagger
 * outward from the centre line: bands above the centre translate up, bands
 * below translate down. Each band carries a subtle theme-derived gradient
 * so the reveal feels coloured rather than a flat black wipe.
 *
 * The brand content sits behind the bands and fades in shortly before the
 * bands clear, giving the impression of an opening shutter.
 *
 *   • Duration ~1.2–1.5 s (driven by `durationMs`).
 *   • Stagger 80–120 ms between bands, scaled to the band count.
 *   • Easing `easeOutExpo` for the bands so they accelerate away cleanly.
 *
 * Reduced-motion: 200 ms simple fade of the brand layer.
 */
export function SplashImpactScale({
  brand,
  durationMs,
  logoSrc,
  Icon,
  backgroundImage,
  bandCount = 7,
  bandDirection = "horizontal",
}: Props) {
  const hasLogo = !!logoSrc;
  const prefersReduced = useReducedMotion();

  // Clamp band count to a sane range — outside 3..14 the perceived motion
  // collapses (too coarse) or fragments (too thin).
  const N = Math.max(3, Math.min(14, Math.round(bandCount)));
  const horizontal = bandDirection === "horizontal";

  // Per-band metadata: each band knows its travel direction + stagger delay.
  const bands = useMemo(() => {
    const t = durationMs / 1000;
    // Total band reveal occupies the first ~70% of the splash duration.
    const totalRevealWindow = t * 0.55;
    const perBandDuration = t * 0.42;
    const totalStaggerWindow = Math.max(0, totalRevealWindow - perBandDuration);
    const baseStagger = N > 1 ? totalStaggerWindow / (N - 1) : 0;
    const stagger = Math.min(0.12, Math.max(0.06, baseStagger));

    const mid = (N - 1) / 2;
    return Array.from({ length: N }, (_, i) => {
      const distFromMid = i - mid;
      // Bands above the centre line move negatively; below, positively.
      const sign = distFromMid <= 0 ? -1 : 1;
      // Outer bands leave first — they have less distance perception and
      // anchor the eye toward the reveal.
      const order = Math.round(Math.abs(distFromMid));
      const delay = order * stagger;
      // Subtle accent-tinted gradient blended over the band base colour.
      // `color-mix` lets us blend the theme accent with `transparent` without
      // needing a separate `--brand-accent-rgb` token. Alternating gradient
      // direction keeps adjacent bands visually distinct.
      const fromPct = Math.round((6 + (i % 2) * 4) * 10) / 10; // 6% or 10%
      const fromTint = `color-mix(in srgb, var(--brand-accent) ${fromPct}%, transparent)`;
      const toTint = "transparent";
      const angle = horizontal ? (i % 2 === 0 ? 90 : 270) : i % 2 === 0 ? 180 : 0;
      const gradient = `linear-gradient(${angle}deg, ${fromTint}, ${toTint})`;
      return { i, sign, delay, duration: perBandDuration, gradient };
    });
  }, [N, durationMs, horizontal]);

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
          <img src={logoSrc} alt="" draggable={false} className="h-16 w-auto object-contain md:h-20" />
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

  const bandStyle = (band: (typeof bands)[number]): React.CSSProperties => {
    const sizePct = 100 / N;
    if (horizontal) {
      return {
        position: "absolute",
        left: 0,
        right: 0,
        top: `${band.i * sizePct}%`,
        height: `${sizePct}%`,
        backgroundImage: band.gradient,
      };
    }
    return {
      position: "absolute",
      top: 0,
      bottom: 0,
      left: `${band.i * sizePct}%`,
      width: `${sizePct}%`,
      backgroundImage: band.gradient,
    };
  };

  const t = durationMs / 1000;
  const contentDelay = t * 0.18;
  const contentDur = t * 0.28;

  return (
    <motion.div
      key="splash"
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      role="dialog"
      aria-modal="true"
      aria-label={brand.name}
      className="fixed inset-0 z-[200] overflow-hidden bg-background"
      style={bgStyle}
    >
      {backgroundImage && <div className="absolute inset-0 bg-black/60" />}
      <h1 className="sr-only">{brand.name}</h1>

      {/* Content sits behind the bands and fades in as they retract. */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: contentDur, delay: contentDelay, ease: [0.22, 1, 0.36, 1] }}
        >
          {hasLogo ? (
            <img src={logoSrc} alt="" draggable={false} className="h-16 w-auto object-contain md:h-20" />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-accent-light/15">
              <Icon size={40} className="text-accent-light" />
            </div>
          )}
        </motion.div>

        <motion.p
          dir="ltr"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: contentDur, delay: contentDelay + 0.08, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-[min(90vw,36rem)] px-4 text-center font-serif text-3xl font-bold tracking-wide text-foreground md:text-4xl lg:text-5xl"
        >
          {brand.name}
        </motion.p>
      </div>

      {/* Band layer — each band slides out past the viewport edge. */}
      <div aria-hidden="true" className="absolute inset-0">
        {bands.map((band) => {
          // Translate the band by its own size + a little extra so it leaves
          // the viewport regardless of rounding.
          const translateAxis = horizontal ? "y" : "x";
          const offsetPct = 110;
          const animate = { [translateAxis]: `${band.sign * offsetPct}%` } as Record<string, string>;
          return (
            <motion.div
              key={band.i}
              className="bg-card"
              style={bandStyle(band)}
              initial={{ [translateAxis]: 0 } as Record<string, number>}
              animate={animate}
              transition={{
                duration: band.duration,
                delay: band.delay,
                ease: [0.16, 1, 0.3, 1],
              }}
            />
          );
        })}
      </div>
    </motion.div>
  );
}
