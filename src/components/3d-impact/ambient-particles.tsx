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
  };
  return matrix[type][density];
}

function resolveColor(color: string | undefined): string {
  if (!color || color === "auto") return "var(--brand-accent, currentColor)";
  return color;
}

/**
 * Decorative particle layer rendered as inline SVG.
 *
 * - `pointer-events: none` so it never blocks interaction.
 * - Pure SVG + CSS keyframes (no canvas, no rAF) to stay cheap.
 * - Returns null when `prefers-reduced-motion` is set or `type === "none"`.
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
