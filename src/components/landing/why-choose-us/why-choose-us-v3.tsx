/**
 * why-choose-us-v3.tsx — COMPARISON TABLE variant.
 *
 * "Us vs. the usual" — an editorial comparison: rows derived from
 * `benefits[]`, the brand column (accent serif header, Check marks) facing a
 * deliberately muted generic alternative (Minus marks — neutral, not a red-X
 * gotcha). Desktop renders a hairline table; mobile stacks one card per row
 * with both values side by side. Column labels for the generic side are
 * inline per-language microcopy (business copy still comes from siteConfig).
 *
 * Selected via `sections.whyChooseUs.variant === "v3"` (WhyChooseUs.tsx
 * dispatcher).
 */
import { Check, ChevronRight, HelpCircle, Minus } from "lucide-react";
import { motion } from "motion/react";
import { localeConfig } from "../../../config/locale";
import { siteConfig } from "../../../config/site";
import { interpolate } from "../../../lib/interpolate";
import { resolveLucideIcon } from "../../../lib/lucide-icons";
import {
  Y_SM, Y_MD, VIEWPORT_ONCE,
  getNicheFlavor, nicheStagger, NICHE_DURATION, NICHE_EASING,
} from "../../../lib/motion";

type Lang = "en" | "he" | "ru" | "ar";

const STRINGS: Record<Lang, {
  elsewhere: string;
  included: string;
  notGuaranteed: string;
}> = {
  en: { elsewhere: "Elsewhere", included: "Included", notGuaranteed: "Not guaranteed" },
  he: { elsewhere: "במקומות אחרים", included: "כלול", notGuaranteed: "לא מובטח" },
  ru: { elsewhere: "В других местах", included: "Включено", notGuaranteed: "Не гарантировано" },
  ar: { elsewhere: "في أماكن أخرى", included: "مشمول", notGuaranteed: "غير مضمون" },
};

export function WhyChooseUsV3({
  onNavigateToAbout,
}: {
  onNavigateToAbout?: () => void;
} = {}) {
  const { sections, brand } = siteConfig;
  const sectionConfig = sections.whyChooseUs;
  const niche = siteConfig.business.type;
  const flavor = getNicheFlavor(niche);
  const dur = NICHE_DURATION[flavor];
  const ease = NICHE_EASING[flavor];
  const stagger = nicheStagger(niche);

  const strings = STRINGS[localeConfig.lang as Lang] ?? STRINGS.en;
  const brandName = brand?.name ?? "";
  const brandVars = { brand: brandName };
  const eyebrow = sectionConfig.title ? interpolate(sectionConfig.title, brandVars) : "";
  const heading = sectionConfig.subtitle ? interpolate(sectionConfig.subtitle, brandVars) : "";
  const benefits = sectionConfig.benefits;

  return (
    <section
      id="why-choose-us"
      className="bg-card px-5 py-14 transition-colors duration-300 sm:px-6 sm:py-[var(--gs-section-py)]"
    >
      <div className="mx-auto max-w-5xl">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="mb-12 text-center sm:mb-16">
          {eyebrow && (
            <motion.p
              initial={{ opacity: 0, y: Y_SM }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={VIEWPORT_ONCE}
              transition={{ duration: dur, ease }}
              className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-accent-light"
            >
              {eyebrow}
            </motion.p>
          )}
          {heading && (
            <motion.h2
              initial={{ opacity: 0, y: Y_MD }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={VIEWPORT_ONCE}
              transition={{ duration: dur, ease, delay: 0.08 }}
              className="mx-auto max-w-2xl font-serif text-3xl leading-tight text-card-foreground sm:text-4xl md:text-5xl"
            >
              {heading}
            </motion.h2>
          )}
        </div>

        {/* ── Desktop table (md+) ────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: Y_MD }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEWPORT_ONCE}
          transition={{ duration: dur, ease }}
          className="hidden overflow-hidden rounded-[var(--gs-card-radius)] border border-border bg-background md:block"
        >
          {/* Header row */}
          <div className="grid grid-cols-[1.5fr_1fr_1fr]">
            <div className="p-5" />
            <div className="border-s border-border bg-accent-light/5 p-5 text-center">
              <span className="font-serif text-lg leading-tight text-accent-light">{brandName}</span>
            </div>
            <div className="flex items-center justify-center border-s border-border p-5 text-center">
              <span className="text-sm font-medium text-muted-foreground">{strings.elsewhere}</span>
            </div>
          </div>

          {/* Benefit rows */}
          {benefits.map((benefit, i) => {
            const IconComponent = resolveLucideIcon(benefit.iconName, HelpCircle);
            return (
              <motion.div
                key={`wcu-v3-row-${benefit.title.slice(0, 20)}-${i}`}
                initial={{ opacity: 0, y: Y_SM }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={VIEWPORT_ONCE}
                transition={{ delay: stagger(i), duration: dur, ease }}
                className="grid grid-cols-[1.5fr_1fr_1fr] border-t border-border"
              >
                <div className="flex items-center gap-3 p-5">
                  <IconComponent size={18} className="shrink-0 text-accent-light" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{benefit.title}</p>
                    {benefit.desc && (
                      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground line-clamp-2">{benefit.desc}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-center border-s border-border bg-accent-light/5 p-5">
                  <Check size={18} className="text-accent-light" aria-hidden="true" />
                  <span className="sr-only">{strings.included}</span>
                </div>
                <div className="flex items-center justify-center border-s border-border p-5">
                  <Minus size={16} className="text-muted-foreground/40" aria-hidden="true" />
                  <span className="sr-only">{strings.notGuaranteed}</span>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* ── Mobile stacked cards (below md) ────────────────────────── */}
        <div className="space-y-[var(--gs-gap)] md:hidden">
          {benefits.map((benefit, i) => {
            const IconComponent = resolveLucideIcon(benefit.iconName, HelpCircle);
            return (
              <motion.div
                key={`wcu-v3-card-${benefit.title.slice(0, 20)}-${i}`}
                initial={{ opacity: 0, y: Y_MD }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={VIEWPORT_ONCE}
                transition={{ delay: stagger(i), duration: dur, ease }}
                className="rounded-[var(--gs-card-radius)] border border-border bg-background p-5"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-light/10">
                    <IconComponent size={18} className="text-accent-light" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-base font-bold leading-snug text-foreground">{benefit.title}</h3>
                    {benefit.desc && (
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground line-clamp-3">{benefit.desc}</p>
                    )}
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4">
                  <div className="flex min-w-0 items-center gap-2">
                    <Check size={16} className="shrink-0 text-accent-light" aria-hidden="true" />
                    <span className="truncate text-xs font-semibold text-accent-light">{brandName}</span>
                  </div>
                  <div className="flex min-w-0 items-center gap-2">
                    <Minus size={16} className="shrink-0 text-muted-foreground/40" aria-hidden="true" />
                    <span className="truncate text-xs text-muted-foreground">{strings.elsewhere}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* ── About affordance ───────────────────────────────────────── */}
        {onNavigateToAbout && (
          <motion.div
            initial={{ opacity: 0, y: Y_SM }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT_ONCE}
            transition={{ delay: 0.2, duration: dur, ease }}
            className="mt-10 text-center"
          >
            <button
              type="button"
              onClick={onNavigateToAbout}
              className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-accent hover:text-accent-light active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 [transition:color_0.2s_cubic-bezier(0.23,1,0.32,1),transform_0.16s_cubic-bezier(0.23,1,0.32,1)]"
            >
              {localeConfig.services.learnMoreAboutUs}
              <ChevronRight size={14} className="rtl:rotate-180" aria-hidden="true" />
            </button>
          </motion.div>
        )}

      </div>
    </section>
  );
}
