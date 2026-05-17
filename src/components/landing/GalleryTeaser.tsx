import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import { handleImgError } from "../../lib/utils";
import { siteConfig } from "../../config/site";
import { localeConfig } from "../../config/locale";
import { Y_SM, VIEWPORT_ONCE, nicheScaleIn, getNicheFlavor, NICHE_DURATION, NICHE_EASING } from "../../lib/motion";

/**
 * Minimal gallery teaser for the estetica niche — replaces the full
 * image-grid Gallery on the landing page. Links to the dedicated /gallery
 * route for the complete Before & After experience.
 */
export function GalleryTeaser({ onViewFull }: { onViewFull: () => void }) {
  const { gallery: sectionConfig } = siteConfig.sections;
  const isRTL = localeConfig.lang === "he";
  const niche = siteConfig.business.type;
  const flavor = getNicheFlavor(niche);
  const images = siteConfig.gallery?.slice(0, 4) ?? [];

  return (
    <section className="bg-muted/30 px-6 py-28 transition-colors duration-300">
      <div className="mx-auto max-w-3xl text-center">
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

        {images.length > 0 && (
          <div className="mx-auto mt-10 grid max-w-2xl grid-cols-2 gap-3">
            {images.map((src, i) => (
              <motion.div
                key={i}
                {...nicheScaleIn(niche)}
                transition={{ delay: i * 0.08, duration: NICHE_DURATION[flavor], ease: NICHE_EASING[flavor] }}
                className="aspect-[4/3] overflow-hidden rounded-lg bg-muted"
              >
                <img
                  src={src}
                  alt={`${sectionConfig.title} ${i + 1}`}
                  className="h-full w-full object-cover transition-transform duration-500 hover:scale-[1.03]"
                  loading="lazy"
                  onError={handleImgError}
                />
              </motion.div>
            ))}
          </div>
        )}

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
            className="group inline-flex items-center gap-2 border border-border px-6 py-3 text-sm font-medium text-foreground transition-all duration-300 hover:border-accent/40 hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
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
