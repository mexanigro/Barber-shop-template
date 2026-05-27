import { Sparkles, ChevronRight, ImageOff } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { siteConfig } from "../../config/site";
import { localeConfig } from "../../config/locale";
import { resolveLucideIcon } from "../../lib/lucide-icons";
import { interpolate } from "../../lib/interpolate";
import { cn, handleImgError } from "../../lib/utils";
import { HeroObject3D } from "../3d-impact/hero-object-3d";
import { AmbientParticles } from "../3d-impact/ambient-particles";
import type { Service } from "../../types";
import {
  DUR_ENTER,
  NICHE_DURATION,
  NICHE_EASING,
  VIEWPORT_ONCE,
  Y_SM,
  Y_MD,
  Y_LG,
  getNicheFlavor,
  nicheStagger,
} from "../../lib/motion";

type Props = {
  onBookClick: (serviceId?: string) => void;
  /** Navigate to the dedicated services / treatments page if present. */
  onNavigateToServices?: () => void;
};

/**
 * `<ServicesTreatmentCardGrid>` — opt-in Services variant
 * (`servicesVariant: "treatment-card-grid"`).
 *
 * Aurea-style layout. Header on top, then a responsive 3-column grid
 * of treatment cards (image on top + title + description + "Learn
 * more" arrow). Mobile collapses to a single column.
 *
 * Reads the same `siteConfig.services` array every other Services
 * variant uses, plus the optional fields the new schema exposes
 * (`eyebrow`, `description`, `heroObjectSlot`, `show3DObject`,
 * `ctaLabel`, `ctaHref`).
 *
 * Each card uses `service.image` (or falls back to
 * `sections.services.images[i]`) and renders the per-service
 * `iconName` overlay inside the image when no image is available
 * (full image fallback path).
 */
export function ServicesTreatmentCardGrid({
  onBookClick,
  onNavigateToServices,
}: Props) {
  const { sections, brand, heroObjects } = siteConfig;
  const sectionConfig = sections.services;
  const services = siteConfig.services;
  const prefersReduced = useReducedMotion();

  if (!sectionConfig) return null;

  const brandVars = { brand: brand?.name ?? "" };
  const eyebrow = sectionConfig.eyebrow
    ? interpolate(sectionConfig.eyebrow, brandVars)
    : interpolate(sectionConfig.title ?? "", brandVars);
  const headline = interpolate(sectionConfig.subtitle ?? "", brandVars);
  const description = sectionConfig.description
    ? interpolate(sectionConfig.description, brandVars)
    : "";

  const niche = siteConfig.business.type;
  const flavor = getNicheFlavor(niche);
  const stagger = nicheStagger(niche);

  // Cap displayed services — same heuristic as the Onyx variant but
  // pinned to a multiple of 3 so the 3-column grid stays even.
  const nicheDefault = niche === "estetica" ? 3 : niche === "nails" ? 3 : 6;
  const landingBudget = siteConfig.landingServicesCount ?? nicheDefault;
  const maxCards = Math.max(landingBudget, 6);
  const displayed = services.slice(0, Math.min(maxCards, services.length));
  const hasMore = services.length > displayed.length;

  // Cameo slot — defaults to "accent" so it doesn't collide with the
  // Hero (primary) or WhyChooseUs (secondary) in tenants that configure
  // all three.
  const requestedSlot = sectionConfig.heroObjectSlot ?? "accent";
  const resolvedSlot =
    heroObjects?.[requestedSlot]?.src
      ? requestedSlot
      : heroObjects?.primary?.src
        ? "primary"
        : null;
  const showCameo = sectionConfig.show3DObject !== false && resolvedSlot !== null;
  const particles = resolvedSlot ? heroObjects?.[resolvedSlot]?.particles : undefined;

  // Image fallback chain: explicit service.image → sectionConfig.images[i] → null.
  const resolveImage = (service: Service, index: number): string | null => {
    if (service.image) return service.image;
    const fromList = sectionConfig.images?.[index % (sectionConfig.images?.length || 1)];
    return fromList ?? null;
  };

  const handleServiceClick = (service: Service) => {
    if (onNavigateToServices) return onNavigateToServices;
    if (siteConfig.features.showBooking) return () => onBookClick(service.id);
    return undefined;
  };

  const ctaLabel = sectionConfig.ctaLabel ?? localeConfig.services.exploreAllTreatments;
  const ctaHref = sectionConfig.ctaHref;
  const showCta =
    Boolean(sectionConfig.ctaLabel || sectionConfig.ctaHref) ||
    (hasMore && Boolean(onNavigateToServices));

  return (
    <section
      id="services"
      className="relative isolate overflow-hidden bg-background px-6 py-24 transition-colors duration-300 md:px-10 md:py-28 lg:py-32"
    >
      {/* Warm bloom keyed to accent — visually distinct from the Onyx
          variant's cool radial. Aurea style leans cream/warm so the
          bloom sits centred behind the headline. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_8%,var(--brand-accent)/0.10,transparent_55%)]"
      />

      <div className="relative mx-auto w-full max-w-7xl">
        {/* ── Floating 3D cameo — peeks from the top-left, opposite the
            Onyx variant's right-side cameo so the two read as a pair
            when both ship in the same site. ──────────────────────── */}
        {showCameo && (
          <div
            aria-hidden
            className="pointer-events-none absolute -top-10 left-0 hidden lg:block xl:-left-4"
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

        {/* ── Section header — centred, Aurea style ──────────────── */}
        <header className="mx-auto mb-14 max-w-3xl text-center lg:mb-20">
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
              className="text-[clamp(2rem,4.2vw,3.5rem)] font-black leading-[1.05] tracking-tight text-foreground"
            >
              {headline}
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

        {/* ── Cards ──────────────────────────────────────────────── */}
        {displayed.length === 0 ? null : (
          <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
            {displayed.map((service, i) => {
              const IconComponent = resolveLucideIcon(service.iconName, Sparkles);
              const handler = handleServiceClick(service);
              const interactive = Boolean(handler);
              const image = resolveImage(service, i);
              return (
                <motion.li
                  key={service.id}
                  initial={prefersReduced ? false : { opacity: 0, y: Y_LG }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={VIEWPORT_ONCE}
                  transition={{
                    delay: stagger(i),
                    duration: NICHE_DURATION[flavor],
                    ease: NICHE_EASING[flavor],
                  }}
                  className={cn(
                    "group relative flex flex-col overflow-hidden rounded-3xl border border-border/60 bg-card shadow-sm transition-all duration-500 hover:-translate-y-1 hover:border-accent/30 hover:shadow-xl",
                    interactive && "cursor-pointer",
                  )}
                  onClick={handler}
                  {...(interactive && {
                    role: "button",
                    tabIndex: 0,
                    onKeyDown: (e: React.KeyboardEvent) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handler?.();
                      }
                    },
                  })}
                >
                  {/* ── Image / fallback ───────────────────────── */}
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
                    {image ? (
                      <img
                        src={image}
                        alt={service.name}
                        loading="lazy"
                        decoding="async"
                        onError={handleImgError}
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-accent/15 via-accent/5 to-transparent">
                        <ImageOff
                          size={48}
                          className="text-muted-foreground/40"
                          aria-hidden
                        />
                      </div>
                    )}
                    {/* Icon badge — sits in the top-right of the image, gives
                        the card a category hook even when the image is generic. */}
                    <div className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-background/80 text-accent shadow-md backdrop-blur-sm">
                      <IconComponent size={18} aria-hidden />
                    </div>
                  </div>

                  {/* ── Body ───────────────────────────────────── */}
                  <div className="flex flex-1 flex-col gap-3 p-6 lg:p-7">
                    <h3 className="text-xl font-bold text-card-foreground lg:text-2xl">
                      {service.name}
                    </h3>
                    {service.description && (
                      <p className="text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
                        {service.description}
                      </p>
                    )}
                    <div className="mt-auto flex items-center justify-between pt-3">
                      {service.fromPrice ? (
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
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
                </motion.li>
              );
            })}
          </ul>
        )}

        {/* ── CTA ────────────────────────────────────────────────── */}
        {showCta && (
          <motion.div
            initial={prefersReduced ? false : { opacity: 0, y: Y_SM }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT_ONCE}
            transition={{ delay: 0.2, duration: DUR_ENTER }}
            className="mt-14 flex justify-center"
          >
            {ctaHref ? (
              <a
                href={ctaHref}
                className="inline-flex items-center gap-2 rounded-full bg-accent px-8 py-3.5 text-sm font-semibold uppercase tracking-[0.22em] text-white shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:bg-accent-light hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
              >
                {ctaLabel}
                <ChevronRight size={16} className="rtl:rotate-180" aria-hidden />
              </a>
            ) : (
              <button
                type="button"
                onClick={onNavigateToServices}
                className="inline-flex items-center gap-2 rounded-full bg-accent px-8 py-3.5 text-sm font-semibold uppercase tracking-[0.22em] text-white shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:bg-accent-light hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
              >
                {ctaLabel}
                <ChevronRight size={16} className="rtl:rotate-180" aria-hidden />
              </button>
            )}
          </motion.div>
        )}
      </div>
    </section>
  );
}
