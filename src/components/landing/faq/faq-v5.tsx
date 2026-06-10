/**
 * faq-v5.tsx — CHAT-STYLE FAQ variant.
 *
 * Questions and answers rendered as a conversational thread: each question
 * is a customer bubble (end-aligned, bg-secondary), each answer the business
 * bubble (start-aligned, bg-card with a small brand avatar). Pairs reveal on
 * scroll-into-view with a soft pop (scale 0.96 + translateY), the answer
 * trailing the question slightly. No fake typing indicators — content is
 * static and presented honestly. Bubble corners use logical utilities
 * (rounded-se-sm / rounded-ss-sm) so the layout mirrors correctly in RTL.
 *
 * Selected via `sections.faq.variant === "v5"` (see FAQ.tsx dispatcher).
 */
import { motion } from "motion/react";
import { siteConfig } from "../../../config/site";
import {
  Y_MD, VIEWPORT_ONCE,
  getNicheFlavor, NICHE_DURATION, NICHE_EASING,
  EASE_OUT_STRONG,
} from "../../../lib/motion";

function BrandAvatar() {
  const { brand } = siteConfig;
  const logo = brand.logo || brand.logoDark;
  const initial = (brand.logoMonogram || brand.name || "?").trim().charAt(0).toUpperCase();

  if (logo) {
    return (
      <span className="flex h-8 w-8 shrink-0 select-none items-center justify-center overflow-hidden rounded-full border border-border bg-card" aria-hidden="true">
        <img src={logo} alt="" className="h-full w-full object-contain p-1" loading="lazy" referrerPolicy="no-referrer" />
      </span>
    );
  }
  return (
    <span
      className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full bg-primary font-serif text-sm font-semibold leading-none text-primary-foreground"
      aria-hidden="true"
    >
      {initial}
    </span>
  );
}

const POP_INITIAL = { opacity: 0, scale: 0.96, y: 14 } as const;
const POP_VISIBLE = { opacity: 1, scale: 1, y: 0 } as const;

export function FaqV5() {
  const data = siteConfig.sections.faq;
  if (!data || !data.items || data.items.length === 0) return null;

  const niche = siteConfig.business.type;
  const flavor = getNicheFlavor(niche);
  const dur = NICHE_DURATION[flavor];
  const ease = NICHE_EASING[flavor];

  return (
    <section id="faq" className="relative flex flex-col justify-center py-8 sm:py-20 md:py-28 lg:block">
      <div className="container mx-auto max-w-2xl px-4">
        <motion.div
          initial={{ opacity: 0, y: Y_MD }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: dur, ease }}
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

        {/* ── Conversation thread ────────────────────────────────────── */}
        <div className="flex flex-col gap-[var(--gs-gap)]" role="region" aria-label={data.title}>
          {data.items.map((item, i) => (
            <div key={`faq-${item.question.slice(0, 30)}-${i}`} className="flex flex-col gap-2.5">

              {/* Customer bubble — question, end-aligned */}
              <motion.div
                initial={POP_INITIAL}
                whileInView={POP_VISIBLE}
                transition={{ duration: 0.45, ease: EASE_OUT_STRONG }}
                viewport={{ once: true, margin: "0px 0px -40px 0px" }}
                className="flex justify-end"
              >
                <div className="max-w-[75%] rounded-2xl rounded-se-sm bg-secondary px-4 py-3 sm:px-5">
                  <p className="text-sm font-medium leading-relaxed text-secondary-foreground md:text-base">
                    {item.question}
                  </p>
                </div>
              </motion.div>

              {/* Business bubble — answer, start-aligned with brand avatar */}
              <motion.div
                initial={POP_INITIAL}
                whileInView={POP_VISIBLE}
                transition={{ duration: 0.45, ease: EASE_OUT_STRONG, delay: 0.14 }}
                viewport={{ once: true, margin: "0px 0px -40px 0px" }}
                className="flex items-start gap-2.5"
              >
                <BrandAvatar />
                <div className="max-w-[75%] rounded-2xl rounded-ss-sm border border-border bg-card px-4 py-3 shadow-sm sm:px-5">
                  <p className="text-sm leading-relaxed text-foreground">
                    {item.answer}
                  </p>
                </div>
              </motion.div>
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
