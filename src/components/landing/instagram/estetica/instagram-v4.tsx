/**
 * instagram/estetica/instagram-v4.tsx — MIRROR GRID (estética).
 *
 * Composed vanity-mirror layout: one tall arch feature on the start side,
 * four soft tiles beside it, and an integrated tinted FOLLOW tile carrying
 * the handle and icon — the CTA lives inside the grid, not under it.
 *
 * Selected when `sections.instagram.variant === "v4"` and niche is estética.
 */
import React from "react";
import { Instagram, ArrowUpRight } from "lucide-react";
import { motion } from "motion/react";
import { cn, handleImgError } from "../../../../lib/utils";
import { localeConfig } from "../../../../config/locale";
import { siteConfig } from "../../../../config/site";
import {
  Y_SM, Y_LG, VIEWPORT_ONCE,
  getNicheFlavor, NICHE_DURATION, NICHE_EASING,
} from "../../../../lib/motion";

const STRINGS: Record<"en" | "he" | "ru" | "ar", { follow: string }> = {
  en: { follow: "Follow us" },
  he: { follow: "עקבו אחרינו" },
  ru: { follow: "Подписывайтесь" },
  ar: { follow: "تابعونا" },
};

export function EsteticaInstagramV4() {
  const ig = siteConfig.sections.instagram;
  const niche = siteConfig.business.type;
  const flavor = getNicheFlavor(niche);
  const dur = NICHE_DURATION[flavor];
  const ease = NICHE_EASING[flavor];
  const t = STRINGS[localeConfig.lang] ?? STRINGS.en;

  // Feature + 3 tiles + the follow tile = the 2×2 block beside the arch
  // feature fills exactly; a 5th image would orphan into a lonely row.
  const images = (ig?.images ?? []).slice(0, 4);
  if (!ig || images.length === 0) return null;
  const [feature, ...tiles] = images;

  const tile = (src: string, index: number, className: string) => (
    <motion.a
      key={`${src}-${index}`}
      href={ig.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${ig.handle} — Instagram`}
      initial={{ opacity: 0, y: Y_LG }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={VIEWPORT_ONCE}
      transition={{ duration: dur, ease, delay: Math.min(index * 0.07, 0.35) }}
      className={cn(
        "group relative block overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60",
        className,
      )}
    >
      <img
        src={src}
        alt={`Instagram — ${ig.handle}`}
        loading="lazy"
        decoding="async"
        onError={handleImgError}
        referrerPolicy="no-referrer"
        className="h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-[1.05]"
      />
      <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-[background-color,opacity] duration-500 group-hover:bg-black/30 group-hover:opacity-100" aria-hidden>
        <Instagram size={18} className="text-white" />
      </span>
    </motion.a>
  );

  return (
    <section id="instagram" className="bg-background py-16 transition-colors duration-300 sm:py-24 lg:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="mb-10 max-w-2xl sm:mb-14">
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

        {/* ── Mirror composition ─────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 sm:gap-[var(--gs-gap)] lg:grid-cols-4">
          {/* Arch feature spans two rows */}
          {feature && tile(feature, 0, "col-span-2 row-span-2 rounded-t-[7rem] rounded-b-[0.5rem] aspect-[4/5] sm:rounded-t-[10rem] lg:aspect-auto")}

          {tiles.slice(0, 2).map((src, i) => tile(src, i + 1, "rounded-[0.5rem] aspect-square"))}

          {/* Integrated follow tile */}
          <motion.a
            href={ig.url}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: Y_LG }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT_ONCE}
            transition={{ duration: dur, ease, delay: 0.2 }}
            className="group flex aspect-square flex-col items-center justify-center gap-3 rounded-[0.5rem] border border-accent/30 bg-secondary/70 text-center dark:bg-secondary/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-primary-foreground transition-transform duration-400 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-110" aria-hidden>
              <Instagram size={18} />
            </span>
            <span className="px-3 text-xs font-medium uppercase tracking-[0.18em] text-accent">
              {t.follow}
            </span>
            <span dir="ltr" className="flex items-center gap-1 px-3 font-serif text-sm italic text-muted-foreground">
              {ig.handle}
              <ArrowUpRight size={12} className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
            </span>
          </motion.a>

          {tiles.slice(2, 3).map((src, i) => tile(src, i + 3, "rounded-[0.5rem] aspect-square"))}
        </div>
      </div>
    </section>
  );
}
