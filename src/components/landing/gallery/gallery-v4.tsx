/**
 * gallery-v4.tsx — BEFORE/AFTER comparison slider gallery variant.
 *
 * One large interactive comparison: two stacked images, the top ("before")
 * clipped with a hardware-accelerated `clip-path: inset()` driven by a
 * draggable divider (pointer capture + keyboard arrows, role="slider").
 * Under RTL both the clip direction and the keyboard mapping mirror.
 *
 * Data source: `sections.beforeAfter.cases` when present; otherwise
 * gallery images paired sequentially ([0]=before, [1]=after, …). Multiple
 * cases render selector chips beneath the slider.
 * Selected via `sections.gallery.variant === "v4"`.
 */
import React from "react";
import { motion } from "motion/react";
import { ArrowRight, GripVertical, Images } from "lucide-react";
import { cn, handleImgError } from "../../../lib/utils";
import { localeConfig } from "../../../config/locale";
import { siteConfig } from "../../../config/site";
import { interpolate } from "../../../lib/interpolate";
import {
  Y_SM, VIEWPORT_ONCE,
  getNicheFlavor, NICHE_DURATION, NICHE_EASING,
  sectionTitleContainerVariants, textWordVariants,
  EASE_OUT_STRONG, BUTTON_PRESS,
} from "../../../lib/motion";

type SliderStrings = {
  before: string;
  after: string;
  sliderLabel: string;
  caseFallback: string;
};

const STRINGS: Record<"en" | "he" | "ru" | "ar", SliderStrings> = {
  en: {
    before: "Before",
    after: "After",
    sliderLabel: "Before and after comparison slider",
    caseFallback: "Case {n}",
  },
  he: {
    before: "לפני",
    after: "אחרי",
    sliderLabel: "מחוון השוואה לפני ואחרי",
    caseFallback: "מקרה {n}",
  },
  ru: {
    before: "До",
    after: "После",
    sliderLabel: "Слайдер сравнения до и после",
    caseFallback: "Работа {n}",
  },
  ar: {
    before: "قبل",
    after: "بعد",
    sliderLabel: "شريط مقارنة قبل وبعد",
    caseFallback: "حالة {n}",
  },
};

type ComparisonPair = { before: string; after: string; label?: string };

const KEY_STEP = 5;
const MAX_PAIRS = 6;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** The comparison surface itself — pure clip-path, no layout animation. */
function ComparisonSlider({
  pair,
  alt,
  isRtl,
  t,
}: {
  pair: ComparisonPair;
  alt: string;
  isRtl: boolean;
  t: SliderStrings;
}) {
  const [position, setPosition] = React.useState(50);
  const draggingRef = React.useRef(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const updateFromClientX = React.useCallback((clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0) return;
    const fraction = ((clientX - rect.left) / rect.width) * 100;
    // `position` measures the revealed "before" share from the inline start.
    setPosition(clamp(isRtl ? 100 - fraction : fraction, 0, 100));
  }, [isRtl]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    updateFromClientX(e.clientX);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    updateFromClientX(e.clientX);
  };
  const endDrag = () => { draggingRef.current = false; };

  const onHandleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    let next: number | null = null;
    switch (e.key) {
      // Physical arrow direction always matches visual handle travel.
      case "ArrowRight": next = position + (isRtl ? -KEY_STEP : KEY_STEP); break;
      case "ArrowLeft": next = position + (isRtl ? KEY_STEP : -KEY_STEP); break;
      case "ArrowUp": next = position + KEY_STEP; break;
      case "ArrowDown": next = position - KEY_STEP; break;
      case "Home": next = 0; break;
      case "End": next = 100; break;
      default: return;
    }
    e.preventDefault();
    setPosition(clamp(next, 0, 100));
  };

  // Clip the top ("before") layer so its inline-start share stays visible.
  const clipPath = isRtl
    ? `inset(0 0 0 ${100 - position}%)`
    : `inset(0 ${100 - position}% 0 0)`;

  return (
    <div
      ref={containerRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      className="gs-image relative aspect-[4/3] w-full cursor-col-resize select-none overflow-hidden bg-muted sm:aspect-[16/9]"
      style={{ touchAction: "pan-y" }}
    >
      {/* After (base layer) */}
      <img
        src={pair.after}
        alt={`${alt} — ${t.after}`}
        className="absolute inset-0 h-full w-full object-cover"
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={handleImgError}
        draggable={false}
      />
      {/* Before (top layer, clipped) */}
      <img
        src={pair.before}
        alt={`${alt} — ${t.before}`}
        className="absolute inset-0 h-full w-full object-cover"
        style={{ clipPath, willChange: "clip-path" }}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={handleImgError}
        draggable={false}
      />

      {/* Corner labels — before at inline-start (over the clipped layer) */}
      <span className="pointer-events-none absolute top-3 start-3 rounded-full bg-black/55 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-white backdrop-blur-sm">
        {t.before}
      </span>
      <span className="pointer-events-none absolute bottom-3 end-3 rounded-full bg-black/55 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-white backdrop-blur-sm">
        {t.after}
      </span>

      {/* Divider + handle. Positioned with inset-inline-start so it mirrors. */}
      <div
        role="slider"
        tabIndex={0}
        aria-label={t.sliderLabel}
        aria-orientation="horizontal"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(position)}
        onKeyDown={onHandleKeyDown}
        className="group absolute inset-y-0 z-10 flex w-11 -translate-x-1/2 cursor-col-resize items-center justify-center focus:outline-none rtl:translate-x-1/2"
        style={{ insetInlineStart: `${position}%`, touchAction: "none" }}
      >
        {/* Divider line */}
        <div className="pointer-events-none absolute inset-y-0 start-1/2 w-0.5 -translate-x-1/2 bg-white shadow-[0_0_8px_rgba(0,0,0,0.45)] rtl:translate-x-1/2" aria-hidden />
        {/* Grip puck — 44px hit area comes from the w-11 wrapper */}
        <div className="relative flex h-11 w-11 items-center justify-center rounded-full border border-white/40 bg-black/55 text-white shadow-lg backdrop-blur-sm transition-transform duration-200 hover:scale-105 group-focus-visible:ring-2 group-focus-visible:ring-white">
          <GripVertical size={18} />
        </div>
      </div>
    </div>
  );
}

export function GalleryV4({ onViewFull }: { onViewFull: () => void }) {
  const { gallery, sections, brand } = siteConfig;
  const sectionConfig = sections.gallery;
  const niche = siteConfig.business.type;
  const flavor = getNicheFlavor(niche);
  const dur = NICHE_DURATION[flavor];
  const ease = NICHE_EASING[flavor];

  const lang = localeConfig.lang as keyof typeof STRINGS;
  const t = STRINGS[lang] ?? STRINGS.en;
  const isRtl = lang === "he" || lang === "ar";

  // Prefer curated before/after cases; otherwise pair gallery sequentially.
  const pairs = React.useMemo<ComparisonPair[]>(() => {
    const cases = sections.beforeAfter?.cases ?? [];
    const fromCases = cases
      .filter((c) => c.imageBefore && c.imageAfter)
      .map((c) => ({ before: c.imageBefore, after: c.imageAfter, label: c.title }));
    if (fromCases.length > 0) return fromCases.slice(0, MAX_PAIRS);

    const safeGallery = Array.isArray(gallery) ? gallery : [];
    const sequential: ComparisonPair[] = [];
    for (let i = 0; i + 1 < safeGallery.length && sequential.length < MAX_PAIRS; i += 2) {
      sequential.push({ before: safeGallery[i], after: safeGallery[i + 1] });
    }
    return sequential;
  }, [sections.beforeAfter, gallery]);

  const [activeIndex, setActiveIndex] = React.useState(0);

  // Internal guard — the dispatcher already falls back, but stay safe.
  if (pairs.length === 0) return null;
  const active = pairs[Math.min(activeIndex, pairs.length - 1)];

  return (
    <section
      id="gallery"
      className="bg-card px-5 py-16 transition-colors duration-300 sm:px-6 sm:py-28"
    >
      <div className="mx-auto max-w-5xl">

        {/* ── Section header ──────────────────────────────────────── */}
        <div className="mb-10 text-center sm:mb-12">
          <motion.p
            initial={{ opacity: 0, y: Y_SM }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT_ONCE}
            transition={{ duration: dur, ease }}
            className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-accent-light"
          >
            {sectionConfig.title}
          </motion.p>
          <motion.h2
            variants={sectionTitleContainerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={VIEWPORT_ONCE}
            className="text-3xl font-black uppercase tracking-tight text-card-foreground sm:text-4xl md:text-5xl"
          >
            {sectionConfig.subtitle.split(" ").map((word: string, i: number) => (
              <motion.span key={i} variants={textWordVariants(niche)} className="inline-block">
                {word}&nbsp;
              </motion.span>
            ))}
          </motion.h2>
        </div>

        {/* ── Comparison slider ───────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEWPORT_ONCE}
          transition={{ duration: dur * 1.1, ease: EASE_OUT_STRONG }}
        >
          <ComparisonSlider
            key={`pair-${activeIndex}`}
            pair={active}
            alt={`${brand.name} — ${activeIndex + 1}`}
            isRtl={isRtl}
            t={t}
          />
        </motion.div>

        {/* ── Case selector chips ─────────────────────────────────── */}
        {pairs.length > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT_ONCE}
            transition={{ delay: 0.15, duration: dur, ease }}
            className="mt-6 flex flex-wrap justify-center gap-[calc(var(--gs-gap)*0.5)]"
          >
            {pairs.map((pair, i) => (
              <button
                key={`case-${i}`}
                type="button"
                onClick={() => setActiveIndex(i)}
                aria-pressed={i === activeIndex}
                className={cn(
                  "min-h-[44px] rounded-full border px-5 py-2 text-sm font-semibold transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
                  i === activeIndex
                    ? "border-accent bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:border-accent/40 hover:text-foreground",
                )}
              >
                {pair.label || interpolate(t.caseFallback, { n: i + 1 })}
              </button>
            ))}
          </motion.div>
        )}

        {/* ── CTA ─────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: Y_SM }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEWPORT_ONCE}
          transition={{ delay: 0.25, duration: dur, ease }}
          className="mt-12 flex justify-center"
        >
          <motion.button
            type="button"
            onClick={onViewFull}
            whileHover={{ y: BUTTON_PRESS[flavor].hoverY }}
            whileTap={{ scale: BUTTON_PRESS[flavor].scale }}
            transition={{ duration: BUTTON_PRESS[flavor].duration, ease: EASE_OUT_STRONG }}
            className="group flex min-h-[48px] items-center gap-3 rounded-xl bg-primary px-9 py-4 text-sm font-bold text-primary-foreground shadow-md shadow-accent/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 [transition:background-color_0.3s_cubic-bezier(0.23,1,0.32,1),box-shadow_0.3s_cubic-bezier(0.23,1,0.32,1)]"
          >
            <Images size={16} className="shrink-0" />
            <span>{localeConfig.gallery.explorePortfolio}</span>
            <ArrowRight size={14} className="shrink-0 transition-transform duration-300 group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1" />
          </motion.button>
        </motion.div>

      </div>
    </section>
  );
}
