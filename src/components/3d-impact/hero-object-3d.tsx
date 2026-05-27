import {
  type ReactNode,
  useCallback,
  useRef,
  useState,
} from "react";
import {
  motion,
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
 */
export function HeroObject3D({
  slotName = "primary",
  fallback = null,
  className,
  priority = false,
  size = "lg",
  alt = "",
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

  // Reduced-motion path: static image with a gentle opacity fade-in.
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

      {/* Layer 1 — scroll parallax (transform-only). */}
      <motion.div
        className="relative z-10 h-full w-full"
        style={{ y: parallaxY }}
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
            {/* Layer 4 — the image itself; drop-shadow follows the alpha. */}
            <motion.img
              src={config.src}
              alt={alt}
              loading={priority ? "eager" : "lazy"}
              decoding="async"
              draggable={false}
              className="relative h-full w-full select-none object-contain"
              style={{ filter: dropShadow }}
            />
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
