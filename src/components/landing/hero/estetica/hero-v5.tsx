/**
 * hero/estetica/hero-v5.tsx — GLOW PARALLAX hero (estética).
 *
 * Layered porcelain composition: slow-drifting blurred sandstone glows in the
 * back, an arch-cropped portrait riding a gentle scroll parallax, and floating
 * treatment pills (real service names) orbiting the photo edge. Copy sits
 * start-aligned; the whole stack parts subtly as the visitor scrolls. The
 * most atmospheric of the estética heroes — glow, depth and softness.
 *
 * Selected when `hero.variant === "v5"` and `business.type === "estetica"`.
 */
import React from "react";
import { Calendar, ArrowRight, Sparkles } from "lucide-react";
import { motion, useScroll, useTransform } from "motion/react";
import { siteConfig } from "../../../../config/site";
import { localeConfig } from "../../../../config/locale";
import { isParallaxEnabled, getAnimationLevel } from "../../../../lib/section-variants";
import {
  getNicheFlavor, NICHE_DURATION, NICHE_EASING, NICHE_STAGGER,
  textContainerVariants, textWordVariants, PARALLAX_SPEED,
  BUTTON_PRESS, EASE_OUT_STRONG,
} from "../../../../lib/motion";

function scrollToServices() {
  document.getElementById("services")?.scrollIntoView({ behavior: "smooth" });
}

export function EsteticaHeroV5({ onBookClick }: { onBookClick: (serviceId?: string) => void }) {
  const { hero, brand, features } = siteConfig;
  const niche = siteConfig.business.type;
  const flavor = getNicheFlavor(niche);
  const dur = NICHE_DURATION[flavor];
  const ease = NICHE_EASING[flavor];
  const step = NICHE_STAGGER[flavor];
  const parallax = isParallaxEnabled();
  const animRich = getAnimationLevel() === "rich";

  const sectionRef = React.useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end start"] });
  const speed = PARALLAX_SPEED[flavor];
  const photoY = useTransform(scrollYProgress, [0, 1], parallax ? [0, -speed * 320] : [0, 0]);
  const glowY = useTransform(scrollYProgress, [0, 1], parallax ? [0, speed * 200] : [0, 0]);
  const pillsY = useTransform(scrollYProgress, [0, 1], parallax ? [0, -speed * 520] : [0, 0]);

  const eyebrow = hero.eyebrow || brand.tagline;
  const pills = siteConfig.services.slice(0, 3);

  const words = (text: string, keyPrefix: string) =>
    text.trim()
      ? text.split(" ").map((word, i) => (
          <motion.span key={`${keyPrefix}-${i}`} variants={textWordVariants(niche)} className="inline-block">
            {word}&nbsp;
          </motion.span>
        ))
      : null;

  return (
    <section ref={sectionRef} id="hero" className="relative flex min-h-[100dvh] items-center overflow-hidden bg-background">
      {/* ── Drifting glow layers ─────────────────────────────────────── */}
      <motion.div style={{ y: glowY }} className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="gs-gradient absolute -top-24 end-[8%] h-[26rem] w-[26rem] rounded-full bg-accent/15 blur-[110px]" />
        <div className="gs-gradient absolute bottom-[12%] start-[4%] h-[22rem] w-[22rem] rounded-full bg-accent-light/20 blur-[100px]" />
        <div className="gs-gradient absolute top-[34%] start-[38%] h-[18rem] w-[18rem] rounded-full bg-secondary blur-[90px]" />
      </motion.div>

      <div className="relative z-10 mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-14 px-5 pb-16 pt-28 sm:px-6 sm:pt-32 lg:grid-cols-12 lg:gap-8 lg:px-8 lg:py-32">

        {/* ── Copy column ───────────────────────────────────────────── */}
        <div className="min-w-0 lg:col-span-6 xl:col-span-5">
          {eyebrow && (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: dur, ease }}
              className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-accent/25 bg-card/60 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.26em] text-accent-light sm:mb-8"
            >
              <Sparkles size={13} aria-hidden />
              <span className="min-w-0 leading-relaxed">{eyebrow}</span>
            </motion.p>
          )}

          <motion.h1
            variants={textContainerVariants}
            initial="hidden"
            animate="visible"
            className="mb-7 text-balance font-serif text-[clamp(2.5rem,7vw,5.25rem)] font-light leading-[1.04] text-foreground sm:mb-9"
          >
            {words(hero.titlePrefix, "p")}
            <em className="font-serif italic text-accent">{words(hero.titleHighlight, "h")}</em>
            {hero.titleSuffix.trim() ? <br /> : null}
            {words(hero.titleSuffix, "s")}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: dur, ease, delay: step * 3 }}
            className="mb-9 max-w-md text-pretty text-[15px] font-light leading-relaxed text-muted-foreground sm:mb-11 md:text-lg"
          >
            {hero.subtitle}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: dur, ease, delay: step * 4 }}
            className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-7"
          >
            {(features.showBooking || features.showInquiry) && (
              <motion.button
                type="button"
                onClick={() => onBookClick()}
                whileHover={{ y: BUTTON_PRESS[flavor].hoverY }}
                whileTap={{ scale: BUTTON_PRESS[flavor].scale }}
                transition={{ duration: BUTTON_PRESS[flavor].duration, ease: EASE_OUT_STRONG }}
                className="group inline-flex min-h-[50px] items-center justify-center gap-2.5 rounded-full bg-primary px-9 py-3.5 text-sm font-medium text-primary-foreground shadow-elevated hover:bg-accent-light focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 sm:text-[15px] [transition:background-color_0.4s_cubic-bezier(0.23,1,0.32,1),box-shadow_0.4s_cubic-bezier(0.23,1,0.32,1)]"
              >
                <Calendar size={17} className="shrink-0" />
                <span className="truncate">{hero.ctaPrimary}</span>
              </motion.button>
            )}
            {features.showServices && (
              <motion.button
                type="button"
                onClick={scrollToServices}
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.16, ease: EASE_OUT_STRONG }}
                className="group inline-flex min-h-[44px] items-center justify-center gap-2 text-sm font-medium text-foreground/80 underline-offset-8 hover:text-accent hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 sm:text-[15px] [transition:color_0.4s_cubic-bezier(0.23,1,0.32,1)]"
              >
                <span>{hero.ctaSecondary}</span>
                <ArrowRight size={15} className="shrink-0 transition-transform duration-300 group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1" />
              </motion.button>
            )}
          </motion.div>
        </div>

        {/* ── Parallax photo + floating treatment pills ─────────────── */}
        <div className="relative mx-auto w-full max-w-sm min-w-0 lg:col-span-6 lg:max-w-none xl:col-span-7 xl:ps-12">
          <motion.div style={{ y: photoY }} className="relative mx-auto max-w-md lg:max-w-lg">
            <motion.div
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: dur * 1.3, ease, delay: step * 2 }}
              className="relative aspect-[4/5] overflow-hidden rounded-t-[11rem] rounded-b-[0.5rem] sm:rounded-t-[15rem]"
            >
              <img
                src={hero.backgroundImage}
                alt={localeConfig.hero.backgroundAlt}
                className="h-full w-full object-cover"
                loading="eager"
                referrerPolicy="no-referrer"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/12 via-transparent to-transparent" aria-hidden />
            </motion.div>

            {/* Floating treatment pills along the arch edge */}
            <motion.div style={{ y: pillsY }} className="pointer-events-none absolute inset-0" aria-hidden>
              {pills.map((p, i) => {
                const positions = [
                  "top-[16%] -start-4 sm:-start-10",
                  "top-[46%] -end-4 sm:-end-8",
                  "bottom-[8%] -start-2 sm:-start-6",
                ];
                return (
                  <motion.span
                    key={p.id}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: dur, ease, delay: step * (6 + i * 1.5) }}
                    className={`absolute ${positions[i % positions.length]} max-w-[12rem] truncate rounded-full border border-border bg-card/95 px-4 py-2 text-xs font-medium text-foreground shadow-elevated sm:text-[13px]`}
                  >
                    {animRich ? (
                      <motion.span
                        className="inline-block"
                        animate={{ y: [0, -4, 0] }}
                        transition={{ duration: 5 + i * 0.8, repeat: Infinity, ease: "easeInOut", delay: i * 0.9 }}
                      >
                        {p.name}
                      </motion.span>
                    ) : (
                      p.name
                    )}
                  </motion.span>
                );
              })}
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
