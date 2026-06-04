/**
 * BusinessBenefits.tsx
 *
 * Six advantages for hiring through Lekt Grigori. Intentionally NOT an
 * identical card grid — alternating rows with a large numeric label,
 * icon glyph, headline and body. The rhythm hints at a chapter list
 * rather than feature dump.
 */

import { motion } from "motion/react";
import { HelpCircle } from "lucide-react";
import { resolveLucideIcon } from "../../../../lib/lucide-icons";
import { useBusinessLocale } from "./useBusinessLocale";

const EASE = [0.23, 1, 0.32, 1] as const;

export function BusinessBenefits() {
  const data = useBusinessLocale().benefits;

  return (
    <section
      id="business-benefits"
      className="relative overflow-hidden bg-background py-20 sm:py-28 md:py-32"
    >
      {/* Faint ambient pull — keeps the section grounded in brand tone */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 35% at 50% 0%, rgba(232,130,12,0.06) 0%, transparent 70%)",
        }}
      />

      <div className="relative mx-auto max-w-6xl px-5 sm:px-8 lg:px-12">
        {/* ── Section header ──────────────────────────────────────────── */}
        <div className="mx-auto mb-14 max-w-2xl text-center sm:mb-20">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, ease: EASE }}
            className="mb-3 font-sans text-xs font-semibold uppercase tracking-[0.22em] text-[#F5A623]"
          >
            {data.eyebrow}
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, delay: 0.06, ease: EASE }}
            className="font-serif text-3xl font-black leading-tight tracking-tight text-foreground sm:text-4xl md:text-5xl"
            style={{ textWrap: "balance" } as React.CSSProperties}
          >
            {data.title}
          </motion.h2>
        </div>

        {/* ── Zigzag rows ─────────────────────────────────────────────── */}
        {/* Each row is full-width on mobile, alternating on lg+. Even rows
            lean to the start; odd rows lean to the end. Rhythm pulls the eye
            down without monotony. */}
        <ul className="flex flex-col">
          {data.benefits.map((b, i) => {
            const Icon = resolveLucideIcon(b.iconName, HelpCircle);
            const reverse = i % 2 === 1;
            return (
              <motion.li
                key={b.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.6, delay: (i % 2) * 0.04, ease: EASE }}
                className={[
                  "relative grid grid-cols-1 items-start gap-6 border-t border-border/60 py-9 sm:py-11 md:py-14 lg:grid-cols-[1fr_2.4fr] lg:gap-12",
                  i === data.benefits.length - 1 ? "border-b" : "",
                  reverse ? "lg:[direction:rtl] rtl:lg:[direction:ltr]" : "",
                ].join(" ")}
              >
                {/* Numeric + icon column */}
                <div
                  className={[
                    "flex items-center gap-5 lg:flex-col lg:items-start lg:gap-6",
                    reverse ? "lg:items-end lg:[direction:ltr] rtl:lg:[direction:rtl]" : "",
                  ].join(" ")}
                >
                  <span className="font-serif text-[3.2rem] font-black leading-none tracking-tighter text-[#E8820C]/22 sm:text-[4rem] lg:text-[5.5rem]">
                    {b.label}
                  </span>
                  <span
                    className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#F5A623]/35 bg-[rgba(232,130,12,0.12)] text-[#F5A623] shadow-[0_12px_36px_-14px_rgba(232,130,12,0.55)] sm:h-16 sm:w-16"
                    aria-hidden
                  >
                    <Icon size={24} strokeWidth={2.1} />
                  </span>
                </div>

                {/* Text column */}
                <div
                  className={[
                    "flex flex-col gap-3 lg:[direction:ltr] rtl:lg:[direction:rtl]",
                    reverse ? "lg:text-end" : "",
                  ].join(" ")}
                >
                  <h3 className="font-serif text-2xl font-bold leading-snug tracking-tight text-foreground sm:text-[1.65rem] md:text-3xl">
                    {b.title}
                  </h3>
                  <p
                    className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-[1.0625rem]"
                    style={{ textWrap: "pretty" } as React.CSSProperties}
                  >
                    {b.description}
                  </p>
                </div>
              </motion.li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

export default BusinessBenefits;
