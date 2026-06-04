/**
 * BusinessHero.tsx
 *
 * Hero for the companies-facing employment landing. Distinct from the
 * job-seeker hero: split layout, text-anchored left, and a live-feel
 * "availability ticker" card right. Stripe/Linear register — restrained
 * cyan with one indigo accent for the secondary depth layer.
 */

import { motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowUpRight, Briefcase, Sparkles } from "lucide-react";
import React from "react";
import { localeConfig } from "../../../../config/locale";
import { siteConfig } from "../../../../config/site";
import { useBusinessLocale } from "./useBusinessLocale";

const EASE = [0.23, 1, 0.32, 1] as const;

const scrollToForm = () => {
  document.getElementById("business-form")?.scrollIntoView({ behavior: "smooth" });
};
const scrollToProcess = () => {
  document.getElementById("business-process")?.scrollIntoView({ behavior: "smooth" });
};

export function BusinessHero() {
  const data = useBusinessLocale().hero;
  const rtl = localeConfig.dir === "rtl";
  const reduce = useReducedMotion();
  const brandName = siteConfig.brand?.name ?? "";

  return (
    <section
      id="business-hero"
      className="relative isolate overflow-hidden pb-20 pt-28 sm:pt-32 lg:pb-28 lg:pt-40"
    >
      {/* ── Background: deep tinted neutral, no #000. Cyan ambience top-right,
           indigo wash bottom-left, faint dot grid through the centre. ──── */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{ background: "oklch(0.18 0.02 240)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 end-[-12%] -z-10 h-[640px] w-[640px] rounded-full opacity-70"
        style={{
          background:
            "radial-gradient(circle, rgba(8,145,178,0.55) 0%, rgba(8,145,178,0.16) 38%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-[-15%] start-[-6%] -z-10 h-[520px] w-[520px] rounded-full opacity-50"
        style={{
          background:
            "radial-gradient(circle, rgba(79,70,229,0.4) 0%, rgba(79,70,229,0.08) 40%, transparent 70%)",
          filter: "blur(50px)",
        }}
      />
      {/* Dot grid texture (subtle structural layer) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.12]"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          maskImage:
            "radial-gradient(ellipse 70% 60% at 50% 40%, black 30%, transparent 75%)",
        }}
      />

      <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-5 sm:px-8 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16 lg:px-12">
        {/* ── Left: copy ────────────────────────────────────────────────── */}
        <div className="relative">
          {/* Eyebrow chip */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: EASE }}
            className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#22D3EE]/35 bg-[rgba(8,145,178,0.14)] px-3.5 py-1.5 backdrop-blur-md"
          >
            <Briefcase size={13} className="text-[#22D3EE]" strokeWidth={2.2} aria-hidden />
            <span className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-100/90">
              {data.eyebrow} · {brandName}
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.07, ease: EASE }}
            className="font-serif text-[clamp(2.4rem,6vw,4.5rem)] font-black leading-[1.02] tracking-tight text-white"
            style={{ textWrap: "balance" } as React.CSSProperties}
          >
            <span className="block">{data.titleLine1}</span>
            <span className="block text-[#22D3EE]">{data.titleHighlight}</span>
          </motion.h1>

          {/* Accent divider — grows from the visual start of the row.
              Tailwind v4 has no logical transform-origin token, so we pair
              `origin-left` with `rtl:origin-right` to flip in Hebrew. */}
          <motion.div
            aria-hidden
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.55, delay: 0.35, ease: EASE }}
            className="mt-7 h-[2px] w-16 origin-left rtl:origin-right bg-[#0891B2]"
          />

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.32, ease: EASE }}
            className="mt-6 max-w-xl font-sans text-base leading-relaxed text-white/78 sm:text-lg"
            style={{ textWrap: "pretty" } as React.CSSProperties}
          >
            {data.subtitle}
          </motion.p>

          {/* CTA pair */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.42, ease: EASE }}
            className="mt-9 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center"
          >
            <button
              type="button"
              onClick={scrollToForm}
              className="group inline-flex min-h-[52px] items-center justify-center gap-2.5 rounded-xl bg-[#0891B2] px-6 py-3.5 font-sans text-base font-bold text-white shadow-[0_18px_55px_-18px_rgba(8,145,178,0.85)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#22D3EE]/60 active:scale-[0.97] [transition:background-color_0.2s_cubic-bezier(0.23,1,0.32,1),transform_0.15s_cubic-bezier(0.23,1,0.32,1),box-shadow_0.3s_cubic-bezier(0.23,1,0.32,1)] hover:bg-[#0e7490]"
            >
              <span>{data.ctaPrimary}</span>
              <ArrowLeft
                size={18}
                strokeWidth={2.4}
                className={rtl ? "transition-transform duration-200 group-hover:-translate-x-1" : "rotate-180 transition-transform duration-200 group-hover:translate-x-1"}
                aria-hidden
              />
            </button>
            <button
              type="button"
              onClick={scrollToProcess}
              className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-6 py-3.5 font-sans text-base font-semibold text-white backdrop-blur-md focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 active:scale-[0.97] [transition:background-color_0.2s_cubic-bezier(0.23,1,0.32,1),border-color_0.2s_cubic-bezier(0.23,1,0.32,1),transform_0.15s_cubic-bezier(0.23,1,0.32,1)] hover:border-white/30 hover:bg-white/[0.07]"
            >
              {data.ctaSecondary}
            </button>
          </motion.div>
        </div>

        {/* ── Right: live availability card ───────────────────────────── */}
        {/* Not a generic stat grid — a single anchored card with a header and
            split rows. Reads as a small dashboard preview rather than the
            hero-metric cliché. */}
        <motion.aside
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: EASE }}
          className="relative"
        >
          {/* Soft glow behind card */}
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-6 -z-10 rounded-[2.5rem] opacity-50"
            style={{
              background:
                "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(34,211,238,0.32) 0%, transparent 70%)",
              filter: "blur(28px)",
            }}
          />

          <div className="overflow-hidden rounded-3xl border border-white/12 bg-white/[0.045] backdrop-blur-xl shadow-[0_36px_80px_-24px_rgba(0,0,0,0.55)]">
            {/* Card header — live indicator + brand wordmark */}
            <div className="flex items-center justify-between gap-4 border-b border-white/10 px-6 py-5">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-2.5 w-2.5">
                  {!reduce && (
                    <span
                      className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"
                      aria-hidden
                    />
                  )}
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
                </span>
                <span className="font-sans text-xs font-semibold uppercase tracking-[0.18em] text-white/75">
                  Live
                </span>
              </div>
              <Sparkles size={16} className="text-[#22D3EE]" strokeWidth={2.2} aria-hidden />
            </div>

            {/* Stats — staggered rows, each with a value + label, separated by
                hairline. Spacing varies — top row has more padding for rhythm. */}
            <ul className="divide-y divide-white/8 px-6 pb-6 pt-2">
              {data.stats.map((stat, i) => (
                <motion.li
                  key={stat.label}
                  initial={{ opacity: 0, x: rtl ? -12 : 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.45 + i * 0.07, ease: EASE }}
                  className={[
                    "flex items-baseline justify-between gap-4",
                    i === 0 ? "pb-4 pt-5" : "py-4",
                  ].join(" ")}
                >
                  <span
                    className="font-serif text-[2.25rem] font-black leading-none tabular-nums text-white sm:text-[2.5rem]"
                  >
                    {stat.value}
                  </span>
                  <span className="text-end font-sans text-sm font-medium leading-tight text-white/65 sm:text-base">
                    {stat.label}
                  </span>
                </motion.li>
              ))}
            </ul>

            {/* Card footer — small affordance to the form */}
            <button
              type="button"
              onClick={scrollToForm}
              className="group flex w-full items-center justify-between gap-2 border-t border-white/10 bg-[rgba(8,145,178,0.12)] px-6 py-4 text-start text-sm font-semibold text-white transition-colors duration-200 hover:bg-[rgba(8,145,178,0.18)] focus:outline-none focus-visible:bg-[rgba(8,145,178,0.22)]"
            >
              <span>{data.ctaPrimary}</span>
              <ArrowUpRight
                size={16}
                className={rtl ? "-scale-x-100 text-[#22D3EE] transition-transform group-hover:-translate-x-0.5" : "text-[#22D3EE] transition-transform group-hover:translate-x-0.5"}
                strokeWidth={2.4}
                aria-hidden
              />
            </button>
          </div>
        </motion.aside>
      </div>
    </section>
  );
}

export default BusinessHero;
