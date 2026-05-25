import { motion } from "motion/react";
import { siteConfig } from "../../config/site";
import {
  Y_MD, VIEWPORT_ONCE,
  getNicheFlavor, nicheStagger, NICHE_DURATION, NICHE_EASING,
  sectionTitleContainerVariants, textWordVariants, EASE_OUT_STRONG,
  NICHE_CARD_HOVER,
} from "../../lib/motion";

export function Philosophy() {
  const data = siteConfig.sections.philosophy;
  if (!data || !data.pillars) return null;

  const niche = siteConfig.business.type;
  const flavor = getNicheFlavor(niche);
  const stagger = nicheStagger(niche);
  const isCafeteria = niche === "cafeteria";

  /* ── Cafeteria: warm editorial layout with large serif type ──────────── */
  if (isCafeteria) {
    return (
      <section id="philosophy" className="relative overflow-hidden py-24 md:py-36">
        {/* Subtle warm radial glow */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,var(--brand-accent)/0.06,transparent_60%)]" aria-hidden />

        <div className="container mx-auto max-w-5xl px-6">
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
            <motion.h2
              variants={sectionTitleContainerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={VIEWPORT_ONCE}
              className="font-serif text-4xl font-normal tracking-wide text-foreground md:text-5xl lg:text-6xl"
            >
              {data.subtitle.split(" ").map((word: string, i: number) => (
                <motion.span key={i} variants={textWordVariants(niche)} className="inline-block">
                  {word}&nbsp;
                </motion.span>
              ))}
            </motion.h2>
            {data.intro && (
              <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
                {data.intro}
              </p>
            )}
          </motion.div>

          {/* Pillars: numbered with a thin rule between */}
          <div className="space-y-0 divide-y divide-border/40">
            {data.pillars.map((pillar, i) => (
              <motion.div
                key={pillar.number}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: NICHE_DURATION[flavor] * 1.2, ease: NICHE_EASING[flavor], delay: stagger(i) }}
                viewport={VIEWPORT_ONCE}
                className="group grid grid-cols-[auto_1fr] gap-8 py-10 first:pt-0 last:pb-0 md:gap-12"
              >
                <span className="font-serif text-5xl font-light text-accent/25 transition-colors duration-500 group-hover:text-accent/50 md:text-6xl">
                  {pillar.number}
                </span>
                <div className="self-center">
                  <h3 className="mb-2 font-serif text-xl font-normal text-foreground md:text-2xl">
                    {pillar.title}
                  </h3>
                  <p className="max-w-lg text-sm leading-relaxed text-muted-foreground">
                    {pillar.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  /* ── Default layout ───────────────────────────────────────────────────── */
  return (
    <section id="philosophy" className="relative overflow-hidden py-20 md:py-28">
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
          <motion.h2
            variants={sectionTitleContainerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={VIEWPORT_ONCE}
            className="text-3xl font-bold text-foreground md:text-4xl lg:text-5xl"
          >
            {data.subtitle.split(" ").map((word: string, i: number) => (
              <motion.span key={i} variants={textWordVariants(niche)} className="inline-block">
                {word}&nbsp;
              </motion.span>
            ))}
          </motion.h2>
          {data.intro && (
            <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground md:text-lg">
              {data.intro}
            </p>
          )}
        </motion.div>

        <div className="grid gap-8 md:grid-cols-3">
          {data.pillars.map((pillar, i) => (
            <motion.div
              key={pillar.number}
              initial={{ opacity: 0, scale: 0.94 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: NICHE_DURATION[flavor] * 1.1, ease: EASE_OUT_STRONG, delay: stagger(i) }}
              viewport={VIEWPORT_ONCE}
              whileHover={{
                y: NICHE_CARD_HOVER[flavor].y,
                boxShadow: NICHE_CARD_HOVER[flavor].shadow,
              }}
              className="group relative rounded-2xl border border-border/50 bg-card/50 p-8 backdrop-blur-sm transition-colors hover:border-accent/30"
            >
              <span className="mb-4 block font-mono text-4xl font-bold text-accent/20">
                {pillar.number}
              </span>
              <h3 className="mb-3 text-xl font-bold text-foreground">
                {pillar.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {pillar.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
