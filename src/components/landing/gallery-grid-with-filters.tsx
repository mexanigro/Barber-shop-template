import { useMemo, useState } from "react";
import { ArrowRight, ArrowUpRight, ImageOff } from "lucide-react";
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
 * Synthetic "All" filter key. Kept as a `__` prefix so it can never
 * collide with a real filter label the tenant might add. The label
 * itself is read from the locale (`localeConfig.gallery.viewAllPhotos`
 * uses an `{count}` token, so we render a friendlier `"All"` here).
 */
const ALL_FILTER = "__all__";

let warnedMissingGalleryFiltersData = false;

/**
 * `<GalleryGridWithFilters>` — opt-in Gallery variant
 * (`galleryVariant: "grid-with-filters"`).
 *
 * Onyx-style layout. Dark surface, header on top with optional
 * eyebrow + description, a row of filter chips below the header, and
 * a 3-column filterable grid of images. Each image hovers to reveal
 * its tag list. A cameo of the floating hero object peeks out of the
 * top-end of the section.
 *
 * Filtering contract:
 *
 *   - `sectionConfig.filters` provides the chip labels.
 *   - `sectionConfig.imageTags[<image-url>]` maps each image to a list
 *     of tags. An image shows under a filter when its tag list includes
 *     that filter (case-sensitive — matches whatever the tenant configured).
 *   - The synthetic "All" tab is always prepended and shows every image.
 *   - Untagged images only appear under "All". Filters with zero matches
 *     stay clickable so the empty state can speak for itself.
 *
 * Falls back to `null` when `siteConfig.gallery` is empty (caller falls
 * back to legacy renderer). Falls back to a plain unfiltered grid when
 * `filters` is empty/missing.
 */
export function GalleryGridWithFilters({ onViewFull }: Props) {
  const { sections, brand, heroObjects, gallery: rawGallery } = siteConfig;
  const sectionConfig = sections.gallery;
  const prefersReduced = useReducedMotion();

  // Hooks always run regardless of which early-return branch we hit
  // below — kept above the bailouts so React's hook order stays stable.
  const [activeFilter, setActiveFilter] = useState<string>(ALL_FILTER);

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
  const stagger = nicheStagger(niche);

  const gallery = Array.isArray(rawGallery) ? rawGallery : [];
  const imageTags = sectionConfig?.imageTags ?? {};
  const filters = sectionConfig?.filters?.filter(Boolean) ?? [];

  // Pre-compute filtered images per filter so chip clicks don't
  // re-iterate the whole gallery on every render.
  const filteredImages = useMemo(() => {
    if (activeFilter === ALL_FILTER) return gallery;
    return gallery.filter((src) => {
      const tags = imageTags[src];
      return Array.isArray(tags) && tags.includes(activeFilter);
    });
  }, [activeFilter, gallery, imageTags]);

  if (!sectionConfig) return null;

  if (gallery.length === 0) {
    if (import.meta.env.DEV && !warnedMissingGalleryFiltersData) {
      warnedMissingGalleryFiltersData = true;
      // eslint-disable-next-line no-console
      console.warn(
        `[GalleryGridWithFilters] galleryVariant="grid-with-filters" but siteConfig.gallery is empty — caller should fall back to the legacy renderer.`,
      );
    }
    return null;
  }

  // Cameo slot — defaults to "accent" to match the Aurea variant and
  // the services / why-choose-us variants in tenants that ship all of
  // them.
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

  const allLabel =
    localeConfig.lang === "he"
      ? "הכול"
      : localeConfig.lang === "ru"
        ? "Всё"
        : localeConfig.lang === "ar"
          ? "الكل"
          : "All";

  // Per-filter counts surface the "(0 matches)" state without forcing
  // the user to click into an empty tab.
  const counts: Record<string, number> = {
    [ALL_FILTER]: gallery.length,
  };
  for (const f of filters) {
    counts[f] = gallery.filter((src) =>
      Array.isArray(imageTags[src]) && imageTags[src].includes(f),
    ).length;
  }

  return (
    <section
      id="gallery"
      className="relative isolate overflow-hidden bg-card px-6 py-24 transition-colors duration-300 md:px-10 md:py-28 lg:py-32"
    >
      {/* Cool radial glow keyed to the accent — mirrors the Onyx
          services variant so the two sections read as visually
          paired when both ship in the same site. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_85%_30%,var(--brand-accent)/0.10,transparent_60%)]"
      />

      <div className="relative mx-auto w-full max-w-7xl">
        {/* ── Floating 3D cameo — peeks from the top-end ─────────── */}
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

        {/* ── Section header — Onyx style, start-aligned ─────────── */}
        <header className="mb-10 max-w-3xl lg:mb-14">
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
              className="text-[clamp(2rem,4.2vw,3.5rem)] font-black leading-[1.05] tracking-tight text-card-foreground"
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

        {/* ── Filter chips ───────────────────────────────────────── */}
        {filters.length > 0 && (
          <div
            role="tablist"
            aria-label="Gallery filters"
            // Mobile: horizontal scroll. Desktop: wrap. `-mx-6` extends
            // the scroll region to the viewport edge so the first chip
            // can sit flush against the section's start padding.
            className="-mx-6 mb-8 flex gap-2 overflow-x-auto px-6 pb-2 md:mx-0 md:flex-wrap md:px-0 md:pb-0 lg:mb-12"
          >
            <FilterChip
              label={allLabel}
              count={counts[ALL_FILTER]}
              active={activeFilter === ALL_FILTER}
              onClick={() => setActiveFilter(ALL_FILTER)}
            />
            {filters.map((f) => (
              <FilterChip
                key={f}
                label={f}
                count={counts[f] ?? 0}
                active={activeFilter === f}
                onClick={() => setActiveFilter(f)}
              />
            ))}
          </div>
        )}

        {/* ── Grid ───────────────────────────────────────────────── */}
        {filteredImages.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-background/40 py-16 text-center">
            <ImageOff
              size={36}
              className="mb-3 text-muted-foreground/60"
              aria-hidden
            />
            <p className="text-sm font-semibold text-muted-foreground">
              {localeConfig.lang === "he"
                ? "אין תוצאות לפילטר הזה."
                : localeConfig.lang === "ru"
                  ? "Нет результатов для этого фильтра."
                  : localeConfig.lang === "ar"
                    ? "لا توجد نتائج لهذا التصنيف."
                    : "No results for this filter."}
            </p>
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 lg:gap-5">
            {filteredImages.map((src, i) => (
              <GridTile
                // Key includes the active filter so the staggered
                // entry animations replay when the user switches tabs.
                key={`${activeFilter}-${src.slice(-24)}-${i}`}
                src={src}
                index={i}
                tags={imageTags[src] ?? []}
                onClick={onViewFull}
                delay={stagger(i)}
                duration={NICHE_DURATION[flavor]}
                easing={NICHE_EASING[flavor]}
                prefersReduced={prefersReduced ?? false}
              />
            ))}
          </ul>
        )}

        {/* ── CTA — surfaces the full gallery route. Always renders
            when there are images so visitors have a discoverable path
            even when the active filter is sparse. ─────────────── */}
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
              className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-background/40 px-7 py-3 text-sm font-semibold uppercase tracking-[0.22em] text-card-foreground backdrop-blur-sm transition-colors duration-300 hover:border-accent hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
            >
              {ctaLabel}
              <ArrowUpRight size={16} className="rtl:-scale-x-100" aria-hidden />
            </a>
          ) : (
            <button
              type="button"
              onClick={onViewFull}
              className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-background/40 px-7 py-3 text-sm font-semibold uppercase tracking-[0.22em] text-card-foreground backdrop-blur-sm transition-colors duration-300 hover:border-accent hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
            >
              {ctaLabel}
              <ArrowUpRight size={16} className="rtl:-scale-x-100" aria-hidden />
            </button>
          )}
        </motion.div>
      </div>
    </section>
  );
}

type FilterChipProps = {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
};

function FilterChip({ label, count, active, onClick }: FilterChipProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
        active
          ? "border-accent bg-accent text-primary-foreground"
          : "border-border/60 bg-background/40 text-muted-foreground hover:border-accent/40 hover:text-card-foreground",
      )}
    >
      <span>{label}</span>
      <span
        aria-hidden
        className={cn(
          "rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums tracking-normal",
          active ? "bg-primary-foreground/15 text-primary-foreground" : "bg-card/60 text-muted-foreground/80",
        )}
      >
        {count}
      </span>
    </button>
  );
}

type GridTileProps = {
  src: string;
  index: number;
  tags: string[];
  onClick: () => void;
  delay: number;
  duration: number;
  easing: [number, number, number, number];
  prefersReduced: boolean;
};

function GridTile({
  src,
  index,
  tags,
  onClick,
  delay,
  duration,
  easing,
  prefersReduced,
}: GridTileProps) {
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
      className="group relative aspect-[4/5] cursor-pointer overflow-hidden rounded-2xl border border-border/60 bg-background/40 shadow-sm transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 sm:aspect-[3/4]"
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

      {/* Hover overlay — tag pills bottom-start, arrow icon bottom-end. */}
      <div className="absolute inset-0 flex flex-col justify-end gap-3 bg-gradient-to-t from-black/75 via-black/15 to-transparent p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <div className="flex items-end justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-sm"
              >
                {tag}
              </span>
            ))}
          </div>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm">
            <ArrowRight size={14} className="text-white rtl:rotate-180" aria-hidden />
          </div>
        </div>
      </div>
    </motion.li>
  );
}
