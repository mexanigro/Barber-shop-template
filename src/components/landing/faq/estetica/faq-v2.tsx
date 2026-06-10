/**
 * faq/estetica/faq-v2.tsx — STICKY COUNSEL (estética).
 *
 * Two-column counsel: a sticky start column holding the serif heading,
 * supporting copy and a quiet "still unsure? call us" nudge, beside an
 * accordion of hairline rows with serif questions and a rotating plus.
 * Multiple rows may stay open — readers compare answers calmly.
 *
 * Selected when `sections.faq.variant === "v2"` and niche is estética.
 */
import React from "react";
import { Phone, Plus } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "../../../../lib/utils";
import { siteConfig } from "../../../../config/site";
import {
  Y_SM, Y_LG, VIEWPORT_ONCE,
  getNicheFlavor, NICHE_DURATION, NICHE_EASING, EASE_OUT_STRONG,
} from "../../../../lib/motion";

export function EsteticaFaqV2() {
  const data = siteConfig.sections.faq;
  const contact = siteConfig.contact;
  const niche = siteConfig.business.type;
  const flavor = getNicheFlavor(niche);
  const dur = NICHE_DURATION[flavor];
  const ease = NICHE_EASING[flavor];

  const [open, setOpen] = React.useState<Set<number>>(new Set([0]));
  if (!data?.items?.length) return null;

  const toggle = (index: number) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });

  return (
    <section id="faq" className="bg-background py-16 transition-colors duration-300 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">

          {/* ── Sticky intro column ──────────────────────────────────── */}
          <div className="min-w-0 lg:col-span-5">
            <div className="lg:sticky lg:top-28">
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
                className="font-serif text-3xl font-light leading-[1.1] text-balance text-foreground sm:text-4xl md:text-5xl"
              >
                {data.title}
              </motion.h2>

              {/* Quiet contact nudge */}
              <motion.div
                initial={{ opacity: 0, y: Y_SM }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={VIEWPORT_ONCE}
                transition={{ duration: dur, ease, delay: 0.18 }}
                className="mt-8 hidden max-w-xs border-t border-border pt-6 lg:block"
              >
                <a
                  href={`tel:${contact.phone}`}
                  className="group inline-flex min-h-[44px] items-center gap-3 text-sm text-muted-foreground hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 [transition:color_0.3s_cubic-bezier(0.23,1,0.32,1)]"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-accent transition-colors duration-300 group-hover:bg-accent group-hover:text-primary-foreground" aria-hidden>
                    <Phone size={15} />
                  </span>
                  <span dir="ltr" className="font-light">{contact.phone}</span>
                </a>
              </motion.div>
            </div>
          </div>

          {/* ── Accordion column ─────────────────────────────────────── */}
          <div className="min-w-0 lg:col-span-7">
            <ul className="divide-y divide-border border-y border-border">
              {data.items.map((item, index) => {
                const isOpen = open.has(index);
                const panelId = `estetica-faq-v2-panel-${index}`;
                const buttonId = `estetica-faq-v2-button-${index}`;
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
                      id={buttonId}
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onClick={() => toggle(index)}
                      className="flex w-full min-h-[64px] items-center justify-between gap-5 py-5 text-start focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 sm:py-6"
                    >
                      <span className={cn(
                        "min-w-0 font-serif text-lg font-normal leading-snug transition-colors duration-300 sm:text-xl",
                        isOpen ? "text-accent" : "text-foreground",
                      )}>
                        {item.question}
                      </span>
                      <span
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-[transform,border-color,color] duration-400 ease-[cubic-bezier(0.23,1,0.32,1)]",
                          isOpen ? "rotate-45 border-accent text-accent" : "border-border text-muted-foreground",
                        )}
                        aria-hidden
                      >
                        <Plus size={15} />
                      </span>
                    </button>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          id={panelId}
                          role="region"
                          aria-labelledby={buttonId}
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.4, ease: EASE_OUT_STRONG }}
                          className="overflow-hidden"
                        >
                          <p className="max-w-prose pb-6 pe-12 text-[15px] font-light leading-relaxed text-muted-foreground">
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
        </div>
      </div>
    </section>
  );
}
