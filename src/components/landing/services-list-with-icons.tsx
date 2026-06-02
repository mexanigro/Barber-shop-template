import { Sparkles, ChevronRight, ArrowUpRight } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { siteConfig } from "../../config/site";
import { localeConfig } from "../../config/locale";
import { resolveLucideIcon } from "../../lib/lucide-icons";
import { interpolate } from "../../lib/interpolate";
import { cn } from "../../lib/utils";
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
  getNicheFlavor,
  nicheStagger,
} from "../../lib/motion";

type Props = {
  onBookClick: (serviceId?: string) => void;
  /** Navigate to the dedicated services / treatments page if present. */
  onNavigateToServices?: () => void;
};

/**
 * `<ServicesListWithIcons>` — opt-in Services variant
 * (`servicesVariant: "list-with-icons"`).
 *
 * Onyx-style layout. Two inner layouts driven by `services.layout`:
 *
 *   • `"grid"` (default) — 4-column responsive card grid; each card
 *     is a vertical stack (icon + title + desc + arrow), dark
 *     surface, fine accent border.
 *   • `"vertical-list"` — horizontal rows stacked vertically; each row
 *     is icon + copy + arrow. Useful when the niche has many services
 *     and we want the section to read like an editorial menu.
 *
 * Reads the same `siteConfig.services` array every other Services
 * variant uses, plus a few optional fields the schema exposes:
 *
 *   • `services.eyebrow`        — small kicker above the headline.
 *   • `services.description`    — 1–2 extra lines under `subtitle`.
 *   • `services.heroObjectSlot` — which `siteConfig.heroObjects` slot
 *                                 to read for the cameo (default
 *                                 `"accent"`, falls back to `"primary"`).
 *   • `services.show3DObject`   — false hides the floating cameo.
 *   • `services.ctaLabel`       — overrides the default localized CTA.
 *   • `services.ctaHref`        — when set, the CTA renders as an anchor.
 *
 * Each card uses the per-service `iconName` (a Lucide name); when
 * absent it falls back to `Sparkles`.
 */
export function ServicesListWithIcons({
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

  const layout = sectionConfig.layout === "vertical-list" ? "vertical-list" : "grid";

  // Cap displayed services to the same landing budget the default
  // variant uses. This keeps the grid readable when a preset defines
  // 8+ services.
  const nicheDefault = niche === "estetica" ? 2 : niche === "nails" ? 3 : 4;
  const landingBudget = siteConfig.landingServicesCount ?? nicheDefault;
  const displayed = services.slice(0, Math.min(landingBudget, services.length));
  const hasMore = services.length > displayed.length;

  // Cameo slot — defaults to "accent" so it doesn't fight the Hero (primary)
  // or WhyChooseUs (secondary by default) for the same slot in tenants
  // that configure all three.
  const requestedSlot = sectionConfig.heroObjectSlot ?? "accent";
  const resolvedSlot =
    heroObjects?.[requestedSlot]?.src
      ? requestedSlot
      : heroObjects?.primary?.src
        ? "primary"
        : null;
  const showCameo = sectionConfig.show3DObject !== false && resolvedSlot !== null;
  const particles = resolvedSlot ? heroObjects?.[resolvedSlot]?.particles : undefined;

  const handleServiceClick = (service: Service) => {
    if (onNavigateToServices) return onNavigateToServices;
    if (siteConfig.features.showBooking) return () => onBookClick(service.id);
    return undefined;
  };

  const ctaLabel = sectionConfig.ctaLabel ?? localeConfig.services.exploreAllTreatments;
  const ctaHref = sectionConfig.ctaHref;
  // Synthesize a CTA only when there are more services to surface OR
  // the tenant explicitly set a CTA label/href.
  const showCta =
    Boolean(sectionConfig.ctaLabel || sectionConfig.ctaHref) ||
    (hasMore && Boolean(onNavigateToServices));

  return (
    <section
      id="services"
      className="relative isolate overflow-hidden bg-background px-6 py-24 transition-colors duration-300 md:px-10 md:py-28 lg:py-32"
    >
      {/* Subtle radial glow keyed to the accent — same treatment as the
          Hero 3D variant and the WhyChooseUs icon-grid variant. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_15%_30%,var(--brand-accent)/0.08,transparent_60%)]"
      />

      <div className="relative mx-auto w-full max-w-7xl">
        {/* ── Floating 3D cameo — desktop only, positioned to the side
            of the grid so it doesn't compete with card content. The
            `end-0` logical property mirrors to the start side under
            RTL so the cameo stays opposite the headline copy. ───── */}
        {showCameo && (
          <div
            aria-hidden
            className="pointer-events-none absolute -top-8 end-0 hidden lg:block xl:-end-8"
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

        {/* ── Section header ──────────────────────────────────────── */}
        <header className="mb-14 max-w-3xl lg:mb-20">
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
              className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg"
            >
              {description}
            </motion.p>
          )}
        </header>

        {/* ── Cards ──────────────────────────────────────────────── */}
        {displayed.length === 0 ? null : layout === "vertical-list" ? (
          <ul className="flex flex-col divide-y divide-border/60 border-y border-border/60">
            {displayed.map((service, i) => {
              const IconComponent = resolveLucideIcon(service.iconName, Sparkles);
              const handler = handleServiceClick(service);
              const interactive = Boolean(handler);
              return (
                <motion.li
                  key={service.id}
                  initial={prefersReduced ? false : { opacity: 0, y: Y_SM }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={VIEWPORT_ONCE}
                  transition={{
                    delay: stagger(i),
                    duration: NICHE_DURATION[flavor],
                    ease: NICHE_EASING[flavor],
                  }}
                  className={cn(
                    "group relative flex items-center gap-6 py-6 transition-colors duration-300",
                    interactive && "cursor-pointer hover:bg-card/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
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
                  <div className="flex h-14 w-14 flex-none items-center justify-center rounded-xl border border-accent/20 bg-accent/10 text-accent transition-colors duration-300 group-hover:border-accent/40 group-hover:bg-accent/20 sm:h-16 sm:w-16">
                    <IconComponent size={26} aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="line-clamp-2 text-lg font-bold text-foreground sm:text-xl">
                      {service.name}
                    </h3>
                    {service.description && (
                      <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
                        {service.description}
                      </p>
                    )}
                  </div>
                  {/* `-scale-x-100` mirrors the diagonal arrow so it still
                      points up-and-outward in RTL (rotate-180 would flip it
                      down-and-inward, which reads backwards). */}
                  <div className="hidden flex-none text-accent transition-transform duration-300 group-hover:translate-x-1 sm:block rtl:-scale-x-100 rtl:group-hover:-translate-x-1">
                    <ArrowUpRight size={22} aria-hidden />
                  </div>
                </motion.li>
              );
            })}
          </ul>
        ) : (
          <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {displayed.map((service, i) => {
              const IconComponent = resolveLucideIcon(service.iconName, Sparkles);
              const handler = handleServiceClick(service);
              const interactive = Boolean(handler);
              return (
                <motion.li
                  key={service.id}
                  initial={prefersReduced ? false : { opacity: 0, y: Y_SM }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={VIEWPORT_ONCE}
                  transition={{
                    delay: stagger(i),
                    duration: NICHE_DURATION[flavor],
                    ease: NICHE_EASING[flavor],
                  }}
                  className={cn(
                    "group relative flex flex-col gap-5 rounded-2xl border border-border/60 bg-card/60 p-6 transition-colors duration-300 hover:border-accent/40 hover:bg-card",
                    interactive && "cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
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
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent transition-colors duration-300 group-hover:bg-accent/20">
                    <IconComponent size={24} aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="mb-2 line-clamp-2 text-base font-bold text-card-foreground sm:text-lg">
                      {service.name}
                    </h3>
                    {service.description && (
                      <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                        {service.description}
                      </p>
                    )}
                  </div>
                  <div className="mt-auto flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.18em] text-accent transition-transform duration-300 group-hover:translate-x-1 rtl:group-hover:-translate-x-1">
                    {service.fromPrice ?? localeConfig.services.book}
                    <ChevronRight size={14} className="rtl:rotate-180" aria-hidden />
                  </div>
                </motion.li>
              );
            })}
          </ul>
        )}

        {/* ── CTA — appears when there are more services than the
            landing budget OR the tenant explicitly defined ctaLabel/Href. ─ */}
        {showCta && (
          <motion.div
            initial={prefersReduced ? false : { opacity: 0, y: Y_SM }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT_ONCE}
            transition={{ delay: 0.2, duration: DUR_ENTER }}
            className="mt-12 flex justify-center"
          >
            {ctaHref ? (
              <a
                href={ctaHref}
                className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-card/40 px-7 py-3 text-sm font-semibold uppercase tracking-[0.22em] text-foreground backdrop-blur-sm transition-colors duration-300 hover:border-accent hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
              >
                {ctaLabel}
                <ChevronRight size={16} className="rtl:rotate-180" aria-hidden />
              </a>
            ) : (
              <button
                type="button"
                onClick={onNavigateToServices}
                className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-card/40 px-7 py-3 text-sm font-semibold uppercase tracking-[0.22em] text-foreground backdrop-blur-sm transition-colors duration-300 hover:border-accent hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
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
