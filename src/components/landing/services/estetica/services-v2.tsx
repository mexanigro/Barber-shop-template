/**
 * services/estetica/services-v2.tsx — TREATMENT MENU editorial (estética).
 *
 * Luxury spa-menu architecture: hairline-divided rows (serif treatment name,
 * one-line description, duration, dotted leader to the price) beside a sticky
 * preview portrait that crossfades as the visitor hovers/focuses each row.
 * On mobile the preview collapses and rows expand inline. The quietest and
 * most "carte de soins" of the estética services variants.
 *
 * Selected when `sections.services.variant === "v2"` and niche is estética.
 */
import React from "react";
import { Clock, ChevronRight } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { cn, handleImgError } from "../../../../lib/utils";
import { localeConfig } from "../../../../config/locale";
import { siteConfig } from "../../../../config/site";
import { interpolate } from "../../../../lib/interpolate";
import type { Service } from "../../../../types";
import { currencySymbol } from "../../../../lib/currency";
import {
  Y_SM, Y_LG, VIEWPORT_ONCE,
  getNicheFlavor, NICHE_DURATION, NICHE_EASING,
  EASE_OUT_STRONG,
} from "../../../../lib/motion";

type Props = {
  onBookClick: (serviceId?: string) => void;
  onNavigateToServices?: () => void;
};

export function EsteticaServicesV2({ onBookClick, onNavigateToServices }: Props) {
  const sectionConfig = siteConfig.sections.services;
  const services = siteConfig.services;
  const niche = siteConfig.business.type;
  const flavor = getNicheFlavor(niche);
  const dur = NICHE_DURATION[flavor];
  const ease = NICHE_EASING[flavor];

  const bookable = siteConfig.features.showBooking || siteConfig.features.showInquiry;
  const bookLabel = siteConfig.features.showBooking
    ? localeConfig.services.book
    : (localeConfig.lang === "he" ? "הצעת מחיר" : "Get Quote");

  const [active, setActive] = React.useState(0);
  const images = sectionConfig.images ?? [];
  const imageFor = (index: number) => images.length ? images[index % images.length] : siteConfig.hero.backgroundImage;

  const renderPrice = (service: Service) =>
    service.price === 0 ? (
      <span className="font-serif text-xl font-medium text-accent">{localeConfig.services.free}</span>
    ) : service.fromPrice ? (
      <span className="font-serif text-xl font-medium tabular-nums text-foreground">{service.fromPrice}</span>
    ) : (
      <span className="flex items-baseline gap-1.5">
        <span className="text-[11px] font-medium text-muted-foreground">{localeConfig.services.fromPrice}</span>
        <span className="font-serif text-xl font-medium tabular-nums text-foreground">
          <span className="font-sans text-base">{currencySymbol()}</span>
          {service.price}
        </span>
      </span>
    );

  return (
    <section id="services" className="bg-background py-16 transition-colors duration-300 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">

        {/* ── Centered menu header ───────────────────────────────────── */}
        <div className="mx-auto mb-12 max-w-2xl text-center sm:mb-16">
          <motion.p
            initial={{ opacity: 0, y: Y_SM }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT_ONCE}
            transition={{ duration: dur, ease }}
            className="mb-3 inline-flex items-center gap-3 text-[10px] font-medium uppercase tracking-[0.32em] text-accent-light sm:text-xs"
          >
            <span className="h-px w-7 bg-accent/50" aria-hidden />
            {sectionConfig.title}
            <span className="h-px w-7 bg-accent/50" aria-hidden />
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: Y_LG }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT_ONCE}
            transition={{ duration: dur, ease, delay: 0.08 }}
            className="font-serif text-3xl font-light leading-[1.08] text-balance text-foreground sm:text-4xl md:text-5xl"
          >
            {sectionConfig.subtitle}
          </motion.h2>
        </div>

        <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-12 lg:gap-14">

          {/* ── Sticky crossfading preview (lg+) ─────────────────────── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={VIEWPORT_ONCE}
            transition={{ duration: dur * 1.2, ease }}
            className="sticky top-28 hidden min-w-0 lg:col-span-5 lg:block"
          >
            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-t-[10rem] rounded-b-[0.5rem]">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.img
                  key={active}
                  src={imageFor(active)}
                  alt={services[active]?.name ?? ""}
                  initial={{ opacity: 0, scale: 1.04 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5, ease: EASE_OUT_STRONG }}
                  onError={handleImgError}
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </AnimatePresence>
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" aria-hidden />
              {/* Active treatment caption */}
              <div className="absolute inset-x-0 bottom-0 p-6">
                <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-white/75">
                  {String(active + 1).padStart(2, "0")} / {String(services.length).padStart(2, "0")}
                </p>
                <p className="mt-1 truncate font-serif text-2xl font-light text-white">{services[active]?.name}</p>
              </div>
            </div>
          </motion.div>

          {/* ── Menu rows ────────────────────────────────────────────── */}
          <div className="min-w-0 lg:col-span-7">
            <ul className="divide-y divide-border border-y border-border">
              {services.map((service, index) => (
                <motion.li
                  key={service.id}
                  initial={{ opacity: 0, y: Y_SM }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={VIEWPORT_ONCE}
                  transition={{ duration: dur, ease, delay: Math.min(index * 0.07, 0.35) }}
                >
                  <div
                    className={cn(
                      "group relative py-6 sm:py-7",
                      "transition-colors duration-300",
                    )}
                    onMouseEnter={() => setActive(index)}
                    onFocusCapture={() => setActive(index)}
                  >
                    <div className="flex items-baseline gap-3">
                      <span className="font-serif text-sm tabular-nums text-accent-light" aria-hidden>
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <h3 className="min-w-0 font-serif text-xl font-normal leading-snug text-foreground transition-colors duration-300 group-hover:text-accent sm:text-2xl">
                        {service.name}
                      </h3>
                      {/* Dotted leader */}
                      <span className="mx-1 hidden h-px flex-1 border-b border-dotted border-border sm:block" aria-hidden />
                      <span className="ms-auto shrink-0 sm:ms-0">{renderPrice(service)}</span>
                    </div>
                    <div className="mt-2 flex flex-col gap-3 ps-7 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
                      <p className="max-w-md text-[13px] font-light leading-relaxed text-muted-foreground sm:text-sm">
                        {service.description}
                      </p>
                      <div className="flex shrink-0 items-center gap-4">
                        <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                          <Clock size={12} aria-hidden />
                          {service.duration} {localeConfig.services.minutesShort}
                        </span>
                        {bookable && (
                          <motion.button
                            type="button"
                            onClick={() => onBookClick(service.id)}
                            whileTap={{ scale: 0.97 }}
                            transition={{ duration: 0.16, ease: EASE_OUT_STRONG }}
                            className="inline-flex min-h-[44px] items-center gap-1 text-xs font-medium uppercase tracking-[0.16em] text-accent underline-offset-4 hover:text-accent-light hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 [transition:color_0.3s_cubic-bezier(0.23,1,0.32,1)]"
                          >
                            {bookLabel}
                            <ChevronRight size={13} className="rtl:rotate-180" aria-hidden />
                          </motion.button>
                        )}
                      </div>
                    </div>
                    {/* Mobile inline thumbnail */}
                    <div className="mt-4 overflow-hidden rounded-[0.5rem] ps-7 lg:hidden">
                      <img
                        src={imageFor(index)}
                        alt={service.name}
                        loading="lazy"
                        decoding="async"
                        onError={handleImgError}
                        referrerPolicy="no-referrer"
                        className="gs-image h-36 w-full object-cover"
                      />
                    </div>
                  </div>
                </motion.li>
              ))}
            </ul>

            {onNavigateToServices && (
              <motion.div
                initial={{ opacity: 0, y: Y_SM }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={VIEWPORT_ONCE}
                transition={{ delay: 0.2, duration: dur, ease }}
                className="mt-8 text-center lg:text-start"
              >
                <motion.button
                  type="button"
                  onClick={onNavigateToServices}
                  whileTap={{ scale: 0.97 }}
                  transition={{ duration: 0.16, ease: EASE_OUT_STRONG }}
                  className="group inline-flex min-h-[44px] items-center gap-2 text-sm font-medium text-accent hover:text-accent-light focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 [transition:color_0.3s_cubic-bezier(0.23,1,0.32,1)]"
                >
                  {interpolate(localeConfig.services.viewAllServices, { count: services.length })}
                  <ChevronRight size={14} className="transition-[translate] duration-200 ease-out group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" aria-hidden />
                </motion.button>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
