/**
 * instagram/estetica/instagram-v5.tsx — GLOW DRIFT (estética).
 *
 * One continuous drift of frames behind a floating porcelain follow plate:
 * the CSS marquee (off-main-thread, aria-hidden duplicate, hover pause,
 * static wrap under reduced/subtle animation) glides while the centered
 * plate carries handle + follow CTA. Ambient, not gridded.
 *
 * Selected when `sections.instagram.variant === "v5"` and niche is estética.
 */
import React from "react";
import { Instagram } from "lucide-react";
import { motion } from "motion/react";
import { cn, handleImgError } from "../../../../lib/utils";
import { localeConfig } from "../../../../config/locale";
import { siteConfig } from "../../../../config/site";
import { getAnimationLevel } from "../../../../lib/section-variants";
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

export function EsteticaInstagramV5() {
  const ig = siteConfig.sections.instagram;
  const niche = siteConfig.business.type;
  const flavor = getNicheFlavor(niche);
  const dur = NICHE_DURATION[flavor];
  const ease = NICHE_EASING[flavor];
  const t = STRINGS[localeConfig.lang] ?? STRINGS.en;
  const marquee = getAnimationLevel() === "rich";

  const images = (ig?.images ?? []).slice(0, 8);
  if (!ig || images.length === 0) return null;

  const Frame = ({ src, index }: { src: string; index: number }) => (
    <a
      href={ig.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${ig.handle} — Instagram`}
      className={cn(
        "group block w-44 shrink-0 overflow-hidden sm:w-56",
        index % 2 === 0 ? "rounded-t-[4.5rem] rounded-b-[0.5rem] sm:rounded-t-[6rem]" : "mt-7 rounded-[0.5rem] sm:mt-10",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60",
      )}
    >
      <img
        src={src}
        alt={`Instagram — ${ig.handle}`}
        loading="lazy"
        decoding="async"
        onError={handleImgError}
        referrerPolicy="no-referrer"
        className="aspect-[3/4] w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-[1.05]"
        draggable={false}
      />
    </a>
  );

  return (
    <section id="instagram" className="relative overflow-hidden bg-secondary/50 py-16 transition-colors duration-300 sm:py-24 lg:py-28 dark:bg-secondary/20">
      <style>{`@keyframes estetica-ig-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>

      {/* ── Section title ────────────────────────────────────────────── */}
      <div className="mx-auto mb-10 max-w-2xl px-5 text-center sm:mb-14 sm:px-6">
        <motion.h2
          initial={{ opacity: 0, y: Y_LG }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEWPORT_ONCE}
          transition={{ duration: dur, ease }}
          className="font-serif text-3xl font-light leading-[1.08] text-balance text-foreground sm:text-4xl md:text-5xl"
        >
          {ig.title}
        </motion.h2>
      </div>

      {/* ── Drift ───────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={VIEWPORT_ONCE}
        transition={{ duration: dur * 1.2, ease }}
        className="group/drift relative"
        dir="ltr"
      >
        <div
          className={cn(
            "flex w-max gap-[var(--gs-gap)] pe-[var(--gs-gap)]",
            marquee && "motion-safe:animate-[estetica-ig-marquee_52s_linear_infinite] group-hover/drift:[animation-play-state:paused]",
            !marquee && "w-full flex-wrap justify-center px-5",
          )}
        >
          {images.map((src, i) => <Frame key={`a-${i}`} src={src} index={i} />)}
          {marquee && (
            <span className="contents" aria-hidden>
              {images.map((src, i) => <Frame key={`b-${i}`} src={src} index={i} />)}
            </span>
          )}
        </div>

        {/* Floating follow plate */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <motion.a
            href={ig.url}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT_ONCE}
            transition={{ duration: dur, ease, delay: 0.25 }}
            whileHover={{ y: BUTTON_PRESS[flavor].hoverY }}
            whileTap={{ scale: BUTTON_PRESS[flavor].scale }}
            className="pointer-events-auto flex flex-col items-center gap-2 rounded-[0.75rem] border border-border bg-card/95 px-9 py-6 text-center shadow-elevated backdrop-blur-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-primary-foreground" aria-hidden>
              <Instagram size={17} />
            </span>
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-accent">{t.follow}</span>
            <span dir="ltr" className="font-serif text-base italic text-foreground">{ig.handle}</span>
          </motion.a>
        </div>
      </motion.div>
    </section>
  );
}
