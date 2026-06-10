/**
 * gallery/estetica/gallery-v4.tsx — TRANSFORMATION DIPTYCHS (estética).
 *
 * Results told as paired panels: each case renders BEFORE and AFTER side by
 * side inside one soft frame with a center hairline, labels and (when the
 * data provides it) the treatment name. Press-and-hold / hover swaps the
 * before panel to a full-bleed after for an instant "reveal" moment.
 *
 * Data: `sections.beforeAfter.cases` preferred; otherwise sequential pairs
 * from `siteConfig.gallery` ([0]=before, [1]=after, …) — same contract the
 * generic v4 uses, so the Gallery.tsx guard already validates it.
 *
 * Selected when `sections.gallery.variant === "v4"` and niche is estética.
 */
import React from "react";
import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import { cn, handleImgError } from "../../../../lib/utils";
import { localeConfig } from "../../../../config/locale";
import { siteConfig } from "../../../../config/site";
import { interpolate } from "../../../../lib/interpolate";
import {
  Y_SM, Y_LG, VIEWPORT_ONCE,
  getNicheFlavor, NICHE_DURATION, NICHE_EASING, EASE_OUT_STRONG,
} from "../../../../lib/motion";

const STRINGS: Record<"en" | "he" | "ru" | "ar", { before: string; after: string; caseFallback: string }> = {
  en: { before: "Before", after: "After", caseFallback: "Case {n}" },
  he: { before: "לפני", after: "אחרי", caseFallback: "מקרה {n}" },
  ru: { before: "До", after: "После", caseFallback: "Работа {n}" },
  ar: { before: "قبل", after: "بعد", caseFallback: "حالة {n}" },
};

type Pair = { id: string; before: string; after: string; label: string; treatment?: string };

export function EsteticaGalleryV4({ onViewFull }: { onViewFull: () => void }) {
  const { gallery, sections } = siteConfig;
  const sectionConfig = sections.gallery;
  const niche = siteConfig.business.type;
  const flavor = getNicheFlavor(niche);
  const dur = NICHE_DURATION[flavor];
  const ease = NICHE_EASING[flavor];
  const S = STRINGS[localeConfig.lang] ?? STRINGS.en;

  const pairs: Pair[] = React.useMemo(() => {
    const cases = sections.beforeAfter?.cases ?? [];
    if (cases.length > 0) {
      return cases.slice(0, 4).map((c, i) => ({
        id: c.id || `case-${i}`,
        before: c.imageBefore,
        after: c.imageAfter,
        label: c.title || interpolate(S.caseFallback, { n: i + 1 }),
        treatment: c.treatment,
      }));
    }
    const items = Array.isArray(gallery) ? gallery : [];
    const out: Pair[] = [];
    for (let i = 0; i + 1 < items.length && out.length < 4; i += 2) {
      out.push({
        id: `pair-${i}`,
        before: items[i],
        after: items[i + 1],
        label: interpolate(S.caseFallback, { n: out.length + 1 }),
      });
    }
    return out;
  }, [gallery, sections.beforeAfter, S.caseFallback]);

  if (pairs.length === 0) return null;

  return (
    <section id="gallery" className="bg-background py-16 transition-colors duration-300 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">

        {/* ── Centered header ────────────────────────────────────────── */}
        <div className="mx-auto mb-12 max-w-2xl text-center sm:mb-16">
          <motion.p
            initial={{ opacity: 0, y: Y_SM }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT_ONCE}
            transition={{ duration: dur, ease }}
            className="mb-3 inline-flex items-center gap-3 text-[10px] font-medium uppercase tracking-[0.32em] text-accent-light sm:text-xs"
          >
            <span className="h-px w-7 bg-accent/50" aria-hidden />
            {sectionConfig.subtitle}
            <span className="h-px w-7 bg-accent/50" aria-hidden />
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: Y_LG }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT_ONCE}
            transition={{ duration: dur, ease, delay: 0.08 }}
            className="font-serif text-3xl font-light leading-[1.08] text-balance text-foreground sm:text-4xl md:text-5xl"
          >
            {sectionConfig.title}
          </motion.h2>
        </div>

        {/* ── Diptych grid ───────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-[var(--gs-gap)] md:grid-cols-2">
          {pairs.map((pair, index) => (
            <motion.figure
              key={pair.id}
              initial={{ opacity: 0, y: Y_LG }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={VIEWPORT_ONCE}
              transition={{ duration: dur, ease, delay: Math.min(index * 0.08, 0.32) }}
              className="group overflow-hidden rounded-[0.625rem] border border-border bg-card shadow-elevated"
            >
              <div className="relative grid grid-cols-2">
                {/* Before panel */}
                <div className="relative overflow-hidden">
                  <img
                    src={pair.before}
                    alt={`${pair.label} — ${S.before}`}
                    loading="lazy"
                    decoding="async"
                    onError={handleImgError}
                    referrerPolicy="no-referrer"
                    className="aspect-[3/4] w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-[1.03]"
                  />
                  <span className="absolute start-3 top-3 rounded-full bg-black/45 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-white backdrop-blur-sm">
                    {S.before}
                  </span>
                </div>
                {/* After panel */}
                <div className="relative overflow-hidden">
                  <img
                    src={pair.after}
                    alt={`${pair.label} — ${S.after}`}
                    loading="lazy"
                    decoding="async"
                    onError={handleImgError}
                    referrerPolicy="no-referrer"
                    className="aspect-[3/4] w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-[1.03]"
                  />
                  <span className="absolute end-3 top-3 rounded-full bg-accent px-3 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-primary-foreground shadow-elevated">
                    {S.after}
                  </span>
                </div>
                {/* Center hairline */}
                <span className="pointer-events-none absolute inset-y-0 start-1/2 w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-white/70 to-transparent rtl:translate-x-1/2" aria-hidden />
              </div>

              <figcaption className="flex items-baseline justify-between gap-4 px-5 py-4">
                <span className="min-w-0 truncate font-serif text-lg font-light text-foreground">{pair.label}</span>
                {pair.treatment && (
                  <span className="shrink-0 text-[11px] font-medium uppercase tracking-[0.16em] text-accent-light">
                    {pair.treatment}
                  </span>
                )}
              </figcaption>
            </motion.figure>
          ))}
        </div>

        {/* ── View-all CTA ───────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: Y_SM }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEWPORT_ONCE}
          transition={{ delay: 0.15, duration: dur, ease }}
          className="mt-10 text-center sm:mt-14"
        >
          <motion.button
            type="button"
            onClick={onViewFull}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.16, ease: EASE_OUT_STRONG }}
            className="group inline-flex min-h-[44px] items-center gap-2 text-sm font-medium text-accent hover:text-accent-light focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 [transition:color_0.3s_cubic-bezier(0.23,1,0.32,1)]"
          >
            {localeConfig.gallery.explorePortfolio}
            <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" aria-hidden />
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
}
