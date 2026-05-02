import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import { siteConfig } from "../../config/site";
import { localeConfig } from "../../config/locale";
import { Y_SM, VIEWPORT_ONCE } from "../../lib/motion";

/**
 * Minimal gallery teaser for the estetica niche — replaces the full
 * image-grid Gallery on the landing page. Links to the dedicated /gallery
 * route for the complete Before & After experience.
 */
export function GalleryTeaser({ onViewFull }: { onViewFull: () => void }) {
  const { gallery: sectionConfig } = siteConfig.sections;
  const isRTL = localeConfig.lang === "he";

  return (
    <section className="bg-muted/30 px-6 py-28 transition-colors duration-300">
      <div className="mx-auto max-w-2xl text-center">
        <motion.h2
          initial={{ opacity: 0, y: Y_SM }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEWPORT_ONCE}
          className="font-serif text-3xl font-normal tracking-wide text-foreground md:text-4xl"
        >
          {sectionConfig.title}
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: Y_SM }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEWPORT_ONCE}
          transition={{ delay: 0.1 }}
          className="mt-4 text-sm text-muted-foreground"
        >
          {sectionConfig.subtitle}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: Y_SM }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEWPORT_ONCE}
          transition={{ delay: 0.2 }}
          className="mt-8"
        >
          <button
            type="button"
            onClick={onViewFull}
            className="group inline-flex items-center gap-2 border border-border px-6 py-3 text-sm font-medium text-foreground transition-all duration-300 hover:border-accent/40 hover:text-accent"
          >
            <span>{isRTL ? "לגלריית התוצאות" : "View Results Gallery"}</span>
            <ArrowRight
              size={14}
              className="transition-transform duration-300 group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1"
            />
          </button>
        </motion.div>
      </div>
    </section>
  );
}
