/**
 * contact/estetica/contact-v2.tsx — CONSULTATION SPLIT (estética).
 *
 * Editorial 50/50: the inquiry form on a warm porcelain panel beside an
 * arch-cropped clinic photograph carrying a floating address plate (and the
 * map link). Business hours run as a hairline two-column strip beneath the
 * form. The default "talk to the clinic" composition of the family.
 *
 * Selected when `sections.contact.variant === "v2"` and niche is estética.
 */
import React from "react";
import { Mail, Phone, MapPin, Clock, ExternalLink } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "../../../../lib/utils";
import { localeConfig } from "../../../../config/locale";
import { siteConfig } from "../../../../config/site";
import {
  Y_SM, Y_LG, VIEWPORT_ONCE,
  getNicheFlavor, nicheStagger, NICHE_DURATION, NICHE_EASING,
} from "../../../../lib/motion";
import { EsteticaContactForm, orderedDayKeys, JS_DAY_TO_KEY, fmtTime } from "./contact-form";

export function EsteticaContactV2() {
  const { sections, contact, hours } = siteConfig;
  const sectionConfig = sections.contact;
  const niche = siteConfig.business.type;
  const flavor = getNicheFlavor(niche);
  const dur = NICHE_DURATION[flavor];
  const ease = NICHE_EASING[flavor];
  const stagger = nicheStagger(niche);

  const showForm = siteConfig.features.showInquiry;
  const showHours = siteConfig.features.showBusinessHours;
  const showMap = siteConfig.features.showLocation;
  if (!showForm && !showHours && !showMap) return null;

  const todayKey = JS_DAY_TO_KEY[new Date().getDay()];
  const fullAddress = `${contact.address.street}, ${contact.address.district}, ${contact.address.cityStateZip}`;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`;

  return (
    <section id="contact" className="bg-secondary/50 py-16 transition-colors duration-300 sm:py-24 lg:py-32 dark:bg-secondary/20">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-12 lg:gap-16">

          {/* ── Form panel ───────────────────────────────────────────── */}
          <div className="order-1 min-w-0 lg:col-span-7">
            <motion.div
              initial={{ opacity: 0, y: Y_SM }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={VIEWPORT_ONCE}
              transition={{ duration: dur, ease }}
              className="mb-9"
            >
              <p className="mb-3 flex items-center gap-3 text-[10px] font-medium uppercase tracking-[0.32em] text-accent-light sm:text-xs">
                <span className="h-px w-7 shrink-0 bg-accent/50" aria-hidden />
                {sectionConfig.title}
              </p>
              <h2 className="font-serif text-3xl font-light leading-[1.08] text-balance text-foreground sm:text-4xl md:text-5xl">
                {sectionConfig.subtitle}
              </h2>
              {sectionConfig.description && (
                <p className="mt-4 max-w-prose text-pretty text-sm font-light leading-relaxed text-muted-foreground sm:text-[15px]">
                  {sectionConfig.description}
                </p>
              )}
            </motion.div>

            {showForm ? (
              <motion.div
                initial={{ opacity: 0, y: Y_SM }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={VIEWPORT_ONCE}
                transition={{ duration: dur, ease, delay: 0.08 }}
              >
                <EsteticaContactForm idPrefix="ecv2" />
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: Y_SM }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={VIEWPORT_ONCE}
                transition={{ duration: dur, ease }}
                className="space-y-3"
              >
                <a
                  href={`tel:${contact.phone}`}
                  className="flex min-h-[44px] touch-manipulation items-center gap-3 text-sm text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 [transition:color_0.3s_cubic-bezier(0.23,1,0.32,1)]"
                >
                  <Phone size={15} className="shrink-0 text-accent" aria-hidden />
                  <span dir="ltr" className="font-medium">{contact.phone}</span>
                </a>
                <a
                  href={`mailto:${contact.email}`}
                  className="flex min-h-[44px] touch-manipulation items-center gap-3 text-sm text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 [transition:color_0.3s_cubic-bezier(0.23,1,0.32,1)]"
                >
                  <Mail size={15} className="shrink-0 text-accent" aria-hidden />
                  <span className="font-medium">{contact.email}</span>
                </a>
              </motion.div>
            )}

            {/* ── Hours strip ─────────────────────────────────────────── */}
            {showHours && (
              <motion.div
                initial={{ opacity: 0, y: Y_SM }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={VIEWPORT_ONCE}
                transition={{ delay: 0.1, duration: dur, ease }}
                className="mt-10 border-t border-border pt-7"
              >
                <div className="mb-4 flex items-center gap-2">
                  <Clock size={13} className="text-accent" aria-hidden />
                  <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-accent-light">
                    {localeConfig.businessHours.eyebrow}
                  </span>
                </div>
                <ul className="grid grid-cols-1 gap-x-10 gap-y-2 sm:grid-cols-2">
                  {orderedDayKeys().map((dayKey, i) => {
                    const slot = hours[dayKey];
                    const isToday = dayKey === todayKey;
                    return (
                      <motion.li
                        key={dayKey}
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={VIEWPORT_ONCE}
                        transition={{ delay: stagger(i), duration: dur, ease }}
                        className={cn("flex items-baseline justify-between gap-4 text-[13px]", !slot && "opacity-45")}
                      >
                        <span className={cn("flex items-center gap-1.5 font-light", isToday ? "font-medium text-foreground" : "text-muted-foreground")}>
                          {isToday && <span className="h-1 w-1 shrink-0 rounded-full bg-accent" aria-hidden />}
                          {localeConfig.businessHours.days[dayKey].label}
                        </span>
                        {slot ? (
                          <span dir="ltr" className="font-medium tabular-nums text-foreground">
                            {fmtTime(slot.start)} – {fmtTime(slot.end)}
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/60">
                            {localeConfig.businessHours.closed}
                          </span>
                        )}
                      </motion.li>
                    );
                  })}
                </ul>
              </motion.div>
            )}
          </div>

          {/* ── Arch photo / map column ──────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={VIEWPORT_ONCE}
            transition={{ duration: dur * 1.2, ease }}
            className="order-2 min-w-0 lg:col-span-5"
          >
            <div className="relative">
              <div className="relative aspect-[4/5] overflow-hidden rounded-t-[10rem] rounded-b-[0.5rem] sm:rounded-t-[13rem]">
                {showMap ? (
                  <iframe
                    title={localeConfig.location.mapAlt}
                    src={`https://www.google.com/maps?q=${encodeURIComponent(fullAddress)}&output=embed`}
                    className="absolute inset-0 h-full w-full border-0"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    allowFullScreen
                  />
                ) : (
                  <>
                    <img
                      src={siteConfig.hero.backgroundImage}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                      draggable={false}
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" aria-hidden />
                  </>
                )}
              </div>

              {/* Floating address plate */}
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={VIEWPORT_ONCE}
                transition={{ delay: 0.18, duration: dur, ease }}
                className="relative z-10 -mt-12 ms-auto me-4 max-w-sm rounded-[0.625rem] border border-border bg-card/95 p-5 shadow-elevated backdrop-blur-sm sm:me-6"
              >
                <div className="mb-1.5 flex items-center gap-2">
                  <MapPin size={13} className="shrink-0 text-accent" aria-hidden />
                  <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                    {localeConfig.location.address}
                  </span>
                </div>
                <p className="text-pretty text-sm font-light leading-relaxed text-foreground">{fullAddress}</p>
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group mt-1 inline-flex min-h-[44px] touch-manipulation items-center gap-1.5 text-xs font-medium uppercase tracking-[0.16em] text-accent hover:text-accent-light focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 [transition:color_0.3s_cubic-bezier(0.23,1,0.32,1)]"
                >
                  <span>{localeConfig.location.openInMaps}</span>
                  <ExternalLink size={11} className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" aria-hidden />
                </a>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
