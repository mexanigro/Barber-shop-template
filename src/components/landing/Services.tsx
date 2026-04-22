import React from "react";
import { Clock, ChevronRight, Calendar } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "../../lib/utils";
import { localeConfig } from "../../config/locale";
import { siteConfig } from "../../config/site";
import { interpolate } from "../../lib/interpolate";

// ─── TEMPLATE LAYOUT RULE: Odd-count grid fill ────────────────────────────────
// Services are rendered in a 2-column grid. When a niche preset defines an
// odd number of services the last card would otherwise leave an empty cell at
// the bottom-right. The helpers below detect this case and make the orphan card
// span both columns, switching it to a horizontal (image-left / text-right)
// layout so every row is fully occupied regardless of how many services the
// preset defines. This logic is intentional, preset-agnostic, and must be
// preserved across all niche clones.
// ─────────────────────────────────────────────────────────────────────────────

export function Services({
  onBookClick,
  /**
   * Pass true when Services is rendered inside LandingBackdrop. This replaces
   * the solid bg-background with a semi-transparent + backdrop-blur treatment
   * so the shared sticky hero image is visible through the section, giving the
   * impression of a single continuous photographic canvas beneath Hero+Services.
   * A subtle top border separates it visually from the Hero section.
   */
  overFixedBackdrop = false,
}: {
  onBookClick: () => void;
  overFixedBackdrop?: boolean;
}) {
  const { sections } = siteConfig;
  const { services: sectionConfig } = sections;
  const services = siteConfig.services;

  /** True for the last card when the total count is odd (grid orphan). */
  const isOddOrphan = (i: number) =>
    services.length % 2 !== 0 && i === services.length - 1;

  return (
    <section
      id="services"
      className={
        overFixedBackdrop
          ? "border-t border-white/10 bg-background/88 px-6 py-28 backdrop-blur-md transition-colors duration-300"
          : "bg-background px-6 py-28 transition-colors duration-300"
      }
    >
      <div className="mx-auto max-w-7xl">

        {/* ── Section header ──────────────────────────────────────── */}
        <div className="mb-20 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
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
              className="text-4xl font-black uppercase tracking-tighter text-foreground md:text-6xl"
            >
              {sectionConfig.subtitle}
            </motion.h2>
          </div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="shrink-0"
          >
            <p className="text-sm text-muted-foreground md:text-right">
              {interpolate(localeConfig.services.servicesAvailable, {
                count: services.length,
              })}
            </p>
            <div className="mt-1 h-px w-32 bg-gradient-to-r from-accent-light/60 to-transparent md:ml-auto" />
          </motion.div>
        </div>

        {/* ── Cards grid ──────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {services.map((service, index) => (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08, duration: 0.5 }}
              className={cn(
                "group relative flex flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-elevated transition-all duration-300",
                "hover:-translate-y-1.5 hover:border-accent/30 hover:shadow-xl dark:hover:border-accent/20",
                siteConfig.features.showBooking && "cursor-pointer",
                isOddOrphan(index) && "md:col-span-2 md:flex-row"
              )}
              onClick={siteConfig.features.showBooking ? onBookClick : undefined}
            >
              {/* Image */}
              <div className={cn(
                "relative overflow-hidden",
                isOddOrphan(index)
                  ? "aspect-[16/9] md:aspect-auto md:w-1/2"
                  : "aspect-[16/9]"
              )}>
                <img
                  src={sectionConfig.images[index % sectionConfig.images.length]}
                  alt={service.name}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                />
                {/* Overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-card/80 via-transparent to-transparent" />

                {/* Service index number */}
                <div className="absolute left-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm">
                  <span className="font-serif text-sm font-bold text-white/80">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>

                {/* Price badge — floats over image bottom-right */}
                <div className="absolute bottom-4 right-4 flex items-baseline gap-1 rounded-xl bg-black/50 px-3 py-1.5 backdrop-blur-md">
                  <span className="text-xs font-semibold text-white/60">
                    {localeConfig.services.fromPrice}
                  </span>
                  <span className="font-serif text-xl font-bold text-accent-light">${service.price}</span>
                </div>
              </div>

              {/* Content */}
              <div className={cn(
                "flex flex-col justify-between p-7",
                isOddOrphan(index) && "md:w-1/2"
              )}>
                <div>
                  <h3 className="mb-3 text-xl font-black tracking-tight text-card-foreground transition-colors duration-200 group-hover:text-accent-light">
                    {service.name}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {service.description}
                  </p>
                </div>

                {/* Footer row */}
                <div className="mt-6 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    <Clock size={13} />
                    <span>
                      {service.duration} {localeConfig.services.minutesShort}
                    </span>
                  </div>

                  {siteConfig.features.showBooking && (
                    <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-accent-light opacity-0 transition-all duration-300 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0">
                      <Calendar size={13} />
                      <span>{localeConfig.services.book}</span>
                      <ChevronRight size={13} />
                    </div>
                  )}
                </div>

                {/* Bottom accent line */}
                <div className="mt-5 h-px w-0 bg-gradient-to-r from-accent-light to-transparent transition-all duration-500 group-hover:w-full" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
