/**
 * hero-v3.tsx — VIDEO BACKGROUND hero variant.
 *
 * Full-viewport hero with `hero.videoUrl` as a muted/looped autoplay layer
 * (poster = backgroundImage). When no video is configured — or motion is
 * reduced — falls back to the background image with a slow Ken Burns zoom.
 * Dark overlay via getOverlayOpacity(0.55), centered-left content, scroll
 * cue at the bottom. Video pauses while the document is hidden.
 *
 * Selected via `hero.variant === "v3"` (see Hero.tsx dispatcher).
 */
import React from "react";
import { Calendar, ChevronRight } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { siteConfig } from "../../../config/site";
import { localeConfig } from "../../../config/locale";
import { getAnimationLevel, getOverlayOpacity } from "../../../lib/section-variants";
import {
  getNicheFlavor, NICHE_DURATION, NICHE_EASING, NICHE_STAGGER,
  BUTTON_PRESS, EASE_OUT_STRONG, SCROLL_INDICATOR_DELAY,
} from "../../../lib/motion";

function scrollToServices() {
  document.getElementById("services")?.scrollIntoView({ behavior: "smooth" });
}

export function HeroV3({ onBookClick }: { onBookClick: (serviceId?: string) => void }) {
  const { hero, brand, features } = siteConfig;
  const niche = siteConfig.business.type;
  const flavor = getNicheFlavor(niche);
  const dur = NICHE_DURATION[flavor];
  const ease = NICHE_EASING[flavor];
  const step = NICHE_STAGGER[flavor];

  const prefersReducedMotion = useReducedMotion();
  const animOk = getAnimationLevel() !== "none" && !prefersReducedMotion;
  const showVideo = Boolean(hero.videoUrl) && animOk;
  const overlayOpacity = getOverlayOpacity(0.55);
  const eyebrow = hero.eyebrow || brand.tagline;

  /* Pause video while tab is hidden; resume on return. */
  const videoRef = React.useRef<HTMLVideoElement>(null);
  React.useEffect(() => {
    if (!showVideo) return;
    const onVisibility = () => {
      const v = videoRef.current;
      if (!v) return;
      if (document.hidden) v.pause();
      else void v.play().catch(() => { /* autoplay restriction — poster remains */ });
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [showVideo]);

  return (
    <section id="hero" className="relative flex min-h-[100dvh] items-center overflow-hidden">

      {/* ── Background: video, or Ken Burns image fallback ───────────── */}
      <div className="absolute inset-0 z-0">
        {showVideo ? (
          <video
            ref={videoRef}
            className="absolute inset-0 h-full w-full object-cover"
            src={hero.videoUrl}
            poster={hero.backgroundImage}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            aria-hidden
            tabIndex={-1}
          />
        ) : (
          <motion.img
            src={hero.backgroundImage}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            loading="eager"
            referrerPolicy="no-referrer"
            aria-hidden
            {...(animOk
              ? {
                  initial: { scale: 1 },
                  animate: { scale: 1.12 },
                  transition: { duration: 22, ease: "linear" as const },
                }
              : {})}
          />
        )}
        {/* Dark overlay — config-driven opacity */}
        <div className="pointer-events-none absolute inset-0 bg-black" style={{ opacity: overlayOpacity }} aria-hidden />
        {/* Grounding gradient so the content edge stays legible */}
        <div className="gs-gradient pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/20" aria-hidden />
      </div>

      {/* ── Content — centered-left ──────────────────────────────────── */}
      <div className="relative z-10 mx-auto w-full max-w-7xl px-5 pb-24 pt-24 sm:px-6 lg:px-8">
        <div className="max-w-2xl text-start">

          {eyebrow && (
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: dur, ease }}
              className="mb-5 text-[11px] font-semibold uppercase tracking-[0.3em] text-accent-light sm:mb-6 sm:text-xs"
            >
              {eyebrow}
            </motion.p>
          )}

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: dur * 1.1, ease, delay: step }}
            className="mb-6 font-serif text-[clamp(2.5rem,7vw,5.5rem)] font-medium leading-[1.04] tracking-tight text-white drop-shadow-[0_2px_24px_rgba(0,0,0,0.5)] sm:mb-7"
          >
            {hero.titlePrefix}{" "}
            <em className="font-serif italic text-accent-light">{hero.titleHighlight}</em>
            {hero.titleSuffix.trim() ? <> {hero.titleSuffix}</> : null}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: dur, ease, delay: step * 2 }}
            className="mb-8 max-w-xl text-base font-light leading-relaxed text-white/80 sm:mb-10 md:text-lg"
          >
            {hero.subtitle}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: dur, ease, delay: step * 3 }}
            className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4"
          >
            {(features.showBooking || features.showInquiry) && (
              <motion.button
                type="button"
                onClick={() => onBookClick()}
                whileHover={{ y: BUTTON_PRESS[flavor].hoverY }}
                whileTap={{ scale: BUTTON_PRESS[flavor].scale }}
                transition={{ duration: BUTTON_PRESS[flavor].duration, ease: EASE_OUT_STRONG }}
                className="group inline-flex min-h-[48px] items-center justify-center gap-2.5 rounded-full bg-primary px-8 py-3.5 text-sm font-semibold text-primary-foreground shadow-xl shadow-black/30 hover:bg-accent-light focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 sm:text-base [transition:background-color_0.3s_cubic-bezier(0.23,1,0.32,1)]"
              >
                <Calendar size={17} className="shrink-0" />
                <span className="truncate">{hero.ctaPrimary}</span>
                <ChevronRight size={15} className="shrink-0 transition-transform duration-300 group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1" />
              </motion.button>
            )}
            {features.showServices && (
              <motion.button
                type="button"
                onClick={scrollToServices}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.16, ease: EASE_OUT_STRONG }}
                className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-white/30 bg-white/10 px-8 py-3.5 text-sm font-semibold text-white backdrop-blur-md hover:border-white/50 hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 sm:text-base [transition:border-color_0.3s_cubic-bezier(0.23,1,0.32,1),background-color_0.3s_cubic-bezier(0.23,1,0.32,1)]"
              >
                <span className="truncate">{hero.ctaSecondary}</span>
              </motion.button>
            )}
          </motion.div>
        </div>
      </div>

      {/* ── Scroll cue ───────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: SCROLL_INDICATOR_DELAY, duration: dur }}
        className="absolute bottom-7 left-1/2 z-10 hidden -translate-x-1/2 flex-col items-center gap-2 md:flex"
      >
        <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/50">
          {localeConfig.hero.scrollHint}
        </span>
        {animOk ? (
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="h-10 w-px bg-gradient-to-b from-white/60 to-transparent"
            aria-hidden
          />
        ) : (
          <div className="h-10 w-px bg-gradient-to-b from-white/60 to-transparent" aria-hidden />
        )}
      </motion.div>
    </section>
  );
}
