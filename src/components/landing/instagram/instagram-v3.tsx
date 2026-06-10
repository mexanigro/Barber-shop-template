/**
 * instagram-v3.tsx — GRID WITH CAPTIONS Instagram variant.
 *
 * 2-col (3-col at md+) grid of square posts, each carrying a visible
 * caption bar: handle + a subtle post number, with decorative Heart /
 * MessageCircle meta icons (aria-hidden — no fake engagement numbers).
 * Hovering dims the image and gently raises the caption bar.
 *
 * Selected via `sections.instagram.variant === "v3"` (see the dispatcher
 * in InstagramTeaser.tsx / InstagramFeed.tsx).
 */
import React from "react";
import { Instagram, Heart, MessageCircle } from "lucide-react";
import { motion } from "motion/react";
import { siteConfig } from "../../../config/site";
import { localeConfig } from "../../../config/locale";
import { handleImgError } from "../../../lib/utils";
import {
  Y_SM, Y_LG, VIEWPORT_ONCE,
  getNicheFlavor, NICHE_DURATION, NICHE_EASING,
} from "../../../lib/motion";

const STRINGS: Record<"en" | "he" | "ru" | "ar", { follow: string }> = {
  en: { follow: "Follow on Instagram" },
  he: { follow: "עקבו באינסטגרם" },
  ru: { follow: "Подписаться в Instagram" },
  ar: { follow: "تابعونا على إنستغرام" },
};

export function InstagramV3() {
  const ig = siteConfig.sections.instagram;
  if (!ig || !ig.url || !ig.images || ig.images.length === 0) return null;

  const t = STRINGS[localeConfig.lang] ?? STRINGS.en;
  const flavor = getNicheFlavor(siteConfig.business.type);
  const dur = NICHE_DURATION[flavor];
  const ease = NICHE_EASING[flavor];

  return (
    <section className="bg-background px-6 py-24 transition-colors duration-300">
      <div className="mx-auto max-w-5xl">

        {/* ── Header: title + handle ────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: Y_SM }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEWPORT_ONCE}
          transition={{ duration: dur, ease }}
          className="mb-10 text-center"
        >
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-accent-light">
            {ig.title}
          </p>
          <a
            href={ig.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl text-sm font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
          >
            <Instagram size={16} className="text-accent-light" aria-hidden />
            <span>{ig.handle}</span>
          </a>
        </motion.div>

        {/* ── Captioned post grid ───────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-[var(--gs-gap)] md:grid-cols-3">
          {ig.images.map((src, i) => (
            <motion.a
              key={i}
              href={ig.url}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: Y_LG }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={VIEWPORT_ONCE}
              transition={{ duration: dur, ease, delay: Math.min(i * 0.07, 0.42) }}
              className="gs-image group block border border-border bg-card transition-colors duration-300 hover:border-accent/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
            >
              <span className="relative block aspect-square overflow-hidden bg-muted">
                <img
                  src={src}
                  alt={`Instagram — ${ig.handle}`}
                  loading="lazy"
                  onError={handleImgError}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                />
                {/* Dimming veil on hover */}
                <span
                  className="absolute inset-0 bg-black/25 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  aria-hidden
                />
              </span>

              {/* Caption bar — handle + post number; decorative meta icons */}
              <span className="flex items-center justify-between gap-3 px-3.5 py-3 transition-transform duration-300 group-hover:-translate-y-0.5 sm:px-4">
                <span className="flex min-w-0 items-baseline gap-2">
                  <span className="truncate text-xs font-semibold text-foreground">
                    {ig.handle}
                  </span>
                  <span className="shrink-0 text-[10px] font-medium tracking-[0.14em] text-muted-foreground">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2.5 text-muted-foreground" aria-hidden>
                  <Heart size={14} />
                  <MessageCircle size={14} />
                </span>
              </span>
            </motion.a>
          ))}
        </div>

        {/* ── Follow CTA ────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: Y_SM }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEWPORT_ONCE}
          transition={{ duration: dur, ease, delay: 0.15 }}
          className="mt-10 text-center"
        >
          <a
            href={ig.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] items-center gap-2.5 rounded-xl border border-border px-6 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground transition-colors duration-300 hover:border-accent/40 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
          >
            <Instagram size={14} aria-hidden />
            {t.follow}
          </a>
        </motion.div>
      </div>
    </section>
  );
}
