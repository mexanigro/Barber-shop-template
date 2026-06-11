/**
 * contact/estetica/contact-v4.tsx — CONCIERGE MINIMAL (estética).
 *
 * No map, no photography: a serene typographic concierge desk. Centered
 * serif invitation, three hairline-divided columns (visit / reach / hours)
 * and an underline-field form beneath. Whitespace is the design — the most
 * restrained, "private clinic" composition of the family.
 *
 * Selected when `sections.contact.variant === "v4"` and niche is estética.
 */
import React from "react";
import { motion } from "motion/react";
import { cn } from "../../../../lib/utils";
import { localeConfig } from "../../../../config/locale";
import { siteConfig } from "../../../../config/site";
import {
  Y_SM, Y_LG, VIEWPORT_ONCE,
  getNicheFlavor, NICHE_DURATION, NICHE_EASING,
} from "../../../../lib/motion";
import { EsteticaContactForm, DAY_KEYS, orderedDayKeys, JS_DAY_TO_KEY, fmtTime } from "./contact-form";

export function EsteticaContactV4() {
  const { sections, contact, hours } = siteConfig;
  const sectionConfig = sections.contact;
  const niche = siteConfig.business.type;
  const flavor = getNicheFlavor(niche);
  const dur = NICHE_DURATION[flavor];
  const ease = NICHE_EASING[flavor];

  const showForm = siteConfig.features.showInquiry;
  const showHours = siteConfig.features.showBusinessHours;
  const todayKey = JS_DAY_TO_KEY[new Date().getDay()];

  // Condensed hours: group consecutive days sharing the same slot.
  const condensed = React.useMemo(() => {
    type Group = { from: (typeof DAY_KEYS)[number]; to: (typeof DAY_KEYS)[number]; label: string };
    const groups: Group[] = [];
    for (const day of orderedDayKeys()) {
      const slot = hours[day];
      const label = slot ? `${fmtTime(slot.start)} – ${fmtTime(slot.end)}` : localeConfig.businessHours.closed;
      const last = groups[groups.length - 1];
      if (last && last.label === label) last.to = day;
      else groups.push({ from: day, to: day, label });
    }
    return groups;
  }, [hours]);

  const colHeading = "text-[10px] font-medium uppercase tracking-[0.24em] text-accent-light";

  return (
    <section id="contact" className="bg-background py-16 transition-colors duration-300 sm:py-24 lg:py-36">
      <div className="mx-auto max-w-3xl px-5 text-center sm:px-6">

        {/* ── Invitation ───────────────────────────────────────────────── */}
        <motion.p
          initial={{ opacity: 0, y: Y_SM }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEWPORT_ONCE}
          transition={{ duration: dur, ease }}
          className="mb-3 inline-flex items-center gap-3 text-[10px] font-medium uppercase tracking-[0.32em] text-accent-light sm:text-xs"
        >
          <span className="h-px w-7 bg-accent/50" aria-hidden />
          {sectionConfig.title}
          <span className="h-px w-7 bg-accent/50" aria-hidden />
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: Y_LG }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEWPORT_ONCE}
          transition={{ duration: dur, ease, delay: 0.08 }}
          className="font-serif text-3xl font-light leading-[1.08] text-balance text-foreground sm:text-4xl md:text-5xl"
        >
          {sectionConfig.subtitle}
        </motion.h2>
        {sectionConfig.description && (
          <motion.p
            initial={{ opacity: 0, y: Y_SM }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT_ONCE}
            transition={{ duration: dur, ease, delay: 0.14 }}
            className="mx-auto mt-4 max-w-lg text-pretty text-sm font-light leading-relaxed text-muted-foreground sm:text-[15px]"
          >
            {sectionConfig.description}
          </motion.p>
        )}

        {/* ── Concierge columns ───────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: Y_LG }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEWPORT_ONCE}
          transition={{ duration: dur, ease, delay: 0.18 }}
          className={cn(
            "mt-12 grid grid-cols-1 gap-y-9 border-y border-border py-9 text-center sm:mt-16",
            showHours ? "sm:grid-cols-3 sm:divide-x sm:divide-border" : "sm:grid-cols-2 sm:divide-x sm:divide-border",
          )}
        >
          <div className="min-w-0 px-4">
            <p className={colHeading}>{localeConfig.location.address}</p>
            <p className="mt-3 text-pretty font-serif text-base font-light leading-relaxed text-foreground">
              {contact.address.street}
              <br />
              {contact.address.district}, {contact.address.cityStateZip}
            </p>
          </div>

          <div className="min-w-0 px-4">
            <p className={colHeading}>{localeConfig.inquiry.phone} · {localeConfig.inquiry.email}</p>
            <p className="mt-3 flex flex-col items-center gap-1.5">
              <a
                href={`tel:${contact.phone}`}
                dir="ltr"
                className="inline-flex min-h-[32px] items-center font-serif text-base font-light text-foreground hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 [transition:color_0.3s_cubic-bezier(0.23,1,0.32,1)]"
              >
                {contact.phone}
              </a>
              <a
                href={`mailto:${contact.email}`}
                className="inline-flex min-h-[32px] max-w-full items-center truncate font-serif text-base font-light text-foreground hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 [transition:color_0.3s_cubic-bezier(0.23,1,0.32,1)]"
              >
                {contact.email}
              </a>
            </p>
          </div>

          {showHours && (
            <div className="min-w-0 px-4">
              <p className={colHeading}>{localeConfig.businessHours.eyebrow}</p>
              <ul className="mt-3 space-y-1.5">
                {condensed.map((g, i) => {
                  const order = orderedDayKeys();
                  const isTodayGroup =
                    order.indexOf(todayKey) >= order.indexOf(g.from) &&
                    order.indexOf(todayKey) <= order.indexOf(g.to);
                  const dayLabel =
                    g.from === g.to
                      ? localeConfig.businessHours.days[g.from].label
                      : `${localeConfig.businessHours.days[g.from].label} – ${localeConfig.businessHours.days[g.to].label}`;
                  return (
                    <li key={i} className={cn("font-serif text-base font-light leading-relaxed", isTodayGroup ? "text-foreground" : "text-muted-foreground")}>
                      <span className="block text-[11px] font-sans font-medium uppercase tracking-[0.14em] text-muted-foreground">{dayLabel}</span>
                      <span dir={g.label === localeConfig.businessHours.closed ? undefined : "ltr"} className="tabular-nums">{g.label}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </motion.div>

        {/* ── Underline form ──────────────────────────────────────────── */}
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: Y_LG }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT_ONCE}
            transition={{ duration: dur, ease, delay: 0.22 }}
            className="mx-auto mt-12 max-w-xl text-start sm:mt-16"
          >
            <EsteticaContactForm idPrefix="ecv4" fieldStyle="underline" />
          </motion.div>
        )}
      </div>
    </section>
  );
}
