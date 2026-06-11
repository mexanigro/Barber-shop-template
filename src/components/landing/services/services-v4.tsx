import { useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { ChevronRight, Clock } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
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
  NICHE_CARD_HOVER,
  EASE_OUT_STRONG,
} from "../../../lib/motion";

type Props = {
  onBookClick: (serviceId?: string) => void;
  onNavigateToServices?: () => void;
};

const ALL_TAB = "__all__";

/** UI microcopy local to this variant — business copy stays in config/locales. */
const STRINGS: Record<"en" | "he" | "ru" | "ar", { all: string }> = {
  en: { all: "All" },
  he: { all: "הכל" },
  ru: { all: "Все" },
  ar: { all: "الكل" },
};

/**
 * ServicesV4 — tabbed categories (`sections.services.variant: "v4"`).
 *
 * Tabs are derived from unique `service.category` values with an "All" tab
 * prepended. When no service declares a category the tab row is omitted and
 * a single grid renders. Tab switches crossfade the grid (AnimatePresence
 * mode="wait"); the active tab indicator slides via layoutId. The tablist is
 * keyboard operable (arrows / Home / End, RTL-aware) with roving tabindex.
 */
export function ServicesV4({ onBookClick, onNavigateToServices }: Props) {
  const sectionConfig = siteConfig.sections.services;
  const services = siteConfig.services;

  const niche = siteConfig.business.type;
  const flavor = getNicheFlavor(niche);
  const isEstetica = niche === "estetica";
  const isNails = niche === "nails";
  const S = STRINGS[localeConfig.lang] ?? STRINGS.en;

  // Same landing slice contract as Services v1. Tabs are derived from the
  // displayed slice so every tab is guaranteed to have visible cards.
  const nicheDefault = isEstetica ? 4 : isNails ? 3 : 4;
  const MAX_LANDING = siteConfig.landingServicesCount ?? nicheDefault;
  const displayedServices = services.slice(0, MAX_LANDING);
  const hasMore = services.length > MAX_LANDING;

  // Pair each service with its image by ORIGINAL index so the photo stays
  // stable for a service regardless of the active filter.
  const items = displayedServices.map((service, index) => ({
    service,
    image: sectionConfig.images[index % sectionConfig.images.length],
  }));

  const categories = Array.from(
    new Set(displayedServices.map((s) => s.category).filter((c): c is string => Boolean(c))),
  );
  const hasTabs = categories.length > 0;
  const tabValues = [ALL_TAB, ...categories];

  const [activeTab, setActiveTab] = useState(ALL_TAB);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const visible = activeTab === ALL_TAB
    ? items
    : items.filter(({ service }) => service.category === activeTab);

  const bookable = siteConfig.features.showBooking || siteConfig.features.showInquiry;
  const bookLabel = siteConfig.features.showBooking
    ? localeConfig.services.book
    : (localeConfig.lang === "he" ? "הצעת מחיר" : "Get Quote");

  const onTabKeyDown = (e: ReactKeyboardEvent) => {
    const idx = tabValues.indexOf(activeTab);
    const isRtl = document.documentElement.dir === "rtl";
    let next: number | null = null;
    if (e.key === "ArrowRight") next = isRtl ? idx - 1 : idx + 1;
    else if (e.key === "ArrowLeft") next = isRtl ? idx + 1 : idx - 1;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabValues.length - 1;
    if (next === null) return;
    e.preventDefault();
    const wrapped = (next + tabValues.length) % tabValues.length;
    setActiveTab(tabValues[wrapped]);
    tabRefs.current[wrapped]?.focus();
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
          {/* Sans for the currency glyph — serif fallback ₪ reads as broken. */}
          <span className="font-sans">{currencySymbol()}</span>
          {service.price}
        </span>
      </span>
    );

  const activeIdx = Math.max(0, tabValues.indexOf(activeTab));

  return (
    <section
      id="services"
      className="bg-background px-5 py-16 transition-colors duration-300 sm:px-6 sm:py-24 lg:py-28"
    >
      <div className="mx-auto max-w-7xl">
        {/* ── Header ── */}
        <div className="mb-10 text-center sm:mb-14">
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

        {/* ── Tab row (omitted when no service has a category) ── */}
        {hasTabs && (
          <motion.div
            initial={{ opacity: 0, y: Y_SM }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT_ONCE}
            transition={{ duration: NICHE_DURATION[flavor], ease: NICHE_EASING[flavor], delay: 0.15 }}
            role="tablist"
            aria-label={sectionConfig.title}
            onKeyDown={onTabKeyDown}
            className="mb-10 flex flex-wrap justify-center gap-2 sm:mb-14"
          >
            {tabValues.map((value, i) => {
              const isActive = activeTab === value;
              return (
                <motion.button
                  key={value}
                  ref={(el) => { tabRefs.current[i] = el; }}
                  type="button"
                  role="tab"
                  id={`services-v4-tab-${i}`}
                  aria-selected={isActive}
                  aria-controls="services-v4-panel"
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => setActiveTab(value)}
                  whileTap={{ scale: 0.97 }}
                  transition={{ duration: 0.16, ease: EASE_OUT_STRONG }}
                  className={cn(
                    "relative min-h-[44px] rounded-full border px-5 py-2 text-xs font-semibold uppercase tracking-[0.18em]",
                    "transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
                    isActive ? "border-transparent" : "border-border hover:border-foreground/30",
                  )}
                >
                  {isActive && (
                    <motion.span
                      layoutId="services-v4-tab-pill"
                      transition={{ duration: 0.3, ease: EASE_OUT_STRONG }}
                      className="absolute inset-0 rounded-full bg-foreground"
                      aria-hidden
                    />
                  )}
                  <span
                    className={cn(
                      "relative z-10 transition-colors duration-200",
                      isActive ? "text-background" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {value === ALL_TAB ? S.all : value}
                  </span>
                </motion.button>
              );
            })}
          </motion.div>
        )}

        {/* ── Grid — crossfades on tab change ── */}
        <div
          {...(hasTabs && {
            id: "services-v4-panel",
            role: "tabpanel",
            "aria-labelledby": `services-v4-tab-${activeIdx}`,
          })}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.ul
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: EASE_OUT_STRONG }}
              className={cn(
                "grid grid-cols-1 gap-[var(--gs-gap)] sm:grid-cols-2",
                // 3 columns leave a lone orphan card when count % 3 === 1
                // (e.g. 4 services → 3 + 1). Fall back to a balanced 2-col
                // grid in that case — same rationale as v1's orphan logic.
                visible.length % 3 === 1 ? "lg:grid-cols-2" : "lg:grid-cols-3",
              )}
            >
              {visible.map(({ service, image }, i) => (
                <motion.li
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
                    delay: Math.min(i * 0.07, 0.35),
                    duration: NICHE_DURATION[flavor],
                    ease: NICHE_EASING[flavor],
                  }}
                  className={cn(
                    "group flex flex-col overflow-hidden rounded-[var(--gs-card-radius)] border border-border bg-card shadow-elevated",
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
                  <div className="gs-image relative aspect-[4/3] w-full overflow-hidden bg-muted">
                    <img
                      src={image}
                      alt={service.name}
                      loading="lazy"
                      decoding="async"
                      onError={handleImgError}
                      className="h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-[1.04]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" />
                    {service.category && (
                      <span className="absolute start-3 top-3 rounded-full bg-black/55 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white backdrop-blur-md">
                        {service.category}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-5 sm:p-6">
                    <h3 className="font-serif text-xl leading-snug text-card-foreground transition-colors duration-200 group-hover:text-accent sm:text-2xl">
                      {service.name}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground line-clamp-2">
                      {service.description}
                    </p>
                    <div className="mt-auto flex items-end justify-between gap-3 border-t border-border/70 pt-4">
                      {renderPrice(service)}
                      <span className="flex items-center gap-1.5 pb-0.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        <Clock size={12} aria-hidden />
                        {service.duration} {localeConfig.services.minutesShort}
                      </span>
                    </div>
                    {bookable && (
                      <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-accent opacity-100 transition-[opacity,translate] duration-300 ease-out sm:translate-y-1 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100">
                        {bookLabel}
                        <ChevronRight size={13} className="rtl:rotate-180" aria-hidden />
                      </span>
                    )}
                  </div>
                </motion.li>
              ))}
            </motion.ul>
          </AnimatePresence>
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
