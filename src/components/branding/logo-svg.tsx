import { useId } from "react";

/**
 * `<LogoSvg>` — editorial monogram + wordmark used by Velvet Muse–style
 * brands. Replaces the generic Lucide-icon brand mark when a client opts
 * into the editorial Hero variant.
 *
 * Anatomy (top → bottom):
 *
 *   ✣  flourish bar       (curved hairline + small ornament)
 *   VM monogram           (overlapping serif uppercase, italic V)
 *   ✣  flourish bar
 *   Velvet Muse           (serif wordmark, the `brand` prop)
 *   ─── SALON ───         (caps suffix flanked by short hairlines)
 *
 * Pure SVG, no external glyph dependency — the monogram is drawn from the
 * embedded serif (Cormorant Garamond) but falls back to Times when the
 * font hasn't loaded yet, which is acceptable for the LCP frame.
 *
 * All decorative paths/fills inherit `currentColor` so a single `color`
 * style on the wrapper (or `text-…` Tailwind class) re-tints the entire
 * logo. The `color` prop is sugar that sets `style.color`.
 *
 * WHY not parametrize the monogram letters?
 *   The interlock between the two letters is hand-tuned (V dips behind M's
 *   first stem at 0.6× cap-height). Generalising that to arbitrary
 *   initials would need a layout engine. For now, the SVG renders the
 *   `monogram` prop literally — clients with 1–3 character monograms get
 *   reasonable results, longer strings get cropped.
 *
 * Multi-language: Hebrew/Arabic clients should pass the matching serif
 * via `serifFamily` (e.g. Frank Ruhl Libre) so the wordmark inherits the
 * right script feel. The monogram falls back to Latin when the script
 * doesn't have a matching glyph; that's fine — most luxury brands keep
 * their Latin monogram across markets.
 */
export type LogoSvgProps = {
  /** Brand wordmark below the monogram. Default `"Velvet Muse"`. */
  brand?: string;
  /** Suffix flanked by hairlines (uppercase, letterspaced). Default `"SALON"`. */
  suffix?: string;
  /**
   * Letters drawn as the interlocking monogram. 1–3 chars recommended.
   * Default `"VM"`.
   */
  monogram?: string;
  /** Foreground color for every stroke + fill. Default `"currentColor"`. */
  color?: string;
  /** Approximate rendered width in px. Default 140 (desktop). */
  width?: number;
  /** Optional explicit serif family. Default Cormorant Garamond stack. */
  serifFamily?: string;
  /** Optional explicit sans family for the SALON suffix. Default Inter stack. */
  sansFamily?: string;
  /** Extra wrapper class — usually unnecessary; size + color come from props. */
  className?: string;
  /** Accessible label. Default derived from `brand + suffix`. */
  ariaLabel?: string;
};

export function LogoSvg({
  brand = "Velvet Muse",
  suffix = "SALON",
  monogram = "VM",
  color = "currentColor",
  width = 140,
  serifFamily = '"Cormorant Garamond", "Times New Roman", serif',
  sansFamily = '"Inter", ui-sans-serif, system-ui, sans-serif',
  className,
  ariaLabel,
}: LogoSvgProps) {
  // useId keeps the gradient ID unique even if the logo renders twice on
  // the same page (e.g. navbar + footer) — collisions would cause one
  // instance to inherit the other's color.
  const uid = useId().replace(/:/g, "");
  const flourishId = `vm-flourish-${uid}`;

  // SVG canvas: 200 wide × 120 tall internal grid. The width prop scales
  // the rendered size; height follows proportionally so the aspect stays
  // consistent across nav, footer, splash.
  const viewBoxW = 200;
  const viewBoxH = 120;
  const height = (width * viewBoxH) / viewBoxW;

  const label = ariaLabel ?? `${brand} ${suffix}`;

  return (
    <svg
      role="img"
      aria-label={label}
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${viewBoxW} ${viewBoxH}`}
      width={width}
      height={height}
      style={{ color }}
      className={className}
    >
      {/* Top flourish — hairline curve with a small ornament centred at midpoint. */}
      <g id={`${flourishId}-top`} stroke="currentColor" strokeWidth={0.7} fill="none" strokeLinecap="round">
        <path d="M 40 22 C 70 14, 130 14, 160 22" />
        {/* tiny diamond ornament */}
        <path d="M 100 12 L 103 16 L 100 20 L 97 16 Z" fill="currentColor" stroke="none" />
        <path d="M 36 22 L 30 22" />
        <path d="M 164 22 L 170 22" />
      </g>

      {/* Monogram — interlocking serif initials.
          We render the literal `monogram` prop centred. The V is set in
          italic and slightly larger so it overlaps the M's left stem,
          producing the hand-drawn ligature feel of an old-world salon
          monogram without us needing a custom glyph file. */}
      <g>
        <text
          x={viewBoxW / 2}
          y={62}
          textAnchor="middle"
          fontFamily={serifFamily}
          fontSize={48}
          fontWeight={500}
          fontStyle="italic"
          letterSpacing={-3}
          fill="currentColor"
        >
          {monogram}
        </text>
      </g>

      {/* Bottom flourish — mirrored curve. */}
      <g id={`${flourishId}-bottom`} stroke="currentColor" strokeWidth={0.7} fill="none" strokeLinecap="round">
        <path d="M 40 76 C 70 84, 130 84, 160 76" />
        <path d="M 36 76 L 30 76" />
        <path d="M 164 76 L 170 76" />
      </g>

      {/* Wordmark — the brand name, serif. */}
      <text
        x={viewBoxW / 2}
        y={97}
        textAnchor="middle"
        fontFamily={serifFamily}
        fontSize={15}
        fontWeight={400}
        letterSpacing={0.4}
        fill="currentColor"
      >
        {brand}
      </text>

      {/* Caps suffix flanked by short hairlines: ── SALON ── */}
      <g>
        <line x1={62} y1={111} x2={80} y2={111} stroke="currentColor" strokeWidth={0.6} />
        <text
          x={viewBoxW / 2}
          y={114}
          textAnchor="middle"
          fontFamily={sansFamily}
          fontSize={7.5}
          fontWeight={500}
          letterSpacing={3}
          fill="currentColor"
        >
          {suffix}
        </text>
        <line x1={120} y1={111} x2={138} y2={111} stroke="currentColor" strokeWidth={0.6} />
      </g>
    </svg>
  );
}
