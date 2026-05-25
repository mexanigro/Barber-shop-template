import { motion } from "motion/react";
import { handleImgError } from "../../lib/utils";
import { siteConfig } from "../../config/site";
import {
  Y_MD, VIEWPORT_ONCE,
  getNicheFlavor, nicheStagger, NICHE_DURATION, NICHE_EASING,
} from "../../lib/motion";

export function Ambience() {
  const data = siteConfig.sections.ambience;
  if (!data || !data.sectors) return null;

  const niche = siteConfig.business.type;
  const flavor = getNicheFlavor(niche);
  const stagger = nicheStagger(niche);
  const isCafeteria = niche === "cafeteria";

  /* ── Cafeteria: immersive full-bleed images with overlaid text ────────── */
  if (isCafeteria) {
    return (
      <section id="ambience" className="relative overflow-hidden py-24 md:py-36">
        <div className="mx-auto max-w-6xl px-6">
          <motion.div
            initial={{ opacity: 0, y: Y_MD }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: NICHE_DURATION[flavor], ease: NICHE_EASING[flavor] }}
            viewport={VIEWPORT_ONCE}
            className="mb-20 text-center"
          >
            <p className="mb-4 text-xs font-medium uppercase tracking-[0.3em] text-accent-light">
              {data.title}
            </p>
            <h2 className="font-serif text-4xl font-normal tracking-wide text-foreground md:text-5xl">
              {data.subtitle}
            </h2>
            {data.intro && (
              <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted-foreground">
                {data.intro}
              </p>
            )}
          </motion.div>

          <div className="space-y-6">
            {data.sectors.map((sector, i) => (
              <motion.div
                key={sector.label}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: NICHE_DURATION[flavor] * 1.2, ease: NICHE_EASING[flavor], delay: stagger(i) }}
                viewport={VIEWPORT_ONCE}
                className="group relative overflow-hidden rounded-2xl"
              >
                {/* Full-bleed image */}
                <div className="relative h-72 overflow-hidden bg-muted md:h-96">
                  <img
                    src={sector.imageSrc}
                    alt={sector.label}
                    className="h-full w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.04]"
                    loading="lazy"
                    onError={handleImgError}
                  />
                  {/* Warm mocha gradient from bottom */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#2C1810]/80 via-[#2C1810]/20 to-transparent" />
                </div>

                {/* Text overlaid at bottom */}
                <div className="absolute inset-x-0 bottom-0 p-6 md:p-8">
                  <h3 className="mb-2 font-serif text-2xl font-normal text-[#F5E6D3] md:text-3xl">
                    {sector.label}
                  </h3>
                  <p className="max-w-lg text-sm leading-relaxed text-[#F5E6D3]/70 md:text-base">
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

  /* ── Default: alternating image/text ──────────────────────────────────── */
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
              <div className="flex-1 overflow-hidden rounded-2xl bg-muted">
                <img
                  src={sector.imageSrc}
                  alt={sector.label}
                  className="h-64 w-full object-cover md:h-80"
                  loading="lazy"
                  onError={handleImgError}
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
