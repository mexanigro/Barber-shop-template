import { type KeyboardEvent as ReactKeyboardEvent } from "react";
import { ChevronRight, Clock } from "lucide-react";
import { motion } from "motion/react";
import { cn, handleImgError } from "../../../lib/utils";
import { localeConfig } from "../../../config/locale";
import { siteConfig } from "../../../config/site";
import { interpolate } from "../../../lib/interpolate";
import type { Service } from "../../../types";
import {
  Y_SM,
  Y_LG,
  VIEWPORT_ONCE,
  getNicheFlavor,
  staggerMasonry,
  NICHE_DURATION,
  NICHE_EASING,
  NICHE_CARD_HOVER,
  EASE_OUT_STRONG,
} from "../../../lib/motion";

type Props = {
  onBookClick: (serviceId?: string) => void;
  onNavigateToServices?: () => void;
};

/** Image aspect ratios cycle so card heights vary and the wall feels organic. */
const ASPECTS = ["aspect-[4/5]", "aspect-square", "aspect-[3/4]"] as const;

/**
 * ServicesV5 — masonry wall (`sections.services.variant: "v5"`).
 *
 * CSS-columns masonry (1 → 2 → 3 columns) where each card's image cycles
 * through 4/5, 1/1 and 3/4 aspect ratios for naturally varied heights.
 * Card = image, serif name, two-line description, price chip over the
 * photo, duration row, hover lift via NICHE_CARD_HOVER. Entrances use
 * staggerMasonry so the wall reveals by grid position.
 */
export function ServicesV5({ onBookClick, onNavigateToServices }: Props) {
  const sectionConfig = siteConfig.sections.services;
  const services = siteConfig.services;

  const niche = siteConfig.business.type;
  const flavor = getNicheFlavor(niche);
  const isEstetica = niche === "estetica";
  const isNails = niche === "nails";

  // Same landing slice contract as Services v1.
  const nicheDefault = isEstetica ? 4 : isNails ? 3 : 4;
  const MAX_LANDING = siteConfig.landingServicesCount ?? nicheDefault;
  const displayedServices = services.slice(0, MAX_LANDING);
  const hasMore = services.length > MAX_LANDING;

  const bookable = siteConfig.features.showBooking || siteConfig.features.showInquiry;
  const bookLabel = siteConfig.features.showBooking
    ? localeConfig.services.book
    : (localeConfig.lang === "he" ? "הצעת מחיר" : "Get Quote");

  const renderPriceChip = (service: Service) => (
    <span className="absolute bottom-3 end-3 inline-flex items-baseline gap-1 rounded-full bg-black/55 px-3 py-1.5 backdrop-blur-md">
      {service.price === 0 ? (
        <span className="text-sm font-bold uppercase tracking-wide text-white">
          {localeConfig.services.free}
        </span>
      ) : service.fromPrice ? (
        <span className="text-sm font-bold text-white">{service.fromPrice}</span>
      ) : (
        <>
          <span className="text-[10px] font-semibold text-white/70">
            {localeConfig.services.fromPrice}
          </span>
          <span className="font-serif text-sm font-bold text-white">
            {/* Sans for the currency glyph — serif fallback ₪ reads as broken. */}
            <span className="font-sans">{localeConfig.currency.symbol}</span>
            {service.price}
          </span>
        </>
      )}
    </span>
  );

  return (
    <section
      id="services"
      className="bg-background px-5 py-16 transition-colors duration-300 sm:px-6 sm:py-24 lg:py-28"
    >
      <div className="mx-auto max-w-7xl">
        {/* ── Header ── */}
        <div className="mb-10 sm:mb-16">
          <motion.p
            initial={{ opacity: 0, y: Y_SM }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT_ONCE}
            transition={{ duration: NICHE_DURATION[flavor], ease: NICHE_EASING[flavor] }}
            className="mb-2 text-[10px] font-bold uppercase tracking-[0.3em] text-foreground/70 sm:mb-3 sm:text-xs"
          >
            {sectionConfig.title}
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: Y_SM }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT_ONCE}
            transition={{ duration: NICHE_DURATION[flavor], ease: NICHE_EASING[flavor], delay: 0.08 }}
            className="max-w-2xl font-serif text-3xl leading-[1.08] text-foreground sm:text-4xl md:text-5xl"
          >
            {sectionConfig.subtitle}
          </motion.h2>
        </div>

        {/* ── Masonry wall ── */}
        <div className="columns-1 [column-gap:var(--gs-gap)] sm:columns-2 lg:columns-3">
          {displayedServices.map((service, index) => (
            <motion.article
              key={service.id}
              initial={{ opacity: 0, y: Y_LG }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={VIEWPORT_ONCE}
              whileHover={{
                y: NICHE_CARD_HOVER[flavor].y,
                scale: NICHE_CARD_HOVER[flavor].scale,
                boxShadow: NICHE_CARD_HOVER[flavor].shadow,
              }}
              whileTap={bookable ? { scale: 0.97 } : undefined}
              transition={{
                delay: staggerMasonry(index, 3, niche),
                duration: NICHE_DURATION[flavor],
                ease: NICHE_EASING[flavor],
              }}
              className={cn(
                "group mb-[var(--gs-gap)] break-inside-avoid overflow-hidden rounded-[var(--gs-card-radius)] border border-border bg-card shadow-elevated",
                "[transition:border-color_0.3s_cubic-bezier(0.23,1,0.32,1)] hover:border-accent/30",
                bookable && "cursor-pointer",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
              )}
              onClick={bookable ? () => onBookClick(service.id) : undefined}
              {...(bookable && {
                role: "button",
                tabIndex: 0,
                onKeyDown: (e: ReactKeyboardEvent) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onBookClick(service.id);
                  }
                },
              })}
            >
              {/* Image — cycling aspect ratio gives the wall its rhythm */}
              <div
                className={cn(
                  "gs-image relative w-full overflow-hidden bg-muted",
                  ASPECTS[index % ASPECTS.length],
                )}
              >
                <img
                  src={sectionConfig.images[index % sectionConfig.images.length]}
                  alt={service.name}
                  loading="lazy"
                  decoding="async"
                  onError={handleImgError}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.05]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/0 to-transparent" />
                {renderPriceChip(service)}
              </div>

              {/* Content */}
              <div className="p-5 sm:p-6">
                <h3 className="font-serif text-xl leading-snug text-card-foreground transition-colors duration-200 group-hover:text-accent">
                  {service.name}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground line-clamp-2">
                  {service.description}
                </p>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    <Clock size={12} aria-hidden />
                    {service.duration} {localeConfig.services.minutesShort}
                  </span>
                  {bookable && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-accent opacity-100 transition-all duration-300 sm:translate-y-0.5 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100">
                      {bookLabel}
                      <ChevronRight size={13} className="rtl:rotate-180" aria-hidden />
                    </span>
                  )}
                </div>
              </div>
            </motion.article>
          ))}
        </div>

        {/* ── View-all affordance (same gating + locale key as v1) ── */}
        {hasMore && (onNavigateToServices || bookable) && (
          <motion.div
            initial={{ opacity: 0, y: Y_SM }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT_ONCE}
            transition={{ delay: 0.3, duration: NICHE_DURATION[flavor], ease: NICHE_EASING[flavor] }}
            className="mt-12 text-center"
          >
            <motion.button
              type="button"
              onClick={onNavigateToServices ?? (() => onBookClick())}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.16, ease: EASE_OUT_STRONG }}
              className="inline-flex min-h-[44px] items-center gap-2 text-sm font-medium text-accent transition-colors duration-200 hover:text-accent-light focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
            >
              {interpolate(localeConfig.services.viewAllServices, { count: services.length })}
              <ChevronRight size={14} className="rtl:rotate-180" aria-hidden />
            </motion.button>
          </motion.div>
        )}
      </div>
    </section>
  );
}
