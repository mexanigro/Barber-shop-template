import React from "react";
import * as Icons from "lucide-react";
import { motion } from "motion/react";
import { localeConfig } from "../../config/locale";
import { siteConfig } from "../../config/site";

export function WhyChooseUs() {
  const { sections } = siteConfig;
  const { whyChooseUs: sectionConfig } = sections;

  return (
    <section id="why-choose-us" className="bg-card px-6 py-28 transition-colors duration-300">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2 lg:gap-24">

          {/* ── Image column ─────────────────────────────────────── */}
          <div className="relative">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative aspect-[4/5] overflow-hidden rounded-3xl border border-border shadow-elevated"
            >
              <img
                src={sectionConfig.mainImage}
                className="h-full w-full object-cover"
                alt={localeConfig.whyChooseUs.imageAlt}
              />
              {/* Subtle darkening at bottom */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
            </motion.div>

            {/* Badge — floats bottom-right */}
            <motion.div
              initial={{ opacity: 0, rotate: 12, scale: 0.8 }}
              whileInView={{ opacity: 1, rotate: 6, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="absolute -bottom-6 -right-6 hidden w-52 overflow-hidden rounded-3xl bg-accent-light p-7 shadow-xl shadow-accent/30 transition-transform duration-500 hover:rotate-0 md:block"
            >
              <Icons.Star className="mb-3 text-zinc-950" size={32} fill="currentColor" />
              <p className="whitespace-pre-line font-serif text-2xl font-bold leading-tight text-zinc-950">
                {sectionConfig.badge}
              </p>
            </motion.div>

            {/* Decorative corner bracket */}
            <div className="pointer-events-none absolute -left-3 -top-3 h-10 w-10 border-l-2 border-t-2 border-accent-light/40 rounded-tl-lg" />
          </div>

          {/* ── Content column ───────────────────────────────────── */}
          <div>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-accent-light"
            >
              {sectionConfig.title}
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="mb-14 text-4xl font-black uppercase tracking-tighter text-card-foreground md:text-6xl"
            >
              {sectionConfig.subtitle}
            </motion.h2>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {sectionConfig.benefits.map((benefit, i) => {
                const IconComponent = (Icons as any)[benefit.iconName] || Icons.HelpCircle;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
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
