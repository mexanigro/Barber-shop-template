import React from "react";
import { Clock, ChevronRight, Calendar, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { cn, handleImgError } from "../../lib/utils";
import { localeConfig } from "../../config/locale";
import { siteConfig } from "../../config/site";
import { interpolate } from "../../lib/interpolate";
import { resolveLucideIcon } from "../../lib/lucide-icons";
import {
  Y_SM, Y_MD, Y_LG, X_IN, VIEWPORT_ONCE,
  getNicheFlavor, nicheStagger, NICHE_DURATION, NICHE_EASING, NICHE_CARD_HOVER,
  sectionTitleContainerVariants, textWordVariants,
  nicheScaleIn, EASE_OUT_STRONG, BUTTON_PRESS,
} from "../../lib/motion";
import { ServicesListWithIcons } from "./services-list-with-icons";
import { ServicesTreatmentCardGrid } from "./services-treatment-card-grid";
import { ServicesCardStackTabs } from "./services-card-stack-tabs";

const AuraServicesModule = React.lazy(() => import("./aura/aura-services").then(m => ({ default: m.AuraServices })));

let warnedMissingServicesVariantData = false;

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
  onBookClick: (serviceId?: string) => void;
  overFixedBackdrop?: boolean;
  onNavigateToServices?: () => void;
}) {
  const { sections } = siteConfig;
  const { services: sectionConfig } = sections;
  const services = siteConfig.services;

  /* ── 3D Impact: services variants ───────────────────────────────────
     Opt-in via `services.servicesVariant`. Each variant component
     handles its own slot resolution (`heroObjectSlot` defaults to
     `"accent"` and falls back to `"primary"`); the cameo is only
     rendered when an entry exists or when `show3DObject === false`.

     If the active site config has no services defined we fall through
     to the legacy renderer (which already handles the empty path with
     its own grid). Warn once in dev so the misconfiguration surfaces. */
  if (sectionConfig?.servicesVariant === "aura") {
    if (services.length > 0) {
      return (
        <React.Suspense fallback={null}>
          <AuraServicesModule onBookClick={onBookClick} onNavigateToServices={onNavigateToServices} />
        </React.Suspense>
      );
    }
  }
  if (sectionConfig?.servicesVariant === "list-with-icons") {
    if (services.length > 0) {
      return (
        <ServicesListWithIcons
          onBookClick={onBookClick}
          onNavigateToServices={onNavigateToServices}
        />
      );
    }
    if (import.meta.env.DEV && !warnedMissingServicesVariantData) {
      warnedMissingServicesVariantData = true;
      // eslint-disable-next-line no-console
      console.warn(
        `[Services] servicesVariant="list-with-icons" but siteConfig.services is empty — falling back to the default Services.`,
      );
    }
  }
  if (sectionConfig?.servicesVariant === "treatment-card-grid") {
    if (services.length > 0) {
      return (
        <ServicesTreatmentCardGrid
          onBookClick={onBookClick}
          onNavigateToServices={onNavigateToServices}
        />
      );
    }
    if (import.meta.env.DEV && !warnedMissingServicesVariantData) {
      warnedMissingServicesVariantData = true;
      // eslint-disable-next-line no-console
      console.warn(
        `[Services] servicesVariant="treatment-card-grid" but siteConfig.services is empty — falling back to the default Services.`,
      );
    }
  }
  if (sectionConfig?.servicesVariant === "card-stack-tabs") {
    if (services.length > 0) {
      return (
        <ServicesCardStackTabs
          onBookClick={onBookClick}
          onNavigateToServices={onNavigateToServices}
        />
      );
    }
    if (import.meta.env.DEV && !warnedMissingServicesVariantData) {
      warnedMissingServicesVariantData = true;
      // eslint-disable-next-line no-console
      console.warn(
        `[Services] servicesVariant="card-stack-tabs" but siteConfig.services is empty — falling back to the default Services.`,
      );
    }
  }

  const isTattoo = siteConfig.business.type === "tattoo";
  const isNails = siteConfig.business.type === "nails";
  const isEstetica = siteConfig.business.type === "estetica";
  const isCafeteria = siteConfig.business.type === "cafeteria";
  const isRemodelaciones = siteConfig.business.type === "remodelaciones";
  const isBarberia = siteConfig.business.type === "barberia";

  const niche = siteConfig.business.type;
  const flavor = getNicheFlavor(niche);
  const stagger = nicheStagger(niche);
  const nicheDefault = isEstetica ? 4 : isNails ? 3 : 4;
  const MAX_LANDING = siteConfig.landingServicesCount ?? nicheDefault;
  const displayedServices = services.slice(0, MAX_LANDING);
  const hasMore = services.length > MAX_LANDING;

  /** True for the last card when the total count is odd (grid orphan). */
  const isOddOrphan = (i: number) =>
    displayedServices.length % 2 !== 0 && i === displayedServices.length - 1;

  return (
    <section
      id="services"
      className={cn(
        "flex flex-col justify-center px-5 py-10 transition-colors duration-300 sm:px-6 sm:py-28 lg:block",
        !isBarberia && !isTattoo && "min-h-[100dvh] sm:min-h-0",
        overFixedBackdrop
          ? isNails
            ? "bg-background/88 backdrop-blur-md border-t border-foreground/10"
            : isEstetica
              ? "border-t border-foreground/10 bg-background/82 backdrop-blur-md"
              : "border-t border-foreground/10 bg-background/88 backdrop-blur-md"
          : "bg-background",
      )}
    >
      <div className="mx-auto max-w-7xl">

        {/* -- Section header -- */}
        <div className="mb-8 flex flex-col gap-3 sm:mb-20 sm:gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <motion.p
              initial={{ opacity: 0, y: Y_SM }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={VIEWPORT_ONCE}
              className="mb-2 text-[10px] font-bold uppercase tracking-[0.3em] text-foreground/70 sm:mb-3 sm:text-xs"
            >
              {sectionConfig.title}
            </motion.p>
            <motion.h2
              variants={sectionTitleContainerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={VIEWPORT_ONCE}
              className={
                isCafeteria
                  ? "font-serif text-2xl font-normal tracking-wide text-foreground sm:text-4xl md:text-5xl"
                  : isRemodelaciones
                    ? "text-2xl font-extrabold tracking-tight text-foreground sm:text-4xl md:text-5xl"
                    : isEstetica
                      ? "font-serif text-[clamp(2.25rem,9vw,3.5rem)] leading-[1.08] tracking-wide text-foreground sm:text-4xl md:text-5xl"
                      : isNails
                        ? "text-2xl font-black uppercase tracking-wide text-foreground sm:text-4xl md:text-6xl"
                        : "text-2xl font-black uppercase tracking-tighter text-foreground sm:text-4xl md:text-6xl"
              }
            >
              {sectionConfig.subtitle.split(" ").map((word: string, i: number, arr: string[]) => (
                <motion.span
                  key={i}
                  variants={textWordVariants(niche)}
                  className={cn(
                    "inline-block",
                    isEstetica && i === arr.length - 1 && "font-serif italic text-[var(--brand-tertiary,#8a7065)]",
                  )}
                >
                  {word}&nbsp;
                </motion.span>
              ))}
            </motion.h2>
            {/* Descriptive subtitle — mobile only for estetica, fills vertical space */}
            {isEstetica && (
              <motion.p
                initial={{ opacity: 0, y: Y_SM }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={VIEWPORT_ONCE}
                transition={{ delay: 0.15 }}
                className="mt-3 max-w-sm text-sm leading-relaxed text-foreground/65 sm:mt-4 sm:max-w-md sm:text-base"
              >
                {sectionConfig.description || localeConfig.services.esteticaSubtitle || "Thoughtful expertise. Premium products. Unmistakable results — each protocol tailored to your unique anatomy."}
              </motion.p>
            )}
          </div>
          <motion.div
            initial={{ opacity: 0, x: X_IN }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={VIEWPORT_ONCE}
            transition={{ delay: 0.2 }}
            className="hidden shrink-0 sm:block"
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
          /* ── Estetica: pill-style icon cards — premium glass feel ── */
          <>
            {/* Mobile: pill list  |  Desktop: 2-col editorial grid */}
            <ul className="flex flex-col gap-4 sm:grid sm:grid-cols-2 sm:gap-6">
              {displayedServices.map((service, index) => {
                const handleClick = onNavigateToServices ?? (siteConfig.features.showBooking ? () => onBookClick(service.id) : undefined);
                const IconComponent = resolveLucideIcon(service.iconName, Sparkles);
                return (
                  <motion.li
                    key={service.id}
                    initial={{ opacity: 0, y: Y_SM }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={VIEWPORT_ONCE}
                    transition={{ delay: stagger(index), duration: NICHE_DURATION[flavor], ease: NICHE_EASING[flavor] }}
                    className={cn(
                      "group flex items-center gap-4 rounded-2xl border border-border/60 bg-card/70 px-5 py-5 backdrop-blur-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 [transition:border-color_0.3s_cubic-bezier(0.23,1,0.32,1),background-color_0.3s_ease] hover:border-accent/30 hover:bg-card",
                      "sm:flex-col sm:items-stretch sm:gap-0 sm:rounded-none sm:border-border sm:bg-card sm:p-0 sm:backdrop-blur-none",
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
                    {/* Mobile: icon circle  |  Desktop: thumbnail image */}
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors duration-300 sm:hidden"
                      style={{ backgroundColor: "color-mix(in srgb, var(--brand-tertiary, var(--brand-accent)) 12%, transparent)", color: "var(--brand-tertiary, var(--brand-accent))" }}
                    >
                      <IconComponent size={20} aria-hidden />
                    </div>
                    <div className="hidden sm:block aspect-[16/10] w-full shrink-0 overflow-hidden bg-muted">
                      <img
                        src={sectionConfig.images[index % sectionConfig.images.length]}
                        alt={service.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                        loading="lazy"
                        onError={handleImgError}
                      />
                    </div>
                    {/* Text */}
                    <div className="min-w-0 flex-1 sm:p-5 md:p-6">
                      <h3 className="font-serif text-[15px] font-medium tracking-wide text-foreground transition-colors duration-200 group-hover:text-accent sm:text-xl md:text-2xl sm:font-normal">
                        {service.name}
                      </h3>
                      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground line-clamp-1 sm:mt-2 sm:text-sm sm:line-clamp-3">
                        {service.description}
                      </p>
                      <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground/60 sm:mt-3 sm:text-xs">
                        <Clock size={11} />
                        <span>{service.duration} {localeConfig.services.minutesShort}</span>
                      </div>
                    </div>
                    {/* Mobile: chevron hint */}
                    <ChevronRight size={16} className="shrink-0 text-accent/40 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:text-accent sm:hidden rtl:rotate-180" aria-hidden />
                  </motion.li>
                );
              })}
            </ul>

            {/* CTA — solid accent button matching hero style */}
            <motion.div
              initial={{ opacity: 0, y: Y_SM }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={VIEWPORT_ONCE}
              transition={{ delay: 0.3 }}
              className="mt-8 flex justify-center sm:mt-10"
            >
              <button
                type="button"
                onClick={onNavigateToServices ?? (() => onBookClick())}
                className="inline-flex items-center gap-1.5 rounded-xl bg-foreground px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-background shadow-[0_4px_16px_-4px_rgba(0,0,0,0.2),0_1px_3px_-1px_rgba(0,0,0,0.1)] active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 sm:rounded-2xl sm:px-7 sm:py-3.5 sm:text-xs sm:tracking-[0.15em] lg:hover:-translate-y-0.5 lg:hover:shadow-[0_8px_24px_-6px_rgba(0,0,0,0.25),0_2px_6px_-2px_rgba(0,0,0,0.12)] [transition:background-color_0.3s_cubic-bezier(0.23,1,0.32,1),box-shadow_0.3s_cubic-bezier(0.23,1,0.32,1),transform_0.16s_cubic-bezier(0.23,1,0.32,1)]"
              >
                {localeConfig.services.exploreAllTreatments}
                <ChevronRight size={14} className="rtl:rotate-180" aria-hidden />
              </button>
            </motion.div>
          </>
        ) : isRemodelaciones ? (
          /* ── Remodelaciones: feature-rich cards with images + bullet features ── */
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {displayedServices.map((service, index) => {
              const isClickable = siteConfig.features.showBooking || siteConfig.features.showInquiry;
              const handleCardClick = isClickable ? () => onBookClick(service.id) : undefined;
              return (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: Y_LG }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={VIEWPORT_ONCE}
                transition={{ delay: stagger(index), duration: NICHE_DURATION[flavor], ease: NICHE_EASING[flavor] }}
                whileHover={{
                  y: NICHE_CARD_HOVER[flavor].y,
                  boxShadow: NICHE_CARD_HOVER[flavor].shadow,
                }}
                className={cn(
                  "group relative overflow-hidden rounded-2xl border border-border bg-card shadow-elevated transition-colors duration-300",
                  "hover:border-accent/30",
                  isClickable && "cursor-pointer",
                  isOddOrphan(index) && "md:col-span-2 md:flex md:flex-row",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
                )}
                onClick={handleCardClick}
                {...(isClickable && {
                  role: "button",
                  tabIndex: 0,
                  onKeyDown: (e: React.KeyboardEvent) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onBookClick(service.id);
                    }
                  },
                })}
              >
                {/* Image */}
                <div className={cn(
                  "relative overflow-hidden bg-muted",
                  isOddOrphan(index) ? "aspect-[16/9] md:aspect-auto md:w-1/2" : "aspect-[16/9]"
                )}>
                  <img
                    src={sectionConfig.images[index % sectionConfig.images.length]}
                    alt={service.name}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                    onError={handleImgError}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

                  {/* Price badge */}
                  <div className="absolute bottom-4 right-4 rounded-xl bg-accent px-4 py-2 text-white shadow-lg">
                    {service.price === 0 ? (
                      <span className="text-sm font-bold uppercase">{localeConfig.services.free}</span>
                    ) : (
                      <span className="text-lg font-bold">
                        {service.fromPrice || `${localeConfig.currency.symbol}${service.price}`}
                      </span>
                    )}
                  </div>

                  {/* Popular badge */}
                  {service.popular && (
                    <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold text-slate-900 shadow-sm">
                      {localeConfig.lang === "he" ? "מומלץ" : localeConfig.lang === "ru" ? "Популярное" : localeConfig.lang === "ar" ? "مميّز" : "Popular"}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className={cn("flex flex-col justify-between p-6", isOddOrphan(index) && "md:w-1/2")}>
                  <div>
                    <h3 className="mb-2 text-xl font-bold tracking-tight text-card-foreground transition-colors duration-200 group-hover:text-accent">
                      {service.name}
                    </h3>
                    <p className="mb-4 text-sm leading-relaxed text-muted-foreground line-clamp-2">
                      {service.description}
                    </p>

                    {/* Feature bullets */}
                    {service.features && service.features.length > 0 && (
                      <ul className="space-y-1.5">
                        {service.features.slice(0, 3).map((feat, fi) => (
                          <li key={fi} className="flex items-start gap-2 text-xs text-muted-foreground">
                            <svg className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* CTA for quote request */}
                  {isClickable && !siteConfig.features.showBooking && (
                    <div className="mt-4 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-accent opacity-100 sm:opacity-0 sm:translate-y-1 transition-all duration-300 sm:group-hover:opacity-100 sm:group-hover:translate-y-0">
                      <Calendar size={13} />
                      <span>{siteConfig.hero.ctaPrimary || (localeConfig.lang === "he" ? "בקשו הצעת מחיר" : "Get a Quote")}</span>
                      <ChevronRight size={13} />
                    </div>
                  )}

                  {/* Bottom accent line */}
                  <div className="mt-5 h-px w-0 bg-gradient-to-r from-accent to-transparent transition-all duration-500 group-hover:w-full" />
                </div>
              </motion.div>
              );
            })}
          </div>
        ) : (
          /* ── Default: image cards with index numbers + price badges ── */
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {displayedServices.map((service, index) => {
              const cardClickable = siteConfig.features.showBooking || siteConfig.features.showInquiry;
              return (
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
                  "group relative flex flex-col overflow-hidden border border-border bg-card shadow-elevated [transition:border-color_0.3s_cubic-bezier(0.23,1,0.32,1),background-color_0.3s_ease]",
                  "hover:border-accent/30 dark:hover:border-accent/20",
                  isTattoo ? "rounded-xl" : isRemodelaciones ? "rounded-2xl" : "rounded-3xl",
                  cardClickable && "cursor-pointer",
                  isOddOrphan(index) && "md:col-span-2 md:flex-row",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
                )}
                onClick={cardClickable ? () => onBookClick(service.id) : undefined}
                {...(cardClickable && {
                  role: "button",
                  tabIndex: 0,
                  onKeyDown: (e: React.KeyboardEvent) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onBookClick(service.id);
                    }
                  },
                })}
              >
                {/* Image with clip-path reveal */}
                <motion.div
                  {...nicheScaleIn(niche)}
                  transition={{ delay: stagger(index) + 0.1, duration: NICHE_DURATION[flavor] * 1.5, ease: NICHE_EASING[flavor] }}
                  className={cn(
                    "relative overflow-hidden bg-muted",
                    isOddOrphan(index)
                      ? "aspect-[16/9] md:aspect-auto md:w-1/2"
                      : isNails ? "aspect-[16/8]" : "aspect-[16/9]"
                  )}
                >
                  <img
                    src={sectionConfig.images[index % sectionConfig.images.length]}
                    alt={service.name}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                    onError={handleImgError}
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
                  isNails ? "p-5 sm:p-6" : "p-5 sm:p-7",
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

                    {cardClickable && (
                      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-accent-light opacity-100 sm:opacity-0 sm:translate-x-2 transition-all duration-300 sm:group-hover:opacity-100 sm:group-hover:translate-x-0">
                        <Calendar size={13} />
                        <span>{siteConfig.features.showBooking ? localeConfig.services.book : (localeConfig.lang === "he" ? "הצעת מחיר" : "Get Quote")}</span>
                        <ChevronRight size={13} />
                      </div>
                    )}
                  </div>

                  {/* Bottom accent line */}
                  <div className="mt-5 h-px w-0 bg-gradient-to-r from-accent-light to-transparent transition-all duration-500 group-hover:w-full" />
                </div>
              </motion.div>
              );
            })}
          </div>
        )}

        {/* View all services CTA (skipped for estetica — has its own pill CTA above) */}
        {!isEstetica && hasMore && (onNavigateToServices || siteConfig.features.showBooking || siteConfig.features.showInquiry) && (
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
              className={cn(
                "inline-flex items-center gap-2 text-sm font-medium text-accent transition-colors duration-200 hover:text-accent-light focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
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
