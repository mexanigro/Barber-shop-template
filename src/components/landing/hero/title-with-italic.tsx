import { Fragment } from "react";
import { motion, useReducedMotion } from "motion/react";

/**
 * `<TitleWithItalic>` — editorial title where one (or more) words slip
 * into italic + accent color, with a hand-drawn underline that "writes
 * itself" the first time the title enters the viewport.
 *
 * Title is described as an array of `parts`:
 *
 *   [
 *     { text: "Hair that feels like " },
 *     { text: "you", italic: true, color: "#8b3a4b", underline: true },
 *     { text: "." },
 *   ]
 *
 * Words within each part fade up with a 60 ms stagger (word-by-word
 * reveal). On reduced-motion the title appears instantly without the
 * stagger or the SVG handwriting effect.
 *
 * The underline is drawn as an absolutely-positioned SVG below the
 * italic word — we use `whileInView` + `pathLength` to animate the
 * stroke. The underline path is a gentle curve, not a straight line,
 * so it reads as drawn-by-hand rather than CSS-decoration.
 */

export type TitlePart = {
  text: string;
  italic?: boolean;
  color?: string;
  underline?: boolean;
};

type Props = {
  parts: TitlePart[];
  /** Maximum font-size in px at the largest breakpoint. Default 96. */
  maxFontSize?: number;
  /** Minimum font-size in px at the smallest breakpoint. Default 40. */
  minFontSize?: number;
  className?: string;
  /** Used as a unique key for the SVG underline id (multiple titles per page). */
  id?: string;
};

export function TitleWithItalic({
  parts,
  maxFontSize = 96,
  minFontSize = 40,
  className,
  id = "vm-title",
}: Props) {
  const prefersReduced = useReducedMotion();

  // We expose stagger as a tunable on the wrapper variants so the
  // children's `transition.delay` is computed from their index without
  // each Fragment recomputing it. Word stagger fixed at 60 ms.
  let globalWordIndex = 0;

  return (
    <h1
      className={[
        "font-serif font-normal text-[#1b0a13] leading-[1.04] tracking-[-0.01em]",
        className ?? "",
      ].join(" ")}
      style={{
        fontSize: `clamp(${minFontSize}px, 6.2vw, ${maxFontSize}px)`,
        fontFamily: "var(--font-serif-hero)",
      }}
    >
      {parts.map((part, partIdx) => {
        // Split each part on whitespace so we can stagger word-by-word.
        // Preserve trailing/leading whitespace by keeping the splitter
        // tokens around — splitting on `(\s+)` gives us alternating
        // words + whitespace tokens.
        const tokens = part.text.split(/(\s+)/).filter((t) => t.length > 0);
        return (
          <Fragment key={`part-${partIdx}`}>
            {tokens.map((token, ti) => {
              if (/^\s+$/.test(token)) {
                return <Fragment key={`ws-${partIdx}-${ti}`}>{token}</Fragment>;
              }
              const wordIdx = globalWordIndex++;
              return (
                <Word
                  key={`w-${partIdx}-${ti}`}
                  text={token}
                  italic={part.italic}
                  color={part.color}
                  underline={part.underline}
                  delay={prefersReduced ? 0 : 0.15 + wordIdx * 0.06}
                  prefersReduced={!!prefersReduced}
                  uniqueId={`${id}-${partIdx}-${ti}`}
                />
              );
            })}
          </Fragment>
        );
      })}
    </h1>
  );
}

function Word({
  text,
  italic,
  color,
  underline,
  delay,
  prefersReduced,
  uniqueId,
}: {
  text: string;
  italic?: boolean;
  color?: string;
  underline?: boolean;
  delay: number;
  prefersReduced: boolean;
  uniqueId: string;
}) {
  return (
    <motion.span
      initial={prefersReduced ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      className="relative inline-block"
      style={{
        fontStyle: italic ? "italic" : undefined,
        color,
        // The italic word uses the dedicated italic family CSS variable
        // when one is set — for scripts with a separate italic face this
        // makes the highlight visibly different from the regular weight.
        fontFamily: italic ? "var(--font-italic-hero, inherit)" : undefined,
      }}
    >
      {text}

      {/* Hand-drawn underline that "writes itself" when the word enters
          viewport. The SVG is sized relative to the parent span (100%
          width, fixed 14 px tall) and offsets below the baseline. */}
      {underline && (
        <svg
          aria-hidden
          viewBox="0 0 200 14"
          preserveAspectRatio="none"
          className="pointer-events-none absolute left-0 right-0 -bottom-2 h-3 w-full"
          style={{ overflow: "visible" }}
        >
          <motion.path
            id={`${uniqueId}-underline`}
            d="M 4 8 C 40 2, 120 12, 196 6"
            fill="none"
            stroke={color ?? "currentColor"}
            strokeWidth={2.2}
            strokeLinecap="round"
            initial={prefersReduced ? false : { pathLength: 0, opacity: 0 }}
            whileInView={{ pathLength: 1, opacity: 1 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{
              duration: 1.05,
              delay: delay + 0.35,
              ease: [0.22, 1, 0.36, 1],
            }}
          />
        </svg>
      )}
    </motion.span>
  );
}
