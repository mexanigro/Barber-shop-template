import { ArrowRight, ImageOff, Images } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { siteConfig } from "../../config/site";
import { localeConfig } from "../../config/locale";
import { interpolate } from "../../lib/interpolate";
import { cn, handleImgError } from "../../lib/utils";
import { HeroObject3D } from "../3d-impact/hero-object-3d";
import { AmbientParticles } from "../3d-impact/ambient-particles";
import { PaperCard } from "../3d-impact/paper-card";
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
  onViewFull: () => void;
};

/**
 * `<GalleryPortraitBentoCameo>` — opt-in Gallery variant
 * (`galleryVariant: "portrait-bento-3d-cameo"`), Velvet Muse style.
 *
 * Composition:
 *
 *   • Centred header with eyebrow + serif headline (last word italic) +
 *     subtitle.
 *   • Asymmetric 5-column × 4-row bento at `lg+` — 4 portraits at 2×2
 *     and 4 portraits at 1×1 stack into a 20-cell grid (8 portraits).
 *     Each portrait enters with `<PaperCard>` (60 ms stagger), gets a
 *     gradient overlay + hover label (image index + arrow icon).
 *   • Mobile collapses to a 2-column even grid; cameos hidden except
 *     for the floating top cameo so the layout stays photo-first.
 *   • Cameos: a small `<HeroObject3D>` floats absolutely at top-end
 *     (always) and at bottom-start (lg only) for added depth. Both
 *     read from the same slot but a tenant can hide them via
 *     `show3DObject: false`.
 *
 * Falls back to `null` when `siteConfig.gallery` is empty (caller is
 * expected to delegate to the legacy renderer).
 */
let warnedMissingPortraitBentoData = false;

const BENTO_PLACEMENTS = [
  // Each entry is the Tailwind arbitrary-value grid-area placement at lg+.
  "lg:[grid-area:1/1/3/3]", // p1 — 2×2 top-left
  "lg:[grid-area:3/1/5/3]", // p2 — 2×2 bottom-left
  "lg:[grid-area:1/3/3/5]", // p3 — 2×2 top-mid
  "lg:[grid-area:1/5/2/6]", // p4 — 1×1 top-right
  "lg:[grid-area:2/5/3/6]", // p5 — 1×1 right
  "lg:[grid-area:3/3/5/5]", // p6 — 2×2 bottom-mid
  "lg:[grid-area:3/5/4/6]", // p7 — 1×1 right
  "lg:[grid-area:4/5/5/6]", // p8 — 1×1 bottom-right
];

const BENTO_ASPECTS = [
  "lg:aspect-square",
  "lg:aspect-square",
  "lg:aspect-square",
  "lg:aspect-square",
  "lg:aspect-square",
  "lg:aspect-square",
  "lg:aspect-square",
  "lg:aspect-square",
];

export function GalleryPortraitBentoCameo({ onViewFull }: Props) {
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

  const gallery = Array.isArray(rawGallery) ? rawGallery : [];
  if (gallery.length === 0) {
    if (import.meta.env.DEV && !warnedMissingPortraitBentoData) {
      warnedMissingPortraitBentoData = true;
      // eslint-disable-next-line no-console
      console.warn(
        `[GalleryPortraitBentoCameo] galleryVariant="portrait-bento-3d-cameo" but siteConfig.gallery is empty — caller should fall back to the legacy renderer.`,
      );
    }
    return null;
  }

  // The bento is purpose-built for 8 portraits. Fewer images fall back
  // to a simple even grid at every breakpoint so we don't leave empty
  // cells. More are surfaced via "View full gallery" below.
  const bentoSlots = gallery.slice(0, 8);
  const hasMore = gallery.length > bentoSlots.length;
  const useBento = bentoSlots.length === 8;

  // Cameo resolution mirrors the other gallery variants.
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

  // Split the headline so the last word renders italic — Velvet Muse
  // signature accent. Skipped when the headline is a single word.
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
      id="gallery"
      className="relative isolate overflow-hidden bg-background px-6 py-24 transition-colors duration-300 md:px-10 md:py-28 lg:py-32"
    >
      {/* Warm bloom — matches the Velvet Muse Services variant. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_10%,var(--brand-accent)/0.10,transparent_55%)]"
      />

      <div className="relative mx-auto w-full max-w-7xl">
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

        {/* ── Bento + floating cameos ────────────────────────────── */}
        <div className="relative">
          {/* Top-end cameo — visible on mobile too so the section keeps
              its 3D signature on small screens. */}
          {showCameo && (
            <div
              aria-hidden
              className="pointer-events-none absolute -top-8 end-0 z-20 hidden sm:block lg:-top-12 lg:-end-6"
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

          {/* Bottom-start cameo — desktop only; gives the section a
              diagonal weight balance. */}
          {showCameo && (
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-12 start-0 z-20 hidden lg:block xl:-start-8"
            >
              <HeroObject3D
                slotName={resolvedSlot ?? "accent"}
                size="sm"
                alt=""
                fallback={null}
              />
            </div>
          )}

          {useBento ? (
            <ul
              className={cn(
                // Mobile: 2-column even grid.
                "grid grid-cols-2 gap-3 sm:gap-4",
                // Desktop: 5-col × 4-row bento via arbitrary-value placement.
                "lg:grid-cols-5 lg:grid-rows-4 lg:auto-rows-fr lg:gap-4",
              )}
            >
              {bentoSlots.map((src, i) => (
                <PortraitTile
                  key={`portrait-${src.slice(-24)}-${i}`}
                  src={src}
                  index={i}
                  onClick={onViewFull}
                  placement={BENTO_PLACEMENTS[i]}
                  aspect={BENTO_ASPECTS[i]}
                />
              ))}
            </ul>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 lg:gap-5">
              {bentoSlots.map((src, i) => (
                <PortraitTile
                  key={`portrait-simple-${src.slice(-24)}-${i}`}
                  src={src}
                  index={i}
                  onClick={onViewFull}
                  placement=""
                  aspect="aspect-[3/4]"
                />
              ))}
            </ul>
          )}
        </div>

        {/* ── "View all photos" surfaces the rest of the gallery ── */}
        {hasMore && (
          <motion.div
            initial={prefersReduced ? false : { opacity: 0, y: Y_SM }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT_ONCE}
            transition={{ delay: 0.15, duration: DUR_ENTER }}
            className="mt-8 flex justify-end"
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

        {/* ── CTA ────────────────────────────────────────────────── */}
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

/**
 * Single portrait tile inside the bento. Wrapped in `<PaperCard>` so
 * each cell drops into place with the paper-spring entrance. Hover
 * reveals the work number + arrow icon, identical to the bento-stats
 * variant so the two read as siblings.
 */
function PortraitTile({
  src,
  index,
  onClick,
  placement,
  aspect,
}: {
  src: string;
  index: number;
  onClick: () => void;
  placement: string;
  aspect: string;
}) {
  return (
    <PaperCard
      delay={index * 0.06}
      intensity="medium"
      onClick={onClick}
      ariaLabel={interpolate(localeConfig.gallery.portfolioAlt, { n: index + 1 })}
      className={cn(
        "group relative cursor-pointer overflow-hidden rounded-2xl border border-border/60 bg-muted shadow-sm transition-[border-color,box-shadow] duration-300 hover:border-accent/40 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 lg:rounded-3xl",
        "aspect-[3/4]",
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
      {/* Hover overlay — same treatment as the bento-stats variant. */}
      <div className="absolute inset-0 flex items-end justify-between bg-gradient-to-t from-black/70 via-transparent to-transparent p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/90">
          {interpolate(localeConfig.gallery.workNumber, {
            n: String(index + 1).padStart(2, "0"),
          })}
        </span>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
          <ArrowRight size={14} className="text-white rtl:rotate-180" aria-hidden />
        </div>
      </div>
    </PaperCard>
  );
}
