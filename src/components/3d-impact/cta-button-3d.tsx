import {
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type ReactNode,
  useCallback,
  useRef,
} from "react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
import { clamp, getIntensityScales } from "../../lib/3d-impact-utils";
import type { HeroObjectIntensity } from "../../types";

type Variant = "primary" | "secondary" | "outline";

type CommonProps = {
  variant?: Variant;
  intensity?: HeroObjectIntensity;
  children: ReactNode;
  className?: string;
};

/**
 * Motion overrides these event handlers with its own animation-lifecycle
 * callbacks, so we drop them from the native HTML prop set before merging
 * with motion's expected types. Consumers very rarely need these on a CTA.
 */
type MotionConflictingProps =
  | "onAnimationStart"
  | "onAnimationEnd"
  | "onAnimationIteration"
  | "onDrag"
  | "onDragStart"
  | "onDragEnd";

type AsButton = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof CommonProps | MotionConflictingProps> & {
    href?: undefined;
  };

type AsAnchor = CommonProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof CommonProps | MotionConflictingProps> & {
    href: string;
  };

type Props = AsButton | AsAnchor;

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "bg-accent text-white border border-transparent hover:bg-accent-light",
  secondary:
    "bg-card text-foreground border border-border hover:border-accent/30 hover:bg-card",
  outline:
    "bg-transparent text-accent border border-accent hover:bg-accent/10",
};

const BASE_CLASS =
  "inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 " +
  "font-semibold transition-colors duration-200 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 " +
  "focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/**
 * `<CTAButton3D>` — accent-aware CTA with subtle 3D polish.
 *
 *   • Elevation on hover (translateY + amplified shadow)
 *   • Cursor-following sheen (lighter than HeroObject3D's drop-shadow)
 *   • Accent glow at the resting state
 *   • Press micro-bounce
 *
 * Reduced-motion: keeps only the background-color hover transition.
 *
 * Renders `<button>` by default; pass `href` to switch to `<a>`.
 */
export function CTAButton3D(props: Props) {
  const {
    variant = "primary",
    intensity = "medium",
    children,
    className,
    ...rest
  } = props;

  const prefersReduced = useReducedMotion();
  const scales = getIntensityScales(intensity);
  const elRef = useRef<HTMLElement | null>(null);

  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const smoothX = useSpring(pointerX, { stiffness: 200, damping: 22 });
  const smoothY = useSpring(pointerY, { stiffness: 200, damping: 22 });

  const sxPx = useTransform(
    smoothX,
    [-1, 1],
    [-scales.shadowOffsetPx * 0.4, scales.shadowOffsetPx * 0.4],
  );
  const syPx = useTransform(
    smoothY,
    [-1, 1],
    [-scales.shadowOffsetPx * 0.4, scales.shadowOffsetPx * 0.4],
  );

  const boxShadow = useMotionTemplate`0 ${scales.shadowOffsetPx}px ${scales.shadowBlur}px -${Math.round(
    scales.shadowBlur / 3,
  )}px var(--brand-accent, rgba(0,0,0,0.35)), ${sxPx}px ${syPx}px ${scales.shadowBlur * 1.2}px var(--brand-accent, rgba(0,0,0,0.18))`;

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (prefersReduced) return;
      const el = elRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const nx = clamp(((e.clientX - rect.left) / rect.width) * 2 - 1, -1, 1);
      const ny = clamp(((e.clientY - rect.top) / rect.height) * 2 - 1, -1, 1);
      pointerX.set(nx);
      pointerY.set(ny);
    },
    [pointerX, pointerY, prefersReduced],
  );

  const handlePointerLeave = useCallback(() => {
    pointerX.set(0);
    pointerY.set(0);
  }, [pointerX, pointerY]);

  const composedClass = [BASE_CLASS, VARIANT_CLASSES[variant], className ?? ""].join(" ");

  // ── Reduced motion: plain element with class-only hover ──
  if (prefersReduced) {
    if ("href" in rest && rest.href !== undefined) {
      const { href, ...anchorRest } = rest as Omit<
        AnchorHTMLAttributes<HTMLAnchorElement>,
        MotionConflictingProps
      >;
      return (
        <a
          ref={(node) => {
            elRef.current = node;
          }}
          href={href}
          className={composedClass}
          {...anchorRest}
        >
          {children}
        </a>
      );
    }
    return (
      <button
        ref={(node) => {
          elRef.current = node;
        }}
        type="button"
        className={composedClass}
        {...(rest as Omit<ButtonHTMLAttributes<HTMLButtonElement>, MotionConflictingProps>)}
      >
        {children}
      </button>
    );
  }

  // ── Full motion path ──
  const motionProps = {
    onPointerMove: handlePointerMove,
    onPointerLeave: handlePointerLeave,
    whileHover: { y: -2 },
    whileTap: { scale: 0.97 },
    transition: {
      duration: 0.18,
      ease: [0.23, 1, 0.32, 1] as [number, number, number, number],
    },
    style: { boxShadow },
    className: composedClass,
  };

  if ("href" in rest && rest.href !== undefined) {
    const { href, ...anchorRest } = rest as Omit<
      AnchorHTMLAttributes<HTMLAnchorElement>,
      MotionConflictingProps
    >;
    return (
      <motion.a
        ref={(node: HTMLAnchorElement | null) => {
          elRef.current = node;
        }}
        href={href}
        {...anchorRest}
        {...motionProps}
      >
        {children}
      </motion.a>
    );
  }

  return (
    <motion.button
      ref={(node: HTMLButtonElement | null) => {
        elRef.current = node;
      }}
      type="button"
      {...(rest as Omit<ButtonHTMLAttributes<HTMLButtonElement>, MotionConflictingProps>)}
      {...motionProps}
    >
      {children}
    </motion.button>
  );
}
