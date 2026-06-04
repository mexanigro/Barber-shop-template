/**
 * WorkerCategories.tsx
 *
 * Same 8 categories as the workers JobCategories, but framed as a live
 * supply marketplace: each card shows an availability count and links to
 * the business form pre-filled with that category. Layout: a 4×2 grid
 * but with intentionally varied tile *sizes* (first tile is featured)
 * so it doesn't read as cookie-cutter.
 */

import { motion } from "motion/react";
import { HelpCircle, ArrowUpRight } from "lucide-react";
import { resolveLucideIcon } from "../../../../lib/lucide-icons";
import { useBusinessLocale } from "./useBusinessLocale";
import { localeConfig } from "../../../../config/locale";

const EASE = [0.23, 1, 0.32, 1] as const;

const dispatchSelect = (id: string) => {
  window.dispatchEvent(
    new CustomEvent("business-category-select", { detail: id }),
  );
  document.getElementById("business-form")?.scrollIntoView({ behavior: "smooth" });
};

export function WorkerCategories() {
  const data = useBusinessLocale().workers;
  const rtl = localeConfig.dir === "rtl";

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
        {/* ── Header — left aligned this time (rhythm break vs centered) ─ */}
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

        {/* ── Tile grid ───────────────────────────────────────────────── */}
        {/* 2 columns mobile, 3 columns tablet, 4 columns desktop. The first
            tile spans 2×2 on lg+ to anchor the eye — that breaks the
            "identical card grid" anti-pattern. */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-5">
          {data.categories.map((cat, i) => {
            const Icon = resolveLucideIcon(cat.iconName, HelpCircle);
            const featured = i === 0;
            return (
              <motion.button
                key={cat.id}
                type="button"
                onClick={() => dispatchSelect(cat.id)}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: Math.min(i * 0.05, 0.35), ease: EASE }}
                whileTap={{ scale: 0.98 }}
                className={[
                  "group relative flex flex-col justify-between rounded-2xl border border-border/70 bg-card p-5 text-start [transition:background-color_0.2s_ease,border-color_0.2s_ease,transform_0.2s_ease,box-shadow_0.2s_ease]",
                  "hover:border-[#E8820C]/55 hover:bg-[rgba(232,130,12,0.04)] hover:shadow-[0_18px_44px_-22px_rgba(232,130,12,0.45)]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8820C] focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  "min-h-[160px]",
                  featured ? "lg:col-span-2 lg:row-span-2 lg:min-h-[336px] lg:p-7" : "",
                ].join(" ")}
              >
                {/* Top row: icon + arrow */}
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={[
                      "flex items-center justify-center rounded-xl bg-[rgba(232,130,12,0.10)] text-[#E8820C] transition-shadow duration-300 group-hover:shadow-[0_0_24px_-4px_rgba(232,130,12,0.45)]",
                      featured ? "h-14 w-14 lg:h-16 lg:w-16" : "h-11 w-11",
                    ].join(" ")}
                    aria-hidden
                  >
                    <Icon size={featured ? 28 : 20} strokeWidth={2.1} />
                  </span>
                  <ArrowUpRight
                    size={featured ? 18 : 14}
                    strokeWidth={2.4}
                    className={[
                      "text-muted-foreground/55 transition-all duration-300 group-hover:text-[#E8820C]",
                      rtl ? "-scale-x-100 group-hover:-translate-x-0.5" : "group-hover:translate-x-0.5",
                    ].join(" ")}
                    aria-hidden
                  />
                </div>

                {/* Bottom: copy */}
                <div className="mt-6 flex flex-col gap-1.5">
                  <span className="font-sans text-[15px] font-bold leading-snug text-foreground sm:text-base lg:text-lg">
                    {cat.label}
                  </span>
                  {featured && (
                    <p className="hidden text-sm leading-relaxed text-muted-foreground lg:line-clamp-2 lg:block">
                      {cat.description}
                    </p>
                  )}
                  <span
                    className={[
                      "mt-1 inline-flex w-fit items-center gap-1.5 rounded-full bg-[rgba(232,130,12,0.10)] px-2.5 py-1 font-sans text-[11px] font-semibold tracking-wide text-[#E8820C]",
                      featured ? "text-xs" : "",
                    ].join(" ")}
                  >
                    <span
                      aria-hidden
                      className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500"
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
