import React from "react";
import { ArrowLeft, ArrowRight, Clock, Calendar, ChevronRight } from "lucide-react";
import { motion } from "motion/react";
import { localeConfig } from "../../config/locale";
import { siteConfig } from "../../config/site";
import { Y_SM, Y_MD, staggerGrid, VIEWPORT_ONCE } from "../../lib/motion";

export function ServicesPage({
  onBack,
  onBookClick,
}: {
  onBack: () => void;
  onBookClick: () => void;
}) {
  const { services, sections } = siteConfig;
  const { services: sectionConfig } = sections;
  const isRtl = localeConfig.dir === "rtl";

  return (
    <div className="min-h-screen bg-background pt-28 pb-20 transition-colors duration-300">
      <div className="mx-auto max-w-5xl px-6">

        {/* Back link */}
        <motion.button
          initial={{ opacity: 0, x: isRtl ? 8 : -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          onClick={onBack}
          className="mb-12 flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded"
        >
          {isRtl ? <ArrowRight size={14} /> : <ArrowLeft size={14} />}
          {localeConfig.lang === "he" ? "חזרה לדף הבית" : "Back to Home"}
        </motion.button>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: Y_SM }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-6"
        >
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-accent-light">
            {sectionConfig.title}
          </p>
          <h1 className="font-serif text-4xl font-normal tracking-wide text-foreground md:text-5xl">
            {sectionConfig.subtitle}
          </h1>
        </motion.div>

        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="mb-6 h-px w-20 origin-left bg-gradient-to-r from-accent-light to-transparent"
        />

        <motion.p
          initial={{ opacity: 0, y: Y_SM }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          className="mb-16 max-w-2xl text-sm leading-relaxed text-muted-foreground"
        >
          {localeConfig.lang === "he"
            ? "כל טיפול מותאם אישית לאנטומיה ולמטרות שלך. אנו משתמשים אך ורק במוצרים מאושרים ובפרוטוקולים מבוססי ראיות."
            : "Every treatment is personalized to your anatomy and goals. We use only approved products and evidence-based protocols."}
        </motion.p>

        {/* Services list */}
        <div className="space-y-0 divide-y divide-border">
          {services.map((service, i) => (
            <motion.article
              key={service.id}
              initial={{ opacity: 0, y: Y_MD }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: staggerGrid(i), duration: 0.4 }}
              className="group grid grid-cols-1 gap-6 py-10 first:pt-0 md:grid-cols-[120px_1fr]"
            >
              {/* Small image */}
              <div className="aspect-square w-24 shrink-0 overflow-hidden rounded-lg border border-border md:w-full">
                <img
                  src={sectionConfig.images[i % sectionConfig.images.length]}
                  alt={service.name}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>

              {/* Content */}
              <div className="flex flex-col justify-center">
                <h2 className="font-serif text-2xl font-normal tracking-wide text-foreground md:text-3xl">
                  {service.name}
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
                  {service.description}
                </p>
                <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground/60">
                  <Clock size={12} />
                  <span>{service.duration} {localeConfig.services.minutesShort}</span>
                </div>
              </div>
            </motion.article>
          ))}
        </div>

        {/* Bottom CTA */}
        {siteConfig.features.showBooking && (
          <motion.div
            initial={{ opacity: 0, y: Y_SM }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT_ONCE}
            transition={{ delay: 0.2 }}
            className="mt-16 border-t border-border pt-12 text-center"
          >
            <p className="mb-4 text-sm text-muted-foreground">
              {localeConfig.lang === "he"
                ? "לא בטוחים איזה טיפול מתאים? התחילו עם ייעוץ אישי."
                : "Not sure which treatment is right for you? Start with a personal consultation."}
            </p>
            <button
              type="button"
              onClick={onBookClick}
              className="group inline-flex items-center gap-2.5 rounded-lg border border-border bg-primary px-8 py-3.5 text-sm font-medium text-primary-foreground transition-all duration-300 hover:bg-accent-light hover:text-zinc-950"
            >
              <Calendar size={16} />
              <span>{siteConfig.hero.ctaPrimary}</span>
              <ChevronRight size={14} className="transition-transform duration-300 group-hover:translate-x-0.5" />
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
