/**
 * BusinessProcess.tsx
 *
 * 3-step process for companies. Horizontal staggered timeline on desktop,
 * vertical timeline on mobile. The middle step intentionally sits slightly
 * higher than its siblings for visual rhythm — matches the workers'
 * HowItWorks language so both audiences feel consistent in tempo.
 */

import { motion, useInView } from "motion/react";
import { useRef } from "react";
import { HelpCircle } from "lucide-react";
import { resolveLucideIcon } from "../../../../lib/lucide-icons";
import { useBusinessLocale } from "./useBusinessLocale";
import { localeConfig } from "../../../../config/locale";

const EASE = [0.23, 1, 0.32, 1] as const;

export function BusinessProcess() {
  const data = useBusinessLocale().process;
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const rtl = localeConfig.dir === "rtl";

  return (
    <section
      ref={ref}
      id="business-process"
      className="relative overflow-hidden py-20 sm:py-28 md:py-32"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 40% at 50% 50%, rgba(8,145,178,0.06) 0%, transparent 70%)",
        }}
      />

      <div className="relative mx-auto max-w-5xl px-5 sm:px-8 lg:px-12">
        {/* ── Header ────────────────────────────────────────────────── */}
        <div className="mb-16 text-center sm:mb-20">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, ease: EASE }}
            className="mb-3 font-sans text-xs font-semibold uppercase tracking-[0.22em] text-[#22D3EE]"
          >
            {data.eyebrow}
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, delay: 0.06, ease: EASE }}
            className="mx-auto max-w-2xl font-serif text-3xl font-black leading-tight tracking-tight text-foreground sm:text-4xl md:text-5xl"
            style={{ textWrap: "balance" } as React.CSSProperties}
          >
            {data.title}
          </motion.h2>
        </div>

        {/* ── Steps ─────────────────────────────────────────────────── */}
        <div className="relative">
          {/* Desktop dashed connector — grows from the visual start of the row */}
          <div
            aria-hidden
            className="pointer-events-none absolute end-[16%] start-[16%] top-[3.75rem] hidden h-px md:block"
          >
            <motion.div
              initial={{ scaleX: 0 }}
              animate={inView ? { scaleX: 1 } : {}}
              transition={{ duration: 1.1, delay: 0.3, ease: EASE }}
              style={{ transformOrigin: rtl ? "right center" : "left center" }}
              className="h-px w-full border-t-2 border-dashed border-[#0891B2]/45"
            />
          </div>
          {/* Mobile vertical connector */}
          <div
            aria-hidden
            className="pointer-events-none absolute bottom-[4.5rem] start-[1.75rem] top-[4.5rem] w-px md:hidden"
          >
            <motion.div
              initial={{ scaleY: 0 }}
              animate={inView ? { scaleY: 1 } : {}}
              transition={{ duration: 0.9, delay: 0.3, ease: EASE }}
              style={{ transformOrigin: "top center" }}
              className="h-full border-s-2 border-dashed border-[#0891B2]/45"
            />
          </div>

          <div className="relative grid gap-10 sm:gap-12 md:grid-cols-3 md:gap-8">
            {data.steps.map((step, i) => {
              const Icon = resolveLucideIcon(step.iconName, HelpCircle);
              // Middle step slightly higher on desktop
              const yOffset = i === 1 ? -16 : 0;
              return (
                <motion.div
                  key={step.number}
                  initial={{ opacity: 0, y: 24 + Math.abs(yOffset) }}
                  whileInView={{ opacity: 1, y: yOffset }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.55, delay: i * 0.1, ease: EASE }}
                  className="group relative flex flex-row gap-5 md:flex-col md:items-center md:text-center"
                >
                  {/* Icon disk on top of connector */}
                  <div className="relative z-10 shrink-0 md:self-center">
                    <span
                      className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#0891B2]/40 bg-background text-[#0891B2] shadow-[0_10px_30px_-10px_rgba(8,145,178,0.55)] sm:h-[3.75rem] sm:w-[3.75rem]"
                      aria-hidden
                    >
                      <Icon size={24} strokeWidth={2.1} />
                    </span>
                  </div>

                  {/* Text — number watermark lives inside this column so it never overlaps the icon */}
                  <div className="relative flex flex-1 flex-col justify-center md:items-center">
                    <span
                      aria-hidden
                      className="pointer-events-none absolute -top-4 select-none font-serif text-5xl font-black leading-none tracking-tighter text-[#0891B2]/20 end-0 sm:text-6xl md:-top-10 md:text-[7rem]"
                    >
                      {step.number}
                    </span>
                    <h3 className="relative mb-1.5 font-sans text-base font-bold text-foreground sm:text-lg md:text-xl">
                      {step.title}
                    </h3>
                    <p
                      className="text-sm leading-relaxed text-muted-foreground md:max-w-[16rem]"
                      style={{ textWrap: "pretty" } as React.CSSProperties}
                    >
                      {step.description}
                    </p>
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

export default BusinessProcess;
