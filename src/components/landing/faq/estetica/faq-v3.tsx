/**
 * faq/estetica/faq-v3.tsx — OPEN EDITORIAL (estética).
 *
 * No accordion at all: every question and answer set in an unhurried
 * two-column editorial spread — serif numerals, hairline tops, generous
 * leading. Nothing to tap, nothing hidden; the reader browses the page
 * like a beauty magazine's advice column.
 *
 * Selected when `sections.faq.variant === "v3"` and niche is estética.
 */
import React from "react";
import { motion } from "motion/react";
import { siteConfig } from "../../../../config/site";
import {
  Y_SM, Y_LG, VIEWPORT_ONCE,
  getNicheFlavor, NICHE_DURATION, NICHE_EASING,
} from "../../../../lib/motion";

export function EsteticaFaqV3() {
  const data = siteConfig.sections.faq;
  const niche = siteConfig.business.type;
  const flavor = getNicheFlavor(niche);
  const dur = NICHE_DURATION[flavor];
  const ease = NICHE_EASING[flavor];

  if (!data?.items?.length) return null;

  return (
    <section id="faq" className="bg-secondary/50 py-16 transition-colors duration-300 sm:py-24 lg:py-32 dark:bg-secondary/20">
      <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">

        {/* ── Centered header ────────────────────────────────────────── */}
        <div className="mx-auto mb-14 max-w-2xl text-center sm:mb-20">
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

        {/* ── Open Q&A spread ────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-x-16 gap-y-12 md:grid-cols-2">
          {data.items.map((item, index) => (
            <motion.article
              key={index}
              initial={{ opacity: 0, y: Y_LG }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={VIEWPORT_ONCE}
              transition={{ duration: dur, ease, delay: Math.min((index % 2) * 0.08, 0.16) }}
              className="border-t border-border pt-7"
            >
              <p className="font-serif text-sm tabular-nums text-accent-light" aria-hidden>
                {String(index + 1).padStart(2, "0")}
              </p>
              <h3 className="mt-2.5 font-serif text-xl font-normal leading-snug text-foreground sm:text-2xl">
                {item.question}
              </h3>
              <p className="mt-3.5 max-w-prose text-[15px] font-light leading-relaxed text-muted-foreground">
                {item.answer}
              </p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
