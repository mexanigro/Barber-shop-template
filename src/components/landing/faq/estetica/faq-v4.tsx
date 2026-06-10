/**
 * faq/estetica/faq-v4.tsx — NUMBERED MEDITATION (estética).
 *
 * Single centered column, one question open at a time: oversized serif
 * numerals in the margin, an exclusive accordion whose open row glows on
 * the porcelain band, closing whatever was open before. Deliberate pace —
 * the reader is guided through one concern at a time.
 *
 * Selected when `sections.faq.variant === "v4"` and niche is estética.
 */
import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../../../../lib/utils";
import { siteConfig } from "../../../../config/site";
import {
  Y_SM, Y_LG, VIEWPORT_ONCE,
  getNicheFlavor, NICHE_DURATION, NICHE_EASING, EASE_OUT_STRONG,
} from "../../../../lib/motion";

export function EsteticaFaqV4() {
  const data = siteConfig.sections.faq;
  const niche = siteConfig.business.type;
  const flavor = getNicheFlavor(niche);
  const dur = NICHE_DURATION[flavor];
  const ease = NICHE_EASING[flavor];

  const [open, setOpen] = React.useState(0);
  if (!data?.items?.length) return null;

  return (
    <section id="faq" className="bg-background py-16 transition-colors duration-300 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-3xl px-5 sm:px-6">

        {/* ── Centered header ────────────────────────────────────────── */}
        <div className="mb-12 text-center sm:mb-16">
          <motion.p
            initial={{ opacity: 0, y: Y_SM }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT_ONCE}
            transition={{ duration: dur, ease }}
            className="mb-3 inline-flex items-center gap-3 text-[10px] font-medium uppercase tracking-[0.32em] text-accent-light sm:text-xs"
          >
            <span className="h-px w-7 bg-accent/50" aria-hidden />
            {data.subtitle}
            <span className="h-px w-7 bg-accent/50" aria-hidden />
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: Y_LG }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT_ONCE}
            transition={{ duration: dur, ease, delay: 0.08 }}
            className="font-serif text-3xl font-light leading-[1.08] text-balance text-foreground sm:text-4xl md:text-5xl"
          >
            {data.title}
          </motion.h2>
        </div>

        {/* ── Exclusive accordion ────────────────────────────────────── */}
        <ul className="flex flex-col gap-3.5">
          {data.items.map((item, index) => {
            const isOpen = index === open;
            const panelId = `estetica-faq-v4-panel-${index}`;
            const buttonId = `estetica-faq-v4-button-${index}`;
            return (
              <motion.li
                key={index}
                initial={{ opacity: 0, y: Y_SM }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={VIEWPORT_ONCE}
                transition={{ duration: dur, ease, delay: Math.min(index * 0.05, 0.25) }}
                className={cn(
                  "overflow-hidden rounded-[0.625rem] border transition-colors duration-500",
                  isOpen ? "border-accent/30 bg-secondary/70 shadow-elevated dark:bg-secondary/30" : "border-border bg-card",
                )}
              >
                <button
                  type="button"
                  id={buttonId}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => setOpen(isOpen ? -1 : index)}
                  className="flex w-full min-h-[68px] items-center gap-5 px-6 py-5 text-start focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 sm:gap-7 sm:px-8"
                >
                  <span
                    className={cn(
                      "shrink-0 font-serif text-2xl font-light tabular-nums transition-colors duration-500 sm:text-3xl",
                      isOpen ? "text-accent" : "text-border",
                    )}
                    aria-hidden
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 flex-1 font-serif text-lg font-normal leading-snug text-foreground sm:text-xl">
                    {item.question}
                  </span>
                  <motion.span
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.4, ease: EASE_OUT_STRONG }}
                    className="shrink-0 text-muted-foreground"
                    aria-hidden
                  >
                    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                      <path d="M5 7.5l5 5 5-5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      id={panelId}
                      role="region"
                      aria-labelledby={buttonId}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.45, ease: EASE_OUT_STRONG }}
                      className="overflow-hidden"
                    >
                      <p className="max-w-prose px-6 pb-7 text-[15px] font-light leading-relaxed text-muted-foreground sm:px-8 sm:ps-[5.5rem]">
                        {item.answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
