import React from "react";
import { Clock, ChevronRight, Calendar } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "../../lib/utils";
import { localeConfig } from "../../config/locale";
import { siteConfig } from "../../config/site";
import { interpolate } from "../../lib/interpolate";
import {
  Y_SM, Y_MD, Y_LG, X_IN, VIEWPORT_ONCE,
  getNicheFlavor, nicheStagger, NICHE_DURATION, NICHE_EASING, NICHE_CARD_HOVER,
  sectionTitleContainerVariants, textWordVariants,
  nicheScaleIn, EASE_OUT_STRONG, BUTTON_PRESS,
} from "../../lib/motion";

// --- TEMPLATE LAYOUT RULE: Odd-count grid fill ---
// Services are rendered in a 2-column grid. When a niche preset defines an
// odd number of services the last card would otherwise leave an empty cell at
// the bottom-right. The helpers below detect this case and make the orphan card
// span both columns, switching it to a horizontal (image-left / text-right)
// layout so every row is fully occupied regardless of how many services the
// preset defines. This logic is intentional, preset-agnostic, and must be
// preserved across all niche clones.
// -------------------------------------------------------------------------

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
  /** Navigate to the dedicated treatments page (estetica only). */
  onNavigateToServices,
}: {
  onBookClick: () => void;
  overFixedBackdrop?: boolean;
  onNavigateToServices?: () => void;
}) {
  const { sections } = siteConfig;
  const { services: sectionConfig } = sections;
  const services = siteConfig.services;
  const isTattoo = siteConfig.business.type === "tattoo";
  const isNails = siteConfig.business.type === "nails";
  const isEstetica = siteConfig.business.type === "estetica";

  const niche = siteConfig.business.type;
  const flavor = getNicheFlavor(niche);
  const stagger = nicheStagger(niche);
  // Landing shows a compact preview — estetica 2, nails 3, others 4 max
  const MAX_LANDING = isEstetica ? 2 : isNails ? 3 : 4;
  const displayedServices = services.slice(0, MAX_LANDING);
  const hasMore = services.length > MAX_LANDING;

  /** True for the last card when the total count is odd (grid orphan). */
  const isOddOrphan = (i: number) =>
    displayedServices.length % 2 !== 0 && i === displayedServices.length - 1;

  return (
    <section
      id="services"
      className={cn(
        "px-6 py-28 transition-colors duration-300",
        overFixedBackdrop
          ? isNails
            ? "bg-background/88 backdrop-blur-md border-t border-foreground/10"
            : isEstetica
              ? "border-t border-foreground/10 bg-background/55 backdrop-blur-sm"
              : "border-t border-foreground/10 bg-background/88 backdrop-blur-md"
          : "bg-background",
      )}
    >
      <div className="mx-auto max-w-7xl">

        {/* -- Section header -- */}
        <div className="mb-20 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
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
              variants={sectionTitleContainerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={VIEWPORT_ONCE}
              className={
                isEstetica
                  ? "text-4xl font-normal tracking-wide text-foreground md:text-5xl"
                  : isNails
                    ? "text-4xl font-black uppercase tracking-wide text-foreground md:text-6xl"
                    : "text-4xl font-black uppercase tracking-tighter text-foreground md:text-6xl"
              }
            >
              {sectionConfig.subtitle.split(" ").map((word: string, i: number) => (
                <motion.span key={i} variants={textWordVariants(niche)} className="inline-block">
                  {word}&nbsp;
                </motion.span>
              ))}
            </motion.h2>
          </div>
          <motion.div
            initial={{ opacity: 0, x: X_IN }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={VIEWPORT_ONCE}
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

        {/* -- Cards grid -- */}
        {isEstetica ? (
          /* ── Estetica: editorial cards — small thumbnails, no prices ── */
          <>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {displayedServices.map((service, index) => {
                const handleClick = onNavigateToServices ?? (siteConfig.features.showBooking ? onBookClick : undefined);
                return (
                  <motion.div
                    key={service.id}
                    initial={{ opacity: 0, y: Y_LG }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={VIEWPORT_ONCE}
                    transition={{ delay: stagger(index), duration: NICHE_DURATION[flavor], ease: NICHE_EASING[flavor] }}
                    className={cn(
                      "group flex flex-col overflow-hidden border border-border bg-card transition-all duration-300 hover:border-accent/30 sm:flex-row",
                      handleClick && "cursor-pointer",
                    )}
                    onClick={handleClick}
                    {...(handleClick && {
                      role: "button",
                      tabIndex: 0,
                      onKeyDown: (e: React.KeyboardEvent) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleClick();
                        }
                      },
                    })}
                  >
                    {/* Thumbnail — prominent on both mobile and desktop */}
                    <div className="aspect-[16/10] w-full shrink-0 overflow-hidden sm:aspect-auto sm:w-36 md:w-44">
                      <img
                        src={sectionConfig.images[index % sectionConfig.images.length]}
                        alt={service.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                        loading="lazy"
                      />
                    </div>
                    {/* Text content */}
                    <div className="min-w-0 flex-1 p-5 sm:p-6">
                      <h3 className="font-serif text-xl font-normal tracking-wide text-foreground transition-colors duration-200 group-hover:text-accent md:text-2xl">
                        {service.name}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground line-clamp-3">
                        {service.description}
                      </p>
                      <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground/60">
                        <Clock size={12} />
                        <span>{service.duration} {localeConfig.services.minutesShort}</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
            <motion.div
              initial={{ opacity: 0, y: Y_SM }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={VIEWPORT_ONCE}
              transition={{ delay: 0.3 }}
              className="mt-10 text-center"
            >
              <button
                type="button"
                onClick={onNavigateToServices ?? onBookClick}
                className="text-sm font-medium text-accent transition-colors duration-200 hover:text-accent-light"
              >
                {localeConfig.services.exploreAllTreatments} →
              </button>
            </motion.div>
          </>
        ) : (
          /* ── Default: image cards with index numbers + price badges ── */
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {displayedServices.map((service, index) => (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: Y_LG }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={VIEWPORT_ONCE}
                transition={{ delay: stagger(index), duration: NICHE_DURATION[flavor], ease: NICHE_EASING[flavor] }}
                whileHover={{
                  y: NICHE_CARD_HOVER[flavor].y,
                  scale: NICHE_CARD_HOVER[flavor].scale,
                  boxShadow: NICHE_CARD_HOVER[flavor].shadow,
                }}
                className={cn(
                  "group relative flex flex-col overflow-hidden border border-border bg-card shadow-elevated transition-colors duration-300",
                  "hover:border-accent/30 dark:hover:border-accent/20",
                  isTattoo ? "rounded-xl" : "rounded-3xl",
                  siteConfig.features.showBooking && "cursor-pointer",
                  isOddOrphan(index) && "md:col-span-2 md:flex-row"
                )}
                onClick={siteConfig.features.showBooking ? onBookClick : undefined}
                {...(siteConfig.features.showBooking && {
                  role: "button",
                  tabIndex: 0,
                  onKeyDown: (e: React.KeyboardEvent) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onBookClick();
                    }
                  },
                })}
              >
                {/* Image with clip-path reveal */}
                <motion.div
                  {...nicheScaleIn(niche)}
                  transition={{ delay: stagger(index) + 0.1, duration: NICHE_DURATION[flavor] * 1.5, ease: NICHE_EASING[flavor] }}
                  className={cn(
                    "relative overflow-hidden",
                    isOddOrphan(index)
                      ? "aspect-[16/9] md:aspect-auto md:w-1/2"
                      : isNails ? "aspect-[16/8]" : "aspect-[16/9]"
                  )}
                >
                  <img
                    src={sectionConfig.images[index % sectionConfig.images.length]}
                    alt={service.name}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                  />
                  {/* Overlay gradient — always dark so text/badges over the image are legible */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/5 to-transparent" />

                  {/* Service index number */}
                  <div
                    className={cn(
                      "absolute left-4 top-4 flex h-8 w-8 items-center justify-center backdrop-blur-sm",
                      isTattoo ? "bg-black/60" : "rounded-full bg-black/40",
                    )}
                  >
                    <span
                      className={
                        isTattoo
                          ? "font-gothic text-base text-white/80"
                          : isNails
                            ? "font-script text-base text-white/90"
                            : "font-serif text-sm font-bold text-white/80"
                      }
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>

                  {/* Price badge -- floats over image bottom-right */}
                  <div
                    className={cn(
                      "absolute bottom-4 right-4 flex items-baseline gap-1 px-3 py-1.5 backdrop-blur-md",
                      isTattoo ? "bg-black/55" : "rounded-xl bg-black/50",
                    )}
                  >
                    {service.price === 0 ? (
                      <span className="font-serif text-xl font-bold uppercase tracking-widest text-accent-light">
                        {localeConfig.services.free}
                      </span>
                    ) : (
                      <>
                        <span className="text-xs font-semibold text-white/60">
                          {localeConfig.services.fromPrice}
                        </span>
                        <span className="font-serif text-xl font-bold text-accent-light">{localeConfig.currency.symbol}{service.price}</span>
                      </>
                    )}
                  </div>
                </motion.div>

                {/* Content */}
                <div className={cn(
                  "flex flex-col justify-between",
                  isNails ? "p-5" : "p-7",
                  isOddOrphan(index) && "md:w-1/2"
                )}>
                  <div>
                    <h3 className={cn(
                      "mb-3 text-xl font-black text-card-foreground transition-colors duration-200 group-hover:text-accent-light",
                      isNails ? "tracking-wide" : "tracking-tight",
                    )}>
                      {service.name}
                    </h3>
                    <p className="text-sm leading-relaxed text-muted-foreground line-clamp-2">
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
        )}

        {/* View all services CTA */}
        {hasMore && (onNavigateToServices || siteConfig.features.showBooking) && (
          <motion.div
            initial={{ opacity: 0, y: Y_SM }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT_ONCE}
            transition={{ delay: 0.3, duration: NICHE_DURATION[flavor], ease: NICHE_EASING[flavor] }}
            className="mt-12 text-center"
          >
            <motion.button
              type="button"
              onClick={onNavigateToServices ?? onBookClick}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.16, ease: EASE_OUT_STRONG }}
              className={cn(
                "inline-flex items-center gap-2 text-sm font-medium text-accent transition-colors duration-200 hover:text-accent-light",
              )}
            >
              {interpolate(localeConfig.services.viewAllServices, { count: services.length })}
              <ChevronRight size={14} className="transition-transform duration-200" />
            </motion.button>
          </motion.div>
        )}
      </div>
    </section>
  );
}
