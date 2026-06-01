import { motion } from "motion/react";
import { siteConfig } from "../../config/site";
import { cn } from "../../lib/utils";
import {
  Y_MD, X_IN, VIEWPORT_ONCE,
  getNicheFlavor, nicheStagger, NICHE_DURATION, NICHE_EASING,
  sectionTitleContainerVariants, textWordVariants, EASE_OUT_STRONG,
} from "../../lib/motion";

export function Process() {
  const data = siteConfig.sections.process;
  if (!data || !data.steps) return null;

  const niche = siteConfig.business.type;
  const flavor = getNicheFlavor(niche);
  const stagger = nicheStagger(niche);
  const isCafeteria = niche === "cafeteria";

  /* ── Cafeteria: horizontal steps with a connecting line ──────────────── */
  if (isCafeteria) {
    return (
      <section id="process" className="relative overflow-hidden bg-card/40 py-20 sm:py-24 md:py-36">
        <div className="container mx-auto max-w-6xl px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: Y_MD }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: NICHE_DURATION[flavor], ease: NICHE_EASING[flavor] }}
            viewport={VIEWPORT_ONCE}
            className="mb-14 text-center sm:mb-20"
          >
            <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.3em] text-accent-light sm:mb-4 sm:text-xs">
              {data.title}
            </p>
            <h2 className="font-serif text-3xl font-normal tracking-wide text-foreground sm:text-4xl md:text-5xl">
              {data.subtitle}
            </h2>
            {data.intro && (
              <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-muted-foreground sm:mt-6 md:text-base">
                {data.intro}
              </p>
            )}
          </motion.div>

          {/* Steps — 4-col grid with connecting line */}
          <div className="relative">
            {/* Vertical connector (mobile/tablet) */}
            <motion.div
              initial={{ scaleY: 0, opacity: 0 }}
              whileInView={{ scaleY: 1, opacity: 1 }}
              viewport={VIEWPORT_ONCE}
              transition={{ duration: NICHE_DURATION[flavor] * 2.5, ease: EASE_OUT_STRONG }}
              style={{ originY: 0 }}
              className="absolute start-6 top-0 h-full w-px bg-gradient-to-b from-accent/30 via-accent/20 to-transparent md:hidden"
            />

            {/* Horizontal connector (desktop) */}
            <motion.div
              initial={{ scaleX: 0, opacity: 0 }}
              whileInView={{ scaleX: 1, opacity: 1 }}
              viewport={VIEWPORT_ONCE}
              transition={{ duration: NICHE_DURATION[flavor] * 2.5, ease: EASE_OUT_STRONG }}
              style={{ originX: 0 }}
              className="absolute left-[12.5%] right-[12.5%] top-6 hidden h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent md:block"
            />

            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 sm:gap-10 md:grid-cols-4 md:gap-8">
              {data.steps.map((step, i) => (
                <motion.div
                  key={step.number}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: NICHE_DURATION[flavor], ease: NICHE_EASING[flavor], delay: stagger(i) + i * 0.08 }}
                  viewport={VIEWPORT_ONCE}
                  className="group relative text-center md:text-center"
                >
                  {/* Mobile: left-aligned layout with connector */}
                  <div className="flex items-start gap-5 text-start md:block md:text-center">
                    {/* Step number circle */}
                    <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-accent/30 bg-background font-serif text-lg font-normal text-accent transition-colors duration-500 group-hover:border-accent group-hover:bg-accent/10 md:mx-auto md:mb-6">
                      {step.number}
                    </div>

                    <div className="flex-1 pb-1 md:pb-0">
                      <h3 className="mb-1.5 font-serif text-base font-normal text-foreground sm:mb-2 sm:text-lg">
                        {step.title}
                      </h3>
                      <p className="text-[13px] leading-relaxed text-muted-foreground sm:text-sm">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  /* ── Default: timeline layout ─────────────────────────────────────────── */
  const isRemodelaciones = niche === "remodelaciones";

  return (
    <section id="process" className="relative overflow-hidden py-16 sm:py-20 md:py-28">
      <div className="container mx-auto max-w-6xl px-4">
        <motion.div
          initial={{ opacity: 0, y: Y_MD }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: NICHE_DURATION[flavor], ease: NICHE_EASING[flavor] }}
          viewport={VIEWPORT_ONCE}
          className="mb-10 text-center sm:mb-12 md:mb-16"
        >
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            {data.title}
          </p>
          <motion.h2
            variants={sectionTitleContainerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={VIEWPORT_ONCE}
            className={cn(
              "text-3xl font-bold text-foreground md:text-4xl lg:text-5xl",
              isRemodelaciones && "font-extrabold tracking-tight",
            )}
          >
            {data.subtitle.split(" ").map((word: string, i: number) => (
              <motion.span key={i} variants={textWordVariants(niche)} className="inline-block">
                {word}&nbsp;
              </motion.span>
            ))}
          </motion.h2>
          {data.intro && (
            <p className="mx-auto mt-4 max-w-2xl text-sm text-muted-foreground sm:text-base md:text-lg">
              {data.intro}
            </p>
          )}
        </motion.div>

        <div className="relative">
          {/* Vertical connector line — mobile: left edge, desktop: center */}
          <motion.div
            initial={{ scaleY: 0, opacity: 0 }}
            whileInView={{ scaleY: 1, opacity: 1 }}
            viewport={VIEWPORT_ONCE}
            transition={{ duration: NICHE_DURATION[flavor] * 2, ease: EASE_OUT_STRONG }}
            style={{ originY: 0 }}
            className="absolute start-5 top-0 h-full w-px bg-gradient-to-b from-accent/40 via-accent/20 to-transparent sm:start-6 md:start-1/2"
          />

          <div className="space-y-6 sm:space-y-8 md:space-y-12">
            {data.steps.map((step, i) => (
              <motion.div
                key={step.number}
                initial={{
                  opacity: 0,
                  x: i % 2 === 0 ? -X_IN : X_IN,
                }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: NICHE_DURATION[flavor], ease: EASE_OUT_STRONG, delay: stagger(i) + i * 0.05 }}
                viewport={VIEWPORT_ONCE}
                className={`relative flex flex-row items-start gap-4 md:items-center md:gap-8 ${
                  i % 2 === 1 ? "md:flex-row-reverse" : ""
                }`}
              >
                <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-accent bg-background font-mono text-sm font-bold text-accent sm:h-12 sm:w-12 md:mx-auto">
                  {step.number}
                </div>

                <div className={cn(
                  "flex-1 rounded-xl border border-border/50 bg-card/50 p-4 backdrop-blur-sm sm:rounded-2xl sm:p-6",
                  i % 2 === 1 && "md:text-end",
                )}>
                  <h3 className="mb-1.5 text-base font-bold text-foreground sm:mb-2 sm:text-lg">
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
