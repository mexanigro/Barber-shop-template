/**
 * instagram-v4.tsx — FEATURED + GRID Instagram variant.
 *
 * Asymmetric editorial composition: the first image becomes a large square
 * feature (half width at lg+) carrying the section header and a prominent
 * "Follow @handle" button over a legibility scrim; the remaining images sit
 * beside it in a tight 2x2 / 3x2 grid.
 *
 * Selected via `sections.instagram.variant === "v4"` (see the dispatcher
 * in InstagramTeaser.tsx / InstagramFeed.tsx).
 */
import React from "react";
import { Instagram } from "lucide-react";
import { motion } from "motion/react";
import { siteConfig } from "../../../config/site";
import { localeConfig } from "../../../config/locale";
import { cn, handleImgError } from "../../../lib/utils";
import {
  Y_LG, VIEWPORT_ONCE,
  getNicheFlavor, NICHE_DURATION, NICHE_EASING, nicheScaleIn,
} from "../../../lib/motion";

const STRINGS: Record<"en" | "he" | "ru" | "ar", { follow: string }> = {
  en: { follow: "Follow" },
  he: { follow: "עקבו אחרי" },
  ru: { follow: "Подписаться" },
  ar: { follow: "تابعوا" },
};

export function InstagramV4() {
  const ig = siteConfig.sections.instagram;
  if (!ig || !ig.url || !ig.images || ig.images.length === 0) return null;

  const t = STRINGS[localeConfig.lang] ?? STRINGS.en;
  const niche = siteConfig.business.type;
  const flavor = getNicheFlavor(niche);
  const dur = NICHE_DURATION[flavor];
  const ease = NICHE_EASING[flavor];

  const [featured, ...rest] = ig.images;
  // Tight companion grid: 3x2 when we have enough posts, otherwise 2x2.
  const gridImages = rest.slice(0, rest.length >= 6 ? 6 : 4);
  const handleLabel = ig.handle.startsWith("@") ? ig.handle : `@${ig.handle}`;

  return (
    <section className="bg-background px-6 py-24 transition-colors duration-300">
      <div className="mx-auto max-w-6xl">
        <div
          className={cn(
            "grid gap-[var(--gs-gap)]",
            gridImages.length > 0 && "lg:grid-cols-2 lg:items-center",
          )}
        >

          {/* ── Featured post with header + follow CTA over scrim ──────── */}
          <motion.div {...nicheScaleIn(niche)} className="gs-image relative aspect-square bg-muted">
            <img
              src={featured}
              alt={`Instagram — ${ig.handle}`}
              loading="lazy"
              onError={handleImgError}
              className="h-full w-full object-cover"
            />
            {/* Legibility scrim (kept independent of decorative-gradient flag) */}
            <div
              className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent"
              aria-hidden
            />
            <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
              <p className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.3em] text-white/75">
                <Instagram size={14} aria-hidden />
                <span className="truncate">{ig.title}</span>
              </p>
              <p className="mb-5 truncate text-2xl font-semibold text-white sm:text-3xl">
                {ig.handle}
              </p>
              <a
                href={ig.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[48px] items-center gap-2.5 rounded-xl bg-background px-7 text-sm font-semibold text-foreground shadow-lg transition-transform duration-300 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
              >
                <Instagram size={16} className="text-accent-light" aria-hidden />
                <span className="truncate">{t.follow} {handleLabel}</span>
              </a>
            </div>
          </motion.div>

          {/* ── Tight companion grid ────────────────────────────────────── */}
          {gridImages.length > 0 && (
            <div
              className={cn(
                "grid gap-[calc(var(--gs-gap)/2)]",
                gridImages.length > 4 ? "grid-cols-3" : "grid-cols-2",
              )}
            >
              {gridImages.map((src, i) => (
                <motion.a
                  key={i}
                  href={ig.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${ig.handle} — Instagram`}
                  initial={{ opacity: 0, y: Y_LG }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={VIEWPORT_ONCE}
                  transition={{ duration: dur, ease, delay: Math.min(i * 0.07, 0.42) }}
                  className="gs-image group relative block aspect-square bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                >
                  <img
                    src={src}
                    alt={`Instagram — ${ig.handle}`}
                    loading="lazy"
                    onError={handleImgError}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
                  />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors duration-300 group-hover:bg-black/25">
                    <Instagram
                      size={18}
                      className="text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                      aria-hidden
                    />
                  </span>
                </motion.a>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
