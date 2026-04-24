import React from "react";
import { Star } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "../../lib/utils";
import { localeConfig } from "../../config/locale";
import { siteConfig } from "../../config/site";

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

  return (
    <section id="testimonials" className="bg-background px-6 py-28 transition-colors duration-300">
      <div className="mx-auto max-w-7xl">

        {/* ── Section header ──────────────────────────────────────── */}
        <div className="mb-16 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-accent-light"
            >
              {sectionConfig.title}
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-4xl font-black uppercase tracking-tighter text-foreground md:text-6xl"
            >
              {sectionConfig.subtitle}
            </motion.h2>
          </div>

          {/* Overall rating */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
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
        <div className="grid grid-cols-1 items-stretch gap-5 md:grid-cols-3">
          {testimonials.map((review, i) => {
            const isFeatured = i === 1 && testimonials.length === 3;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={cn(
                  "relative flex flex-col rounded-3xl border bg-card p-8 shadow-elevated transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl",
                  isFeatured
                    ? "border-accent/30 bg-card shadow-lg md:-translate-y-3 dark:border-accent/20"
                    : "border-border hover:border-accent/20"
                )}
              >
                {/* Large decorative quote mark */}
                <span
                  className="pointer-events-none absolute right-6 top-4 select-none font-serif text-[120px] font-bold leading-none text-border/30 dark:text-border/20"
                  aria-hidden
                >
                  "
                </span>

                {/* Stars */}
                <div className="mb-5 flex gap-1">
                  {[...Array(review.rating)].map((_, j) => (
                    <Star key={j} size={14} className="text-accent-light" fill="currentColor" />
                  ))}
                </div>

                {/* Quote text in serif */}
                <p className="relative mb-8 flex-1 font-serif text-lg font-light italic leading-relaxed text-card-foreground/80">
                  "{review.text}"
                </p>

                {/* Divider */}
                <div className={cn(
                  "mb-6 h-px",
                  isFeatured
                    ? "bg-gradient-to-r from-accent-light/60 via-accent/30 to-transparent"
                    : "bg-border"
                )} />

                {/* Author */}
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                    isFeatured
                      ? "bg-accent-light text-zinc-950"
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
    </section>
  );
}
