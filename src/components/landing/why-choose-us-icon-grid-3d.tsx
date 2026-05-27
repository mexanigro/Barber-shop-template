import { HelpCircle } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { siteConfig } from "../../config/site";
import { resolveLucideIcon } from "../../lib/lucide-icons";
import { interpolate } from "../../lib/interpolate";
import { cn } from "../../lib/utils";
import { HeroObject3D } from "../3d-impact/hero-object-3d";
import { AmbientParticles } from "../3d-impact/ambient-particles";
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

/**
 * `<WhyChooseUsIconGrid3D>` — opt-in Why-Choose-Us variant
 * (`whyChooseUsVariant: "icon-grid-3d"`).
 *
 * Aurea / Onyx-style two-column layout: stack of icon-cards on the
 * left, large 3D hero object on the right. Below `lg` the layout
 * collapses into one column with the object trailing the cards.
 *
 * Reads the same `siteConfig.sections.whyChooseUs` shape every other
 * variant uses, plus a few optional fields the schema exposes for this
 * variant:
 *
 *   • `whyChooseUs.eyebrow`        — small kicker above the headline.
 *   • `whyChooseUs.description`    — 1-2 extra lines under `subtitle`.
 *   • `whyChooseUs.heroObjectSlot` — which `siteConfig.heroObjects`
 *                                    slot to read (default "secondary",
 *                                    falls back to "primary").
 *   • `whyChooseUs.show3DObject`   — false renders cards full-width
 *                                    without the side object.
 *
 * Renders an `<AmbientParticles>` layer behind the object when
 * `siteConfig.heroObjects[slot].particles` is set.
 */
export function WhyChooseUsIconGrid3D() {
  const { sections, brand, heroObjects } = siteConfig;
  const sectionConfig = sections.whyChooseUs;
  const prefersReduced = useReducedMotion();

  if (!sectionConfig || !sectionConfig.benefits) return null;

  const benefits = sectionConfig.benefits;
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

  // Resolve slot: explicit → "secondary" default → "primary" fallback.
  // The HeroObject3D hook also falls back to "primary" when the requested
  // slot is missing — we resolve explicitly here so AmbientParticles reads
  // the matching slot's particle config.
  const requestedSlot = sectionConfig.heroObjectSlot ?? "secondary";
  const resolvedSlot =
    heroObjects?.[requestedSlot]?.src
      ? requestedSlot
      : heroObjects?.primary?.src
        ? "primary"
        : null;

  const showObject = sectionConfig.show3DObject !== false && resolvedSlot !== null;
  const particles = resolvedSlot ? heroObjects?.[resolvedSlot]?.particles : undefined;

  const cardsColumn = (
    <div className="flex flex-col">
      <header className="mb-10">
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

      {benefits.length > 0 && (
        <ul
          className={cn(
            "grid grid-cols-1 gap-4",
            // 2x2 grid above sm when we have 4+ cards; single column for ≤3.
            benefits.length >= 4 ? "sm:grid-cols-2" : "",
          )}
        >
          {benefits.map((benefit, i) => {
            const IconComponent = resolveLucideIcon(benefit.iconName, HelpCircle);
            return (
              <motion.li
                key={`wcu3d-${benefit.title.slice(0, 24)}-${i}`}
                initial={prefersReduced ? false : { opacity: 0, y: Y_SM }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={VIEWPORT_ONCE}
                transition={{
                  delay: stagger(i),
                  duration: NICHE_DURATION[flavor],
                  ease: NICHE_EASING[flavor],
                }}
                className="group relative flex items-start gap-5 rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur-sm transition-colors duration-300 hover:border-accent/40 hover:bg-card sm:p-6"
              >
                <div className="flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-accent/10 text-accent transition-colors duration-300 group-hover:bg-accent/20">
                  <IconComponent size={22} aria-hidden />
                </div>
                <div className="min-w-0">
                  <h3 className="mb-1.5 text-base font-bold text-card-foreground sm:text-lg">
                    {benefit.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
                    {benefit.desc}
                  </p>
                </div>
              </motion.li>
            );
          })}
        </ul>
      )}
    </div>
  );

  return (
    <section
      id="why-choose-us"
      className="relative isolate overflow-hidden bg-background px-6 py-24 transition-colors duration-300 md:px-10 md:py-28 lg:py-32"
    >
      {/* Soft radial glow keyed to the accent — mirrors the Hero 3D variant. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_85%_50%,var(--brand-accent)/0.08,transparent_60%)]"
      />

      <div className="mx-auto w-full max-w-7xl">
        {showObject ? (
          <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-16 xl:gap-20">
            <div className="order-1">{cardsColumn}</div>

            {/* ── Hero object column (bottom on mobile, right on desktop) ── */}
            <div className="relative order-2 flex w-full items-center justify-center lg:sticky lg:top-24 lg:justify-end">
              {particles && particles !== "none" && (
                <div className="pointer-events-none absolute inset-0 -z-10">
                  <AmbientParticles type={particles} density="medium" />
                </div>
              )}
              <HeroObject3D
                slotName={resolvedSlot ?? "secondary"}
                size="xl"
                alt={brand?.name ? `${brand.name} — ${headline}` : headline}
                fallback={
                  <div
                    aria-hidden
                    className="h-72 w-72 rounded-3xl bg-card/40 sm:h-96 sm:w-96"
                  />
                }
              />
            </div>
          </div>
        ) : (
          // show3DObject === false (or no slot configured): single column,
          // cards centred. Keeps the header readable and the cards centred
          // without forcing a max-width that fights the section padding.
          <div className="mx-auto max-w-3xl">{cardsColumn}</div>
        )}
      </div>
    </section>
  );
}
