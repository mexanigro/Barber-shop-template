/**
 * faq-v2.tsx — TWO-COLUMN FAQ variant.
 *
 * Items split into two balanced columns at lg+ (odd item goes to the first
 * column), each row an independent borderless accordion separated by hairline
 * border-b dividers — no card boxes. Serif medium questions, smooth
 * height-auto reveal via AnimatePresence, chevron rotation, multiple rows can
 * be open at once. Single column on mobile.
 *
 * Selected via `sections.faq.variant === "v2"` (see FAQ.tsx dispatcher).
 */
import { useState, useId } from "react";
import { motion, AnimatePresence } from "motion/react";
import { siteConfig } from "../../../config/site";
import {
  Y_MD, VIEWPORT_ONCE,
  getNicheFlavor, nicheStagger, NICHE_DURATION, NICHE_EASING,
  EASE_OUT_STRONG,
} from "../../../lib/motion";

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <motion.svg
      width="18"
      height="18"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      className="shrink-0 text-muted-foreground"
      animate={{ rotate: open ? 180 : 0 }}
      transition={{ duration: 0.25, ease: EASE_OUT_STRONG }}
    >
      <path d="M5 7.5l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </motion.svg>
  );
}

function HairlineRow({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div className="border-b border-border/60">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full min-h-[44px] items-center justify-between gap-4 rounded-sm py-5 text-start hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 [transition:color_0.3s_cubic-bezier(0.23,1,0.32,1)]"
      >
        <span className="font-serif text-base font-medium leading-snug text-foreground md:text-lg">
          {question}
        </span>
        <ChevronIcon open={open} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panelId}
            role="region"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0, transition: { duration: 0.22, ease: EASE_OUT_STRONG } }}
            transition={{ duration: 0.35, ease: EASE_OUT_STRONG }}
            className="overflow-hidden"
          >
            <p className="pb-5 pe-8 text-sm leading-relaxed text-muted-foreground">
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function FaqV2() {
  const data = siteConfig.sections.faq;
  if (!data || !data.items || data.items.length === 0) return null;

  const niche = siteConfig.business.type;
  const flavor = getNicheFlavor(niche);
  const stagger = nicheStagger(niche);

  // Balanced split: with an odd count the first column takes the extra item.
  const mid = Math.ceil(data.items.length / 2);
  const columns = [data.items.slice(0, mid), data.items.slice(mid)];

  return (
    <section id="faq" className="relative flex flex-col justify-center py-8 sm:py-20 md:py-28 lg:block">
      <div className="container mx-auto max-w-5xl px-4">
        <motion.div
          initial={{ opacity: 0, y: Y_MD }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: NICHE_DURATION[flavor], ease: NICHE_EASING[flavor] }}
          viewport={VIEWPORT_ONCE}
          className="mb-12 text-center md:mb-16"
        >
          <h2 className="font-serif text-3xl font-medium tracking-tight text-foreground md:text-4xl">
            {data.title}
          </h2>
          {data.subtitle && (
            <p className="mx-auto mt-3 max-w-xl text-base text-muted-foreground">
              {data.subtitle}
            </p>
          )}
        </motion.div>

        <div
          className="grid grid-cols-1 gap-x-[calc(var(--gs-gap)*2)] lg:grid-cols-2"
          role="region"
          aria-label={data.title}
        >
          {columns.map((column, colIndex) => (
            <div
              key={`faq-col-${colIndex}`}
              className={colIndex === 0 ? "border-t border-border/60" : "lg:border-t lg:border-border/60"}
            >
              {column.map((item, i) => (
                <motion.div
                  key={`faq-${item.question.slice(0, 30)}-${i}`}
                  initial={{ opacity: 0, y: Y_MD }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: NICHE_DURATION[flavor], ease: NICHE_EASING[flavor], delay: stagger(i) }}
                  viewport={VIEWPORT_ONCE}
                >
                  <HairlineRow question={item.question} answer={item.answer} />
                </motion.div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* FAQPage JSON-LD structured data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: data.items.map((item) => ({
              "@type": "Question",
              name: item.question,
              acceptedAnswer: { "@type": "Answer", text: item.answer },
            })),
          }).replace(/<\/script>/gi, "<\\/script>"),
        }}
      />
    </section>
  );
}
