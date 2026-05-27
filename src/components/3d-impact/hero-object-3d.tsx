import {
  type ReactNode,
  useCallback,
  useRef,
  useState,
} from "react";
import {
  motion,
  type MotionValue,
  useInView,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import { useHeroObject } from "../../hooks/use-hero-object";
import { AmbientParticles } from "./ambient-particles";
import { clamp, getIntensityScales, getShadowColor } from "../../lib/3d-impact-utils";
import type { HeroObjectConfig, HeroObjectIntensity, HeroObjectLayer } from "../../types";

type Size = "sm" | "md" | "lg" | "xl";

type Props = {
  slotName?: string;
  fallback?: ReactNode;
  className?: string;
  /** Eager loading if this is the LCP/hero image. */
  priority?: boolean;
  size?: Size;
  /** Alt text for the underlying <img>. Empty string = decorative. */
  alt?: string;
  /**
   * Optional Framer Motion `layoutId` applied to the underlying image.
   * When another `<motion.img>` with the same id unmounts elsewhere in the
   * tree (e.g. the `SplashImpactReveal3D` hero object), Motion animates
   * the new image *from* the unmounting element's position/size — one
   * continuous "object travels into the hero" transition.
   *
   * Both elements must share a `<LayoutGroup>`/Motion context (the global
   * one is fine in this app). The shared transition is **opt-in** — leave
   * unset to keep the default per-instance entry animation.
   *
   * Ignored under `prefers-reduced-motion`: the static path drops layoutId
   * to avoid a "fly across the screen" effect that the user opted out of.
   *
   * Also ignored when `config.composition` is set — the stack is rendered
   * as multiple layers and there is no single primary image to anchor
   * the shared transition to.
   */
  layoutId?: string;
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: "w-32 h-32 sm:w-40 sm:h-40",
  md: "w-48 h-48 sm:w-56 sm:h-56",
  lg: "w-64 h-64 sm:w-80 sm:h-80",
  xl: "w-80 h-80 sm:w-96 sm:h-96 lg:w-[28rem] lg:h-[28rem]",
};

/**
 * `<HeroObject3D>` — wraps a transparent PNG with the 3D Impact treatment:
 *
 *   • Scroll parallax (outer wrapper, page scrollYProgress)
 *   • Constant subtle levitation (CSS keyframe on a dedicated layer)
 *   • Mouse tilt with springy lerp (perspective transform)
 *   • Cursor-following drop-shadow (light-source illusion, drives `filter`)
 *   • Viewport entry (scale + opacity + translateY)
 *   • Viewport exit dim (opacity falls to 0.4 when scrolled past)
 *   • Optional `<AmbientParticles>` layer driven by the slot config
 *
 * Each transform lives on its OWN layer so they compose instead of
 * overwriting each other (`transform` is a single property).
 *
 * Respects `prefers-reduced-motion`: keeps a single opacity fade-in
 * and drops every other animation.
 *
 * Opt-in: if the active site config has no entry for the requested
 * slot (and no `"primary"` fallback), renders `fallback`.
 *
 * Multi-layer composition: when `config.composition` is set, every layer
 * renders inside the same tilt+levitation wrapper but owns its OWN
 * scroll parallax (driven by `layer.parallaxFactor`), shadow magnitude
 * (`layer.intensity`), offset/scale/rotation/opacity/zIndex. The single
 * `config.src` field is ignored in this mode — provide it via a layer
 * if you want the same image rendered.
 */
export function HeroObject3D({
  slotName = "primary",
  fallback = null,
  className,
  priority = false,
  size = "lg",
  alt = "",
  layoutId,
}: Props) {
  const config = useHeroObject(slotName);
  const prefersReduced = useReducedMotion();

  const containerRef = useRef<HTMLDivElement>(null);
  const inView = useInView(containerRef, { amount: 0.3, once: false });

  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const smoothX = useSpring(pointerX, { stiffness: 140, damping: 18, mass: 0.6 });
  const smoothY = useSpring(pointerY, { stiffness: 140, damping: 18, mass: 0.6 });

  const scales = getIntensityScales(config?.intensity);
  const rotateY = useTransform(smoothX, [-1, 1], [-scales.tiltDeg, scales.tiltDeg]);
  const rotateX = useTransform(smoothY, [-1, 1], [scales.tiltDeg, -scales.tiltDeg]);

  // Cursor → "light source" mapping. Shadow falls in the OPPOSITE direction
  // of the cursor: mouse upper-right → shadow elongates down-left.
  const shadowOffsetX = useTransform(
    smoothX,
    [-1, 1],
    [scales.shadowOffsetPx, -scales.shadowOffsetPx],
  );
  const shadowOffsetY = useTransform(
    smoothY,
    [-1, 1],
    [scales.shadowOffsetPx * 0.5, -scales.shadowOffsetPx * 0.5],
  );

  // Scroll parallax — slower than the rest of the page.
  const { scrollYProgress } = useScroll();
  const parallaxY = useTransform(scrollYProgress, [0, 1], [0, -60]);

  // will-change is expensive — only paint a fresh GPU layer during hover.
  const [isInteracting, setIsInteracting] = useState(false);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (prefersReduced) return;
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const nx = clamp(((e.clientX - rect.left) / rect.width) * 2 - 1, -1, 1);
      const ny = clamp(((e.clientY - rect.top) / rect.height) * 2 - 1, -1, 1);
      pointerX.set(nx);
      pointerY.set(ny);
    },
    [pointerX, pointerY, prefersReduced],
  );

  const handlePointerEnter = useCallback(() => {
    if (prefersReduced) return;
    setIsInteracting(true);
  }, [prefersReduced]);

  const handlePointerLeave = useCallback(() => {
    setIsInteracting(false);
    pointerX.set(0);
    pointerY.set(0);
  }, [pointerX, pointerY]);

  // useMotionTemplate must always run — keep it above the early-return
  // branches so hook order stays stable.
  const shadowColor = getShadowColor(config, config?.intensity);
  const baseDropY = scales.shadowOffsetPx * 0.6;
  const dropShadow = useMotionTemplate`drop-shadow(${shadowOffsetX}px calc(${shadowOffsetY}px + ${baseDropY}px) ${scales.shadowBlur}px ${shadowColor})`;

  if (!config) return <>{fallback}</>;

  const sizeClass = SIZE_CLASSES[size];
  const composition = Array.isArray(config.composition) && config.composition.length > 0
    ? config.composition
    : null;

  // Reduced-motion path: static image (single src) or static stack
  // (composition) with a gentle opacity fade-in. Layers render with
  // their offsets/scale/rotation but without scroll parallax or tilt.
  if (prefersReduced) {
    return (
      <div
        ref={containerRef}
        className={[
          "relative inline-flex items-center justify-center",
          sizeClass,
          className ?? "",
        ].join(" ")}
      >
        <AmbientParticles type={config.particles ?? "none"} />
        {composition ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="relative z-10 h-full w-full"
          >
            {[...composition]
              .sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0))
              .map((layer, i) => (
                <StaticLayer key={`${layer.src}-${i}`} layer={layer} alt={i === 0 ? alt : ""} />
              ))}
          </motion.div>
        ) : (
          <motion.img
            src={config.src}
            alt={alt}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            draggable={false}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="relative z-10 h-full w-full select-none object-contain"
          />
        )}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      className={[
        "relative inline-flex items-center justify-center",
        sizeClass,
        className ?? "",
      ].join(" ")}
      style={{ perspective: "1000px" }}
    >
      <AmbientParticles type={config.particles ?? "none"} />

      {/* Layer 1 — scroll parallax (transform-only).
          Composition skips this layer because each child owns its own
          parallax factor (rendered inside the tilt group below). */}
      <motion.div
        className="relative z-10 h-full w-full"
        style={composition ? undefined : { y: parallaxY }}
      >
        {/* Layer 2 — constant levitation via CSS keyframe. */}
        <div
          className="impact3d-levitate h-full w-full"
          style={
            {
              "--impact3d-levitate": `${scales.levitatePx}px`,
              animation: `impact3d-levitate ${4 + scales.levitatePx * 0.1}s ease-in-out infinite`,
            } as React.CSSProperties
          }
        >
          {/* Layer 3 — tilt + viewport entry. preserve-3d for child depth. */}
          <motion.div
            className="relative h-full w-full"
            style={{
              rotateX,
              rotateY,
              transformStyle: "preserve-3d",
              willChange: isInteracting ? "transform" : "auto",
            }}
            initial={{ opacity: 0, scale: 0.8, y: 30 }}
            animate={
              inView
                ? { opacity: 1, scale: 1, y: 0 }
                : { opacity: 0.4, scale: 0.95, y: 0 }
            }
            transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
          >
            {composition ? (
              [...composition]
                .sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0))
                .map((layer, i) => (
                  <HeroLayer
                    key={`${layer.src}-${i}`}
                    layer={layer}
                    parentIntensity={config.intensity}
                    parentConfig={config}
                    scrollYProgress={scrollYProgress}
                    smoothX={smoothX}
                    smoothY={smoothY}
                    isInteracting={isInteracting}
                    alt={i === 0 ? alt : ""}
                    priority={priority}
                  />
                ))
            ) : (
              /* Layer 4 — the image itself; drop-shadow follows the alpha.
                  When `layoutId` is set, this is the shared-layout target —
                  another `<motion.img>` with the same id (e.g. the splash
                  hero object) will animate INTO this rect on unmount.

                  `initial={false}` (only when layoutId is on) prevents a
                  stray "animate from the other layoutId element" on the
                  initial commit, when the splash and the hero variant
                  mount in the same React tick. The destination animation
                  we *want* (splash → hero on splash exit) still fires,
                  because that's an unmount-driven layout change, not an
                  initial-mount animation. */
              <motion.img
                layoutId={layoutId}
                initial={layoutId ? false : undefined}
                src={config.src}
                alt={alt}
                loading={priority ? "eager" : "lazy"}
                decoding="async"
                draggable={false}
                className="relative h-full w-full select-none object-contain"
                style={{ filter: dropShadow }}
                transition={layoutId ? { layout: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } } : undefined}
              />
            )}
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

/**
 * Renders a single layer inside an animated `<HeroObject3D>` composition.
 *
 * Each layer owns its own scroll parallax (`parallaxFactor`) and shadow
 * magnitude (per-layer `intensity` falls back to the parent's). Static
 * offset/scale/rotation/opacity are applied to a CSS-transformed wrapper
 * around the motion.img so they don't fight the parallax y value.
 *
 * Kept as its own component so hooks (useTransform/useMotionTemplate)
 * have a stable order per layer — React tracks hook order per component
 * instance, so a variable number of layers across renders is fine.
 */
function HeroLayer({
  layer,
  parentIntensity,
  parentConfig,
  scrollYProgress,
  smoothX,
  smoothY,
  isInteracting,
  alt,
  priority,
}: {
  layer: HeroObjectLayer;
  parentIntensity: HeroObjectIntensity | undefined;
  parentConfig: HeroObjectConfig;
  scrollYProgress: MotionValue<number>;
  smoothX: MotionValue<number>;
  smoothY: MotionValue<number>;
  isInteracting: boolean;
  alt: string;
  priority: boolean;
}) {
  const factor = clamp(layer.parallaxFactor ?? 1, 0, 2);
  const parallaxY = useTransform(scrollYProgress, [0, 1], [0, -60 * factor]);

  const intensity = layer.intensity ?? parentIntensity;
  const scales = getIntensityScales(intensity);
  const shadowColor = getShadowColor(parentConfig, intensity);

  const shadowOffsetX = useTransform(
    smoothX,
    [-1, 1],
    [scales.shadowOffsetPx, -scales.shadowOffsetPx],
  );
  const shadowOffsetY = useTransform(
    smoothY,
    [-1, 1],
    [scales.shadowOffsetPx * 0.5, -scales.shadowOffsetPx * 0.5],
  );
  const baseDropY = scales.shadowOffsetPx * 0.6;
  const dropShadow = useMotionTemplate`drop-shadow(${shadowOffsetX}px calc(${shadowOffsetY}px + ${baseDropY}px) ${scales.shadowBlur}px ${shadowColor})`;

  const offsetX = normaliseOffset(layer.offset?.x);
  const offsetY = normaliseOffset(layer.offset?.y);
  const scale = layer.scale ?? 1;
  const rotation = layer.rotation ?? 0;
  const opacity = layer.opacity ?? 1;
  const zIndex = layer.zIndex ?? 0;

  return (
    <div
      className="pointer-events-none absolute inset-0 flex items-center justify-center"
      style={{ zIndex, transform: `translate(${offsetX}, ${offsetY})` }}
    >
      {/* Outer motion.div owns ONLY the parallax y so the MotionValue
          isn't silently dropped when a literal `scale` / `rotate` is
          spread next to it in the same style object — Framer composes
          numeric transform props eagerly and a MotionValue mixed in can
          end up overwritten. Keep the static transforms on the inner
          (non-motion) div. */}
      <motion.div
        className="relative h-full w-full"
        style={{
          y: parallaxY,
          opacity,
          willChange: isInteracting ? "transform" : "auto",
        }}
      >
        <div
          className="relative h-full w-full"
          style={{ transform: `scale(${scale}) rotate(${rotation}deg)` }}
        >
          <motion.img
            src={layer.src}
            alt={alt}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            draggable={false}
            className="h-full w-full select-none object-contain"
            style={{ filter: dropShadow }}
          />
        </div>
      </motion.div>
    </div>
  );
}

/** Static (reduced-motion) version of a composition layer. */
function StaticLayer({ layer, alt }: { layer: HeroObjectLayer; alt: string }) {
  const offsetX = normaliseOffset(layer.offset?.x);
  const offsetY = normaliseOffset(layer.offset?.y);
  const scale = layer.scale ?? 1;
  const rotation = layer.rotation ?? 0;
  const opacity = layer.opacity ?? 1;
  const zIndex = layer.zIndex ?? 0;
  return (
    <div
      className="pointer-events-none absolute inset-0 flex items-center justify-center"
      style={{
        zIndex,
        opacity,
        transform: `translate(${offsetX}, ${offsetY}) scale(${scale}) rotate(${rotation}deg)`,
      }}
    >
      <img
        src={layer.src}
        alt={alt}
        loading="lazy"
        decoding="async"
        draggable={false}
        className="h-full w-full select-none object-contain"
      />
    </div>
  );
}

/** Convert a numeric (px) or string offset into a CSS-ready value. */
function normaliseOffset(raw: number | string | undefined): string {
  if (raw === undefined || raw === null) return "0px";
  if (typeof raw === "number") return `${raw}px`;
  return raw;
}
