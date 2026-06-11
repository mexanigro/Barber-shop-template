/**
 * services/estetica/services-v3.tsx — RITUAL RAIL (estética).
 *
 * Horizontal snap rail of tall arch-top treatment cards: portrait imagery
 * under a soft veil, serif name, duration chip and price, with a quiet
 * progress hairline and lg+ arrows. Follows the template rail contract
 * (touch-pan-y + overflow-y-hidden + pb ≥ Y_LG so the rail never traps
 * vertical scroll — see project memory "rail scroll capture").
 *
 * Selected when `sections.services.variant === "v3"` and niche is estética.
 */
import React from "react";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { motion } from "motion/react";
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

const STRINGS: Record<"en" | "he" | "ru" | "ar", { prev: string; next: string; rail: string }> = {
  en: { prev: "Previous treatments", next: "Next treatments", rail: "Treatments carousel" },
  he: { prev: "טיפולים קודמים", next: "טיפולים הבאים", rail: "קרוסלת טיפולים" },
  ru: { prev: "Предыдущие процедуры", next: "Следующие процедуры", rail: "Карусель процедур" },
  ar: { prev: "العلاجات السابقة", next: "العلاجات التالية", rail: "شريط العلاجات" },
};

export function EsteticaServicesV3({ onBookClick, onNavigateToServices }: Props) {
  const sectionConfig = siteConfig.sections.services;
  const services = siteConfig.services;
  const niche = siteConfig.business.type;
  const flavor = getNicheFlavor(niche);
  const dur = NICHE_DURATION[flavor];
  const ease = NICHE_EASING[flavor];
  const S = STRINGS[localeConfig.lang] ?? STRINGS.en;

  const bookable = siteConfig.features.showBooking || siteConfig.features.showInquiry;
  const bookLabel = siteConfig.features.showBooking
    ? localeConfig.services.book
    : (localeConfig.lang === "he" ? "הצעת מחיר" : "Get Quote");

  const railRef = React.useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = React.useState(true);
  const [atEnd, setAtEnd] = React.useState(false);
  const [progress, setProgress] = React.useState(0);

  const updateArrows = React.useCallback(() => {
    const el = railRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const pos = Math.abs(el.scrollLeft);
    setAtStart(pos <= 1);
    setAtEnd(pos >= max - 1);
    setProgress(max > 1 ? Math.min(1, pos / max) : 0);
  }, []);

  React.useEffect(() => {
    updateArrows();
    const el = railRef.current;
    if (!el) return;
    const ro = new ResizeObserver(updateArrows);
    ro.observe(el);
    return () => ro.disconnect();
  }, [updateArrows]);

  const scrollByCard = (direction: 1 | -1) => {
    const el = railRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-rail-card]");
    const gap = parseFloat(getComputedStyle(el).columnGap || "") || 24;
    const step = card ? card.offsetWidth + gap : el.clientWidth * 0.8;
    const isRtl = getComputedStyle(el).direction === "rtl";
    el.scrollBy({ left: direction * step * (isRtl ? -1 : 1), behavior: "smooth" });
  };

  const images = sectionConfig.images ?? [];
  const imageFor = (index: number) => images.length ? images[index % images.length] : siteConfig.hero.backgroundImage;

  const renderPrice = (service: Service) =>
    service.price === 0 ? (
      <span className="font-serif text-lg font-medium text-accent">{localeConfig.services.free}</span>
    ) : service.fromPrice ? (
      <span className="font-serif text-lg font-medium tabular-nums text-foreground">{service.fromPrice}</span>
    ) : (
      <span className="flex items-baseline gap-1">
        <span className="text-[11px] font-medium text-muted-foreground">{localeConfig.services.fromPrice}</span>
        <span className="font-serif text-lg font-medium tabular-nums text-foreground">
          <span className="font-sans text-sm">{currencySymbol()}</span>
          {service.price}
        </span>
      </span>
    );

  const arrowClass = cn(
    "flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-foreground",
    "transition-colors duration-200 hover:border-accent/50 hover:text-accent",
    "disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-border disabled:hover:text-foreground",
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
  );

  return (
    <section id="services" className="overflow-hidden bg-secondary/50 py-16 transition-colors duration-300 sm:py-24 lg:py-28 dark:bg-secondary/20">
      {/* ── Header: title start, arrows end ──────────────────────────── */}
      <div className="mx-auto flex max-w-7xl items-end justify-between gap-6 px-5 sm:px-6">
        <div className="min-w-0">
          <motion.p
            initial={{ opacity: 0, y: Y_SM }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT_ONCE}
            transition={{ duration: dur, ease }}
            className="mb-2 flex items-center gap-3 text-[10px] font-medium uppercase tracking-[0.32em] text-accent-light sm:mb-3 sm:text-xs"
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

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={VIEWPORT_ONCE}
          transition={{ duration: dur, delay: 0.2 }}
          className="hidden shrink-0 items-center gap-3 lg:flex"
        >
          <motion.button type="button" onClick={() => scrollByCard(-1)} disabled={atStart} aria-label={S.prev} whileTap={{ scale: 0.97 }} className={arrowClass}>
            <ChevronLeft size={18} className="rtl:rotate-180" aria-hidden />
          </motion.button>
          <motion.button type="button" onClick={() => scrollByCard(1)} disabled={atEnd} aria-label={S.next} whileTap={{ scale: 0.97 }} className={arrowClass}>
            <ChevronRight size={18} className="rtl:rotate-180" aria-hidden />
          </motion.button>
        </motion.div>
      </div>

      {/* ── Arch-card rail ───────────────────────────────────────────── */}
      <div
        ref={railRef}
        onScroll={updateArrows}
        role="region"
        aria-label={S.rail}
        tabIndex={0}
        className={cn(
          "mt-9 flex touch-pan-y snap-x snap-mandatory gap-[var(--gs-gap)] overflow-x-auto overflow-y-hidden overscroll-x-contain scroll-smooth pb-8 sm:mt-12",
          "px-5 scroll-ps-5 sm:px-6 sm:scroll-ps-6",
          "lg:px-[max(1.5rem,calc((100vw-80rem)/2))] lg:scroll-ps-[max(1.5rem,calc((100vw-80rem)/2))]",
          "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
        )}
      >
        {services.map((service, index) => (
          <motion.article
            key={service.id}
            data-rail-card
            initial={{ opacity: 0, y: Y_LG }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT_ONCE}
            transition={{ delay: Math.min(index * 0.06, 0.3), duration: dur, ease }}
            className="group flex w-[72vw] max-w-[300px] shrink-0 snap-start flex-col sm:w-[290px]"
          >
            {/* Arch portrait */}
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-t-[8.5rem] rounded-b-[0.5rem] bg-muted">
              <img
                src={imageFor(index)}
                alt={service.name}
                loading="lazy"
                decoding="async"
                onError={handleImgError}
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-[1.04]"
                draggable={false}
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" aria-hidden />
              {/* Duration chip */}
              <span className="absolute bottom-3 start-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-card/90 px-3.5 py-1.5 text-[11px] font-medium text-foreground shadow-elevated backdrop-blur-sm rtl:translate-x-1/2">
                <Clock size={11} aria-hidden />
                {service.duration} {localeConfig.services.minutesShort}
              </span>
            </div>

            {/* Meta */}
            <div className="flex flex-1 flex-col items-center pt-5 text-center">
              <h3 className="font-serif text-xl leading-snug text-foreground transition-colors duration-300 group-hover:text-accent">
                {service.name}
              </h3>
              <div className="mt-1.5">{renderPrice(service)}</div>
              <p className="mt-2 line-clamp-2 max-w-[16rem] text-[13px] font-light leading-relaxed text-muted-foreground">
                {service.description}
              </p>
              {bookable && (
                <motion.button
                  type="button"
                  onClick={() => onBookClick(service.id)}
                  whileTap={{ scale: 0.97 }}
                  transition={{ duration: 0.16, ease: EASE_OUT_STRONG }}
                  className="mt-4 inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full border border-accent/35 px-6 text-xs font-medium uppercase tracking-[0.16em] text-accent hover:border-accent hover:bg-accent hover:text-primary-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 [transition:background-color_0.3s_cubic-bezier(0.23,1,0.32,1),border-color_0.3s_cubic-bezier(0.23,1,0.32,1),color_0.3s_cubic-bezier(0.23,1,0.32,1)]"
                >
                  {bookLabel}
                </motion.button>
              )}
            </div>
          </motion.article>
        ))}
      </div>

      {/* ── Progress hairline ────────────────────────────────────────── */}
      {!(atStart && atEnd) && (
        <div className="mx-auto mt-2 h-0.5 w-36 overflow-hidden rounded-full bg-border" aria-hidden>
          <div
            className="h-full w-full origin-left rounded-full bg-accent transition-transform duration-150 ease-out rtl:origin-right"
            style={{ transform: `scaleX(${progress})` }}
          />
        </div>
      )}

      {/* ── View-all ─────────────────────────────────────────────────── */}
      {onNavigateToServices && (
        <motion.div
          initial={{ opacity: 0, y: Y_SM }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEWPORT_ONCE}
          transition={{ delay: 0.2, duration: dur, ease }}
          className="mt-8 text-center"
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
    </section>
  );
}
