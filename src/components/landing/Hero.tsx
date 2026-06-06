import React from "react";
import { ChevronRight, ChevronDown, Calendar, Star, Users, Award, Clock, GripVertical, MessageCircle } from "lucide-react";
import { motion, useScroll, useTransform, useMotionValue, useInView, animate } from "motion/react";
import { localeConfig } from "../../config/locale";
import { siteConfig } from "../../config/site";
import { cn } from "../../lib/utils";
import {
  DUR_HERO, Y_SM, Y_MD,
  getNicheFlavor, NICHE_EASING, NICHE_DURATION,
  textContainerVariants, textWordVariants,
  PARALLAX_SPEED, BUTTON_PRESS, EASE_OUT_STRONG,
  SCROLL_INDICATOR_DELAY, nicheStagger,
} from "../../lib/motion";
import { HeroVariant3DObject } from "./hero-variant-3d-object";

const AuraHeroModule = React.lazy(() => import("./aura/aura-hero").then(m => ({ default: m.AuraHero })));
function AuraHeroLazy(props: { onBookClick: (serviceId?: string) => void }) {
  return <React.Suspense fallback={null}><AuraHeroModule {...props} /></React.Suspense>;
}

let warnedMissing3DPrimary = false;

const STAT_DEFS = [
  { icon: Users, numericValue: 500, suffix: "+", labelKey: "clientsServed" as const },
  { icon: Award, numericValue: 10, suffix: "", labelKey: "yearsMastery" as const },
  { icon: Star, numericValue: 5.0, suffix: "", decimals: 1, labelKey: "avgRating" as const },
  { icon: Clock, numericValue: 3, suffix: "", labelKey: "masterArtisans" as const },
];

function CountUp({ target, suffix = "", decimals = 0 }: { target: number; suffix?: string; decimals?: number }) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const count = useMotionValue(0);

  React.useEffect(() => {
    if (!isInView) return;
    const controls = animate(count, target, {
      duration: 2,
      ease: [0.16, 1, 0.3, 1],
    });
    const unsub = count.on("change", (v) => {
      if (ref.current) {
        ref.current.textContent = (decimals > 0 ? v.toFixed(decimals) : Math.round(v).toString()) + suffix;
      }
    });
    return () => { controls.stop(); unsub(); };
  }, [isInView, target, suffix, decimals, count]);

  return <span ref={ref}>0{suffix}</span>;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * BEFORE / AFTER SLIDER — remodelaciones hero variant
 * ═══════════════════════════════════════════════════════════════════════════ */
function BeforeAfterSlider({ beforeSrc, afterSrc }: { beforeSrc: string; afterSrc: string }) {
  const [sliderPos, setSliderPos] = React.useState(52);
  const safePos = Math.max(sliderPos, 1);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const draggingRef = React.useRef(false);

  const handleMove = React.useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setSliderPos(Math.max(0, Math.min(100, pct)));
  }, []);

  React.useEffect(() => {
    const stop = () => { draggingRef.current = false; };
    window.addEventListener("mouseup", stop);
    window.addEventListener("touchend", stop);
    return () => {
      window.removeEventListener("mouseup", stop);
      window.removeEventListener("touchend", stop);
    };
  }, []);

  const beginDrag = () => { draggingRef.current = true; };

  return (
    <div
      ref={containerRef}
      className="relative aspect-[4/3] w-full cursor-ew-resize select-none overflow-hidden rounded-2xl ring-1 ring-slate-900/10 shadow-[0_40px_100px_-48px_rgba(15,23,42,0.35)] sm:aspect-[16/10] md:aspect-[16/9] lg:aspect-[2/1]"
      style={{ touchAction: "pan-y" }}
      onMouseMove={(e) => { if (draggingRef.current) handleMove(e.clientX); }}
      onMouseUp={() => { draggingRef.current = false; }}
      onMouseLeave={() => { draggingRef.current = false; }}
      onTouchMove={(e) => { if (draggingRef.current) handleMove(e.touches[0].clientX); }}
      onTouchEnd={() => { draggingRef.current = false; }}
    >
      {/* After (background) */}
      <img src={afterSrc} alt={localeConfig.hero.afterLabel} className="absolute inset-0 h-full w-full object-cover" draggable={false} />

      {/* Before (clipped) */}
      <div className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${safePos}%` }}>
        <img
          src={beforeSrc}
          alt={localeConfig.hero.beforeLabel}
          className="absolute inset-0 h-full max-w-none object-cover"
          style={{ width: `${(100 / safePos) * 100}%` }}
          draggable={false}
        />
      </div>

      {/* Divider line + handle */}
      <div
        className="absolute inset-y-0 z-20 w-[3px] bg-gradient-to-b from-white/15 via-white to-white/15 shadow-[0_0_0_1px_rgba(255,255,255,0.35)]"
        style={{ left: `${safePos}%`, transform: "translateX(-50%)" }}
      >
        <button
          type="button"
          aria-label={localeConfig.hero.sliderThumb}
          className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-slate-900 shadow-[0_18px_55px_-18px_rgba(0,0,0,0.65)] ring-4 ring-accent/35 transition-transform duration-200 hover:scale-105 active:scale-95 sm:h-14 sm:w-14"
          onMouseDown={beginDrag}
          onTouchStart={beginDrag}
        >
          <GripVertical className="h-5 w-5 opacity-80 sm:h-6 sm:w-6" />
        </button>
      </div>

      {/* Top labels */}
      <span className="absolute left-3 top-3 z-10 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-md sm:left-4 sm:top-4 sm:px-3 sm:text-xs">
        {localeConfig.hero.beforeLabel}
      </span>
      <span className="absolute right-3 top-3 z-10 rounded-full bg-accent px-2.5 py-1 text-[11px] font-semibold text-white shadow-lg sm:right-4 sm:top-4 sm:px-3 sm:text-xs">
        {localeConfig.hero.afterLabel}
      </span>

      {/* Bottom edge cues */}
      <div className="pointer-events-none absolute bottom-3 left-3 z-10 hidden rounded-full bg-black/55 px-3 py-1.5 text-[11px] font-semibold text-white/90 backdrop-blur-md sm:block sm:bottom-4 sm:left-4">
        {localeConfig.hero.sliderCueBefore}
      </div>
      <div className="pointer-events-none absolute bottom-3 right-3 z-10 hidden rounded-full bg-black/55 px-3 py-1.5 text-[11px] font-semibold text-white/90 backdrop-blur-md sm:block sm:bottom-4 sm:right-4">
        {localeConfig.hero.sliderCueAfter}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * HERO COMPONENT
 * ═══════════════════════════════════════════════════════════════════════════ */
export function Hero({
  onBookClick,
  omitBackground = false,
}: {
  onBookClick: () => void;
  omitBackground?: boolean;
}) {
  const { hero } = siteConfig;
  const niche = siteConfig.business.type;
  const isTattoo = niche === "tattoo";
  const isNails = niche === "nails";
  const isEstetica = niche === "estetica";
  const isCafeteria = niche === "cafeteria";
  const isRemodelaciones = niche === "remodelaciones";

  /* ── Aura variant ── */
  if (hero.heroVariant === "aura") {
    return <AuraHeroLazy onBookClick={onBookClick} />;
  }

  /* ── 3D Impact: hero-3d-object variant ── */
  if (hero.heroVariant === "hero-3d-object") {
    const hasPrimarySlot = Boolean(siteConfig.heroObjects?.primary?.src);
    if (hasPrimarySlot) {
      return <HeroVariant3DObject onBookClick={onBookClick} />;
    }
    if (import.meta.env.DEV && !warnedMissing3DPrimary) {
      warnedMissing3DPrimary = true;
      // eslint-disable-next-line no-console
      console.warn(
        "[Hero] heroVariant=\"hero-3d-object\" but siteConfig.heroObjects.primary is not configured — falling back to the default Hero.",
      );
    }
  }

  const sectionRef = React.useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end start"] });
  const flavor = getNicheFlavor(niche);
  const parallaxY = useTransform(scrollYProgress, [0, 1], [0, -PARALLAX_SPEED[flavor] * 300]);
  const scrollIndicatorOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);

  /* ── Cafeteria: centered soft hero ─────────────────────────────────── */
  if (isCafeteria) {
    return (
      <section
        ref={sectionRef}
        id="hero"
        className="relative flex min-h-[100dvh] w-full items-center justify-center overflow-hidden"
      >
        {/* Background image with mocha overlay */}
        <div className="absolute inset-0 z-0">
          <motion.img
            style={{ y: parallaxY }}
            src={hero.backgroundImage}
            className="absolute inset-0 h-[115%] w-full object-cover"
            alt={localeConfig.hero.backgroundAlt}
            loading="eager"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-[#2C1810]/55" aria-hidden />
        </div>

        {/* Content — centered */}
        <div className="relative z-10 mx-auto max-w-5xl px-5 pt-20 text-center sm:px-6 sm:pt-24">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="mb-6 text-[10px] tracking-[5px] uppercase text-accent-light sm:mb-8 sm:text-xs sm:tracking-[8px] md:text-sm"
          >
            {hero.titleSuffix}
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.4, ease: [0.23, 1, 0.32, 1] }}
            className="mb-6 font-serif leading-[0.9] text-[#F5E6D3] sm:mb-8"
          >
            <span className="block text-[clamp(2.8rem,12vw,11rem)]">
              {hero.titlePrefix}
            </span>
            <span className="block text-[clamp(2.8rem,12vw,11rem)] italic text-accent-light">
              {hero.titleHighlight}
            </span>
          </motion.h1>

          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.6, delay: 0.7, ease: [0.23, 1, 0.32, 1] }}
            className="mx-auto mb-6 h-px w-12 origin-center bg-accent-light/50 sm:mb-8 sm:w-16"
          />

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8, ease: [0.23, 1, 0.32, 1] }}
            className="mx-auto mb-8 max-w-md text-[15px] leading-relaxed text-[#F5E6D3]/70 sm:mb-10 sm:max-w-lg sm:text-base md:text-xl"
          >
            {hero.subtitle}
          </motion.p>

          {/* CTA — subtle scroll-down with chevron */}
          <motion.button
            type="button"
            onClick={() => {
              const el = document.querySelector("#menu") || document.querySelector("#services");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.0, ease: [0.23, 1, 0.32, 1] }}
            className="group inline-flex min-h-[44px] items-center gap-3 rounded-full px-6 py-3 text-[11px] tracking-[4px] uppercase text-[#F5E6D3]/80 hover:bg-[#F5E6D3]/5 hover:text-accent-light focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-light/50 active:scale-[0.97] sm:text-xs [transition:color_0.5s_cubic-bezier(0.23,1,0.32,1),background-color_0.5s_cubic-bezier(0.23,1,0.32,1),transform_0.16s_cubic-bezier(0.23,1,0.32,1)]"
          >
            <span className="truncate">{hero.ctaPrimary}</span>
            <ChevronDown size={16} className="shrink-0 transition-transform duration-500 group-hover:translate-y-1" />
          </motion.button>
        </div>

        {/* Corner decorations — hidden on very small screens */}
        <div className="absolute left-4 top-4 z-10 hidden h-10 w-10 border-l border-t border-[#F5E6D3]/10 sm:block sm:left-8 sm:top-8 sm:h-12 sm:w-12" />
        <div className="absolute right-4 top-4 z-10 hidden h-10 w-10 border-r border-t border-[#F5E6D3]/10 sm:block sm:right-8 sm:top-8 sm:h-12 sm:w-12" />
        <div className="absolute bottom-4 left-4 z-10 hidden h-10 w-10 border-b border-l border-[#F5E6D3]/10 sm:block sm:bottom-8 sm:left-8 sm:h-12 sm:w-12" />
        <div className="absolute bottom-4 right-4 z-10 hidden h-10 w-10 border-b border-r border-[#F5E6D3]/10 sm:block sm:bottom-8 sm:right-8 sm:h-12 sm:w-12" />

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.6 }}
          style={{ opacity: scrollIndicatorOpacity }}
          className="absolute bottom-8 left-1/2 z-20 hidden -translate-x-1/2 flex-col items-center gap-2 md:flex"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="h-12 w-px bg-gradient-to-b from-accent-light/60 to-transparent"
          />
        </motion.div>
      </section>
    );
  }

  /* ── Remodelaciones: before/after slider hero ──────────────────────── */
  if (isRemodelaciones && hero.variant === "slider" && hero.beforeImage && hero.afterImage) {
    const scrollToPortfolio = () => {
      const el = document.querySelector("#portfolio") || document.querySelector("#services");
      if (el) el.scrollIntoView({ behavior: "smooth" });
    };

    return (
      <section ref={sectionRef} id="hero" className="relative h-[100dvh] min-h-0 overflow-hidden">
        {/* ── Full-bleed background image ── */}
        <div className="absolute inset-0 z-0">
          {!omitBackground && (
            <motion.img
              style={{ y: parallaxY }}
              src={hero.backgroundImage || hero.afterImage}
              className="absolute inset-0 h-full w-full scale-110 object-cover blur-[2px] sm:h-[115%]"
              alt=""
              loading="eager"
              referrerPolicy="no-referrer"
            />
          )}
          <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-black/30 via-black/20 to-black/40" aria-hidden />
          <div className="pointer-events-none absolute inset-0 z-[2] bg-[radial-gradient(ellipse_at_50%_-10%,var(--brand-accent)/0.10,transparent_52%)]" aria-hidden />
        </div>

        <div className="relative z-20 mx-auto flex h-full max-w-7xl items-start px-4 pb-8 pt-28 sm:pb-16 sm:pt-32 md:px-6 lg:items-center lg:pt-36">
          <div className="grid w-full min-w-0 grid-cols-1 items-center gap-8 lg:grid-cols-6 lg:gap-14">

            {/* Slider — 4 cols */}
            <motion.div
              className="order-1 min-w-0 lg:col-span-4"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15, ease: [0.23, 1, 0.32, 1] }}
            >
              <BeforeAfterSlider beforeSrc={hero.beforeImage} afterSrc={hero.afterImage} />
            </motion.div>

            {/* Copy — 2 cols */}
            <motion.div
              className="order-2 min-w-0 lg:col-span-2"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1, ease: [0.23, 1, 0.32, 1] }}
            >
              <h1 className="text-2xl font-extrabold leading-[1.12] tracking-tight text-foreground sm:text-3xl md:text-4xl lg:text-[2.65rem]">
                {hero.titlePrefix}{" "}
                <span className="text-accent">{hero.titleHighlight}</span>{" "}
                {hero.titleSuffix}
              </h1>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:mt-6 sm:text-base md:text-lg">
                {hero.subtitle}
              </p>

              <div className="mt-6 flex w-full min-w-0 flex-col gap-3 sm:mt-8 sm:flex-row sm:gap-4">
                {siteConfig.contact.social.whatsapp ? (
                  <motion.a
                    href={siteConfig.contact.social.whatsapp}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ duration: 0.16, ease: EASE_OUT_STRONG }}
                    className="group relative isolate flex items-center justify-center gap-2 overflow-hidden rounded-full bg-[#25D366] px-7 py-3.5 font-semibold text-white shadow-[0_18px_55px_-18px_rgba(37,211,102,0.75)] hover:-translate-y-0.5 hover:shadow-[0_22px_65px_-18px_rgba(37,211,102,0.85)] active:scale-[0.97] [transition:transform_0.16s_cubic-bezier(0.23,1,0.32,1),box-shadow_0.3s_cubic-bezier(0.23,1,0.32,1)]"
                  >
                    <MessageCircle size={16} className="shrink-0" />
                    <span className="truncate">{hero.ctaPrimary}</span>
                  </motion.a>
                ) : (
                  <motion.button
                    type="button"
                    onClick={onBookClick}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ duration: 0.16, ease: EASE_OUT_STRONG }}
                    className="flex items-center justify-center gap-2 rounded-full bg-accent px-7 py-3.5 font-semibold text-white shadow-lg hover:bg-accent-light active:scale-[0.97] [transition:background-color_0.3s_cubic-bezier(0.23,1,0.32,1),transform_0.16s_cubic-bezier(0.23,1,0.32,1)]"
                  >
                    <Calendar size={16} className="shrink-0" />
                    <span className="truncate">{hero.ctaPrimary}</span>
                  </motion.button>
                )}
                <motion.button
                  type="button"
                  onClick={scrollToPortfolio}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.16, ease: EASE_OUT_STRONG }}
                  className="truncate rounded-full border border-border bg-card/85 px-7 py-3.5 font-semibold text-foreground shadow-sm backdrop-blur-sm hover:border-accent/30 hover:bg-card active:scale-[0.97] [transition:border-color_0.3s_cubic-bezier(0.23,1,0.32,1),background-color_0.3s_cubic-bezier(0.23,1,0.32,1),transform_0.16s_cubic-bezier(0.23,1,0.32,1)]"
                >
                  {hero.ctaSecondary}
                </motion.button>
              </div>

              {/* Stats row — staggered entrance + count-up */}
              {siteConfig.features.showHeroStats !== false && hero.stats && hero.stats.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.7, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  className="mt-6 grid w-full grid-cols-3 divide-x divide-border sm:mt-10"
                >
                  {hero.stats.map((s, i) => {
                    const parsed = s.value.match(/^([\d.]+)(.*)$/);
                    const numeric = parsed ? parseFloat(parsed[1]) : 0;
                    const suffix = parsed ? parsed[2] : s.value;
                    const decimals = parsed && parsed[1].includes(".") ? parsed[1].split(".")[1].length : 0;
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.9, delay: 0.8 + i * 0.15, ease: [0.16, 1, 0.3, 1] }}
                        className="flex flex-col items-center px-1 sm:px-2"
                      >
                        <span className="text-lg font-extrabold leading-none text-foreground sm:text-xl md:text-2xl">
                          {numeric > 0 ? <CountUp target={numeric} suffix={suffix} decimals={decimals} /> : s.value}
                        </span>
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.6, delay: 1.1 + i * 0.15, ease: [0.16, 1, 0.3, 1] }}
                          className="mt-0.5 line-clamp-2 text-center text-[11px] leading-tight text-muted-foreground sm:text-xs"
                        >
                          {s.label}
                        </motion.span>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </motion.div>
          </div>
        </div>
      </section>
    );
  }

  /* ── Standard hero (barberia / tattoo / nails / estetica) ──────────── */
  const heroBadgeShell = isEstetica
    ? "mb-2 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 shadow-[0_4px_16px_-4px_rgba(0,0,0,0.25),inset_0_1px_0_0_rgba(255,255,255,0.08)] backdrop-blur-md sm:mb-8 sm:gap-2 sm:px-5 sm:py-2.5"
    : isNails
      ? "mb-2 inline-flex items-center gap-2 rounded-full border border-accent-light/35 bg-surface-dark/40 px-3 py-1.5 shadow-[0_4px_16px_-4px_rgba(0,0,0,0.3),inset_0_1px_0_0_rgba(255,255,255,0.06)] backdrop-blur-md sm:mb-8 sm:gap-2.5 sm:px-4 sm:py-2"
      : "mb-2 inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/30 px-3 py-1.5 shadow-[0_4px_16px_-4px_rgba(0,0,0,0.35),inset_0_1px_0_0_rgba(255,255,255,0.06)] backdrop-blur-md sm:mb-8 sm:gap-2.5 sm:px-4 sm:py-2";

  return (
    <section ref={sectionRef} id="hero" className="relative flex min-h-[100dvh] items-end overflow-hidden">

      {/* ── Background ─────────────────────────────────────────────── */}
      <div className="absolute inset-0 z-0">
        {!omitBackground && (
          <motion.img
            style={{ y: parallaxY }}
            src={hero.backgroundImage}
            className="absolute inset-0 h-full w-full object-cover sm:h-[115%]"
            alt={localeConfig.hero.backgroundAlt}
            loading="eager"
            referrerPolicy="no-referrer"
          />
        )}
        <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-br from-black/45 via-black/20 to-black/45 dark:from-black/25 dark:via-black/10 dark:to-black/30" aria-hidden />
        {!omitBackground && (
          <div className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-t from-background via-black/30 to-transparent" aria-hidden />
        )}
        <div className="pointer-events-none absolute inset-0 z-[3] bg-gradient-to-r from-black/25 via-transparent to-transparent" aria-hidden />
      </div>

      {/* ── Content ─────────────────────────────────────────────────── */}
      <div className="relative z-20 mx-auto w-full max-w-7xl px-5 pb-5 pt-20 sm:px-6 sm:pb-24 sm:pt-40 md:pb-[clamp(1.5rem,5vh,8rem)] md:pt-[clamp(5rem,10vh,12rem)]">
        <div className="max-w-3xl">

          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: Y_SM }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: DUR_HERO }}
            className={heroBadgeShell}
          >
            {!isEstetica && [...Array(5)].map((_, i) => (
              <Star key={i} size={12} className="text-accent-light" fill="currentColor" />
            ))}
            <span
              className={
                isTattoo
                  ? "ml-1 font-gothic text-sm text-white/90"
                  : isNails
                    ? "ml-1 font-script text-sm text-white/90"
                    : "ml-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/90"
              }
            >
              {siteConfig.brand.tagline}
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={textContainerVariants}
            initial="hidden"
            animate="visible"
            className={
              isTattoo
                ? "mb-2 text-[clamp(1.75rem,7.5vw,3rem)] font-black leading-[1.05] tracking-wide text-white drop-shadow-[0_2px_24px_rgba(0,0,0,0.6)] sm:mb-6 sm:text-5xl md:text-7xl lg:text-8xl"
                : isNails
                  ? "mb-2 text-[clamp(1.75rem,7.5vw,3rem)] font-black leading-[1.05] tracking-wide text-white drop-shadow-[0_2px_18px_rgba(111,74,86,0.38)] sm:mb-6 sm:text-5xl md:text-7xl lg:text-8xl"
                  : isEstetica
                    ? "mb-2 text-[clamp(1.75rem,7.5vw,3rem)] font-normal leading-[1.05] tracking-wide text-white drop-shadow-[0_2px_20px_rgba(0,0,0,0.4)] sm:mb-6 sm:text-5xl md:text-7xl lg:text-8xl"
                    : "mb-2 text-[clamp(1.75rem,7.5vw,3rem)] font-black leading-[1] tracking-tighter text-white drop-shadow-[0_2px_24px_rgba(0,0,0,0.6)] sm:mb-6 sm:text-5xl md:text-7xl lg:text-8xl"
            }
          >
            {hero.titlePrefix.split(" ").map((word, i) => (
              <motion.span key={`p-${i}`} variants={textWordVariants(niche)} className="inline-block">
                {word}&nbsp;
              </motion.span>
            ))}
            <em
              className={
                isTattoo
                  ? "not-italic font-gothic text-accent-light"
                  : isNails
                    ? "not-italic font-serif font-semibold text-accent-light"
                    : "not-italic font-serif font-light text-accent-light"
              }
            >
              {hero.titleHighlight.split(" ").map((word, i) => (
                <motion.span key={`h-${i}`} variants={textWordVariants(niche)} className="inline-block">
                  {word}&nbsp;
                </motion.span>
              ))}
            </em>
            <br />
            <span
              className={
                isNails
                  ? "text-xl font-semibold tracking-wider text-white/85 sm:text-3xl md:text-4xl lg:text-5xl"
                  : isTattoo
                    ? "text-xl font-semibold tracking-wider text-white/75 sm:text-3xl md:text-4xl lg:text-5xl"
                    : "text-xl font-semibold tracking-tight text-white/75 sm:text-3xl md:text-4xl lg:text-5xl"
              }
            >
              {hero.titleSuffix.split(" ").map((word, i) => (
                <motion.span key={`s-${i}`} variants={textWordVariants(niche)} className="inline-block">
                  {word}&nbsp;
                </motion.span>
              ))}
            </span>
          </motion.h1>

          {/* Decorative rule */}
          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ duration: DUR_HERO, delay: 0.4 }}
            className="mb-2 h-px w-16 origin-left bg-gradient-to-r from-accent-light to-transparent sm:mb-6 sm:w-24"
          />

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: Y_SM }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: DUR_HERO, delay: 0.5 }}
            className={cn(
              "mb-3 max-w-xl text-sm leading-relaxed sm:mb-10 sm:text-base md:text-lg",
              isTattoo ? "font-normal text-white/80" : isNails ? "font-light text-white/85" : "font-light text-white/75",
            )}
          >
            {hero.subtitle}
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: Y_SM }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: DUR_HERO, delay: 0.65 }}
            className="flex flex-col gap-3 sm:flex-row sm:items-center"
          >
            {(siteConfig.features.showBooking || siteConfig.features.showInquiry) && (
              <motion.button
                type="button"
                onClick={() => onBookClick()}
                whileHover={{ y: BUTTON_PRESS[flavor].hoverY }}
                whileTap={{ scale: BUTTON_PRESS[flavor].scale }}
                transition={{ duration: BUTTON_PRESS[flavor].duration, ease: EASE_OUT_STRONG }}
                className={
                  isEstetica
                    ? "group flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-lg hover:bg-accent-light hover:text-primary-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 sm:gap-2.5 sm:px-8 sm:py-4 sm:text-base [transition:background-color_0.3s_cubic-bezier(0.23,1,0.32,1),color_0.3s_cubic-bezier(0.23,1,0.32,1),box-shadow_0.3s_cubic-bezier(0.23,1,0.32,1)]"
                    : isTattoo
                      ? "group flex items-center justify-center gap-2 rounded-md bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground shadow-xl shadow-black/30 hover:bg-foreground hover:text-background focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 sm:gap-2.5 sm:px-8 sm:py-4 sm:text-base [transition:background-color_0.3s_cubic-bezier(0.23,1,0.32,1),color_0.3s_cubic-bezier(0.23,1,0.32,1)]"
                      : isNails
                        ? "group flex items-center justify-center gap-2 bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground shadow-[0_8px_32px_-8px_rgba(111,74,86,0.35)] hover:bg-foreground hover:text-background focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 sm:gap-2.5 sm:px-8 sm:py-4 sm:text-base [transition:background-color_0.3s_cubic-bezier(0.23,1,0.32,1),color_0.3s_cubic-bezier(0.23,1,0.32,1)]"
                        : "group flex items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-xl shadow-black/30 hover:bg-accent-light hover:text-primary-foreground hover:shadow-accent/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 sm:gap-2.5 sm:px-8 sm:py-4 sm:text-base [transition:background-color_0.3s_cubic-bezier(0.23,1,0.32,1),color_0.3s_cubic-bezier(0.23,1,0.32,1),box-shadow_0.3s_cubic-bezier(0.23,1,0.32,1)]"
                }
              >
                <Calendar size={18} className="shrink-0" />
                <span className="truncate">{hero.ctaPrimary}</span>
                <ChevronRight size={16} className="shrink-0 transition-transform duration-300 group-hover:translate-x-1" />
              </motion.button>
            )}
            {siteConfig.features.showServices && !isEstetica && (
              <motion.a
                href="#services"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.16, ease: EASE_OUT_STRONG }}
                className={
                  isTattoo
                    ? "flex items-center justify-center gap-2 rounded-md border border-white/30 bg-white/10 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur-md hover:border-white/50 hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 sm:px-8 sm:py-4 sm:text-base [transition:border-color_0.3s_cubic-bezier(0.23,1,0.32,1),background-color_0.3s_cubic-bezier(0.23,1,0.32,1)]"
                    : isNails
                      ? "flex items-center justify-center gap-2 border border-accent-light/35 bg-surface-dark/45 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur-md hover:border-accent-light/60 hover:bg-surface-dark/65 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 sm:px-8 sm:py-4 sm:text-base [transition:border-color_0.3s_cubic-bezier(0.23,1,0.32,1),background-color_0.3s_cubic-bezier(0.23,1,0.32,1)]"
                      : "flex items-center justify-center gap-2 rounded-2xl border border-white/25 bg-white/10 px-8 py-4 text-base font-semibold text-white backdrop-blur-md hover:border-white/40 hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 [transition:border-color_0.3s_cubic-bezier(0.23,1,0.32,1),background-color_0.3s_cubic-bezier(0.23,1,0.32,1)]"
                }
              >
                {hero.ctaSecondary}
              </motion.a>
            )}
          </motion.div>

          {siteConfig.features.showServices && isEstetica && (
            <motion.a
              href="#services"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: DUR_HERO, delay: 0.85, ease: EASE_OUT_STRONG }}
              className="group mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-white/50 hover:text-white/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 sm:mt-5 [transition:color_0.3s_cubic-bezier(0.23,1,0.32,1)]"
            >
              <span>{hero.ctaSecondary}</span>
              <ChevronRight size={14} className="transition-transform duration-300 group-hover:translate-x-0.5" />
            </motion.a>
          )}
        </div>

        {/* Stats row */}
        {!isEstetica && siteConfig.features.showHeroStats !== false && (
        <motion.div
          initial={{ opacity: 0, y: Y_MD }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: DUR_HERO, delay: 0.85 }}
          className={
            isNails
              ? "mt-3 grid grid-cols-4 gap-px overflow-hidden rounded-xl border border-accent-light/20 bg-surface-dark/35 shadow-[0_8px_32px_-12px_rgba(0,0,0,0.3)] backdrop-blur-md sm:mt-16 sm:rounded-2xl"
              : isTattoo
                ? "mt-3 grid grid-cols-4 gap-px overflow-hidden rounded-md border border-white/10 bg-white/10 shadow-[0_6px_24px_-8px_rgba(0,0,0,0.4)] backdrop-blur-md sm:mt-16 sm:rounded-lg"
                : "mt-3 grid grid-cols-4 gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 shadow-[0_8px_32px_-12px_rgba(0,0,0,0.3)] backdrop-blur-md sm:mt-16 sm:rounded-2xl"
          }
        >
          {STAT_DEFS.map(({ icon: Icon, numericValue, suffix, decimals, labelKey }, i) => (
            <motion.div
              key={labelKey}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.9 + i * 0.08, ease: EASE_OUT_STRONG }}
              className={
                isNails
                  ? "flex flex-col items-center gap-0.5 bg-surface-dark/45 px-1.5 py-2 text-center transition-colors duration-200 hover:bg-surface-dark/60 sm:gap-1.5 sm:px-4 sm:py-5"
                  : isTattoo
                    ? "flex flex-col items-center gap-0.5 bg-black/20 px-1.5 py-2 text-center transition-colors duration-200 hover:bg-black/30 sm:gap-1.5 sm:px-4 sm:py-5"
                    : "flex flex-col items-center gap-0.5 bg-black/20 px-1.5 py-2 text-center transition-colors duration-200 hover:bg-black/30 sm:gap-1.5 sm:px-4 sm:py-5"
              }
            >
              <Icon size={14} className="text-accent-light sm:h-[18px] sm:w-[18px]" />
              <span className="font-serif text-base font-bold leading-none text-white sm:text-2xl">
                <CountUp target={numericValue} suffix={suffix} decimals={decimals} />
              </span>
              <span className={cn(
                "line-clamp-2 text-center text-[10px] font-medium uppercase leading-tight sm:text-xs",
                isNails ? "text-white/70" : "text-white/60",
              )}>
                {localeConfig.hero.stats[labelKey]}
              </span>
            </motion.div>
          ))}
        </motion.div>
        )}
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: SCROLL_INDICATOR_DELAY, duration: DUR_HERO }}
        style={{ opacity: scrollIndicatorOpacity }}
        className="absolute bottom-8 end-8 z-20 hidden flex-col items-center gap-2 md:flex"
      >
        <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/40 [writing-mode:vertical-rl]">
          {localeConfig.hero.scrollHint}
        </span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          className="h-12 w-px bg-gradient-to-b from-accent-light/70 to-transparent"
        />
      </motion.div>
    </section>
  );
}
