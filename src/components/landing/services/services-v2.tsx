import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { motion } from "motion/react";
import { cn, handleImgError } from "../../../lib/utils";
import { localeConfig } from "../../../config/locale";
import { siteConfig } from "../../../config/site";
import { interpolate } from "../../../lib/interpolate";
import type { Service } from "../../../types";
import { currencySymbol } from "../../../lib/currency";
import {
  Y_SM,
  Y_LG,
  VIEWPORT_ONCE,
  getNicheFlavor,
  NICHE_DURATION,
  NICHE_EASING,
  EASE_OUT_STRONG,
} from "../../../lib/motion";

type Props = {
  onBookClick: (serviceId?: string) => void;
  onNavigateToServices?: () => void;
};

/** UI microcopy local to this variant — business copy stays in config/locales. */
const STRINGS: Record<"en" | "he" | "ru" | "ar", {
  prev: string;
  next: string;
  rail: string;
}> = {
  en: { prev: "Previous services", next: "Next services", rail: "Services carousel" },
  he: { prev: "שירותים קודמים", next: "שירותים הבאים", rail: "קרוסלת שירותים" },
  ru: { prev: "Предыдущие услуги", next: "Следующие услуги", rail: "Карусель услуг" },
  ar: { prev: "الخدمات السابقة", next: "الخدمات التالية", rail: "شريط الخدمات" },
};

/**
 * ServicesV2 — horizontal scroll rail (`sections.services.variant: "v2"`).
 *
 * Edge-bleeding scroll-snap rail of tall portrait cards. The rail itself
 * scrolls (overscroll-x-contain keeps the page from panning); prev/next
 * arrows appear at lg+ and follow the document direction so "next" always
 * advances toward the content end under both LTR and RTL.
 *
 * Shows ALL services (the rail is the "view all" surface); when
 * `onNavigateToServices` exists the standard view-all CTA renders below.
 */
export function ServicesV2({ onBookClick, onNavigateToServices }: Props) {
  const sectionConfig = siteConfig.sections.services;
  const services = siteConfig.services;

  const niche = siteConfig.business.type;
  const flavor = getNicheFlavor(niche);
  const S = STRINGS[localeConfig.lang] ?? STRINGS.en;
  const bookable = siteConfig.features.showBooking || siteConfig.features.showInquiry;
  const bookLabel = siteConfig.features.showBooking
    ? localeConfig.services.book
    : (localeConfig.lang === "he" ? "הצעת מחיר" : "Get Quote");

  const railRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const [progress, setProgress] = useState(0);

  const updateArrows = useCallback(() => {
    const el = railRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    // Math.abs handles RTL, where scrollLeft runs into negative values.
    const pos = Math.abs(el.scrollLeft);
    setAtStart(pos <= 1);
    setAtEnd(pos >= max - 1);
    setProgress(max > 1 ? Math.min(1, pos / max) : 0);
  }, []);

  useEffect(() => {
    updateArrows();
    const el = railRef.current;
    if (!el) return;
    const ro = new ResizeObserver(updateArrows);
    ro.observe(el);
    return () => ro.disconnect();
  }, [updateArrows]);

  /** direction: 1 = toward content end ("next"), -1 = toward start. */
  const scrollByCard = (direction: 1 | -1) => {
    const el = railRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-rail-card]");
    const gap = parseFloat(getComputedStyle(el).columnGap || "") || 24;
    const step = card ? card.offsetWidth + gap : el.clientWidth * 0.8;
    const isRtl = getComputedStyle(el).direction === "rtl";
    el.scrollBy({ left: direction * step * (isRtl ? -1 : 1), behavior: "smooth" });
  };

  /* ── Gesture handling ─────────────────────────────────────────────────
     The rail must NEVER trap vertical scroll: `touch-pan-y` hands vertical
     pans to the page natively, and horizontal movement is driven by the
     pointer handlers below. The gesture axis is locked once after a small
     dead-zone — only clearly horizontal drags move the rail. Scroll-snap is
     suspended during the drag (mandatory snap fights per-frame scrollLeft
     writes) and restored after the release snap settles. */
  const drag = useRef<{
    startX: number;
    startY: number;
    startScroll: number;
    axis: "none" | "x" | "y";
    moved: boolean;
    lastX: number;
    lastT: number;
    velocity: number; // scrollLeft px per ms, sign-aware (RTL-safe)
  } | null>(null);
  const restoreSnapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const restoreSnap = (el: HTMLElement, delay: number) => {
    if (restoreSnapTimer.current) clearTimeout(restoreSnapTimer.current);
    restoreSnapTimer.current = setTimeout(() => {
      el.style.scrollSnapType = "";
      el.style.scrollBehavior = "";
      el.style.userSelect = "";
    }, delay);
  };

  useEffect(() => () => {
    if (restoreSnapTimer.current) clearTimeout(restoreSnapTimer.current);
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const el = railRef.current;
    if (!el) return;
    drag.current = {
      startX: e.clientX,
      startY: e.clientY,
      startScroll: el.scrollLeft,
      axis: "none",
      moved: false,
      lastX: e.clientX,
      lastT: e.timeStamp,
      velocity: 0,
    };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const el = railRef.current;
    if (!d || !el || d.axis === "y") return;

    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;

    if (d.axis === "none") {
      if (Math.abs(dx) < 7 && Math.abs(dy) < 7) return; // dead-zone
      if (Math.abs(dx) <= Math.abs(dy)) {
        d.axis = "y"; // vertical gesture → page scroll owns it, never capture
        return;
      }
      d.axis = "x";
      el.setPointerCapture(e.pointerId);
      el.style.scrollSnapType = "none";
      el.style.scrollBehavior = "auto"; // override scroll-smooth for 1:1 tracking
      el.style.userSelect = "none";
    }

    const dt = Math.max(1, e.timeStamp - d.lastT);
    d.velocity = -(e.clientX - d.lastX) / dt;
    d.lastX = e.clientX;
    d.lastT = e.timeStamp;
    d.moved = true;
    el.scrollLeft = d.startScroll - dx;
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const el = railRef.current;
    if (!d) return;
    drag.current = d.moved ? { ...d, axis: "none" } : null; // keep `moved` for click suppression
    if (!el || d.axis !== "x") return;

    if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);

    // Snap to the nearest card edge, biased one card forward on a fling.
    // scrollLeft is sign-aware (negative under RTL) so the same math holds
    // in both directions: positive velocity always means "scrollLeft grows".
    const card = el.querySelector<HTMLElement>("[data-rail-card]");
    const gap = parseFloat(getComputedStyle(el).columnGap || "") || 24;
    const step = card ? card.offsetWidth + gap : el.clientWidth * 0.8;
    const index = el.scrollLeft / step;
    const FLING = 0.35; // px/ms
    const target =
      d.velocity > FLING ? Math.ceil(index)
      : d.velocity < -FLING ? Math.floor(index)
      : Math.round(index);
    el.scrollTo({ left: target * step, behavior: "smooth" });
    restoreSnap(el, 450);
  };

  /** A drag that moved the rail must not fire the click underneath it. */
  const onClickCapture = (e: React.MouseEvent<HTMLDivElement>) => {
    if (drag.current?.moved) {
      e.preventDefault();
      e.stopPropagation();
      drag.current = null;
    }
  };

  const renderPrice = (service: Service) =>
    service.price === 0 ? (
      <span className="font-serif text-lg font-bold text-accent">
        {localeConfig.services.free}
      </span>
    ) : service.fromPrice ? (
      <span className="font-serif text-lg font-bold tabular-nums text-foreground">{service.fromPrice}</span>
    ) : (
      <span className="flex items-baseline gap-1">
        <span className="text-xs font-medium text-muted-foreground">
          {localeConfig.services.fromPrice}
        </span>
        <span className="font-serif text-lg font-bold tabular-nums text-foreground">
          {/* Sans for the currency glyph — the niche display serifs fall back
              to an ornate/blocky ₪ that reads as a broken character. */}
          <span className="font-sans">{currencySymbol()}</span>
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
    <section
      id="services"
      className="overflow-hidden bg-background py-16 transition-colors duration-300 sm:py-24 lg:py-28"
    >
      {/* ── Header row: title start, arrows end (mirrors under RTL) ── */}
      <div className="mx-auto flex max-w-7xl items-end justify-between gap-6 px-5 sm:px-6">
        <div>
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
            initial={{ opacity: 0, y: Y_LG }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT_ONCE}
            transition={{ duration: NICHE_DURATION[flavor], ease: NICHE_EASING[flavor], delay: 0.08 }}
            className="font-serif text-3xl leading-[1.08] text-balance text-foreground sm:text-4xl md:text-5xl"
          >
            {sectionConfig.subtitle}
          </motion.h2>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={VIEWPORT_ONCE}
          transition={{ duration: NICHE_DURATION[flavor], delay: 0.2 }}
          className="hidden shrink-0 items-center gap-3 lg:flex"
        >
          <motion.button
            type="button"
            onClick={() => scrollByCard(-1)}
            disabled={atStart}
            aria-label={S.prev}
            whileTap={{ scale: 0.97 }}
            className={arrowClass}
          >
            <ChevronLeft size={18} className="rtl:rotate-180" aria-hidden />
          </motion.button>
          <motion.button
            type="button"
            onClick={() => scrollByCard(1)}
            disabled={atEnd}
            aria-label={S.next}
            whileTap={{ scale: 0.97 }}
            className={arrowClass}
          >
            <ChevronRight size={18} className="rtl:rotate-180" aria-hidden />
          </motion.button>
        </motion.div>
      </div>

      {/* ── Scroll rail — full-bleed, padding aligns first card with header ── */}
      <div
        ref={railRef}
        onScroll={updateArrows}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={onClickCapture}
        role="region"
        aria-label={S.rail}
        tabIndex={0}
        className={cn(
          // touch-pan-y: vertical swipes ALWAYS scroll the page; horizontal
          // movement is handled by the pointer handlers above.
          // overflow-y-hidden is load-bearing: overflow-x:auto alone computes
          // overflow-y:auto, and cards still waiting on their whileInView
          // reveal sit translated down by Y_LG (24px) — 8px past pb-4 — which
          // makes the rail vertically scrollable and lets the browser latch
          // wheel/touch gestures to it instead of the page. pb-8 (32px ≥ Y_LG)
          // so the entrance offset never clips against the hidden edge.
          "mt-8 flex touch-pan-y snap-x snap-mandatory gap-[var(--gs-gap)] overflow-x-auto overflow-y-hidden overscroll-x-contain scroll-smooth pb-8 sm:mt-12",
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
            transition={{
              delay: Math.min(index * 0.06, 0.3),
              duration: NICHE_DURATION[flavor],
              ease: NICHE_EASING[flavor],
            }}
            className="group flex w-[74vw] max-w-[320px] shrink-0 snap-start flex-col sm:w-[300px]"
          >
            {/* Portrait image — top ~4/5 of the card */}
            <div className="gs-image relative aspect-[3/4] w-full overflow-hidden bg-muted">
              <img
                src={sectionConfig.images[index % sectionConfig.images.length]}
                alt={service.name}
                loading="lazy"
                decoding="async"
                onError={handleImgError}
                className="h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-[1.05]"
                draggable={false}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/0 to-transparent" />
              {/* Index mark */}
              <span className="absolute start-4 top-4 font-serif text-sm font-bold tabular-nums text-white/85">
                {String(index + 1).padStart(2, "0")}
              </span>
            </div>

            {/* Meta */}
            <div className="flex flex-1 flex-col pt-4">
              <h3 className="font-serif text-lg leading-snug text-foreground transition-colors duration-200 group-hover:text-accent sm:text-xl">
                {service.name}
              </h3>
              <div className="mt-1.5 flex items-baseline justify-between gap-3">
                {renderPrice(service)}
                <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  <Clock size={12} aria-hidden />
                  {service.duration} {localeConfig.services.minutesShort}
                </span>
              </div>
              {bookable && (
                <motion.button
                  type="button"
                  onClick={() => onBookClick(service.id)}
                  whileTap={{ scale: 0.97 }}
                  transition={{ duration: 0.16, ease: EASE_OUT_STRONG }}
                  className="mt-4 inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-[var(--gs-btn-radius)] border border-border bg-transparent px-4 text-xs font-bold uppercase tracking-widest text-foreground transition-colors duration-200 hover:border-accent hover:bg-accent/10 hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                >
                  {bookLabel}
                  <ChevronRight size={14} className="rtl:rotate-180" aria-hidden />
                </motion.button>
              )}
            </div>
          </motion.article>
        ))}
      </div>

      {/* ── Scroll progress — wayfinding for touch, where the arrows are hidden ── */}
      {!(atStart && atEnd) && (
        <div
          className="mx-auto mt-2 h-0.5 w-36 overflow-hidden rounded-full bg-border"
          aria-hidden
        >
          <div
            className="h-full w-full origin-left rounded-full bg-accent transition-transform duration-150 ease-out rtl:origin-right"
            style={{ transform: `scaleX(${progress})` }}
          />
        </div>
      )}

      {/* ── View-all affordance (same locale key as v1) ── */}
      {onNavigateToServices && (
        <motion.div
          initial={{ opacity: 0, y: Y_SM }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEWPORT_ONCE}
          transition={{ delay: 0.2, duration: NICHE_DURATION[flavor], ease: NICHE_EASING[flavor] }}
          className="mt-8 text-center"
        >
          <motion.button
            type="button"
            onClick={onNavigateToServices}
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
    </section>
  );
}
