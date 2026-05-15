import React from "react";
import { ArrowLeft, ArrowRight, HelpCircle, ChevronRight, Calendar } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "../../lib/utils";
import { localeConfig } from "../../config/locale";
import { siteConfig } from "../../config/site";
import { resolveLucideIcon } from "../../lib/lucide-icons";
import {
  Y_SM, Y_MD, VIEWPORT_ONCE,
  getNicheFlavor, nicheStagger, nicheScaleIn, NICHE_DURATION, NICHE_EASING,
} from "../../lib/motion";

export function AboutPage({
  onBack,
  onBookClick,
  onNavigateToStaffProfile,
}: {
  onBack: () => void;
  onBookClick: () => void;
  onNavigateToStaffProfile?: (slug: string) => void;
}) {
  const { brand, sections, staff } = siteConfig;
  const { whyChooseUs: wcu, team: teamSection } = sections;
  const niche = siteConfig.business.type;
  const flavor = getNicheFlavor(niche);
  const isRtl = localeConfig.dir === "rtl";
  const stagger = nicheStagger(niche);
  const imageScaleIn = nicheScaleIn(niche);

  const isTattoo = niche === "tattoo";
  const isNails = niche === "nails";
  const isEstetica = niche === "estetica";

  const headingClass = isEstetica
    ? "font-serif text-4xl font-normal tracking-wide text-foreground md:text-5xl lg:text-6xl"
    : isNails
      ? "font-serif text-4xl font-black uppercase tracking-wide text-foreground md:text-5xl lg:text-6xl"
      : isTattoo
        ? "font-serif text-4xl font-black uppercase tracking-tight text-foreground md:text-5xl lg:text-6xl"
        : "font-serif text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl";

  const subheadingClass = isEstetica
    ? "font-serif text-3xl font-normal tracking-wide text-foreground md:text-4xl"
    : isNails
      ? "font-serif text-3xl font-black uppercase tracking-wide text-foreground md:text-4xl"
      : "font-serif text-3xl font-bold tracking-tight text-foreground md:text-4xl";

  const imageRound = isTattoo ? "rounded-xl" : "rounded-3xl";
  const cardRound = isTattoo ? "rounded-lg" : "rounded-2xl";

  // i18n — use localeConfig.about if available, fallback for safety
  const aboutL = (localeConfig as Record<string, unknown>).about as Record<string, string> | undefined;
  const t = {
    backToHome: aboutL?.backToHome ?? "Back to Home",
    approachEyebrow: aboutL?.approachEyebrow ?? "Our Approach",
    approachTitle: aboutL?.approachTitle ?? "Every treatment is built on clear principles",
    ctaTitle: aboutL?.ctaTitle ?? "Your first step is on us",
    ctaBody: aboutL?.ctaBody ?? "Come in for a free, no-obligation consultation. We will understand your goals and design a personalized plan.",
  };

  return (
    <div className="min-h-screen bg-background pt-28 pb-20 transition-colors duration-300">
      <div className="mx-auto max-w-6xl px-6">

        {/* Back link */}
        <motion.button
          initial={{ opacity: 0, x: isRtl ? 8 : -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          onClick={onBack}
          className="mb-16 flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded"
        >
          {isRtl ? <ArrowRight size={14} /> : <ArrowLeft size={14} />}
          {t.backToHome}
        </motion.button>

        {/* ── Hero section ── */}
        <div className="mb-24 grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <motion.div
            initial={{ opacity: 0, y: Y_MD }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: NICHE_DURATION[flavor], ease: NICHE_EASING[flavor] }}
          >
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-accent-light">
              {wcu.title}
            </p>
            <h1 className={cn("mb-6", headingClass)}>
              {wcu.subtitle}
            </h1>
            <motion.div
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ duration: NICHE_DURATION[flavor] * 0.8, ease: NICHE_EASING[flavor], delay: 0.2 }}
              style={{ originX: 0 }}
              className="mb-8 h-px w-20 bg-gradient-to-r from-accent-light to-transparent"
            />
            <p className="max-w-lg text-base leading-relaxed text-muted-foreground">
              {brand.description ?? brand.tagline}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: NICHE_DURATION[flavor] * 1.2, ease: NICHE_EASING[flavor], delay: 0.15 }}
          >
            <div className={cn("aspect-[4/5] overflow-hidden border border-border", imageRound)}>
              <img
                src={wcu.mainImage}
                alt={localeConfig.whyChooseUs?.imageAlt ?? brand.name}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
          </motion.div>
        </div>

        {/* ── Philosophy / Benefits ── */}
        <motion.div
          initial={{ opacity: 0, y: Y_SM }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEWPORT_ONCE}
          transition={{ duration: NICHE_DURATION[flavor], ease: NICHE_EASING[flavor] }}
          className="mb-24"
        >
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-accent-light">
            {t.approachEyebrow}
          </p>
          <h2 className={cn("mb-14", subheadingClass)}>
            {t.approachTitle}
          </h2>

          <div className={cn(
            "grid grid-cols-1 gap-px overflow-hidden border border-border bg-border sm:grid-cols-2",
            isTattoo ? "rounded-lg" : "rounded-xl",
          )}>
            {wcu.benefits.map((benefit, i) => {
              const IconComponent = resolveLucideIcon(benefit.iconName, HelpCircle);
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: Y_SM }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={VIEWPORT_ONCE}
                  transition={{ delay: stagger(i), duration: NICHE_DURATION[flavor], ease: NICHE_EASING[flavor] }}
                  className="bg-card p-8 md:p-10"
                >
                  <IconComponent className="mb-4 text-accent-light" size={20} />
                  <h3 className="mb-2 text-base font-medium text-foreground">{benefit.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{benefit.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* ── Team preview ── */}
        <motion.div
          initial={{ opacity: 0, y: Y_SM }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEWPORT_ONCE}
          transition={{ duration: NICHE_DURATION[flavor], ease: NICHE_EASING[flavor] }}
          className="mb-24"
        >
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-accent-light">
            {teamSection.title}
          </p>
          <h2 className={cn("mb-6", subheadingClass)}>
            {teamSection.subtitle}
          </h2>
          <p className="mb-12 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {teamSection.description}
          </p>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {staff.map((member, i) => (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: Y_MD }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={VIEWPORT_ONCE}
                transition={{ delay: stagger(i), duration: NICHE_DURATION[flavor], ease: NICHE_EASING[flavor] }}
                className="group"
              >
                <div
                  className={cn(
                    "aspect-[3/4] overflow-hidden border border-border",
                    imageRound,
                    onNavigateToStaffProfile && "cursor-pointer",
                  )}
                  onClick={onNavigateToStaffProfile ? () => onNavigateToStaffProfile(member.slug) : undefined}
                  role={onNavigateToStaffProfile ? "button" : undefined}
                  tabIndex={onNavigateToStaffProfile ? 0 : undefined}
                  onKeyDown={onNavigateToStaffProfile ? (e: React.KeyboardEvent) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onNavigateToStaffProfile(member.slug);
                    }
                  } : undefined}
                >
                  <img
                    src={member.photoUrl}
                    alt={member.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="mt-4">
                  <h3 className="text-base font-medium text-foreground">{member.name}</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">{member.specialty}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* ── Bottom CTA ── */}
        {siteConfig.features.showBooking && (
          <motion.div
            initial={{ opacity: 0, y: Y_SM }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT_ONCE}
            transition={{ delay: 0.2, duration: NICHE_DURATION[flavor], ease: NICHE_EASING[flavor] }}
            className="border-t border-border pt-16 text-center"
          >
            <p className={cn("mb-2 text-2xl md:text-3xl", isEstetica ? "font-serif font-normal tracking-wide text-foreground" : "font-serif font-bold text-foreground")}>
              {t.ctaTitle}
            </p>
            <p className="mx-auto mb-8 max-w-md text-sm text-muted-foreground">
              {t.ctaBody}
            </p>
            <button
              type="button"
              onClick={onBookClick}
              className={cn(
                "group inline-flex items-center gap-2.5 border border-border bg-primary px-8 py-3.5 text-sm font-medium text-primary-foreground transition-all duration-300 hover:bg-accent-light hover:text-zinc-950",
                isTattoo ? "rounded-lg" : "rounded-xl",
              )}
            >
              <Calendar size={16} />
              <span>{siteConfig.hero.ctaPrimary}</span>
              <ChevronRight size={14} className="transition-transform duration-300 group-hover:translate-x-0.5 rtl:rotate-180" />
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
