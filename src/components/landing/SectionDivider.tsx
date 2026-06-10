import { motion } from "motion/react";
import { siteConfig } from "../../config/site";
import { nicheDivider } from "../../lib/motion";
import { cn } from "../../lib/utils";

/**
 * Divider between landing sections. `global.dividerStyle` (Firestore) selects
 * the rendering: "none" removes it from the DOM, "line" is a solid hairline,
 * "gradient" is the legacy fading line (default), "ornament" adds a diamond
 * glyph between two hairlines.
 */
export function SectionDivider() {
  const niche = siteConfig.business.type;
  const style = siteConfig.global?.dividerStyle ?? "gradient";
  if (style === "none") return null;

  const dividerProps = nicheDivider(niche);
  const isTattoo = niche === "tattoo";
  const width = isTattoo ? "w-24" : "w-32";

  if (style === "ornament") {
    return (
      <div className="hidden items-center justify-center gap-3 py-1 lg:flex" aria-hidden="true">
        <motion.div {...dividerProps} className={cn("h-px bg-accent-light/30", width)} />
        <motion.span
          {...dividerProps}
          className="block h-1.5 w-1.5 rotate-45 bg-accent-light/50"
        />
        <motion.div {...dividerProps} className={cn("h-px bg-accent-light/30", width)} />
      </div>
    );
  }

  return (
    <div className="hidden justify-center py-1 lg:flex" aria-hidden="true">
      <motion.div
        {...dividerProps}
        className={cn(
          style === "line"
            ? "bg-accent-light/30"
            : "bg-gradient-to-r from-transparent via-accent-light/30 to-transparent",
          "h-px",
          width,
        )}
      />
    </div>
  );
}
