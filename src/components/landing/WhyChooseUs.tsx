import React from "react";
import { HelpCircle, Star, ChevronRight } from "lucide-react";
import { motion } from "motion/react";
import { localeConfig } from "../../config/locale";
import { resolveLucideIcon } from "../../lib/lucide-icons";
import { siteConfig } from "../../config/site";
import { cn } from "../../lib/utils";
import { Y_SM, Y_MD, staggerGrid, VIEWPORT_ONCE } from "../../lib/motion";

export function WhyChooseUs({
  onNavigateToAbout,
}: {
  onNavigateToAbout?: () => void;
} = {}) {
  const { sections } = siteConfig;
  const { whyChooseUs: sectionConfig } = sections;
  const isTattoo = siteConfig.business.type === "tattoo";
  const isNails = siteConfig.business.type === "nails";
  const isEstetica = siteConfig.business.type === "estetica";

  const mainImageOverlayClass = isNails
    ? "absolute inset-0 bg-gradient-to-t from-surface-dark/35 to-transparent"
    : "absolute inset-0 bg-gradient-to-t from-black/30 to-transparent";

  /* ── Estetica: compact teaser linking to dedicated about page ────────── */
  if (isEstetica) {
    return (
      <section id="why-choose-us" className="bg-background px-6 py-20 transition-colors duration-300">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: Y_SM }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT_ONCE}
            className="mb-10 text-center"
          >
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-accent-light">
              {sectionConfig.title}
            </p>
            <h2 className="font-serif text-3xl font-normal tracking-wide text-foreground md:text-4xl">
              {sectionConfig.subtitle}
            </h2>
          </motion.div>

          {/* Benefit highlights — horizontal row */}
          <div className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
            {sectionConfig.benefits.map((benefit, i) => {
              const IconComponent = resolveLucideIcon(benefit.iconName, HelpCircle);
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: Y_SM }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={VIEWPORT_ONCE}
                  transition={{ delay: staggerGrid(i) }}
                  className="bg-card p-6 text-center"
                >
                  <IconComponent className="mx-auto mb-3 text-accent-light" size={18} />
                  <h3 className="text-sm font-medium text-foreground">{benefit.title}</h3>
                </motion.div>
              );
            })}
          </div>

          {/* Link to full about page */}
          {onNavigateToAbout && (
            <motion.div
              initial={{ opacity: 0, y: Y_SM }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={VIEWPORT_ONCE}
              transition={{ delay: 0.3 }}
              className="mt-8 text-center"
            >
              <button
                type="button"
                onClick={onNavigateToAbout}
                className="inline-flex items-center gap-2 text-sm font-medium text-accent transition-colors duration-200 hover:text-accent-light"
              >
                {localeConfig.lang === "he" ? "הכירו אותנו" : "Learn more about us"}
                <ChevronRight size={14} className="rtl:rotate-180" />
              </button>
            </motion.div>
          )}
        </div>
      </section>
    );
  }

  /* ── Default layout (barberia / tattoo / nails) ───────────────────────── */
  return (
    <section id="why-choose-us" className="bg-card px-6 py-28 transition-colors duration-300">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2 lg:gap-24">

          {/* ── Image column ─────────────────────────────────────── */}
          <div className="relative">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={VIEWPORT_ONCE}
              transition={{ duration: 0.5 }}
              className="relative aspect-[4/5] overflow-hidden rounded-3xl border border-border shadow-elevated"
            >
              <img
                src={sectionConfig.mainImage}
                className="h-full w-full object-cover"
                alt={localeConfig.whyChooseUs.imageAlt}
              />
              {/* Subtle darkening at bottom */}
              <div className={mainImageOverlayClass} />
            </motion.div>

            {/* Badge — floats bottom-end (logical: end = right in LTR, left in RTL) */}
            <motion.div
              initial={{ opacity: 0, rotate: 12, scale: 0.8 }}
              whileInView={{ opacity: 1, rotate: 6, scale: 1 }}
              viewport={VIEWPORT_ONCE}
              transition={{ delay: 0.3, duration: 0.5 }}
              className={
                isTattoo
                  ? "absolute -bottom-6 -end-6 hidden w-52 overflow-hidden bg-primary p-7 shadow-xl shadow-black/30 transition-transform duration-500 hover:rotate-0 md:block"
                  : isNails
                    ? "absolute -bottom-6 -end-6 hidden w-52 overflow-hidden bg-primary p-7 shadow-xl shadow-surface-dark/35 transition-transform duration-500 hover:rotate-0 md:block"
                    : "absolute -bottom-6 -end-6 hidden w-52 overflow-hidden rounded-3xl bg-accent-light p-7 shadow-xl shadow-accent/30 transition-transform duration-500 hover:rotate-0 md:block"
              }
            >
              <Star
                className={
                  isTattoo || isNails ? "mb-3 text-primary-foreground" : "mb-3 text-zinc-950"
                }
                size={32}
                fill="currentColor"
              />
              <p
                className={
                  isTattoo
                    ? "whitespace-pre-line font-gothic text-2xl leading-tight text-primary-foreground"
                    : isNails
                      ? "whitespace-pre-line font-script text-2xl leading-tight text-primary-foreground"
                      : "whitespace-pre-line font-serif text-2xl font-bold leading-tight text-zinc-950"
                }
              >
                {sectionConfig.badge}
              </p>
            </motion.div>

            {/* Decorative corner bracket — intentionally physical (geometric ornament) */}
            <div className="pointer-events-none absolute -left-3 -top-3 h-10 w-10 border-l-2 border-t-2 border-accent-light/40 rounded-tl-lg" />
          </div>

          {/* ── Content column ───────────────────────────────────── */}
          <div>
            <motion.p
              initial={{ opacity: 0, y: Y_SM }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={VIEWPORT_ONCE}
              className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-accent-light"
            >
              {sectionConfig.title}
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: Y_MD }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={VIEWPORT_ONCE}
              transition={{ delay: 0.1 }}
              className={
                isNails
                  ? "mb-14 text-4xl font-black uppercase tracking-wide text-card-foreground md:text-6xl"
                  : "mb-14 text-4xl font-black uppercase tracking-tighter text-card-foreground md:text-6xl"
              }
            >
              {sectionConfig.subtitle}
            </motion.h2>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {sectionConfig.benefits.map((benefit, i) => {
                const IconComponent = resolveLucideIcon(benefit.iconName, HelpCircle);
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: Y_MD }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={VIEWPORT_ONCE}
                    transition={{ delay: staggerGrid(i) }}
                    className="group rounded-2xl border border-border bg-background p-6 transition-all duration-300 hover:border-accent/30 hover:shadow-lg dark:bg-background/50"
                  >
                    <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-accent-light/10 transition-colors duration-300 group-hover:bg-accent-light/20">
                      <IconComponent className="text-accent-light" size={22} />
                    </div>
                    <h3 className="mb-2 text-base font-bold text-card-foreground">
                      {benefit.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {benefit.desc}
                    </p>
                    {/* Bottom accent */}
                    <div className="mt-5 h-px w-0 bg-gradient-to-r from-accent-light to-transparent transition-all duration-500 group-hover:w-full" />
                  </motion.div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
