/**
 * WorkerCategories.tsx
 *
 * Photo-grid version: each category shows a stock image with the title
 * overlaid at the bottom (same pattern as the workers-facing JobCategories).
 * Clicking a card scrolls to the business form pre-filled with that category.
 */

import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { useBusinessLocale } from "./useBusinessLocale";
import { localeConfig } from "../../../../config/locale";

const EASE = [0.23, 1, 0.32, 1] as const;

const IMAGES_BY_ID: Record<string, string> = {
  supermarket:
    "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=900",
  warehouse:
    "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=900",
  cleaning:
    "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&q=80&w=900",
  logistics:
    "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&q=80&w=900",
  drivers:
    "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&q=80&w=900",
  cooking:
    "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&q=80&w=900",
  construction:
    "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&q=80&w=900",
  other:
    "https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&q=80&w=900",
};

const FALLBACK_IMAGE = IMAGES_BY_ID.other;

const dispatchSelect = (id: string) => {
  window.dispatchEvent(
    new CustomEvent("business-category-select", { detail: id }),
  );
  document
    .getElementById("business-form")
    ?.scrollIntoView({ behavior: "smooth" });
};

export function WorkerCategories() {
  const data = useBusinessLocale().workers;
  const rtl = localeConfig.dir === "rtl";
  const cats = data.categories;
  const lastIndex = cats.length - 1;

  return (
    <section
      id="business-workers"
      className="relative overflow-hidden bg-muted/40 py-20 sm:py-28 md:py-32"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 40% at 50% 100%, rgba(232,130,12,0.05) 0%, transparent 70%)",
        }}
      />

      <div className="relative mx-auto max-w-6xl px-5 sm:px-8 lg:px-12">
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="mb-12 flex flex-col items-start gap-4 sm:mb-16">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, ease: EASE }}
            className="font-sans text-xs font-semibold uppercase tracking-[0.22em] text-[#E8820C]"
          >
            {data.eyebrow}
          </motion.p>
          <div className="flex w-full flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, delay: 0.06, ease: EASE }}
              className="max-w-2xl font-serif text-3xl font-black leading-tight tracking-tight text-foreground sm:text-4xl md:text-5xl"
              style={{ textWrap: "balance" } as React.CSSProperties}
            >
              {data.title}
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, delay: 0.18, ease: EASE }}
              className="max-w-xs text-sm text-muted-foreground"
            >
              {data.sub}
            </motion.p>
          </div>
        </div>

        {/* ── Photo grid ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 md:gap-5 lg:gap-6">
          {cats.map((cat, i) => {
            const imageUrl = IMAGES_BY_ID[cat.id] ?? FALLBACK_IMAGE;
            const isLast = i === lastIndex;

            return (
              <motion.button
                key={cat.id}
                type="button"
                onClick={() => dispatchSelect(cat.id)}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{
                  duration: 0.5,
                  delay: Math.min(i * 0.05, 0.35),
                  ease: EASE,
                }}
                whileHover={{
                  y: -4,
                  transition: { duration: 0.2, ease: EASE },
                }}
                whileTap={{ scale: 0.97 }}
                aria-label={cat.label}
                className={[
                  "group relative block w-full overflow-hidden rounded-2xl",
                  "aspect-[3/4] sm:aspect-[4/5]",
                  "shadow-sm ring-1 ring-border/60",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8820C] focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  "[transition:box-shadow_0.25s_ease,transform_0.2s_ease]",
                  "hover:shadow-lg hover:shadow-black/20",
                ].join(" ")}
              >
                {/* Photo */}
                <img
                  src={imageUrl}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover [transition:transform_0.5s_cubic-bezier(0.23,1,0.32,1),filter_0.3s_ease] group-hover:scale-[1.06]"
                  draggable={false}
                />

                {/* Bottom gradient for legibility */}
                <div
                  aria-hidden
                  className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/85 via-black/45 to-transparent"
                />

                {/* Arrow badge on last card */}
                {isLast && (
                  <span
                    aria-hidden
                    className={[
                      "absolute end-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#E8820C] text-white shadow-md ring-1 ring-white/30",
                      "[transition:transform_0.25s_cubic-bezier(0.23,1,0.32,1)]",
                      rtl
                        ? "group-hover:-translate-x-0.5"
                        : "group-hover:translate-x-0.5",
                    ].join(" ")}
                  >
                    <ArrowUpRight
                      size={14}
                      strokeWidth={2.5}
                      className="rtl:-scale-x-100"
                    />
                  </span>
                )}

                {/* Text overlay */}
                <div className="absolute inset-x-0 bottom-0 flex flex-col items-start gap-1.5 p-4 text-start sm:p-5">
                  <motion.span
                    initial={{ opacity: 0, y: 8 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-40px" }}
                    transition={{
                      duration: 0.5,
                      delay: Math.min(i * 0.05, 0.35) + 0.1,
                      ease: EASE,
                    }}
                    className="font-serif text-base font-extrabold leading-tight tracking-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)] sm:text-lg md:text-xl"
                  >
                    {cat.label}
                  </motion.span>
                  <motion.span
                    initial={{ opacity: 0, y: 8 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-40px" }}
                    transition={{
                      duration: 0.5,
                      delay: Math.min(i * 0.05, 0.35) + 0.15,
                      ease: EASE,
                    }}
                    className="line-clamp-2 font-sans text-[11px] font-medium leading-snug text-white/85 sm:text-xs"
                  >
                    {cat.description}
                  </motion.span>
                  <span className="mt-0.5 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-semibold tracking-wide text-white backdrop-blur-sm sm:text-[11px]">
                    <span
                      aria-hidden
                      className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400"
                    />
                    {cat.count}
                  </span>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default WorkerCategories;
