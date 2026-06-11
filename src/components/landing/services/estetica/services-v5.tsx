/**
 * services/estetica/services-v5.tsx — PORCELAIN BENTO (estética).
 *
 * Contemporary bento composition: the first treatment takes a tall featured
 * cell with full portrait imagery; the rest alternate between soft tinted
 * text tiles and compact image tiles, all on the 0.5rem clinical radius with
 * barely-there shadows. Hovering lifts tiles gently; every tile is a direct
 * booking surface. The most graphic/2026 of the estética services variants.
 *
 * Selected when `sections.services.variant === "v5"` and niche is estética.
 */
import React from "react";
import { Clock, ArrowUpRight } from "lucide-react";
import { motion } from "motion/react";
import { cn, handleImgError } from "../../../../lib/utils";
import { localeConfig } from "../../../../config/locale";
import { siteConfig } from "../../../../config/site";
import { interpolate } from "../../../../lib/interpolate";
import type { Service } from "../../../../types";
import { currencySymbol } from "../../../../lib/currency";
import {
  Y_SM, Y_LG, VIEWPORT_ONCE,
  getNicheFlavor, NICHE_DURATION, NICHE_EASING, EASE_OUT_STRONG, NICHE_CARD_HOVER,
} from "../../../../lib/motion";

type Props = {
  onBookClick: (serviceId?: string) => void;
  onNavigateToServices?: () => void;
};

export function EsteticaServicesV5({ onBookClick, onNavigateToServices }: Props) {
  const sectionConfig = siteConfig.sections.services;
  const services = siteConfig.services;
  const niche = siteConfig.business.type;
  const flavor = getNicheFlavor(niche);
  const dur = NICHE_DURATION[flavor];
  const ease = NICHE_EASING[flavor];
  const hover = NICHE_CARD_HOVER[flavor];

  const bookable = siteConfig.features.showBooking || siteConfig.features.showInquiry;

  const images = sectionConfig.images ?? [];
  const imageFor = (index: number) => images.length ? images[index % images.length] : siteConfig.hero.backgroundImage;

  const [featured, ...rest] = services;

  const renderPrice = (service: Service, onImage = false) =>
    service.price === 0 ? (
      <span className={cn("font-serif text-lg font-medium", onImage ? "text-white" : "text-accent")}>{localeConfig.services.free}</span>
    ) : service.fromPrice ? (
      <span className={cn("font-serif text-lg font-medium tabular-nums", onImage ? "text-white" : "text-foreground")}>{service.fromPrice}</span>
    ) : (
      <span className="flex items-baseline gap-1">
        <span className={cn("text-[11px] font-medium", onImage ? "text-white/75" : "text-muted-foreground")}>{localeConfig.services.fromPrice}</span>
        <span className={cn("font-serif text-lg font-medium tabular-nums", onImage ? "text-white" : "text-foreground")}>
          <span className="font-sans text-sm">{currencySymbol()}</span>
          {service.price}
        </span>
      </span>
    );

  const tileInteractive = (serviceId: string) =>
    bookable
      ? {
          role: "button" as const,
          tabIndex: 0,
          onClick: () => onBookClick(serviceId),
          onKeyDown: (e: React.KeyboardEvent) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onBookClick(serviceId);
            }
          },
        }
      : {};

  return (
    <section id="services" className="bg-background py-16 transition-colors duration-300 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">

        {/* ── Header row: title + view-all ───────────────────────────── */}
        <div className="mb-10 flex flex-wrap items-end justify-between gap-6 sm:mb-14">
          <div className="min-w-0">
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

          {onNavigateToServices && (
            <motion.button
              type="button"
              onClick={onNavigateToServices}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={VIEWPORT_ONCE}
              transition={{ duration: dur, delay: 0.2 }}
              whileTap={{ scale: 0.97 }}
              className="group inline-flex min-h-[44px] shrink-0 items-center gap-2 text-sm font-medium text-accent hover:text-accent-light focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 [transition:color_0.3s_cubic-bezier(0.23,1,0.32,1)]"
            >
              {interpolate(localeConfig.services.viewAllServices, { count: services.length })}
              <ArrowUpRight size={15} className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" aria-hidden />
            </motion.button>
          )}
        </div>

        {/* ── Bento grid ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-[var(--gs-gap)] sm:grid-cols-2 lg:grid-cols-4 lg:[grid-auto-rows:minmax(11rem,auto)]">

          {/* Featured tall image tile */}
          {featured && (
            <motion.article
              {...tileInteractive(featured.id)}
              initial={{ opacity: 0, y: Y_LG }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={VIEWPORT_ONCE}
              whileHover={{ y: hover.y }}
              transition={{ duration: dur, ease }}
              aria-label={bookable ? `${featured.name} — ${localeConfig.services.book}` : undefined}
              className={cn(
                "group relative overflow-hidden rounded-[0.5rem] sm:col-span-2 lg:col-span-2 lg:row-span-2",
                bookable && "cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
              )}
            >
              <img
                src={imageFor(0)}
                alt={featured.name}
                loading="lazy"
                decoding="async"
                onError={handleImgError}
                referrerPolicy="no-referrer"
                className="aspect-[4/3] h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-[1.04] sm:aspect-auto sm:min-h-[24rem]"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" aria-hidden />
              <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
                <p className="mb-1.5 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.22em] text-white/80">
                  <Clock size={11} aria-hidden />
                  {featured.duration} {localeConfig.services.minutesShort}
                </p>
                <h3 className="font-serif text-2xl font-light leading-tight text-white sm:text-3xl">
                  {featured.name}
                </h3>
                <p className="mt-2 line-clamp-2 max-w-md text-[13px] font-light leading-relaxed text-white/85 sm:text-sm">
                  {featured.description}
                </p>
                <div className="mt-3">{renderPrice(featured, true)}</div>
              </div>
              {bookable && (
                <span className="absolute end-5 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-card/90 text-foreground opacity-0 shadow-elevated backdrop-blur-sm transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden>
                  <ArrowUpRight size={16} className="rtl:-scale-x-100" />
                </span>
              )}
            </motion.article>
          )}

          {/* Alternating text/image tiles */}
          {rest.map((service, i) => {
            const index = i + 1;
            const isImageTile = i % 2 === 1;
            return (
              <motion.article
                key={service.id}
                {...tileInteractive(service.id)}
                initial={{ opacity: 0, y: Y_LG }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={VIEWPORT_ONCE}
                whileHover={{ y: hover.y }}
                transition={{ duration: dur, ease, delay: Math.min(index * 0.06, 0.3) }}
                aria-label={bookable ? `${service.name} — ${localeConfig.services.book}` : undefined}
                className={cn(
                  "group relative flex min-h-[11rem] flex-col overflow-hidden rounded-[0.5rem]",
                  bookable && "cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
                  isImageTile ? "justify-end" : "justify-between border border-border bg-secondary/60 p-6 dark:bg-secondary/30",
                  "lg:col-span-1",
                )}
              >
                {isImageTile ? (
                  <>
                    <img
                      src={imageFor(index)}
                      alt={service.name}
                      loading="lazy"
                      decoding="async"
                      onError={handleImgError}
                      referrerPolicy="no-referrer"
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-[1.05]"
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent" aria-hidden />
                    <div className="relative p-5">
                      <h3 className="font-serif text-lg font-light leading-tight text-white sm:text-xl">{service.name}</h3>
                      <div className="mt-1 flex items-center justify-between gap-3">
                        {renderPrice(service, true)}
                        <span className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-[0.16em] text-white/75">
                          <Clock size={10} aria-hidden />
                          {service.duration} {localeConfig.services.minutesShort}
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <span className="font-serif text-sm tabular-nums text-accent-light" aria-hidden>
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <h3 className="mt-2 font-serif text-lg font-normal leading-tight text-foreground transition-colors duration-300 group-hover:text-accent sm:text-xl">
                        {service.name}
                      </h3>
                      <p className="mt-2 line-clamp-3 text-[13px] font-light leading-relaxed text-muted-foreground">
                        {service.description}
                      </p>
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-3">
                      {renderPrice(service)}
                      <span className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                        <Clock size={10} aria-hidden />
                        {service.duration} {localeConfig.services.minutesShort}
                      </span>
                    </div>
                  </>
                )}
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
