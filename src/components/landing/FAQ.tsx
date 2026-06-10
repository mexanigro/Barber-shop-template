import React, { useState, useId, Suspense } from "react";
import { motion, AnimatePresence } from "motion/react";
import { siteConfig } from "../../config/site";
import { resolveVariant } from "../../lib/section-variants";
import {
  Y_MD, VIEWPORT_ONCE,
  getNicheFlavor, nicheStagger, NICHE_DURATION, NICHE_EASING,
  EASE_OUT_STRONG,
} from "../../lib/motion";

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <motion.svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
      animate={{ rotate: open ? 180 : 0 }}
      transition={{ duration: 0.25, ease: EASE_OUT_STRONG }}
    >
      <path d="M5 7.5l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </motion.svg>
  );
}

const AuraFaqModule = React.lazy(() => import("./aura/aura-faq").then(m => ({ default: m.AuraFaq })));

/* ── 5-variant system (sections.faq.variant) ─────────────────────────────
   v1 = this original accordion; v2..v5 lazy-load from ./faq/. */
const FAQ_VARIANT_MODULES = {
  v2: React.lazy(() => import("./faq/faq-v2").then(m => ({ default: m.FaqV2 }))),
  v3: React.lazy(() => import("./faq/faq-v3").then(m => ({ default: m.FaqV3 }))),
  v4: React.lazy(() => import("./faq/faq-v4").then(m => ({ default: m.FaqV4 }))),
  v5: React.lazy(() => import("./faq/faq-v5").then(m => ({ default: m.FaqV5 }))),
} as const;

/* ── Estética-specific variant modules (porcelain editorial family). Same
   flag values; the dispatcher swaps the map when business.type === "estetica". */
const FAQ_VARIANT_MODULES_ESTETICA = {
  v2: React.lazy(() => import("./faq/estetica/faq-v2").then(m => ({ default: m.EsteticaFaqV2 }))),
  v3: React.lazy(() => import("./faq/estetica/faq-v3").then(m => ({ default: m.EsteticaFaqV3 }))),
  v4: React.lazy(() => import("./faq/estetica/faq-v4").then(m => ({ default: m.EsteticaFaqV4 }))),
  v5: React.lazy(() => import("./faq/estetica/faq-v5").then(m => ({ default: m.EsteticaFaqV5 }))),
} as const;

let warnedEmptyFaqVariantItems = false;

export function FAQ() {
  const data = siteConfig.sections.faq;
  if (!data || !data.items) return null;

  const variantCode = resolveVariant(data.variant);
  if (variantCode !== "v1") {
    if (data.items.length > 0) {
      const VariantModule = (siteConfig.business.type === "estetica"
        ? FAQ_VARIANT_MODULES_ESTETICA
        : FAQ_VARIANT_MODULES)[variantCode];
      return <Suspense fallback={null}><VariantModule /></Suspense>;
    }
    if (import.meta.env.DEV && !warnedEmptyFaqVariantItems) {
      warnedEmptyFaqVariantItems = true;
      // eslint-disable-next-line no-console
      console.warn(
        `[FAQ] variant="${variantCode}" but sections.faq.items is empty — falling back to the default FAQ.`,
      );
    }
  }

  if (data.faqVariant === "aura") {
    return <Suspense fallback={null}><AuraFaqModule /></Suspense>;
  }

  const niche = siteConfig.business.type;
  const isCafeteria = niche === "cafeteria";
  const flavor = getNicheFlavor(niche);
  const stagger = nicheStagger(niche);

  return (
    <section id="faq" className="relative flex flex-col justify-center py-8 sm:py-20 md:py-28 lg:block">
      <div className="container mx-auto max-w-3xl px-4">
        <motion.div
          initial={{ opacity: 0, y: Y_MD }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: NICHE_DURATION[flavor], ease: NICHE_EASING[flavor] }}
          viewport={VIEWPORT_ONCE}
          className="mb-12 text-center md:mb-16"
        >
          <h2 className={isCafeteria
            ? "font-serif text-3xl font-normal tracking-wide text-foreground md:text-4xl"
            : "text-3xl font-bold text-foreground md:text-4xl"
          }>
            {data.title}
          </h2>
          {data.subtitle && (
            <p className="mx-auto mt-3 max-w-xl text-base text-muted-foreground">
              {data.subtitle}
            </p>
          )}
        </motion.div>

        <div className="space-y-3" role="region" aria-label={data.title}>
          {data.items.map((item, i) => (
            <motion.div
              key={`faq-${item.question.slice(0, 30)}-${i}`}
              initial={{ opacity: 0, y: Y_MD }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: NICHE_DURATION[flavor], ease: NICHE_EASING[flavor], delay: stagger(i) }}
              viewport={VIEWPORT_ONCE}
            >
              <AccordionItem question={item.question} answer={item.answer} />
            </motion.div>
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
              acceptedAnswer: {
                "@type": "Answer",
                text: item.answer,
              },
            })),
          }).replace(/<\/script>/gi, "<\\/script>"),
        }}
      />
    </section>
  );
}

function AccordionItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div
      className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm hover:border-accent/30 [transition:border-color_0.3s_cubic-bezier(0.23,1,0.32,1),background-color_0.3s_ease]"
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full min-h-[48px] items-center justify-between gap-4 px-6 py-5 text-start focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
      >
        <span className="line-clamp-2 text-sm font-semibold text-foreground md:text-base">{question}</span>
        <ChevronIcon open={open} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panelId}
            role="region"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: EASE_OUT_STRONG }}
            className="overflow-hidden"
          >
            <p className="px-6 pb-5 text-sm leading-relaxed text-muted-foreground">
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
