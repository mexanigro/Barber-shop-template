import { motion } from "motion/react";
import { siteConfig } from "../../config/site";
import {
  Y_MD, VIEWPORT_ONCE,
  getNicheFlavor, nicheStagger, NICHE_DURATION, NICHE_EASING,
} from "../../lib/motion";

export function Ambience() {
  const data = siteConfig.sections.ambience;
  if (!data) return null;

  const niche = siteConfig.business.type;
  const flavor = getNicheFlavor(niche);
  const stagger = nicheStagger(niche);

  return (
    <section id="ambience" className="relative overflow-hidden py-20 md:py-28">
      <div className="container mx-auto max-w-6xl px-4">
        <motion.div
          initial={{ opacity: 0, y: Y_MD }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: NICHE_DURATION[flavor], ease: NICHE_EASING[flavor] }}
          viewport={VIEWPORT_ONCE}
          className="mb-12 text-center md:mb-16"
        >
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            {data.title}
          </p>
          <h2 className="text-3xl font-bold text-foreground md:text-4xl lg:text-5xl">
            {data.subtitle}
          </h2>
          {data.intro && (
            <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground md:text-lg">
              {data.intro}
            </p>
          )}
        </motion.div>

        <div className="space-y-16">
          {data.sectors.map((sector, i) => (
            <motion.div
              key={sector.label}
              initial={{ opacity: 0, y: Y_MD }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: NICHE_DURATION[flavor], ease: NICHE_EASING[flavor], delay: stagger(i) }}
              viewport={VIEWPORT_ONCE}
              className={`flex flex-col gap-6 md:flex-row md:items-center md:gap-12 ${
                i % 2 === 1 ? "md:flex-row-reverse" : ""
              }`}
            >
              <div className="flex-1 overflow-hidden rounded-2xl">
                <img
                  src={sector.imageSrc}
                  alt={sector.label}
                  className="h-64 w-full object-cover md:h-80"
                  loading="lazy"
                />
              </div>

              <div className="flex-1">
                <h3 className="mb-3 text-xl font-bold text-foreground md:text-2xl">
                  {sector.label}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
                  {sector.body}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
