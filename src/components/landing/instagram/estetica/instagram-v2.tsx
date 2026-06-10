/**
 * instagram/estetica/instagram-v2.tsx — VANITY FRAMES (estética).
 *
 * Six frames on a tinted porcelain band, alternating arch and soft-square
 * crops with gentle vertical offsets — a dressing-table arrangement rather
 * than a grid. Centered handle header and one follow pill below; every
 * frame links out to the profile.
 *
 * Selected when `sections.instagram.variant === "v2"` and niche is estética.
 */
import React from "react";
import { Instagram } from "lucide-react";
import { motion } from "motion/react";
import { cn, handleImgError } from "../../../../lib/utils";
import { localeConfig } from "../../../../config/locale";
import { siteConfig } from "../../../../config/site";
import {
  Y_SM, Y_LG, VIEWPORT_ONCE,
  getNicheFlavor, NICHE_DURATION, NICHE_EASING, EASE_OUT_STRONG, BUTTON_PRESS,
} from "../../../../lib/motion";

const STRINGS: Record<"en" | "he" | "ru" | "ar", { follow: string }> = {
  en: { follow: "Follow us" },
  he: { follow: "עקבו אחרינו" },
  ru: { follow: "Подписывайтесь" },
  ar: { follow: "تابعونا" },
};

const OFFSETS = ["sm:mt-0", "sm:mt-8", "sm:mt-3", "sm:mt-10", "sm:mt-1", "sm:mt-6"];

export function EsteticaInstagramV2() {
  const ig = siteConfig.sections.instagram;
  const niche = siteConfig.business.type;
  const flavor = getNicheFlavor(niche);
  const dur = NICHE_DURATION[flavor];
  const ease = NICHE_EASING[flavor];
  const t = STRINGS[localeConfig.lang] ?? STRINGS.en;

  const images = (ig?.images ?? []).slice(0, 6);
  if (!ig || images.length === 0) return null;

  return (
    <section id="instagram" className="bg-secondary/50 py-16 transition-colors duration-300 sm:py-24 lg:py-28 dark:bg-secondary/20">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">

        {/* ── Centered handle header ─────────────────────────────────── */}
        <div className="mx-auto mb-12 max-w-2xl text-center sm:mb-16">
          <motion.p
            initial={{ opacity: 0, y: Y_SM }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT_ONCE}
            transition={{ duration: dur, ease }}
            className="mb-3 inline-flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.32em] text-accent-light sm:text-xs"
          >
            <Instagram size={13} aria-hidden />
            <span dir="ltr">{ig.handle}</span>
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

        {/* ── Vanity arrangement ─────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3 sm:gap-[var(--gs-gap)] lg:grid-cols-6">
          {images.map((src, index) => {
            const isArch = index % 2 === 0;
            return (
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
                  isArch ? "rounded-t-[4.5rem] rounded-b-[0.5rem] sm:rounded-t-[6rem]" : "rounded-[0.5rem]",
                  OFFSETS[index % OFFSETS.length],
                )}
              >
                <img
                  src={src}
                  alt={`Instagram — ${ig.handle}`}
                  loading="lazy"
                  decoding="async"
                  onError={handleImgError}
                  referrerPolicy="no-referrer"
                  className="aspect-[3/4] w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-[1.06]"
                />
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-[background-color,opacity] duration-500 group-hover:bg-black/30 group-hover:opacity-100" aria-hidden>
                  <Instagram size={20} className="text-white" />
                </span>
              </motion.a>
            );
          })}
        </div>

        {/* ── Follow pill ────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: Y_SM }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEWPORT_ONCE}
          transition={{ delay: 0.15, duration: dur, ease }}
          className="mt-12 text-center sm:mt-16"
        >
          <motion.a
            href={ig.url}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ y: BUTTON_PRESS[flavor].hoverY }}
            whileTap={{ scale: BUTTON_PRESS[flavor].scale }}
            transition={{ duration: BUTTON_PRESS[flavor].duration, ease: EASE_OUT_STRONG }}
            className="inline-flex min-h-[48px] items-center justify-center gap-2.5 rounded-full border border-accent/35 px-8 py-3.5 text-sm font-medium text-accent hover:border-accent hover:bg-accent hover:text-primary-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 [transition:background-color_0.35s_cubic-bezier(0.23,1,0.32,1),border-color_0.35s_cubic-bezier(0.23,1,0.32,1),color_0.35s_cubic-bezier(0.23,1,0.32,1)]"
          >
            <Instagram size={15} aria-hidden />
            <span>{t.follow}</span>
          </motion.a>
        </motion.div>
      </div>
    </section>
  );
}
