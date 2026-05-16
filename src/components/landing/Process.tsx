import { motion } from "motion/react";
import { siteConfig } from "../../config/site";
import {
  Y_MD, VIEWPORT_ONCE,
  getNicheFlavor, nicheStagger, NICHE_DURATION, NICHE_EASING,
} from "../../lib/motion";

export function Process() {
  const data = siteConfig.sections.process;
  if (!data) return null;

  const niche = siteConfig.business.type;
  const flavor = getNicheFlavor(niche);
  const stagger = nicheStagger(niche);

  return (
    <section id="process" className="relative overflow-hidden py-20 md:py-28">
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

        <div className="relative">
          <div className="absolute start-6 top-0 hidden h-full w-px bg-gradient-to-b from-accent/40 via-accent/20 to-transparent md:start-1/2 md:block" />

          <div className="space-y-8 md:space-y-12">
            {data.steps.map((step, i) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: Y_MD }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: NICHE_DURATION[flavor], ease: NICHE_EASING[flavor], delay: stagger(i) }}
                viewport={VIEWPORT_ONCE}
                className={`relative flex flex-col gap-4 md:flex-row md:items-center md:gap-8 ${
                  i % 2 === 1 ? "md:flex-row-reverse" : ""
                }`}
              >
                <div className="absolute start-0 top-0 flex h-12 w-12 items-center justify-center rounded-full border-2 border-accent bg-background font-mono text-sm font-bold text-accent md:relative md:start-auto md:mx-auto">
                  {step.number}
                </div>

                <div className={`flex-1 rounded-2xl border border-border/50 bg-card/50 p-6 backdrop-blur-sm ms-16 md:ms-0 ${
                  i % 2 === 1 ? "md:text-end" : ""
                }`}>
                  <h3 className="mb-2 text-lg font-bold text-foreground">
                    {step.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                </div>

                <div className="hidden flex-1 md:block" />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
