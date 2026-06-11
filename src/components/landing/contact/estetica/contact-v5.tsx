/**
 * contact/estetica/contact-v5.tsx — IMMERSIVE ATLAS (estética).
 *
 * The map IS the section: a full-width embedded map (photographic veil
 * fallback when location is off) with a porcelain side panel docked on the
 * start edge, switching between INFO (address, channels, condensed hours)
 * and WRITE (compact form) through soft tabs. Spatial-first — "come find
 * us" leading, conversation one tap away.
 *
 * Selected when `sections.contact.variant === "v5"` and niche is estética.
 */
import React from "react";
import { Mail, Phone, MapPin, Clock, ExternalLink } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "../../../../lib/utils";
import { localeConfig } from "../../../../config/locale";
import { siteConfig } from "../../../../config/site";
import { getOverlayOpacity } from "../../../../lib/section-variants";
import {
  Y_SM, VIEWPORT_ONCE,
  getNicheFlavor, NICHE_DURATION, NICHE_EASING, EASE_OUT_STRONG,
} from "../../../../lib/motion";
import { EsteticaContactForm, orderedDayKeys, JS_DAY_TO_KEY, fmtTime } from "./contact-form";

const STRINGS: Record<"en" | "he" | "ru" | "ar", { info: string; write: string }> = {
  en: { info: "Visit", write: "Write to us" },
  he: { info: "ביקור", write: "כתבו לנו" },
  ru: { info: "Визит", write: "Напишите нам" },
  ar: { info: "زيارة", write: "اكتبوا لنا" },
};

export function EsteticaContactV5() {
  const { sections, contact, hours } = siteConfig;
  const sectionConfig = sections.contact;
  const niche = siteConfig.business.type;
  const flavor = getNicheFlavor(niche);
  const dur = NICHE_DURATION[flavor];
  const ease = NICHE_EASING[flavor];
  const S = STRINGS[localeConfig.lang] ?? STRINGS.en;

  const showForm = siteConfig.features.showInquiry;
  const showHours = siteConfig.features.showBusinessHours;
  const showMap = siteConfig.features.showLocation;
  if (!showForm && !showHours && !showMap) return null;

  const [tab, setTab] = React.useState<"info" | "write">("info");
  const todayKey = JS_DAY_TO_KEY[new Date().getDay()];
  const todaySlot = hours[todayKey];
  const fullAddress = `${contact.address.street}, ${contact.address.district}, ${contact.address.cityStateZip}`;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`;

  const tabButton = (key: "info" | "write", label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={tab === key}
      onClick={() => setTab(key)}
      className={cn(
        "relative min-h-[44px] flex-1 px-4 text-xs font-medium uppercase tracking-[0.18em]",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
        "[transition:color_0.3s_cubic-bezier(0.23,1,0.32,1)]",
        tab === key ? "text-accent" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
      {tab === key && (
        <motion.span
          layoutId="estetica-contact-v5-tab"
          transition={{ duration: 0.4, ease: EASE_OUT_STRONG }}
          className="absolute inset-x-3 bottom-0 h-px bg-accent"
          aria-hidden
        />
      )}
    </button>
  );

  return (
    <section id="contact" className="bg-background transition-colors duration-300">
      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-7xl px-5 pb-10 pt-16 sm:px-6 sm:pb-12 sm:pt-24 lg:px-8">
        <motion.p
          initial={{ opacity: 0, y: Y_SM }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEWPORT_ONCE}
          transition={{ duration: dur, ease }}
          className="mb-3 flex items-center gap-3 text-[10px] font-medium uppercase tracking-[0.32em] text-accent-light sm:text-xs"
        >
          <span className="h-px w-7 shrink-0 bg-accent/50" aria-hidden />
          {sectionConfig.title}
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: Y_SM }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEWPORT_ONCE}
          transition={{ duration: dur, ease, delay: 0.08 }}
          className="font-serif text-3xl font-light leading-[1.08] text-balance text-foreground sm:text-4xl md:text-5xl"
        >
          {sectionConfig.subtitle}
        </motion.h2>
      </div>

      {/* ── Atlas stage ──────────────────────────────────────────────── */}
      <div className="relative min-h-[680px] sm:min-h-[620px]">
        {/* Map / veiled photo backdrop */}
        <div className="absolute inset-0">
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
            <div className="absolute inset-0" aria-hidden>
              <img
                src={siteConfig.hero.backgroundImage}
                alt=""
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
                draggable={false}
              />
              <div className="absolute inset-0 bg-background" style={{ opacity: getOverlayOpacity(0.6) }} />
            </div>
          )}
        </div>

        {/* Docked porcelain panel */}
        <div className="relative mx-auto flex min-h-[680px] max-w-7xl items-center px-5 py-10 sm:min-h-[620px] sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT_ONCE}
            transition={{ duration: dur * 1.15, ease }}
            className="w-full max-w-md rounded-[0.75rem] border border-border bg-card/95 shadow-elevated backdrop-blur-sm"
          >
            {/* Tabs */}
            {showForm ? (
              <div role="tablist" className="flex border-b border-border">
                {tabButton("info", S.info)}
                {tabButton("write", S.write)}
              </div>
            ) : null}

            <div className="p-6 sm:p-8">
              <AnimatePresence mode="wait" initial={false}>
                {tab === "write" && showForm ? (
                  <motion.div
                    key="write"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.35, ease: EASE_OUT_STRONG }}
                  >
                    <EsteticaContactForm idPrefix="ecv5" compact />
                  </motion.div>
                ) : (
                  <motion.div
                    key="info"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.35, ease: EASE_OUT_STRONG }}
                    className="space-y-6"
                  >
                    {/* Address */}
                    <div>
                      <p className="mb-2 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                        <MapPin size={12} className="text-accent" aria-hidden />
                        {localeConfig.location.address}
                      </p>
                      <p className="text-pretty font-serif text-lg font-light leading-relaxed text-foreground">
                        {contact.address.street}
                        <br />
                        {contact.address.district}, {contact.address.cityStateZip}
                      </p>
                      {showMap && (
                        <a
                          href={mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group mt-1 inline-flex min-h-[44px] touch-manipulation items-center gap-1.5 text-xs font-medium uppercase tracking-[0.16em] text-accent hover:text-accent-light focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 [transition:color_0.3s_cubic-bezier(0.23,1,0.32,1)]"
                        >
                          <span>{localeConfig.location.openInMaps}</span>
                          <ExternalLink size={11} className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" aria-hidden />
                        </a>
                      )}
                    </div>

                    {/* Channels */}
                    <div className="border-t border-border pt-5">
                      <a
                        href={`tel:${contact.phone}`}
                        className="flex min-h-[44px] touch-manipulation items-center gap-3 text-sm text-muted-foreground hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 [transition:color_0.3s_cubic-bezier(0.23,1,0.32,1)]"
                      >
                        <Phone size={14} className="shrink-0 text-accent" aria-hidden />
                        <span dir="ltr" className="font-light">{contact.phone}</span>
                      </a>
                      <a
                        href={`mailto:${contact.email}`}
                        className="flex min-h-[44px] touch-manipulation items-center gap-3 text-sm text-muted-foreground hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 [transition:color_0.3s_cubic-bezier(0.23,1,0.32,1)]"
                      >
                        <Mail size={14} className="shrink-0 text-accent" aria-hidden />
                        <span className="truncate font-light">{contact.email}</span>
                      </a>
                    </div>

                    {/* Hours (condensed: today highlighted, full list quiet) */}
                    {showHours && (
                      <div className="border-t border-border pt-5">
                        <p className="mb-3 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                          <Clock size={12} className="text-accent" aria-hidden />
                          {localeConfig.businessHours.eyebrow}
                        </p>
                        <ul className="space-y-1.5">
                          {orderedDayKeys().map((dayKey) => {
                            const slot = hours[dayKey];
                            const isToday = dayKey === todayKey;
                            return (
                              <li
                                key={dayKey}
                                className={cn(
                                  "flex items-baseline justify-between gap-4 text-[13px]",
                                  isToday ? "font-medium text-foreground" : "font-light text-muted-foreground",
                                  !slot && "opacity-50",
                                )}
                              >
                                <span className="flex items-center gap-1.5">
                                  {isToday && <span className="h-1 w-1 shrink-0 rounded-full bg-accent" aria-hidden />}
                                  {localeConfig.businessHours.days[dayKey].label}
                                </span>
                                {slot ? (
                                  <span dir="ltr" className="tabular-nums">{fmtTime(slot.start)} – {fmtTime(slot.end)}</span>
                                ) : (
                                  <span className="text-[10px] font-medium uppercase tracking-[0.14em]">{localeConfig.businessHours.closed}</span>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                        {todaySlot && (
                          <p className="sr-only">
                            {localeConfig.businessHours.today}: {fmtTime(todaySlot.start)} – {fmtTime(todaySlot.end)}
                          </p>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
