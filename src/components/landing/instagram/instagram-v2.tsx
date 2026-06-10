/**
 * instagram-v2.tsx — STORIES STYLE Instagram variant.
 *
 * Horizontal rail of tall 9/16 "story" frames with scroll-snap and an
 * edge-bleed treatment on mobile. Each frame is wrapped in the iconic
 * story ring — a refined two-tone conic ring built from the brand accent
 * tokens (`--brand-accent` / `--gs-accent-alt`), not a rainbow gradient.
 * Header row carries the section title + handle; every frame links out
 * to the Instagram profile.
 *
 * Selected via `sections.instagram.variant === "v2"` (see the dispatcher
 * in InstagramTeaser.tsx / InstagramFeed.tsx).
 */
import React from "react";
import { Instagram } from "lucide-react";
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

/** Two-tone story ring — brand accent tokens only, no rainbow. */
const RING_GRADIENT =
  "conic-gradient(from 210deg, var(--brand-accent), var(--gs-accent-alt), var(--brand-accent))";

export function InstagramV2() {
  const ig = siteConfig.sections.instagram;
  if (!ig || !ig.url || !ig.images || ig.images.length === 0) return null;

  const t = STRINGS[localeConfig.lang] ?? STRINGS.en;
  const flavor = getNicheFlavor(siteConfig.business.type);
  const dur = NICHE_DURATION[flavor];
  const ease = NICHE_EASING[flavor];

  return (
    <section className="overflow-x-clip bg-background px-6 py-24 transition-colors duration-300">
      <div className="mx-auto max-w-5xl">

        {/* ── Header row: title + handle, follow CTA on the end side ──── */}
        <motion.div
          initial={{ opacity: 0, y: Y_SM }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEWPORT_ONCE}
          transition={{ duration: dur, ease }}
          className="mb-10 flex flex-wrap items-end justify-between gap-x-6 gap-y-4"
        >
          <div className="min-w-0">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.3em] text-accent-light">
              {ig.title}
            </p>
            <a
              href={ig.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center gap-2.5 rounded-xl text-base font-semibold text-foreground transition-colors duration-200 hover:text-accent-light focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
            >
              <Instagram size={20} className="shrink-0 text-accent-light" aria-hidden />
              <span className="truncate">{ig.handle}</span>
            </a>
          </div>

          <a
            href={ig.url}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden min-h-[44px] items-center gap-2 rounded-xl border border-border px-5 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground transition-colors duration-300 hover:border-accent/40 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 sm:inline-flex"
          >
            <Instagram size={14} aria-hidden />
            <span>{t.follow}</span>
          </a>
        </motion.div>

        {/* ── Stories rail: scroll-snap, edge-bleed on mobile ──────────── */}
        <div className="-mx-6 snap-x snap-mandatory overflow-x-auto px-6 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex w-max gap-[var(--gs-gap)]">
            {ig.images.map((src, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: Y_LG }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={VIEWPORT_ONCE}
                transition={{ duration: dur, ease, delay: Math.min(i * 0.06, 0.36) }}
                className="snap-start"
              >
                <a
                  href={ig.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${ig.handle} — Instagram`}
                  className="gs-gradient group block rounded-[calc(var(--gs-image-radius)+7px)] bg-accent/45 p-[2.5px] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                  style={{ backgroundImage: RING_GRADIENT }}
                >
                  {/* Inner gap ring — background-colored breathing room */}
                  <span className="block rounded-[calc(var(--gs-image-radius)+4px)] bg-background p-[3px]">
                    <span className="gs-image relative block aspect-[9/16] w-40 bg-muted sm:w-48 lg:w-52">
                      <img
                        src={src}
                        alt={`Instagram — ${ig.handle}`}
                        loading="lazy"
                        onError={handleImgError}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.07]"
                      />
                      <span
                        className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/20"
                        aria-hidden
                      />
                    </span>
                  </span>
                </a>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ── Mobile follow CTA (header CTA hidden below sm) ───────────── */}
        <motion.div
          initial={{ opacity: 0, y: Y_SM }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEWPORT_ONCE}
          transition={{ duration: dur, ease, delay: 0.1 }}
          className="mt-8 text-center sm:hidden"
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
