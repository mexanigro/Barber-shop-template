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
      <div className="mx-auto max-w-6xl px-6">

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

        {/* Services list — each treatment gets a prominent image */}
        <div className="space-y-16">
          {services.map((service, i) => {
            const isReversed = i % 2 !== 0;
            return (
              <motion.article
                key={service.id}
                initial={{ opacity: 0, y: Y_MD }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: staggerGrid(i), duration: 0.4 }}
                className="group grid grid-cols-1 gap-8 md:grid-cols-2 md:items-center"
              >
                {/* Image — large, expressive */}
                <div className={`overflow-hidden rounded-lg border border-border ${isReversed ? "md:order-2" : ""}`}>
                  <img
                    src={sectionConfig.images[i % sectionConfig.images.length]}
                    alt={service.name}
                    className="aspect-[4/3] w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                    loading="lazy"
                  />
                </div>

                {/* Content */}
                <div className={`flex flex-col justify-center ${isReversed ? "md:order-1" : ""}`}>
                  <span className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-accent-light/60">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h2 className="font-serif text-3xl font-normal tracking-wide text-foreground md:text-4xl">
                    {service.name}
                  </h2>
                  <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
                    {service.description}
                  </p>
                  <div className="mt-5 flex items-center gap-1.5 text-xs text-muted-foreground/60">
                    <Clock size={12} />
                    <span>{service.duration} {localeConfig.services.minutesShort}</span>
                  </div>
                  {siteConfig.features.showBooking && (
                    <button
                      type="button"
                      onClick={onBookClick}
                      className="mt-6 inline-flex w-fit items-center gap-2 text-sm font-medium text-accent transition-colors duration-200 hover:text-accent-light"
                    >
                      <Calendar size={14} />
                      <span>{siteConfig.hero.ctaPrimary}</span>
                      <ChevronRight size={13} className="transition-transform duration-300 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
                    </button>
                  )}
                </div>
              </motion.article>
            );
          })}
        </div>

        {/* Bottom CTA */}
        {siteConfig.features.showBooking && (
          <motion.div
            initial={{ opacity: 0, y: Y_SM }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT_ONCE}
            transition={{ delay: 0.2 }}
            className="mt-20 border-t border-border pt-12 text-center"
          >
            <p className="mb-4 text-sm text-muted-foreground">
              {localeConfig.lang === "he"
                ? "לא בטוחים איזה טיפול מתאים? בואו נדבר פנים אל פנים."
                : "Not sure which treatment is right for you? Let’s talk face to face."}
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
