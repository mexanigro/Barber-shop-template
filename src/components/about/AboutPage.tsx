import React from "react";
import { ArrowLeft, ArrowRight, HelpCircle, ChevronRight, Calendar } from "lucide-react";
import { motion } from "motion/react";
import { localeConfig } from "../../config/locale";
import { siteConfig } from "../../config/site";
import { resolveLucideIcon } from "../../lib/lucide-icons";
import { Y_SM, Y_MD, staggerGrid, VIEWPORT_ONCE } from "../../lib/motion";

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
  const isRtl = localeConfig.dir === "rtl";

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
          {localeConfig.lang === "he" ? "חזרה לדף הבית" : "Back to Home"}
        </motion.button>

        {/* ── Hero section ── */}
        <div className="mb-24 grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <motion.div
            initial={{ opacity: 0, y: Y_MD }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-accent-light">
              {wcu.title}
            </p>
            <h1 className="mb-6 font-serif text-4xl font-normal tracking-wide text-foreground md:text-5xl lg:text-6xl">
              {wcu.subtitle}
            </h1>
            <div className="mb-8 h-px w-20 bg-gradient-to-r from-accent-light to-transparent" />
            <p className="max-w-lg text-base leading-relaxed text-muted-foreground">
              {brand.description ?? brand.tagline}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            <div className="aspect-[4/5] overflow-hidden rounded-lg border border-border">
              <img
                src={wcu.mainImage}
                alt={localeConfig.whyChooseUs?.imageAlt ?? brand.name}
                className="h-full w-full object-cover"
              />
            </div>
          </motion.div>
        </div>

        {/* ── Philosophy / Benefits ── */}
        <motion.div
          initial={{ opacity: 0, y: Y_SM }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEWPORT_ONCE}
          className="mb-24"
        >
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-accent-light">
            {localeConfig.lang === "he" ? "הגישה שלנו" : "Our Approach"}
          </p>
          <h2 className="mb-14 font-serif text-3xl font-normal tracking-wide text-foreground md:text-4xl">
            {localeConfig.lang === "he"
              ? "כל טיפול מבוסס על עקרונות ברורים"
              : "Every treatment is built on clear principles"}
          </h2>

          <div className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2">
            {wcu.benefits.map((benefit, i) => {
              const IconComponent = resolveLucideIcon(benefit.iconName, HelpCircle);
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: Y_SM }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={VIEWPORT_ONCE}
                  transition={{ delay: staggerGrid(i) }}
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
          className="mb-24"
        >
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-accent-light">
            {teamSection.title}
          </p>
          <h2 className="mb-6 font-serif text-3xl font-normal tracking-wide text-foreground md:text-4xl">
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
                transition={{ delay: staggerGrid(i) }}
                className="group"
              >
                <div
                  className={`aspect-[3/4] overflow-hidden rounded-lg border border-border ${
                    onNavigateToStaffProfile ? "cursor-pointer" : ""
                  }`}
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
            transition={{ delay: 0.2 }}
            className="border-t border-border pt-16 text-center"
          >
            <p className="mb-2 font-serif text-2xl font-normal tracking-wide text-foreground md:text-3xl">
              {localeConfig.lang === "he"
                ? "הצעד הראשון עלינו"
                : "Your first step is on us"}
            </p>
            <p className="mx-auto mb-8 max-w-md text-sm text-muted-foreground">
              {localeConfig.lang === "he"
                ? "בואו לייעוץ חינם, ללא התחייבות. נכיר, נבין את המטרות שלכם, ונבנה תוכנית מותאמת."
                : "Come in for a free, no-obligation consultation. We will understand your goals and design a personalized plan."}
            </p>
            <button
              type="button"
              onClick={onBookClick}
              className="group inline-flex items-center gap-2.5 rounded-lg border border-border bg-primary px-8 py-3.5 text-sm font-medium text-primary-foreground transition-all duration-300 hover:bg-accent-light hover:text-zinc-950"
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
