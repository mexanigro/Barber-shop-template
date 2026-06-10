/**
 * faq/estetica/faq-v5.tsx — CONSULTATION CONSOLE (estética).
 *
 * Question list as a quiet menu on the start side; the chosen answer lands
 * in a sticky porcelain panel styled like a specialist's note (serif quote,
 * hairline frame, counter). Desktop is a two-pane console; mobile folds the
 * same model into per-question disclosure.
 *
 * Selected when `sections.faq.variant === "v5"` and niche is estética.
 */
import React from "react";
import { ArrowRight } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "../../../../lib/utils";
import { siteConfig } from "../../../../config/site";
import {
  Y_SM, Y_LG, VIEWPORT_ONCE,
  getNicheFlavor, NICHE_DURATION, NICHE_EASING, EASE_OUT_STRONG,
} from "../../../../lib/motion";

export function EsteticaFaqV5() {
  const data = siteConfig.sections.faq;
  const niche = siteConfig.business.type;
  const flavor = getNicheFlavor(niche);
  const dur = NICHE_DURATION[flavor];
  const ease = NICHE_EASING[flavor];

  const [active, setActive] = React.useState(0);
  const [mobileOpen, setMobileOpen] = React.useState(0);
  if (!data?.items?.length) return null;

  const current = data.items[active] ?? data.items[0];

  return (
    <section id="faq" className="bg-background py-16 transition-colors duration-300 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="mb-12 max-w-2xl sm:mb-16">
          <motion.p
            initial={{ opacity: 0, y: Y_SM }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT_ONCE}
            transition={{ duration: dur, ease }}
            className="mb-3 flex items-center gap-3 text-[10px] font-medium uppercase tracking-[0.32em] text-accent-light sm:text-xs"
          >
            <span className="h-px w-7 shrink-0 bg-accent/50" aria-hidden />
            {data.subtitle}
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: Y_LG }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT_ONCE}
            transition={{ duration: dur, ease, delay: 0.08 }}
            className="font-serif text-3xl font-light leading-[1.08] text-balance text-foreground sm:text-4xl md:text-5xl"
          >
            {data.title}
          </motion.h2>
        </div>

        {/* ── Desktop console ────────────────────────────────────────── */}
        <div className="hidden gap-14 lg:grid lg:grid-cols-12">
          <nav className="lg:col-span-6" aria-label={data.title}>
            <ul className="flex flex-col">
              {data.items.map((item, index) => {
                const isActive = index === active;
                return (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, y: Y_SM }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={VIEWPORT_ONCE}
                    transition={{ duration: dur, ease, delay: Math.min(index * 0.05, 0.25) }}
                  >
                    <button
                      type="button"
                      onClick={() => setActive(index)}
                      aria-current={isActive ? "true" : undefined}
                      className={cn(
                        "group relative flex w-full min-h-[60px] items-center gap-4 border-b border-border py-5 pe-4 text-start",
                        "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
                      )}
                    >
                      <span className={cn(
                        "shrink-0 font-serif text-sm tabular-nums transition-colors duration-300",
                        isActive ? "text-accent" : "text-muted-foreground/50 group-hover:text-accent-light",
                      )} aria-hidden>
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className={cn(
                        "min-w-0 flex-1 font-serif text-lg leading-snug transition-colors duration-300 xl:text-xl",
                        isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground",
                      )}>
                        {item.question}
                      </span>
                      <ArrowRight
                        size={15}
                        className={cn(
                          "shrink-0 transition-[opacity,translate] duration-300 rtl:-scale-x-100",
                          isActive ? "translate-x-0 text-accent opacity-100" : "-translate-x-1 text-muted-foreground opacity-0 group-hover:translate-x-0 group-hover:opacity-60 rtl:translate-x-1 rtl:group-hover:translate-x-0",
                        )}
                        aria-hidden
                      />
                      {isActive && (
                        <motion.span
                          layoutId="estetica-faq-v5-active"
                          transition={{ duration: 0.45, ease: EASE_OUT_STRONG }}
                          className="absolute inset-x-0 bottom-[-1px] h-px bg-accent"
                          aria-hidden
                        />
                      )}
                    </button>
                  </motion.li>
                );
              })}
            </ul>
          </nav>

          {/* Specialist's note panel */}
          <div className="lg:col-span-6">
            <motion.div
              initial={{ opacity: 0, y: Y_LG }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={VIEWPORT_ONCE}
              transition={{ duration: dur * 1.1, ease }}
              className="sticky top-28"
            >
              <div className="relative rounded-[0.75rem] border border-accent/25 bg-secondary/60 p-9 dark:bg-secondary/25 xl:p-12">
                <span className="absolute -top-3 start-8 bg-background px-3 font-serif text-sm italic text-accent" aria-hidden>
                  {String(active + 1).padStart(2, "0")} / {String(data.items.length).padStart(2, "0")}
                </span>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={active}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.4, ease: EASE_OUT_STRONG }}
                  >
                    <h3 className="font-serif text-2xl font-light leading-snug text-foreground">
                      {current.question}
                    </h3>
                    <p className="mt-5 max-w-prose font-serif text-lg font-light italic leading-relaxed text-foreground/75">
                      {current.answer}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        </div>

        {/* ── Mobile disclosure ──────────────────────────────────────── */}
        <ul className="flex flex-col divide-y divide-border border-y border-border lg:hidden">
          {data.items.map((item, index) => {
            const isOpen = index === mobileOpen;
            const panelId = `estetica-faq-v5-m-panel-${index}`;
            return (
              <motion.li
                key={index}
                initial={{ opacity: 0, y: Y_SM }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={VIEWPORT_ONCE}
                transition={{ duration: dur, ease, delay: Math.min(index * 0.04, 0.2) }}
              >
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => setMobileOpen(isOpen ? -1 : index)}
                  className="flex w-full min-h-[60px] items-center gap-3.5 py-4 text-start focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                >
                  <span className={cn("shrink-0 font-serif text-xs tabular-nums", isOpen ? "text-accent" : "text-muted-foreground/60")} aria-hidden>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className={cn("min-w-0 flex-1 font-serif text-[17px] leading-snug", isOpen ? "text-accent" : "text-foreground")}>
                    {item.question}
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      id={panelId}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.4, ease: EASE_OUT_STRONG }}
                      className="overflow-hidden"
                    >
                      <p className="pb-5 ps-7 text-[14px] font-light leading-relaxed text-muted-foreground">
                        {item.answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
