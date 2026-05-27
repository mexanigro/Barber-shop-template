import { forwardRef, type ReactNode, type CSSProperties } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { usePaperSpring, type PaperSpringIntensity } from "../../hooks/use-paper-spring";

type Props = {
  children: ReactNode;
  /**
   * Per-card stagger delay in seconds. Pass `index * 0.08` from a grid
   * to get an 80 ms cascade between siblings. Ignored under
   * `prefers-reduced-motion` (everything resolves to its rest state in
   * a single short tween).
   */
  delay?: number;
  /** Paper-spring intensity — see `usePaperSpring`. Default `"medium"`. */
  intensity?: PaperSpringIntensity;
  /**
   * When set, the card crossfades on `key` changes via `AnimatePresence`
   * with `mode="popLayout"`. Pass a stable identifier (e.g. the active
   * filter tab) so swapping the visible items replays the paper drop.
   * Leave undefined to disable swap-animation (default).
   */
  swapKey?: string;
  /** Click handler; if set the card gets `role="button"` and keyboard support. */
  onClick?: () => void;
  /** Optional aria-label when the card is interactive but visually unlabelled. */
  ariaLabel?: string;
  className?: string;
  style?: CSSProperties;
  /**
   * Disable the `whileHover` lift. Useful for non-interactive cards
   * inside a stack carousel where hover would feel wrong.
   */
  disableHover?: boolean;
};

/**
 * `<PaperCard>` — generic wrapper that gives a child element the
 * "paper settling into place" motion treatment.
 *
 *   - Entry: `whileInView` fade + lift, transitioned via `usePaperSpring`.
 *   - Hover: subtle `y` translate (only when interactive AND motion is on).
 *   - Tap:   tiny scale press (motion only).
 *   - Reduced-motion: collapses to a quick opacity tween.
 *
 * The card is render-agnostic — it brings the motion, you bring the
 * content + visual styling. Pair with whatever surface (card grid,
 * portrait bento, etc.) needs the paper feel.
 */
export const PaperCard = forwardRef<HTMLDivElement, Props>(function PaperCard(
  {
    children,
    delay = 0,
    intensity = "medium",
    swapKey,
    onClick,
    ariaLabel,
    className,
    style,
    disableHover = false,
  },
  ref,
) {
  const spring = usePaperSpring(intensity);
  const prefersReduced = useReducedMotion();
  const interactive = Boolean(onClick);

  const initial = prefersReduced ? { opacity: 0 } : { opacity: 0, y: 28, scale: 0.96 };
  const animateInView = prefersReduced
    ? { opacity: 1 }
    : { opacity: 1, y: 0, scale: 1 };

  const interactiveProps =
    interactive && !prefersReduced && !disableHover
      ? { whileHover: { y: -3 }, whileTap: { scale: 0.985 } }
      : {};

  const inner = (
    <motion.div
      ref={ref}
      initial={initial}
      whileInView={animateInView}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ ...spring, delay }}
      {...interactiveProps}
      onClick={onClick}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={interactive ? ariaLabel : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );

  // When the caller wants tab-swap behaviour, wrap in AnimatePresence so
  // the exit animation runs. `popLayout` keeps siblings in place while
  // the leaving card flies out.
  if (swapKey !== undefined) {
    return (
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={swapKey}
          initial={initial}
          animate={animateInView}
          exit={prefersReduced ? { opacity: 0 } : { opacity: 0, y: -18, scale: 0.95 }}
          transition={{ ...spring, delay }}
          {...interactiveProps}
          onClick={onClick}
          role={interactive ? "button" : undefined}
          tabIndex={interactive ? 0 : undefined}
          aria-label={interactive ? ariaLabel : undefined}
          onKeyDown={
            interactive
              ? (e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onClick?.();
                  }
                }
              : undefined
          }
          className={className}
          style={style}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    );
  }

  return inner;
});
