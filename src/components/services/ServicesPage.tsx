import React from "react";
import { ArrowLeft, ArrowRight, Clock, Calendar, ChevronRight } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "../../lib/utils";
import { localeConfig } from "../../config/locale";
import { siteConfig } from "../../config/site";
import { interpolate } from "../../lib/interpolate";
import {
  Y_SM, Y_MD, VIEWPORT_ONCE,
  getNicheFlavor, nicheStagger, NICHE_DURATION, NICHE_EASING,
} from "../../lib/motion";

export function ServicesPage({
  onBack,
  onBookClick,
}: {
  onBack: () => void;
  onBookClick: (serviceId?: string) => void;
}) {
  const { services, sections, brand } = siteConfig;
  const { services: sectionConfig } = sections;
  const isRtl = localeConfig.dir === "rtl";
  const niche = siteConfig.business.type;
  const flavor = getNicheFlavor(niche);
  const stagger = nicheStagger(niche);

  const isTattoo = niche === "tattoo";
  const isNails = niche === "nails";
  const isEstetica = niche === "estetica";

  const headingClass = isEstetica
    ? "font-serif text-4xl font-normal tracking-wide text-foreground md:text-5xl"
    : isNails
      ? "font-serif text-4xl font-black uppercase tracking-wide text-foreground md:text-5xl"
      : isTattoo
        ? "font-serif text-4xl font-black uppercase tracking-tight text-foreground md:text-5xl"
        : "font-serif text-4xl font-bold tracking-tight text-foreground md:text-5xl";

  const serviceNameClass = isEstetica
    ? "font-serif text-3xl font-normal tracking-wide text-foreground md:text-4xl"
    : isNails
      ? "text-2xl font-bold tracking-wide text-foreground md:text-3xl"
      : isTattoo
        ? "text-2xl font-black uppercase tracking-tight text-foreground md:text-3xl"
        : "text-2xl font-bold tracking-tight text-foreground md:text-3xl";

  const imageRound = isTattoo ? "rounded-xl" : "rounded-2xl";

  React.useEffect(() => {
    document.title = `${sectionConfig.subtitle} · ${brand.name}`;
  }, []);

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
          {localeConfig.about.backToHome}
        </motion.button>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: Y_SM }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: NICHE_DURATION[flavor], ease: NICHE_EASING[flavor] }}
          className="mb-6"
        >
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-accent-light">
            {sectionConfig.title}
          </p>
          <h1 className={headingClass}>
            {sectionConfig.subtitle}
          </h1>
        </motion.div>

        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ duration: NICHE_DURATION[flavor] * 0.8, delay: 0.2, ease: NICHE_EASING[flavor] }}
          style={{ originX: 0 }}
          className="mb-6 h-px w-20 bg-gradient-to-r from-accent-light to-transparent"
        />

        <motion.p
          initial={{ opacity: 0, y: Y_SM }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: NICHE_DURATION[flavor], ease: NICHE_EASING[flavor] }}
          className="mb-16 max-w-2xl text-sm leading-relaxed text-muted-foreground"
        >
          {interpolate(localeConfig.services.servicesPageIntro, { count: services.length })}
        </motion.p>

        {/* Services list — alternating image/content */}
        <div className="space-y-16">
          {services.map((service, i) => {
            const isReversed = i % 2 !== 0;
            return (
              <motion.article
                key={service.id}
                initial={{ opacity: 0, y: Y_MD }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={VIEWPORT_ONCE}
                transition={{ delay: stagger(i), duration: NICHE_DURATION[flavor], ease: NICHE_EASING[flavor] }}
                className="group grid grid-cols-1 gap-8 md:grid-cols-2 md:items-center"
              >
                {/* Image */}
                <div
                  className={cn(
                    "overflow-hidden border border-border",
                    imageRound,
                    isReversed && "md:order-2",
                    (siteConfig.features.showBooking || siteConfig.features.showInquiry) && "cursor-pointer",
                  )}
                  onClick={(siteConfig.features.showBooking || siteConfig.features.showInquiry) ? () => onBookClick(service.id) : undefined}
                  role={(siteConfig.features.showBooking || siteConfig.features.showInquiry) ? "button" : undefined}
                  tabIndex={(siteConfig.features.showBooking || siteConfig.features.showInquiry) ? 0 : undefined}
                  onKeyDown={(siteConfig.features.showBooking || siteConfig.features.showInquiry) ? (e: React.KeyboardEvent) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onBookClick(service.id);
                    }
                  } : undefined}
                >
                  <img
                    src={sectionConfig.images[i % sectionConfig.images.length]}
                    alt={service.name}
                    className="aspect-[4/3] w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                    loading="lazy"
                  />
                </div>

                {/* Content */}
                <div className={cn("flex flex-col justify-center", isReversed && "md:order-1")}>
                  <span className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-accent-light/60">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h2 className={serviceNameClass}>
                    {service.name}
                  </h2>
                  <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
                    {service.description}
                  </p>

                  <div className="mt-5 flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60">
                      <Clock size={12} />
                      <span>{service.duration} {localeConfig.services.minutesShort}</span>
                    </div>
                    {service.price > 0 && (
                      <span className="text-sm font-semibold text-accent-light">
                        {localeConfig.currency.symbol}{service.price}
                      </span>
                    )}
                  </div>

                  {(siteConfig.features.showBooking || siteConfig.features.showInquiry) && (
                    <button
                      type="button"
                      onClick={() => onBookClick(service.id)}
                      className={cn(
                        "mt-6 inline-flex w-fit items-center gap-2 bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-all duration-300 hover:bg-accent-light hover:text-zinc-950",
                        isTattoo ? "rounded-lg" : "rounded-xl",
                      )}
                    >
                      <Calendar size={14} />
                      <span>{siteConfig.features.showBooking ? localeConfig.services.book : (localeConfig.lang === "he" ? "בקשו הצעת מחיר" : "Get a Quote")}</span>
                      <ChevronRight size={13} className="transition-transform duration-300 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
                    </button>
                  )}
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
