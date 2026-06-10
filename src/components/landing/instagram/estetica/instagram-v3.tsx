/**
 * instagram/estetica/instagram-v3.tsx — KEEPSAKE STRIP (estética).
 *
 * Horizontal scroll strip of polaroid keepsakes: white-matted frames with
 * gentle alternating tilt and the handle as a handwritten-style serif
 * caption. Follows the template rail contract (touch-pan-y +
 * overflow-y-hidden + pb ≥ Y_LG) so it never traps page scroll.
 *
 * Selected when `sections.instagram.variant === "v3"` and niche is estética.
 */
import React from "react";
import { Instagram, ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import { cn, handleImgError } from "../../../../lib/utils";
import { localeConfig } from "../../../../config/locale";
import { siteConfig } from "../../../../config/site";
import {
  Y_SM, Y_LG, VIEWPORT_ONCE,
  getNicheFlavor, NICHE_DURATION, NICHE_EASING, EASE_OUT_STRONG,
} from "../../../../lib/motion";

const STRINGS: Record<"en" | "he" | "ru" | "ar", { follow: string; rail: string }> = {
  en: { follow: "See more on Instagram", rail: "Instagram photos" },
  he: { follow: "עוד באינסטגרם", rail: "תמונות אינסטגרם" },
  ru: { follow: "Больше в Instagram", rail: "Фото из Instagram" },
  ar: { follow: "المزيد على إنستغرام", rail: "صور إنستغرام" },
};

const TILTS = ["-rotate-2", "rotate-1", "-rotate-1", "rotate-2", "-rotate-1", "rotate-1"];

export function EsteticaInstagramV3() {
  const ig = siteConfig.sections.instagram;
  const niche = siteConfig.business.type;
  const flavor = getNicheFlavor(niche);
  const dur = NICHE_DURATION[flavor];
  const ease = NICHE_EASING[flavor];
  const t = STRINGS[localeConfig.lang] ?? STRINGS.en;

  const images = (ig?.images ?? []).slice(0, 8);
  if (!ig || images.length === 0) return null;

  return (
    <section id="instagram" className="overflow-hidden bg-background py-16 transition-colors duration-300 sm:py-24 lg:py-28">
      {/* ── Header row ───────────────────────────────────────────────── */}
      <div className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-6 px-5 sm:px-6 lg:px-8">
        <div className="min-w-0">
          <motion.p
            initial={{ opacity: 0, y: Y_SM }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT_ONCE}
            transition={{ duration: dur, ease }}
            className="mb-3 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.32em] text-accent-light sm:text-xs"
          >
            <Instagram size={13} aria-hidden />
            <span dir="ltr" className="truncate">{ig.handle}</span>
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: Y_LG }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT_ONCE}
            transition={{ duration: dur, ease, delay: 0.08 }}
            className="font-serif text-3xl font-light leading-[1.08] text-balance text-foreground sm:text-4xl md:text-5xl"
          >
            {ig.title}
          </motion.h2>
        </div>

        <motion.a
          href={ig.url}
          target="_blank"
          rel="noopener noreferrer"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={VIEWPORT_ONCE}
          transition={{ duration: dur, delay: 0.2 }}
          whileTap={{ scale: 0.97 }}
          className="group inline-flex min-h-[44px] shrink-0 items-center gap-2 text-sm font-medium text-accent hover:text-accent-light focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 [transition:color_0.3s_cubic-bezier(0.23,1,0.32,1)]"
        >
          <span>{t.follow}</span>
          <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" aria-hidden />
        </motion.a>
      </div>

      {/* ── Polaroid strip ───────────────────────────────────────────── */}
      <div
        role="region"
        aria-label={t.rail}
        tabIndex={0}
        className={cn(
          "mt-10 flex touch-pan-y gap-7 overflow-x-auto overflow-y-hidden overscroll-x-contain pb-10 pt-4 sm:mt-12",
          "px-5 sm:px-6 lg:px-[max(1.5rem,calc((100vw-80rem)/2))]",
          "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
        )}
      >
        {images.map((src, index) => (
          <motion.a
            key={`${src}-${index}`}
            href={ig.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${ig.handle} — Instagram`}
            initial={{ opacity: 0, y: Y_LG }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT_ONCE}
            transition={{ duration: dur, ease, delay: Math.min(index * 0.06, 0.3) }}
            className={cn(
              "group block w-[13.5rem] shrink-0 rounded-[0.375rem] border border-border bg-card p-3 pb-9 shadow-elevated sm:w-[15rem]",
              "transition-[transform,box-shadow] duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] hover:rotate-0 hover:-translate-y-1.5",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60",
              TILTS[index % TILTS.length],
            )}
          >
            <span className="block overflow-hidden rounded-[0.25rem]">
              <img
                src={src}
                alt={`Instagram — ${ig.handle}`}
                loading="lazy"
                decoding="async"
                onError={handleImgError}
                referrerPolicy="no-referrer"
                className="aspect-square w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-[1.05]"
                draggable={false}
              />
            </span>
            <span dir="ltr" className="mt-3 block truncate text-center font-serif text-sm italic text-muted-foreground">
              {ig.handle}
            </span>
          </motion.a>
        ))}
      </div>
    </section>
  );
}
