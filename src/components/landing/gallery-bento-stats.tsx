import { ArrowRight, ImageOff, Images } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { siteConfig } from "../../config/site";
import { localeConfig } from "../../config/locale";
import { interpolate } from "../../lib/interpolate";
import { cn, handleImgError } from "../../lib/utils";
import { HeroObject3D } from "../3d-impact/hero-object-3d";
import { AmbientParticles } from "../3d-impact/ambient-particles";
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
  onViewFull: () => void;
};

/**
 * `<GalleryBentoStats>` — opt-in Gallery variant
 * (`galleryVariant: "bento-stats"`).
 *
 * Aurea-style layout. Centred header on top, asymmetric bento grid of
 * up to 6 images on the right (or full-width when the cameo is hidden),
 * a floating 3D cameo on the left at `lg` and up, and an optional
 * `stats[]` bar below the grid.
 *
 * Bento layout (lg+, 4 cols × 3 rows):
 *   ┌─────────┬───┬───┐
 *   │   img1  │ 2 │ 3 │
 *   │  (2×2)  ├───┼───┤
 *   │         │ 4 │ 5 │
 *   ├─────┬───┤(1×2)├──┤
 *   │  6  │ . │ . │ . │
 *   └─────┴───┴───┴───┘
 *
 * Below `lg` the bento collapses to a 2-column even grid and the cameo
 * hides (bento layouts read badly at narrow widths). When `gallery`
 * has fewer than 6 images the bento falls back to a simple even grid
 * at every breakpoint.
 */
let warnedMissingGalleryBentoData = false;

export function GalleryBentoStats({ onViewFull }: Props) {
  const { sections, brand, heroObjects, gallery: rawGallery } = siteConfig;
  const sectionConfig = sections.gallery;
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

  // Fall back to legacy when there's nothing to show.
  const gallery = Array.isArray(rawGallery) ? rawGallery : [];
  if (gallery.length === 0) {
    if (import.meta.env.DEV && !warnedMissingGalleryBentoData) {
      warnedMissingGalleryBentoData = true;
      // eslint-disable-next-line no-console
      console.warn(
        `[GalleryBentoStats] galleryVariant="bento-stats" but siteConfig.gallery is empty — caller should fall back to the legacy renderer.`,
      );
    }
    return null;
  }

  // The bento is designed around 6 images. With fewer, fall back to a
  // simple even grid at every breakpoint so we don't render gaping
  // empty cells. With more, show the first 6 + surface a "view full"
  // tile so the rest stays discoverable.
  const bentoSlots = gallery.slice(0, 6);
  const hasMore = gallery.length > bentoSlots.length;
  const useBento = bentoSlots.length === 6;

  const stats = (sectionConfig.stats ?? []).filter(
    (s) => s.value || s.label,
  );

  // Cameo slot — defaults to "accent" to match the services / why-choose-us
  // variants in tenants that ship all three.
  const requestedSlot = sectionConfig.heroObjectSlot ?? "accent";
  const resolvedSlot =
    heroObjects?.[requestedSlot]?.src
      ? requestedSlot
      : heroObjects?.primary?.src
        ? "primary"
        : null;
  const showCameo = sectionConfig.show3DObject !== false && resolvedSlot !== null;
  const particles = resolvedSlot ? heroObjects?.[resolvedSlot]?.particles : undefined;

  const ctaLabel =
    sectionConfig.ctaLabel ?? localeConfig.gallery.explorePortfolio;
  const ctaHref = sectionConfig.ctaHref;

  // Bento positions for the 6-image layout. Each entry is the grid
  // placement (col-start / row-start / col-end / row-end). Tailwind
  // arbitrary values keep this declarative without `style={}` props.
  const bentoCells = [
    "lg:[grid-area:1/1/3/3]",   // img1 — 2×2 hero
    "lg:[grid-area:1/3/2/4]",   // img2
    "lg:[grid-area:1/4/2/5]",   // img3
    "lg:[grid-area:2/3/4/4]",   // img4 — 1×2 vertical
    "lg:[grid-area:2/4/3/5]",   // img5
    "lg:[grid-area:3/1/4/3]",   // img6 — 2×1 horizontal bottom-left
  ];

  // Aspect ratios per slot — the hero gets a taller crop, the
  // vertical slot a portrait crop, the horizontal slot a wide crop.
  // Mobile (<lg) overrides them all with `aspect-square` so the
  // simple even grid stays predictable.
  const bentoAspects = [
    "lg:aspect-[5/4]",  // img1 hero — slight landscape
    "lg:aspect-square", // img2
    "lg:aspect-square", // img3
    "lg:aspect-[3/5]",  // img4 vertical
    "lg:aspect-square", // img5
    "lg:aspect-[5/3]",  // img6 horizontal
  ];

  return (
    <section
      id="gallery"
      className="relative isolate overflow-hidden bg-background px-6 py-24 transition-colors duration-300 md:px-10 md:py-28 lg:py-32"
    >
      {/* Warm bloom keyed to the accent — mirrors the Aurea services
          variant so the two sections read as visually paired when both
          ship in the same site. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_8%,var(--brand-accent)/0.10,transparent_55%)]"
      />

      <div className="relative mx-auto w-full max-w-7xl">
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

        {/* ── Cameo + bento row ──────────────────────────────────── */}
        <div
          className={cn(
            "grid gap-10",
            // Two-column at lg only when the cameo is shown; otherwise
            // the bento spans the full width.
            showCameo ? "lg:grid-cols-[minmax(0,0.32fr)_minmax(0,1fr)] lg:gap-14 xl:gap-20" : "",
          )}
        >
          {/* ── Floating 3D cameo — left side at lg+ only ───────── */}
          {showCameo && (
            <div
              aria-hidden
              className="pointer-events-none relative hidden lg:flex lg:items-start lg:justify-center lg:pt-6"
            >
              {particles && particles !== "none" && (
                <div className="pointer-events-none absolute inset-0 -z-10">
                  <AmbientParticles type={particles} density="medium" />
                </div>
              )}
              <HeroObject3D
                slotName={resolvedSlot ?? "accent"}
                size="lg"
                alt=""
                fallback={null}
              />
            </div>
          )}

          {/* ── Bento grid (or even-grid fallback) ───────────────── */}
          <div className="min-w-0">
            {useBento ? (
              <ul
                className={cn(
                  // Mobile: 2-column even grid.
                  "grid grid-cols-2 gap-3 sm:gap-4",
                  // Desktop: 4×3 bento via grid-template-areas using
                  // arbitrary-value Tailwind. Auto-rows keeps row
                  // heights equal so the vertical 1×2 reads correctly.
                  "lg:grid-cols-4 lg:grid-rows-3 lg:auto-rows-fr lg:gap-4",
                )}
              >
                {bentoSlots.map((src, i) => (
                  <BentoTile
                    key={`bento-${src.slice(-24)}-${i}`}
                    src={src}
                    index={i}
                    onClick={onViewFull}
                    placement={bentoCells[i]}
                    aspect={bentoAspects[i]}
                    delay={stagger(i)}
                    duration={NICHE_DURATION[flavor]}
                    easing={NICHE_EASING[flavor]}
                    prefersReduced={prefersReduced ?? false}
                  />
                ))}
              </ul>
            ) : (
              <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 lg:gap-5">
                {bentoSlots.map((src, i) => (
                  <BentoTile
                    key={`bento-simple-${src.slice(-24)}-${i}`}
                    src={src}
                    index={i}
                    onClick={onViewFull}
                    placement=""
                    aspect="aspect-[4/3]"
                    delay={stagger(i)}
                    duration={NICHE_DURATION[flavor]}
                    easing={NICHE_EASING[flavor]}
                    prefersReduced={prefersReduced ?? false}
                  />
                ))}
              </ul>
            )}

            {/* ── "View full gallery" link ─ surfaces the rest when
                we capped the bento to 6 images. ─────────────────── */}
            {hasMore && (
              <motion.div
                initial={prefersReduced ? false : { opacity: 0, y: Y_SM }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={VIEWPORT_ONCE}
                transition={{ delay: 0.2, duration: DUR_ENTER }}
                className="mt-6 flex justify-end"
              >
                <button
                  type="button"
                  onClick={onViewFull}
                  className="group inline-flex items-center gap-1.5 text-sm font-semibold text-accent transition-colors duration-200 hover:text-accent-light focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                >
                  {interpolate(localeConfig.gallery.viewAllPhotos, {
                    count: gallery.length,
                  })}
                  <ArrowRight
                    size={14}
                    className="transition-transform duration-200 group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1"
                  />
                </button>
              </motion.div>
            )}
          </div>
        </div>

        {/* ── Stats bar — surfaces under the bento when configured ── */}
        {stats.length > 0 && (
          <motion.ul
            initial={prefersReduced ? false : { opacity: 0, y: Y_LG }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT_ONCE}
            transition={{ delay: 0.15, duration: NICHE_DURATION[flavor], ease: NICHE_EASING[flavor] }}
            className={cn(
              "mt-14 grid grid-cols-2 gap-6 border-t border-border/60 pt-10 sm:gap-8 lg:mt-20 lg:pt-14",
              // Cap the cols so 3 stats stay readable; 4+ wraps to 2 rows.
              stats.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-4",
            )}
          >
            {stats.map((stat, i) => (
              <motion.li
                key={`stat-${i}-${stat.label}`}
                initial={prefersReduced ? false : { opacity: 0, y: Y_SM }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={VIEWPORT_ONCE}
                transition={{ delay: stagger(i), duration: DUR_ENTER }}
                className="text-center sm:text-start"
              >
                <p className="text-[clamp(2rem,3.6vw,3.25rem)] font-black leading-none tracking-tight text-foreground">
                  {stat.value}
                </p>
                <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground sm:text-xs">
                  {stat.label}
                </p>
              </motion.li>
            ))}
          </motion.ul>
        )}

        {/* ── CTA — only when explicitly configured. The "View all
            photos" link above already surfaces the gallery route when
            there are more images than the bento shows. ──────────── */}
        {(sectionConfig.ctaLabel || sectionConfig.ctaHref) && (
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
                className="inline-flex items-center gap-2 rounded-full bg-accent px-8 py-3.5 text-sm font-semibold uppercase tracking-[0.22em] text-primary-foreground shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:bg-accent-light hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
              >
                <Images size={16} aria-hidden />
                {ctaLabel}
              </a>
            ) : (
              <button
                type="button"
                onClick={onViewFull}
                className="inline-flex items-center gap-2 rounded-full bg-accent px-8 py-3.5 text-sm font-semibold uppercase tracking-[0.22em] text-primary-foreground shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:bg-accent-light hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
              >
                <Images size={16} aria-hidden />
                {ctaLabel}
              </button>
            )}
          </motion.div>
        )}
      </div>
    </section>
  );
}

type BentoTileProps = {
  src: string;
  index: number;
  onClick: () => void;
  placement: string;
  aspect: string;
  delay: number;
  duration: number;
  easing: [number, number, number, number];
  prefersReduced: boolean;
};

function BentoTile({
  src,
  index,
  onClick,
  placement,
  aspect,
  delay,
  duration,
  easing,
  prefersReduced,
}: BentoTileProps) {
  return (
    <motion.li
      initial={prefersReduced ? false : { opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={VIEWPORT_ONCE}
      transition={{ delay, duration, ease: easing }}
      onClick={onClick}
      tabIndex={0}
      role="button"
      aria-label={interpolate(localeConfig.gallery.portfolioAlt, {
        n: index + 1,
      })}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        "group relative cursor-pointer overflow-hidden rounded-2xl border border-border/60 bg-muted shadow-sm transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 lg:rounded-3xl",
        "aspect-square",
        aspect,
        placement,
      )}
    >
      {src ? (
        <img
          src={src}
          alt={interpolate(localeConfig.gallery.portfolioAlt, { n: index + 1 })}
          loading="lazy"
          decoding="async"
          onError={handleImgError}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.05]"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-accent/15 via-accent/5 to-transparent">
          <ImageOff size={36} className="text-muted-foreground/40" aria-hidden />
        </div>
      )}
      {/* Subtle hover overlay — image index + arrow icon. */}
      <div className="absolute inset-0 flex items-end justify-between bg-gradient-to-t from-black/65 via-transparent to-transparent p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/85">
          {interpolate(localeConfig.gallery.workNumber, {
            n: String(index + 1).padStart(2, "0"),
          })}
        </span>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm">
          <ArrowRight size={14} className="text-white rtl:rotate-180" aria-hidden />
        </div>
      </div>
    </motion.li>
  );
}
