/**
 * services/estetica/services-v4.tsx — CONSULTATION STEPPER (estética).
 *
 * Clinical consultation architecture: a vertical treatment index on the
 * start side (numbered serif tabs with an animated active hairline) driving
 * a detail pane — portrait, description, duration/price meta and booking
 * CTA — that crossfades per selection. Mobile renders the same model as an
 * elegant accordion. Feels like being walked through a treatment plan.
 *
 * Selected when `sections.services.variant === "v4"` and niche is estética.
 */
import React from "react";
import { Clock, ChevronDown, Calendar } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { cn, handleImgError } from "../../../../lib/utils";
import { localeConfig } from "../../../../config/locale";
import { siteConfig } from "../../../../config/site";
import { interpolate } from "../../../../lib/interpolate";
import type { Service } from "../../../../types";
import { currencySymbol } from "../../../../lib/currency";
import {
  Y_SM, Y_LG, VIEWPORT_ONCE,
  getNicheFlavor, NICHE_DURATION, NICHE_EASING, EASE_OUT_STRONG,
} from "../../../../lib/motion";

type Props = {
  onBookClick: (serviceId?: string) => void;
  onNavigateToServices?: () => void;
};

export function EsteticaServicesV4({ onBookClick, onNavigateToServices }: Props) {
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
  const current = services[active];

  const renderPrice = (service: Service, large = false) =>
    service.price === 0 ? (
      <span className={cn("font-serif font-medium text-accent", large ? "text-2xl" : "text-lg")}>{localeConfig.services.free}</span>
    ) : service.fromPrice ? (
      <span className={cn("font-serif font-medium tabular-nums text-foreground", large ? "text-2xl" : "text-lg")}>{service.fromPrice}</span>
    ) : (
      <span className="flex items-baseline gap-1.5">
        <span className="text-[11px] font-medium text-muted-foreground">{localeConfig.services.fromPrice}</span>
        <span className={cn("font-serif font-medium tabular-nums text-foreground", large ? "text-2xl" : "text-lg")}>
          <span className={cn("font-sans", large ? "text-lg" : "text-sm")}>{currencySymbol()}</span>
          {service.price}
        </span>
      </span>
    );

  const bookButton = (service: Service) =>
    bookable ? (
      <motion.button
        type="button"
        onClick={() => onBookClick(service.id)}
        whileTap={{ scale: 0.97 }}
        transition={{ duration: 0.16, ease: EASE_OUT_STRONG }}
        className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-full bg-primary px-7 py-3 text-xs font-medium uppercase tracking-[0.16em] text-primary-foreground shadow-elevated hover:bg-accent-light focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 [transition:background-color_0.3s_cubic-bezier(0.23,1,0.32,1)]"
      >
        <Calendar size={14} aria-hidden />
        {bookLabel}
      </motion.button>
    ) : null;

  return (
    <section id="services" className="bg-background py-16 transition-colors duration-300 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="mb-12 max-w-2xl sm:mb-16">
          <motion.p
            initial={{ opacity: 0, y: Y_SM }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT_ONCE}
            transition={{ duration: dur, ease }}
            className="mb-3 flex items-center gap-3 text-[10px] font-medium uppercase tracking-[0.32em] text-accent-light sm:text-xs"
          >
            <span className="h-px w-7 shrink-0 bg-accent/50" aria-hidden />
            {sectionConfig.title}
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

        {/* ── Desktop: index + detail pane ───────────────────────────── */}
        <div className="hidden gap-14 lg:grid lg:grid-cols-12">
          {/* Treatment index */}
          <nav className="lg:col-span-4" aria-label={sectionConfig.title}>
            <ul className="flex flex-col">
              {services.map((service, index) => {
                const isActive = index === active;
                return (
                  <motion.li
                    key={service.id}
                    initial={{ opacity: 0, y: Y_SM }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={VIEWPORT_ONCE}
                    transition={{ duration: dur, ease, delay: Math.min(index * 0.06, 0.3) }}
                  >
                    <button
                      type="button"
                      onClick={() => setActive(index)}
                      aria-current={isActive ? "true" : undefined}
                      className={cn(
                        "group relative flex w-full min-h-[64px] items-baseline gap-4 border-b border-border px-1 py-5 text-start",
                        "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
                        "[transition:color_0.3s_cubic-bezier(0.23,1,0.32,1)]",
                      )}
                    >
                      <span className={cn(
                        "font-serif text-sm tabular-nums transition-colors duration-300",
                        isActive ? "text-accent" : "text-muted-foreground/60 group-hover:text-accent-light",
                      )} aria-hidden>
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className={cn(
                        "min-w-0 truncate font-serif text-xl transition-colors duration-300 sm:text-2xl",
                        isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground",
                      )}>
                        {service.name}
                      </span>
                      <span className="ms-auto shrink-0 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                        {service.duration} {localeConfig.services.minutesShort}
                      </span>
                      {/* Animated active hairline */}
                      {isActive && (
                        <motion.span
                          layoutId="estetica-services-v4-active"
                          transition={{ duration: 0.45, ease: EASE_OUT_STRONG }}
                          className="absolute inset-x-0 bottom-[-1px] h-px bg-accent"
                          aria-hidden
                        />
                      )}
                    </button>
                  </motion.li>
                );
              })}
            </ul>

            {onNavigateToServices && (
              <button
                type="button"
                onClick={onNavigateToServices}
                className="group mt-7 inline-flex min-h-[44px] items-center gap-2 text-sm font-medium text-accent hover:text-accent-light focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 [transition:color_0.3s_cubic-bezier(0.23,1,0.32,1)]"
              >
                {interpolate(localeConfig.services.viewAllServices, { count: services.length })}
              </button>
            )}
          </nav>

          {/* Detail pane */}
          <div className="min-w-0 lg:col-span-8">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={current?.id ?? active}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.45, ease: EASE_OUT_STRONG }}
                className="grid grid-cols-2 items-stretch gap-10"
              >
                <div className="relative overflow-hidden rounded-t-[7rem] rounded-b-[0.5rem]">
                  <img
                    src={imageFor(active)}
                    alt={current?.name ?? ""}
                    loading="lazy"
                    decoding="async"
                    onError={handleImgError}
                    referrerPolicy="no-referrer"
                    className="aspect-[4/5] h-full w-full object-cover"
                  />
                </div>
                <div className="flex min-w-0 flex-col justify-center py-4">
                  <h3 className="font-serif text-3xl font-light leading-tight text-foreground xl:text-4xl">
                    {current?.name}
                  </h3>
                  <p className="mt-5 max-w-md text-[15px] font-light leading-relaxed text-muted-foreground">
                    {current?.description}
                  </p>
                  <div className="mt-7 flex items-center gap-7 border-t border-border pt-6">
                    {current && renderPrice(current, true)}
                    <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                      <Clock size={13} aria-hidden />
                      {current?.duration} {localeConfig.services.minutesShort}
                    </span>
                  </div>
                  <div className="mt-8">{current && bookButton(current)}</div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* ── Mobile: elegant accordion ──────────────────────────────── */}
        <div className="lg:hidden">
          <ul className="divide-y divide-border border-y border-border">
            {services.map((service, index) => {
              const isOpen = index === active;
              return (
                <motion.li
                  key={service.id}
                  initial={{ opacity: 0, y: Y_SM }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={VIEWPORT_ONCE}
                  transition={{ duration: dur, ease, delay: Math.min(index * 0.05, 0.25) }}
                >
                  <button
                    type="button"
                    onClick={() => setActive(isOpen ? -1 : index)}
                    aria-expanded={isOpen}
                    className="flex w-full min-h-[60px] items-center gap-3 py-4 text-start focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                  >
                    <span className="font-serif text-xs tabular-nums text-accent-light" aria-hidden>
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className={cn(
                      "min-w-0 flex-1 truncate font-serif text-lg transition-colors duration-300",
                      isOpen ? "text-accent" : "text-foreground",
                    )}>
                      {service.name}
                    </span>
                    <span className="shrink-0">{renderPrice(service)}</span>
                    <ChevronDown
                      size={16}
                      className={cn("shrink-0 text-muted-foreground transition-transform duration-300", isOpen && "rotate-180")}
                      aria-hidden
                    />
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.4, ease: EASE_OUT_STRONG }}
                        className="overflow-hidden"
                      >
                        <div className="pb-5 ps-7">
                          <div className="overflow-hidden rounded-t-[5rem] rounded-b-[0.5rem]">
                            <img
                              src={imageFor(index)}
                              alt={service.name}
                              loading="lazy"
                              decoding="async"
                              onError={handleImgError}
                              referrerPolicy="no-referrer"
                              className="aspect-[4/3] w-full object-cover"
                            />
                          </div>
                          <p className="mt-4 text-[13px] font-light leading-relaxed text-muted-foreground">
                            {service.description}
                          </p>
                          <div className="mt-3 flex items-center justify-between gap-4">
                            <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                              <Clock size={12} aria-hidden />
                              {service.duration} {localeConfig.services.minutesShort}
                            </span>
                            {bookButton(service)}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.li>
              );
            })}
          </ul>

          {onNavigateToServices && (
            <div className="mt-7 text-center">
              <button
                type="button"
                onClick={onNavigateToServices}
                className="inline-flex min-h-[44px] items-center gap-2 text-sm font-medium text-accent hover:text-accent-light focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 [transition:color_0.3s_cubic-bezier(0.23,1,0.32,1)]"
              >
                {interpolate(localeConfig.services.viewAllServices, { count: services.length })}
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
