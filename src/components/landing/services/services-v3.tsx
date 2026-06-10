import { useState } from "react";
import { ChevronRight, Clock, Plus } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { cn, handleImgError } from "../../../lib/utils";
import { localeConfig } from "../../../config/locale";
import { siteConfig } from "../../../config/site";
import { interpolate } from "../../../lib/interpolate";
import type { Service } from "../../../types";
import {
  Y_SM,
  VIEWPORT_ONCE,
  getNicheFlavor,
  nicheStagger,
  NICHE_DURATION,
  NICHE_EASING,
  EASE_OUT_STRONG,
} from "../../../lib/motion";

type Props = {
  onBookClick: (serviceId?: string) => void;
  onNavigateToServices?: () => void;
};

/**
 * ServicesV3 — editorial accordion (`sections.services.variant: "v3"`).
 *
 * Vertical list where every service is a numbered row (01, 02, …) with a
 * large serif name and the price aligned to the end. Rows expand in place
 * (AnimatePresence height auto) to reveal description, duration, a small
 * image thumb and the Book button. One row open at a time; the first row
 * starts open. Full row is the disclosure button with proper ARIA wiring.
 */
export function ServicesV3({ onBookClick, onNavigateToServices }: Props) {
  const sectionConfig = siteConfig.sections.services;
  const services = siteConfig.services;

  const niche = siteConfig.business.type;
  const flavor = getNicheFlavor(niche);
  const stagger = nicheStagger(niche);
  const isEstetica = niche === "estetica";
  const isNails = niche === "nails";

  // Same landing slice contract as Services v1.
  const nicheDefault = isEstetica ? 4 : isNails ? 3 : 4;
  const MAX_LANDING = siteConfig.landingServicesCount ?? nicheDefault;
  const displayedServices = services.slice(0, MAX_LANDING);
  const hasMore = services.length > MAX_LANDING;

  const [openId, setOpenId] = useState<string | null>(displayedServices[0]?.id ?? null);

  const bookable = siteConfig.features.showBooking || siteConfig.features.showInquiry;
  const bookLabel = siteConfig.features.showBooking
    ? localeConfig.services.book
    : (localeConfig.lang === "he" ? "הצעת מחיר" : "Get Quote");

  const renderPrice = (service: Service) =>
    service.price === 0 ? (
      <span className="font-serif text-base font-bold uppercase tracking-wide text-accent sm:text-lg">
        {localeConfig.services.free}
      </span>
    ) : service.fromPrice ? (
      <span className="font-serif text-base font-bold tabular-nums text-foreground sm:text-lg">
        {service.fromPrice}
      </span>
    ) : (
      <span className="flex items-baseline gap-1">
        <span className="hidden text-xs font-medium text-muted-foreground sm:inline">
          {localeConfig.services.fromPrice}
        </span>
        <span className="font-serif text-base font-bold tabular-nums text-foreground sm:text-lg">
          {/* Sans for the currency glyph — serif fallback ₪ reads as broken. */}
          <span className="font-sans">{localeConfig.currency.symbol}</span>
          {service.price}
        </span>
      </span>
    );

  return (
    <section
      id="services"
      className="bg-background px-5 py-16 transition-colors duration-300 sm:px-6 sm:py-24 lg:py-28"
    >
      <div className="mx-auto max-w-4xl">
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
            className="font-serif text-3xl leading-[1.08] text-balance text-foreground sm:text-4xl md:text-5xl"
          >
            {sectionConfig.subtitle}
          </motion.h2>
        </div>

        {/* ── Accordion list ── */}
        <ul>
          {displayedServices.map((service, index) => {
            const isOpen = openId === service.id;
            const triggerId = `services-v3-trigger-${service.id}`;
            const panelId = `services-v3-panel-${service.id}`;
            return (
              <motion.li
                key={service.id}
                initial={{ opacity: 0, y: Y_SM }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={VIEWPORT_ONCE}
                transition={{
                  delay: stagger(index),
                  duration: NICHE_DURATION[flavor],
                  ease: NICHE_EASING[flavor],
                }}
                className="border-b border-border first:border-t"
              >
                {/* Row trigger — the whole row is the button */}
                <motion.button
                  type="button"
                  id={triggerId}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => setOpenId(isOpen ? null : service.id)}
                  whileTap={{ scale: 0.99 }}
                  transition={{ duration: 0.16, ease: EASE_OUT_STRONG }}
                  className="group flex min-h-[44px] w-full items-center gap-4 py-5 text-start focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 sm:gap-6 sm:py-7"
                >
                  <span
                    className={cn(
                      "w-7 shrink-0 text-xs font-semibold tabular-nums transition-colors duration-200 sm:text-sm",
                      isOpen ? "text-accent" : "text-muted-foreground",
                    )}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span
                    className={cn(
                      "flex-1 font-serif text-2xl leading-tight transition-colors duration-200 sm:text-3xl md:text-4xl",
                      isOpen ? "text-accent" : "text-foreground group-hover:text-accent",
                    )}
                  >
                    {service.name}
                  </span>
                  <span className="ms-auto shrink-0">{renderPrice(service)}</span>
                  {/* Plus rotates 45deg into a close mark — clearer affordance than a chevron */}
                  <motion.span
                    animate={{ rotate: isOpen ? 45 : 0 }}
                    transition={{ duration: 0.3, ease: EASE_OUT_STRONG }}
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors duration-200",
                      isOpen
                        ? "border-accent text-accent"
                        : "border-border text-muted-foreground group-hover:border-accent/50 group-hover:text-accent",
                    )}
                    aria-hidden
                  >
                    <Plus size={16} />
                  </motion.span>
                </motion.button>

                {/* Expanding panel */}
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key="panel"
                      id={panelId}
                      role="region"
                      aria-labelledby={triggerId}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.4, ease: EASE_OUT_STRONG }}
                      className="overflow-hidden"
                    >
                      <div className="flex flex-col gap-5 pb-7 ps-11 pt-1 sm:flex-row sm:gap-7 sm:ps-[3.25rem]">
                        {/* Image thumb */}
                        <div className="gs-image w-full max-w-[220px] shrink-0 overflow-hidden bg-muted sm:w-44">
                          <div className="aspect-[4/3]">
                            <img
                              src={sectionConfig.images[index % sectionConfig.images.length]}
                              alt={service.name}
                              loading="lazy"
                              decoding="async"
                              onError={handleImgError}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        </div>
                        {/* Detail */}
                        <div className="flex min-w-0 flex-col items-start">
                          <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
                            {service.description}
                          </p>
                          <span className="mt-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                            <Clock size={12} aria-hidden />
                            {service.duration} {localeConfig.services.minutesShort}
                          </span>
                          {bookable && (
                            <motion.button
                              type="button"
                              onClick={() => onBookClick(service.id)}
                              whileTap={{ scale: 0.97 }}
                              transition={{ duration: 0.16, ease: EASE_OUT_STRONG }}
                              className="mt-5 inline-flex min-h-[44px] items-center gap-1.5 rounded-[var(--gs-btn-radius)] bg-foreground px-6 text-xs font-bold uppercase tracking-widest text-background transition-[translate,opacity] duration-200 ease-out hover:-translate-y-0.5 hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                            >
                              {bookLabel}
                              <ChevronRight size={14} className="rtl:rotate-180" aria-hidden />
                            </motion.button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.li>
            );
          })}
        </ul>

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
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.16, ease: EASE_OUT_STRONG }}
              className="group inline-flex min-h-[44px] items-center gap-2 text-sm font-medium text-accent transition-colors duration-200 hover:text-accent-light focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
            >
              {interpolate(localeConfig.services.viewAllServices, { count: services.length })}
              {/* CSS nudge instead of whileHover x — mirrors correctly under RTL */}
              <ChevronRight
                size={14}
                className="transition-[translate] duration-200 ease-out group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
                aria-hidden
              />
            </motion.button>
          </motion.div>
        )}
      </div>
    </section>
  );
}
