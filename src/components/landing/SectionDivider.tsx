import { motion } from "motion/react";
import { siteConfig } from "../../config/site";
import { nicheDivider } from "../../lib/motion";
import { cn } from "../../lib/utils";

export function SectionDivider() {
  const niche = siteConfig.business.type;
  const dividerProps = nicheDivider(niche);
  const isTattoo = niche === "tattoo";

  return (
    <div className="flex justify-center py-1">
      <motion.div
        {...dividerProps}
        className={cn(
          "bg-gradient-to-r from-transparent via-accent-light/30 to-transparent",
          isTattoo ? "h-px w-24" : "h-px w-32",
        )}
      />
    </div>
  );
}
