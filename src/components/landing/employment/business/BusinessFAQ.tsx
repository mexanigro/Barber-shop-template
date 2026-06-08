/**
 * BusinessFAQ.tsx
 *
 * Employer FAQ. Standard accordion pattern intentionally — by this point in
 * the page, businesses just want answers without ceremony. Two-column on
 * desktop so the page doesn't crawl. Includes FAQPage JSON-LD for SEO.
 */

import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { useBusinessLocale } from "./useBusinessLocale";

const EASE = [0.23, 1, 0.32, 1] as const;

interface ItemProps {
  question: string;
  answer: string;
  index: number;
}

function FaqItem({ question, answer, index }: ItemProps) {
  const [open, setOpen] = React.useState(false);
  const panelId = React.useId();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, delay: Math.min(index * 0.04, 0.3), ease: EASE }}
      className="rounded-2xl border border-border/60 bg-card/70 transition-colors duration-200 hover:border-[#E8820C]/30"
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full min-h-[60px] items-start justify-between gap-5 px-6 py-5 text-start focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E8820C]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <span className="text-[15px] font-bold leading-snug text-foreground sm:text-base">
          {question}
        </span>
        <motion.span
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.22, ease: EASE }}
          aria-hidden
          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#E8820C]/40 text-[#E8820C]"
        >
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <path d="M5.5 1v9M1 5.5h9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="panel"
            id={panelId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: EASE }}
            className="overflow-hidden"
          >
            <p
              className="px-6 pb-5 text-[15px] leading-relaxed text-muted-foreground sm:text-base"
              style={{ textWrap: "pretty" } as React.CSSProperties}
            >
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function BusinessFAQ() {
  const data = useBusinessLocale().faq;

  return (
    <section
      id="business-faq"
      className="relative overflow-hidden bg-muted/30 py-20 sm:py-28 md:py-32"
    >
      <div className="relative mx-auto max-w-5xl px-5 sm:px-8 lg:px-12">
        <div className="mb-12 max-w-2xl sm:mb-16">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, ease: EASE }}
            className="mb-3 font-sans text-xs font-semibold uppercase tracking-[0.22em] text-[#E8820C]"
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

        {/* Two-column on desktop, single on mobile. Items split evenly. */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
          {data.items.map((item, i) => (
            <FaqItem key={item.question} question={item.question} answer={item.answer} index={i} />
          ))}
        </div>
      </div>

      {/* JSON-LD for SEO */}
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

export default BusinessFAQ;
