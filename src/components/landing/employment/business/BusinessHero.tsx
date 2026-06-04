/**
 * BusinessHero.tsx
 *
 * Hero for the companies-facing employment landing. Mirrors the visual
 * structure of EmploymentHero — full-bleed background image, dark gradient
 * overlays, centered text with eyebrow/headline/subtitle/CTAs, and a
 * frosted stats bar anchored at the bottom.
 */

import { motion, useScroll, useTransform, useReducedMotion } from "motion/react";
import { ArrowLeft, Briefcase, ChevronDown } from "lucide-react";
import React from "react";
import { localeConfig } from "../../../../config/locale";
import { siteConfig } from "../../../../config/site";
import { useBusinessLocale } from "./useBusinessLocale";
import {
  Y_MD,
  EASE_OUT_STRONG,
  SCROLL_INDICATOR_DELAY,
} from "../../../../lib/motion";

const EASE = [0.23, 1, 0.32, 1] as const;
const BG_IMAGE =
  "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1920&q=80";

const scrollToForm = () => {
  document.getElementById("business-form")?.scrollIntoView({ behavior: "smooth" });
};
const scrollToProcess = () => {
  document.getElementById("business-process")?.scrollIntoView({ behavior: "smooth" });
};

interface StatItemProps {
  value: string;
  label: string;
  index: number;
}

function StatItem({ value, label, index }: StatItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 1.0 + index * 0.07, ease: EASE }}
      className="flex flex-1 flex-col items-center gap-0.5 px-4 py-3 sm:py-4"
    >
      <span className="font-sans text-xl font-extrabold leading-none tabular-nums text-white sm:text-2xl md:text-3xl">
        {value}
      </span>
      <span className="mt-0.5 text-center text-[11px] font-medium leading-tight text-white/70 sm:text-xs">
        {label}
      </span>
    </motion.div>
  );
}

export function BusinessHero() {
  const data = useBusinessLocale().hero;
  const rtl = localeConfig.dir === "rtl";
  const reduce = useReducedMotion();
  const brandName = siteConfig.brand?.name ?? "";

  const sectionRef = React.useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  const parallaxY = useTransform(scrollYProgress, [0, 1], [0, -80]);
  const scrollIndicatorOpacity = useTransform(scrollYProgress, [0, 0.18], [1, 0]);
  const hasStats = Array.isArray(data.stats) && data.stats.length > 0;

  return (
    <section
      ref={sectionRef}
      id="business-hero"
      className="relative flex min-h-[85vh] w-full flex-col items-center justify-center overflow-hidden sm:min-h-screen"
    >
      {/* ── Background image with parallax ──────────────────────────── */}
      <div className="absolute inset-0 z-0">
        <motion.img
          style={reduce ? undefined : { y: parallaxY }}
          src={BG_IMAGE}
          alt=""
          role="presentation"
          loading="eager"
          referrerPolicy="no-referrer"
          className="absolute inset-0 h-[115%] w-full object-cover object-center"
        />

        {/* Dark mesh gradient — bottom-anchored, brand-tinted */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, rgba(6,12,22,0.92) 0%, rgba(6,12,22,0.72) 28%, rgba(232,130,12,0.08) 60%, transparent 100%)",
          }}
        />
        {/* Side vignette for depth */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[rgba(6,12,22,0.55)] via-transparent to-[rgba(6,12,22,0.35)]"
        />
        {/* Top fade for navbar legibility */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[rgba(6,12,22,0.5)] to-transparent"
        />
      </div>

      {/* ── Subtle teal glow orb top-right ───────────────────────────── */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 end-[-8rem] h-[600px] w-[600px] rounded-full opacity-20"
        style={{
          background:
            "radial-gradient(circle, rgba(232,130,12,0.55) 0%, rgba(232,130,12,0.1) 55%, transparent 75%)",
          filter: "blur(48px)",
        }}
      />

      {/* ── Main content ─────────────────────────────────────────────── */}
      <div className="relative z-10 mx-auto w-full max-w-4xl px-5 pb-32 pt-24 text-center sm:px-6 sm:pb-40 sm:pt-32 md:pt-36 lg:pt-40">

        {/* Eyebrow chip */}
        <motion.div
          initial={{ opacity: 0, y: Y_MD }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.1, ease: EASE }}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-[rgba(232,130,12,0.35)] bg-[rgba(232,130,12,0.12)] px-4 py-1.5 shadow-[0_4px_16px_-4px_rgba(232,130,12,0.3)] backdrop-blur-md sm:mb-8"
        >
          <Briefcase size={13} className="shrink-0 text-[#F5A623]" aria-hidden />
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-200 sm:text-xs">
            {data.eyebrow} · {brandName}
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.18, ease: EASE }}
          className="mb-4 font-serif text-4xl font-black leading-[1.05] tracking-tight text-white drop-shadow-[0_2px_16px_rgba(0,0,0,0.4)] sm:mb-6 sm:text-5xl md:text-6xl lg:text-7xl"
        >
          <span className="block">{data.titleLine1}</span>
          <span className="block font-black text-[#F5A623]">{data.titleHighlight}</span>
        </motion.h1>

        {/* Accent divider */}
        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ duration: 0.55, delay: 0.45, ease: EASE_OUT_STRONG }}
          className="mx-auto mb-5 h-[2px] w-16 origin-center bg-[#E8820C] sm:mb-7 sm:w-20"
          aria-hidden
        />

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: Y_MD }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.5, ease: EASE }}
          className="mx-auto mb-8 max-w-2xl font-sans text-base leading-relaxed text-white/80 sm:mb-10 sm:text-lg md:text-xl"
        >
          {data.subtitle}
        </motion.p>

        {/* CTA buttons */}
        <motion.div
          initial={{ opacity: 0, y: Y_MD }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.62, ease: EASE }}
          className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4"
        >
          {/* Primary: filled teal */}
          <motion.button
            type="button"
            onClick={scrollToForm}
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.18, ease: EASE_OUT_STRONG }}
            className="group flex min-h-[52px] min-w-[200px] items-center justify-center gap-2.5 rounded-xl bg-[#E8820C] px-7 py-3.5 font-sans text-base font-bold text-white shadow-[0_18px_55px_-18px_rgba(232,130,12,0.7)] hover:bg-[#C46A08] hover:shadow-[0_22px_65px_-18px_rgba(232,130,12,0.85)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F5A623]/60 active:scale-[0.97] sm:text-base [transition:background-color_0.2s_cubic-bezier(0.25,0.46,0.45,0.94),box-shadow_0.3s_cubic-bezier(0.25,0.46,0.45,0.94),transform_0.15s_cubic-bezier(0.25,0.46,0.45,0.94)]"
          >
            <span className="truncate">{data.ctaPrimary}</span>
            <ArrowLeft
              size={18}
              strokeWidth={2.4}
              className={
                rtl
                  ? "shrink-0 transition-transform duration-200 group-hover:-translate-x-1"
                  : "shrink-0 rotate-180 transition-transform duration-200 group-hover:translate-x-1"
              }
              aria-hidden
            />
          </motion.button>

          {/* Secondary: ghost outline */}
          <motion.button
            type="button"
            onClick={scrollToProcess}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.18, ease: EASE_OUT_STRONG }}
            className="flex min-h-[52px] min-w-[200px] items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-7 py-3.5 font-sans text-base font-semibold text-white backdrop-blur-md hover:border-white/40 hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 active:scale-[0.97] [transition:border-color_0.2s_cubic-bezier(0.25,0.46,0.45,0.94),background-color_0.2s_cubic-bezier(0.25,0.46,0.45,0.94),transform_0.15s_cubic-bezier(0.25,0.46,0.45,0.94)]"
          >
            <span className="truncate">{data.ctaSecondary}</span>
          </motion.button>
        </motion.div>
      </div>

      {/* ── Stats bar — slides up from below ────────────────────────── */}
      {hasStats && (
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.85, ease: EASE }}
          className="absolute inset-x-0 bottom-0 z-20"
        >
          <div className="mx-auto max-w-3xl px-4 pb-4 sm:px-6 sm:pb-6">
            <div className="flex items-stretch divide-x divide-white/25 overflow-hidden rounded-2xl border border-white/10 bg-[rgba(6,12,22,0.65)] shadow-[0_-8px_40px_-12px_rgba(0,0,0,0.5)] backdrop-blur-xl rtl:divide-x-reverse">
              {data.stats.map((stat, i) => (
                <StatItem
                  key={i}
                  value={stat.value}
                  label={stat.label}
                  index={i}
                />
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Scroll indicator (hidden when stats bar is present) ───── */}
      {!hasStats && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: SCROLL_INDICATOR_DELAY, duration: 0.6 }}
          style={{ opacity: scrollIndicatorOpacity }}
          className="absolute bottom-8 left-1/2 z-20 -translate-x-1/2"
          aria-hidden
        >
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
            className="flex flex-col items-center gap-1"
          >
            <ChevronDown size={22} className="text-white/35" />
          </motion.div>
        </motion.div>
      )}
    </section>
  );
}

export default BusinessHero;
