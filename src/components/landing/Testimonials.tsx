import React, { useRef } from "react";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "../../lib/utils";
import { localeConfig } from "../../config/locale";
import { siteConfig } from "../../config/site";
import {
  Y_SM, Y_MD, X_IN, VIEWPORT_ONCE,
  getNicheFlavor, nicheStagger, NICHE_DURATION, NICHE_EASING,
  sectionTitleContainerVariants, textWordVariants, EASE_OUT_STRONG,
  NICHE_CARD_HOVER,
} from "../../lib/motion";

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

export function Testimonials() {
  const { testimonials, sections } = siteConfig;
  const { testimonials: sectionConfig } = sections;
  const niche = siteConfig.business.type;
  const flavor = getNicheFlavor(niche);
  const stagger = nicheStagger(niche);
  const isEstetica = niche === "estetica";
  const isNails = niche === "nails";
  const isCafeteria = niche === "cafeteria";
  const isRemodelaciones = niche === "remodelaciones";
  const scrollRef = useRef<HTMLDivElement>(null);
  const isScrollable = testimonials.length > 3;

  function scroll(dir: "left" | "right") {
    const el = scrollRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-testimonial]");
    const distance = card ? card.offsetWidth + 20 : 340;
    el.scrollBy({ left: dir === "left" ? -distance : distance, behavior: "smooth" });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowLeft") { e.preventDefault(); scroll("left"); }
    if (e.key === "ArrowRight") { e.preventDefault(); scroll("right"); }
  }

  return (
    <section id="testimonials" className="bg-background px-6 py-28 transition-colors duration-300">
      <div className="mx-auto max-w-7xl">

        {/* ── Section header ──────────────────────────────────────── */}
        <div className="mb-16 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <motion.p
              initial={{ opacity: 0, y: Y_SM }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={VIEWPORT_ONCE}
              transition={{ duration: NICHE_DURATION[flavor], ease: NICHE_EASING[flavor] }}
              className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-accent-light"
            >
              {sectionConfig.title}
            </motion.p>
            <motion.h2
              variants={sectionTitleContainerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={VIEWPORT_ONCE}
              className={
                isCafeteria
                  ? "font-serif text-4xl font-normal tracking-wide text-foreground md:text-5xl"
                  : isRemodelaciones
                    ? "text-4xl font-extrabold tracking-tight text-foreground md:text-5xl"
                    : isEstetica
                      ? "text-4xl font-normal tracking-wide text-foreground md:text-5xl"
                      : isNails
                        ? "text-4xl font-black uppercase tracking-wide text-foreground md:text-6xl"
                        : "text-4xl font-black uppercase tracking-tighter text-foreground md:text-6xl"
              }
            >
              {sectionConfig.subtitle.split(" ").map((word: string, i: number) => (
                <motion.span key={i} variants={textWordVariants(niche)} className="inline-block">
                  {word}&nbsp;
                </motion.span>
              ))}
            </motion.h2>
          </div>

          {/* Overall rating */}
          <motion.div
            initial={{ opacity: 0, x: X_IN }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={VIEWPORT_ONCE}
            transition={{ delay: 0.2, duration: NICHE_DURATION[flavor], ease: NICHE_EASING[flavor] }}
            className="flex shrink-0 items-center gap-3 rounded-2xl border border-border bg-card px-5 py-3 shadow-sm self-start md:self-auto"
          >
            <div className="flex gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={14} className="text-accent-light" fill="currentColor" />
              ))}
            </div>
            <div className="h-4 w-px bg-border" />
            <span className="font-serif text-lg font-bold text-foreground">5.0</span>
            <span className="text-xs text-muted-foreground">
              {localeConfig.testimonials.averageRating}
            </span>
          </motion.div>
        </div>

        {/* ── Cards ───────────────────────────────────────────────── */}
        <div className="relative">
          {isScrollable && (
            <div className="mb-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => scroll("left")}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:border-accent/30 hover:text-accent-light focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                aria-label="Previous"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={() => scroll("right")}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:border-accent/30 hover:text-accent-light focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                aria-label="Next"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}

          <div
            ref={scrollRef}
            role={isScrollable ? "region" : undefined}
            aria-label={isScrollable ? sectionConfig.title : undefined}
            tabIndex={isScrollable ? 0 : undefined}
            onKeyDown={isScrollable ? handleKeyDown : undefined}
            className={cn(
              isScrollable
                ? "flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4 [scrollbar-width:thin] [scrollbar-color:theme(colors.border)_transparent] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:rounded-xl"
                : "grid grid-cols-1 items-stretch gap-5 sm:grid-cols-2 md:grid-cols-3"
            )}
          >
            {testimonials.map((review, i) => {
              const isFeatured = !isScrollable && i === 1 && testimonials.length === 3;
              return (
                <motion.div
                  key={`testimonial-${review.name.slice(0, 15)}-${i}`}
                  data-testimonial
                  initial={{ opacity: 0, scale: isFeatured ? 0.92 : 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={VIEWPORT_ONCE}
                  transition={{ delay: stagger(i) + (isFeatured ? 0.1 : 0), duration: NICHE_DURATION[flavor] * 1.1, ease: EASE_OUT_STRONG }}
                  whileHover={{
                    y: NICHE_CARD_HOVER[flavor].y,
                    boxShadow: NICHE_CARD_HOVER[flavor].shadow,
                  }}
                  className={cn(
                    "relative flex flex-col border bg-card p-5 sm:p-8 shadow-elevated transition-colors duration-300",
                    niche === "tattoo" ? "rounded-xl" : (isCafeteria || isRemodelaciones) ? "rounded-2xl" : "rounded-3xl",
                    isScrollable && "w-[320px] shrink-0 snap-center sm:w-[360px]",
                    isFeatured
                      ? "border-accent/30 bg-card shadow-lg md:-translate-y-3 dark:border-accent/20"
                      : "border-border hover:border-accent/20"
                  )}
                >
                  <span
                    className="pointer-events-none absolute right-4 top-2 select-none font-serif text-[80px] sm:text-[120px] font-bold leading-none text-border/30 dark:text-border/20"
                    aria-hidden
                  >
                    &ldquo;
                  </span>

                  <div className="mb-5 flex gap-1">
                    {[...Array(review.rating)].map((_, j) => (
                      <motion.span
                        key={j}
                        initial={{ opacity: 0, scale: 0.5 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={VIEWPORT_ONCE}
                        transition={{ delay: stagger(i) + 0.15 + j * 0.03, duration: 0.2, ease: EASE_OUT_STRONG }}
                      >
                        <Star size={14} className="text-accent-light" fill="currentColor" />
                      </motion.span>
                    ))}
                  </div>

                  <p className="relative mb-8 flex-1 font-serif text-lg font-light italic leading-relaxed text-card-foreground/80">
                    &ldquo;{review.text}&rdquo;
                  </p>

                  <div className={cn(
                    "mb-6 h-px",
                    isFeatured
                      ? "bg-gradient-to-r from-accent-light/60 via-accent/30 to-transparent"
                      : "bg-border"
                  )} />

                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                      isFeatured
                        ? "bg-accent-light text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}>
                      {getInitials(review.name)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-card-foreground">{review.name}</p>
                      <p className="text-xs uppercase tracking-widest text-muted-foreground">{review.title}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

      </div>
    </section>
  );
}
