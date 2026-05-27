import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Sparkles, ImageOff } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { siteConfig } from "../../config/site";
import { localeConfig } from "../../config/locale";
import { resolveLucideIcon } from "../../lib/lucide-icons";
import { interpolate } from "../../lib/interpolate";
import { cn, handleImgError } from "../../lib/utils";
import { HeroObject3D } from "../3d-impact/hero-object-3d";
import { AmbientParticles } from "../3d-impact/ambient-particles";
import { PaperCard } from "../3d-impact/paper-card";
import { usePaperSpring } from "../../hooks/use-paper-spring";
import type { Service } from "../../types";
import {
  DUR_ENTER,
  NICHE_DURATION,
  NICHE_EASING,
  VIEWPORT_ONCE,
  Y_SM,
  Y_MD,
  getNicheFlavor,
} from "../../lib/motion";

type Props = {
  onBookClick: (serviceId?: string) => void;
  onNavigateToServices?: () => void;
};

const ALL_FILTER = "__all__";

/**
 * `<ServicesCardStackTabs>` — opt-in Services variant
 * (`servicesVariant: "card-stack-tabs"`), Velvet Muse style.
 *
 * Composition:
 *
 *   • Header with eyebrow, serif headline (last word styled as cursive
 *     italic for a hairstyling-salon read), subtitle, and optional
 *     description.
 *   • Filter tab row that maps to `service.category`. An `"All"` tab is
 *     prepended at runtime; untagged services only appear under "All".
 *     Omit `filters` to render the grid without tabs.
 *   • Desktop (`lg+`) a 3×2 card grid (up to 6 cards). Each card uses
 *     `<PaperCard>` so the entrance reads as paper settling — staggered
 *     by 80 ms. Tab changes replay the entrance.
 *   • Mobile a stacked carousel — the active card sits centre, prev and
 *     next peek behind at scale 0.85 with a touch of blur. Prev/next
 *     buttons + swipe gesture (drag past 80 px) navigate. The
 *     surrounding cards stay rendered to avoid empty-stack flicker.
 *   • Two CTAs at the bottom: a primary "View full menu" (uses
 *     `ctaLabel`/`ctaHref` or falls back to `onNavigateToServices`) and
 *     a secondary "Book a consultation" (uses `ctaSecondaryLabel`/
 *     `ctaSecondaryHref` or falls back to `onBookClick(undefined)`).
 *
 * Falls back to `null` when `siteConfig.services` is empty (caller is
 * expected to delegate to the legacy renderer).
 */
let warnedMissingServicesCardStackData = false;

export function ServicesCardStackTabs({
  onBookClick,
  onNavigateToServices,
}: Props) {
  const { sections, brand, heroObjects } = siteConfig;
  const sectionConfig = sections.services;
  const services = siteConfig.services;
  const prefersReduced = useReducedMotion();
  const paperSpring = usePaperSpring("medium");

  // Hooks run unconditionally — kept above any early-return below so
  // React's hook order stays stable across mode switches.
  const [activeFilter, setActiveFilter] = useState<string>(ALL_FILTER);
  const [carouselIdx, setCarouselIdx] = useState(0);

  const brandVars = { brand: brand?.name ?? "" };
  const eyebrow = sectionConfig?.eyebrow
    ? interpolate(sectionConfig.eyebrow, brandVars)
    : interpolate(sectionConfig?.title ?? "", brandVars);
  const headline = interpolate(sectionConfig?.subtitle ?? "", brandVars);
  const description = sectionConfig?.description
    ? interpolate(sectionConfig.description, brandVars)
    : "";

  const niche = siteConfig.business.type;
  const flavor = getNicheFlavor(niche);

  const filters = (sectionConfig?.filters ?? []).filter(Boolean);

  const filteredServices = useMemo<Service[]>(() => {
    if (activeFilter === ALL_FILTER) return services;
    return services.filter((s) => s.category === activeFilter);
  }, [activeFilter, services]);

  // Cap to 6 — the grid is purpose-built around 3×2.
  const displayed = filteredServices.slice(0, 6);

  // Cameo slot — same convention as the other Services variants.
  const requestedSlot = sectionConfig?.heroObjectSlot ?? "accent";
  const resolvedSlot =
    heroObjects?.[requestedSlot]?.src
      ? requestedSlot
      : heroObjects?.primary?.src
        ? "primary"
        : null;
  const showCameo =
    sectionConfig?.show3DObject !== false && resolvedSlot !== null;
  const particles = resolvedSlot ? heroObjects?.[resolvedSlot]?.particles : undefined;

  // Resolve images — explicit service.image wins, then the section pool.
  const resolveImage = (service: Service, index: number): string | null => {
    if (service.image) return service.image;
    const pool = sectionConfig?.images;
    if (!pool || pool.length === 0) return null;
    return pool[index % pool.length] ?? null;
  };

  // Primary CTA — "View full menu" by default, deferring to the locale
  // when unset.
  const ctaPrimaryLabel =
    sectionConfig?.ctaLabel ?? localeConfig.services.exploreAllTreatments;
  const ctaPrimaryHref = sectionConfig?.ctaHref;
  // Secondary CTA — "Book a consultation" default.
  const ctaSecondaryLabel =
    sectionConfig?.ctaSecondaryLabel ?? localeConfig.services.book;
  const ctaSecondaryHref = sectionConfig?.ctaSecondaryHref;

  // Bail out *after* hooks so React stays happy. Warn once so dev
  // notices the misconfiguration.
  if (!sectionConfig) return null;
  if (services.length === 0) {
    if (import.meta.env.DEV && !warnedMissingServicesCardStackData) {
      warnedMissingServicesCardStackData = true;
      // eslint-disable-next-line no-console
      console.warn(
        `[ServicesCardStackTabs] servicesVariant="card-stack-tabs" but siteConfig.services is empty — caller should fall back to the legacy renderer.`,
      );
    }
    return null;
  }

  // Reset the carousel pointer when filter narrows the list below the
  // current index. Pure derived state — recomputed each render.
  const safeCarouselIdx =
    displayed.length === 0
      ? 0
      : Math.min(carouselIdx, displayed.length - 1);

  const goPrev = () =>
    setCarouselIdx((i) => Math.max(0, Math.min(i, displayed.length - 1) - 1));
  const goNext = () =>
    setCarouselIdx((i) => Math.min(displayed.length - 1, i + 1));

  // Render a single service card. Shared by both desktop grid and
  // mobile carousel so visual styling stays identical.
  const renderCard = (service: Service, index: number) => {
    const Icon = resolveLucideIcon(service.iconName, Sparkles);
    const img = resolveImage(service, index);
    return (
      <div
        className={cn(
          "group relative flex h-full flex-col overflow-hidden rounded-3xl border border-border/60 bg-card shadow-sm transition-[border-color,box-shadow,transform] duration-300",
          "hover:border-accent/40 hover:shadow-xl",
        )}
      >
        <div className="relative aspect-[5/4] w-full overflow-hidden bg-muted">
          {img ? (
            <img
              src={img}
              alt={service.name}
              loading="lazy"
              decoding="async"
              onError={handleImgError}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-accent/20 via-accent/8 to-transparent">
              <ImageOff size={42} className="text-muted-foreground/40" aria-hidden />
            </div>
          )}
          {/* Icon chip — sits over the image so it reads as a category mark. */}
          <div className="absolute end-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-background/85 text-accent shadow-md backdrop-blur-sm">
            <Icon size={18} aria-hidden />
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-3 p-6 lg:p-7">
          <h3 className="font-serif text-xl font-semibold leading-snug text-card-foreground lg:text-[1.4rem]">
            {service.name}
          </h3>
          {service.description && (
            <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
              {service.description}
            </p>
          )}
          <div className="mt-auto flex items-center justify-between pt-2">
            {service.fromPrice ? (
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {service.fromPrice}
              </span>
            ) : (
              <span />
            )}
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-accent transition-transform duration-300 group-hover:translate-x-1 rtl:group-hover:-translate-x-1">
              {localeConfig.services.book}
              <ChevronRight size={16} className="rtl:rotate-180" aria-hidden />
            </span>
          </div>
        </div>
      </div>
    );
  };

  // Split the headline so the last word can be rendered in italic
  // serif — the Velvet Muse "cursive accent on one word". Falls back
  // to the unstyled headline when only one word is present.
  const renderHeadline = () => {
    if (!headline) return null;
    const parts = headline.trim().split(/\s+/);
    if (parts.length <= 1) return headline;
    const last = parts.pop()!;
    return (
      <>
        {parts.join(" ")}{" "}
        <span className="font-serif italic text-accent">{last}</span>
      </>
    );
  };

  return (
    <section
      id="services"
      className="relative isolate overflow-hidden bg-background px-6 py-24 transition-colors duration-300 md:px-10 md:py-28 lg:py-32"
    >
      {/* Soft warm bloom — Velvet Muse leans cream + warm gold accents. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_8%,var(--brand-accent)/0.10,transparent_55%)]"
      />

      <div className="relative mx-auto w-full max-w-7xl">
        {/* Floating 3D cameo — peeks from the top-start. */}
        {showCameo && (
          <div
            aria-hidden
            className="pointer-events-none absolute -top-12 start-0 hidden lg:block xl:-start-6"
          >
            {particles && particles !== "none" && (
              <div className="pointer-events-none absolute inset-0 -z-10">
                <AmbientParticles type={particles} density="medium" />
              </div>
            )}
            <HeroObject3D
              slotName={resolvedSlot ?? "accent"}
              size="md"
              alt=""
              fallback={null}
            />
          </div>
        )}

        {/* ── Header ─────────────────────────────────────────────── */}
        <header className="mx-auto mb-12 max-w-3xl text-center lg:mb-16">
          {eyebrow && (
            <motion.p
              initial={prefersReduced ? false : { opacity: 0, y: Y_SM }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={VIEWPORT_ONCE}
              transition={{ duration: DUR_ENTER }}
              className="mb-4 text-[11px] font-semibold uppercase tracking-[0.32em] text-accent"
            >
              {eyebrow}
            </motion.p>
          )}
          {headline && (
            <motion.h2
              initial={prefersReduced ? false : { opacity: 0, y: Y_MD }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={VIEWPORT_ONCE}
              transition={{ duration: NICHE_DURATION[flavor], ease: NICHE_EASING[flavor] }}
              className="font-serif text-[clamp(2.25rem,4.4vw,3.75rem)] font-semibold leading-[1.05] tracking-tight text-foreground"
            >
              {renderHeadline()}
            </motion.h2>
          )}
          {description && (
            <motion.p
              initial={prefersReduced ? false : { opacity: 0, y: Y_SM }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={VIEWPORT_ONCE}
              transition={{ duration: DUR_ENTER, delay: 0.1 }}
              className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg"
            >
              {description}
            </motion.p>
          )}
        </header>

        {/* ── Filter tabs ────────────────────────────────────────── */}
        {filters.length > 0 && (
          <div className="mb-10 flex flex-wrap justify-center gap-2 lg:mb-14">
            <FilterChip
              label={localeConfig.gallery?.viewAllPhotos?.includes("{count}")
                ? "All"
                : "All"}
              active={activeFilter === ALL_FILTER}
              onClick={() => {
                setActiveFilter(ALL_FILTER);
                setCarouselIdx(0);
              }}
            />
            {filters.map((f) => (
              <FilterChip
                key={f}
                label={f}
                active={activeFilter === f}
                onClick={() => {
                  setActiveFilter(f);
                  setCarouselIdx(0);
                }}
              />
            ))}
          </div>
        )}

        {/* ── Cards: desktop grid + mobile carousel ─────────────── */}
        {displayed.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            {interpolate(localeConfig.services.servicesAvailable, { count: 0 })}
          </p>
        ) : (
          <>
            {/* Desktop / tablet: 3×2 grid */}
            <ul
              className="hidden grid-cols-2 gap-6 lg:grid lg:grid-cols-3 lg:gap-8"
              aria-label="Service catalogue"
            >
              <AnimatePresence mode="popLayout" initial={false}>
                {displayed.map((service, i) => (
                  <PaperCard
                    key={`${activeFilter}-${service.id}`}
                    delay={i * 0.08}
                    intensity="medium"
                    onClick={
                      siteConfig.features.showBooking
                        ? () => onBookClick(service.id)
                        : onNavigateToServices
                    }
                    ariaLabel={service.name}
                    className="block"
                  >
                    {renderCard(service, i)}
                  </PaperCard>
                ))}
              </AnimatePresence>
            </ul>

            {/* Mobile: stacked carousel */}
            <div className="relative lg:hidden">
              <div
                className="relative mx-auto h-[480px] w-full max-w-md select-none"
                aria-label="Service carousel"
              >
                {displayed.map((service, i) => {
                  const offset = i - safeCarouselIdx;
                  // Render only the centre card + immediate neighbours to
                  // keep the layered stack readable.
                  if (Math.abs(offset) > 1) return null;
                  const isCenter = offset === 0;
                  return (
                    <motion.div
                      key={`${activeFilter}-${service.id}`}
                      drag={isCenter ? "x" : false}
                      dragConstraints={{ left: 0, right: 0 }}
                      dragElastic={0.2}
                      onDragEnd={(_e, info) => {
                        if (info.offset.x < -80) goNext();
                        else if (info.offset.x > 80) goPrev();
                      }}
                      animate={{
                        x: offset * 60,
                        scale: isCenter ? 1 : 0.85,
                        opacity: isCenter ? 1 : 0.55,
                        filter: isCenter ? "blur(0px)" : "blur(2px)",
                        zIndex: isCenter ? 30 : 10,
                      }}
                      transition={paperSpring}
                      className="absolute inset-x-4 top-0"
                      onClick={() => {
                        if (!isCenter) return;
                        if (siteConfig.features.showBooking) onBookClick(service.id);
                        else onNavigateToServices?.();
                      }}
                    >
                      {renderCard(service, i)}
                    </motion.div>
                  );
                })}
              </div>

              {/* Prev / next + dots — visible only when more than one card. */}
              {displayed.length > 1 && (
                <div className="mt-6 flex items-center justify-center gap-4">
                  <button
                    type="button"
                    onClick={goPrev}
                    disabled={safeCarouselIdx === 0}
                    aria-label="Previous service"
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-card text-foreground transition-colors hover:border-accent/50 hover:text-accent disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                  >
                    <ChevronLeft size={18} className="rtl:rotate-180" aria-hidden />
                  </button>
                  <div className="flex items-center gap-1.5" aria-hidden>
                    {displayed.map((_, i) => (
                      <span
                        key={i}
                        className={cn(
                          "h-1.5 rounded-full transition-all duration-300",
                          i === safeCarouselIdx
                            ? "w-6 bg-accent"
                            : "w-1.5 bg-border",
                        )}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={goNext}
                    disabled={safeCarouselIdx >= displayed.length - 1}
                    aria-label="Next service"
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-card text-foreground transition-colors hover:border-accent/50 hover:text-accent disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                  >
                    <ChevronRight size={18} className="rtl:rotate-180" aria-hidden />
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── CTAs ───────────────────────────────────────────────── */}
        <motion.div
          initial={prefersReduced ? false : { opacity: 0, y: Y_SM }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEWPORT_ONCE}
          transition={{ duration: DUR_ENTER, delay: 0.15 }}
          className="mt-14 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4"
        >
          {ctaPrimaryHref ? (
            <a
              href={ctaPrimaryHref}
              className="inline-flex items-center gap-2 rounded-full bg-accent px-8 py-3.5 text-sm font-semibold uppercase tracking-[0.22em] text-primary-foreground shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:bg-accent-light hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
            >
              {ctaPrimaryLabel}
              <ChevronRight size={16} className="rtl:rotate-180" aria-hidden />
            </a>
          ) : (
            <button
              type="button"
              onClick={onNavigateToServices}
              className="inline-flex items-center gap-2 rounded-full bg-accent px-8 py-3.5 text-sm font-semibold uppercase tracking-[0.22em] text-primary-foreground shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:bg-accent-light hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
            >
              {ctaPrimaryLabel}
              <ChevronRight size={16} className="rtl:rotate-180" aria-hidden />
            </button>
          )}
          {ctaSecondaryHref ? (
            <a
              href={ctaSecondaryHref}
              className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-transparent px-7 py-3 text-sm font-semibold uppercase tracking-[0.22em] text-foreground transition-colors duration-300 hover:border-accent hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
            >
              {ctaSecondaryLabel}
            </a>
          ) : (
            <button
              type="button"
              onClick={() => onBookClick()}
              className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-transparent px-7 py-3 text-sm font-semibold uppercase tracking-[0.22em] text-foreground transition-colors duration-300 hover:border-accent hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
            >
              {ctaSecondaryLabel}
            </button>
          )}
        </motion.div>
      </div>
    </section>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
        active
          ? "border-transparent bg-accent text-primary-foreground shadow-sm"
          : "border-border/70 bg-transparent text-muted-foreground hover:border-accent/50 hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}
