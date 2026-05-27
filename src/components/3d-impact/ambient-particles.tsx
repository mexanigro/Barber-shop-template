import { useMemo } from "react";
import { useReducedMotion } from "motion/react";
import type { AmbientParticleType } from "../../types";

type Density = "low" | "medium" | "high";

type Props = {
  type: AmbientParticleType;
  density?: Density;
  /** CSS color string or `"auto"` to inherit the theme accent. Default "auto". */
  color?: string;
  className?: string;
};

/** Tiny seeded PRNG so particle layouts are stable across re-renders. */
function rand(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function countFor(type: AmbientParticleType, density: Density): number {
  if (type === "none") return 0;
  const matrix: Record<Exclude<AmbientParticleType, "none">, Record<Density, number>> = {
    bubbles: { low: 6, medium: 9, high: 12 },
    smoke: { low: 3, medium: 4, high: 5 },
    sparkles: { low: 8, medium: 12, high: 16 },
    pearls: { low: 5, medium: 8, high: 11 },
  };
  return matrix[type][density];
}

function resolveColor(color: string | undefined): string {
  if (!color || color === "auto") return "var(--brand-accent, currentColor)";
  return color;
}

/** SVG defs for the pearl gradient — referenced via fill="url(#…)". */
const PEARL_GRADIENT_ID = "impact3d-pearl-gradient";

/**
 * Decorative particle layer rendered as inline SVG.
 *
 * - `pointer-events: none` so it never blocks interaction.
 * - Pure SVG + CSS keyframes (no canvas, no rAF) to stay cheap.
 * - Returns null when `prefers-reduced-motion` is set or `type === "none"`.
 *
 * Pearls render with a soft radial-gradient highlight (one defs block
 * per mount) so each particle reads as a pearl bead rather than a flat
 * dot. No external asset required; if the tenant wants a custom pearl
 * PNG they can swap to a layer-based composition instead.
 */
export function AmbientParticles({
  type,
  density = "medium",
  color,
  className,
}: Props) {
  const prefersReduced = useReducedMotion();

  const particles = useMemo(() => {
    const count = countFor(type, density);
    if (count === 0) return [];
    const next = rand(type.charCodeAt(0) * 53 + count * 7);
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: next() * 100,
      y: next() * 100,
      sz: next(),
      delay: next() * -8,
      duration: 4 + next() * 6,
      opacity: 0.2 + next() * 0.3,
    }));
  }, [type, density]);

  if (type === "none" || prefersReduced || particles.length === 0) return null;

  const fill = resolveColor(color);

  return (
    <div
      aria-hidden="true"
      className={
        "pointer-events-none absolute inset-0 overflow-hidden " + (className ?? "")
      }
    >
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {type === "pearls" && (
          <defs>
            {/*
              Off-centre highlight at (35%, 35%) so each pearl reads as a
              spherical bead with a top-left light source. `stop-color`
              "white" gives the highlight; the outer stop fades to the
              resolved fill so it still inherits the theme accent tint.
            */}
            <radialGradient id={PEARL_GRADIENT_ID} cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="white" stopOpacity="0.95" />
              <stop offset="55%" stopColor={fill} stopOpacity="0.55" />
              <stop offset="100%" stopColor={fill} stopOpacity="0.85" />
            </radialGradient>
          </defs>
        )}
        {particles.map((p) => {
          if (type === "bubbles") {
            const r = 0.8 + p.sz * 1.6;
            return (
              <circle
                key={p.id}
                cx={p.x}
                cy={p.y}
                r={r}
                fill={fill}
                opacity={p.opacity}
                style={{
                  animation: `impact3d-bubble ${p.duration}s ease-in-out ${p.delay}s infinite`,
                  transformOrigin: `${p.x}px ${p.y}px`,
                  transformBox: "fill-box",
                }}
              />
            );
          }
          if (type === "smoke") {
            const r = 6 + p.sz * 10;
            return (
              <circle
                key={p.id}
                cx={p.x}
                cy={p.y}
                r={r}
                fill={fill}
                opacity={p.opacity * 0.35}
                style={{
                  animation: `impact3d-smoke ${p.duration * 1.6}s ease-in-out ${p.delay}s infinite`,
                  filter: "blur(2px)",
                  transformOrigin: `${p.x}px ${p.y}px`,
                  transformBox: "fill-box",
                }}
              />
            );
          }
          if (type === "pearls") {
            // Larger than bubbles, smaller than smoke. Slight size jitter
            // so the cluster doesn't feel mechanical.
            const r = 1.2 + p.sz * 1.8;
            return (
              <circle
                key={p.id}
                cx={p.x}
                cy={p.y}
                r={r}
                fill={`url(#${PEARL_GRADIENT_ID})`}
                opacity={p.opacity + 0.2}
                style={{
                  animation: `impact3d-pearl ${p.duration * 1.4}s ease-in-out ${p.delay}s infinite`,
                  transformOrigin: `${p.x}px ${p.y}px`,
                  transformBox: "fill-box",
                  filter: "drop-shadow(0 1px 1.5px rgba(0,0,0,0.18))",
                }}
              />
            );
          }
          // sparkles
          const r = 0.4 + p.sz * 0.8;
          return (
            <circle
              key={p.id}
              cx={p.x}
              cy={p.y}
              r={r}
              fill={fill}
              opacity={p.opacity}
              style={{
                animation: `impact3d-sparkle ${p.duration * 0.6}s ease-in-out ${p.delay}s infinite`,
                transformOrigin: `${p.x}px ${p.y}px`,
                transformBox: "fill-box",
              }}
            />
          );
        })}
      </svg>
    </div>
  );
}
