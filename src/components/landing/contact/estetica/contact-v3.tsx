/**
 * contact/estetica/contact-v3.tsx — FLOATING PORCELAIN CARD (estética).
 *
 * Immersive yet calm: full-bleed clinic photography softened by a porcelain
 * veil, with one floating card holding the compact inquiry form and a
 * hairline row of direct channels (call / write / visit). One surface, one
 * decision — the most focused "book a consultation" composition.
 *
 * Selected when `sections.contact.variant === "v3"` and niche is estética.
 */
import React from "react";
import { Mail, Phone, MapPin } from "lucide-react";
import { motion } from "motion/react";
import { localeConfig } from "../../../../config/locale";
import { siteConfig } from "../../../../config/site";
import { getOverlayOpacity } from "../../../../lib/section-variants";
import {
  Y_SM, Y_LG, VIEWPORT_ONCE,
  getNicheFlavor, NICHE_DURATION, NICHE_EASING,
} from "../../../../lib/motion";
import { EsteticaContactForm } from "./contact-form";

export function EsteticaContactV3() {
  const { sections, contact } = siteConfig;
  const sectionConfig = sections.contact;
  const niche = siteConfig.business.type;
  const flavor = getNicheFlavor(niche);
  const dur = NICHE_DURATION[flavor];
  const ease = NICHE_EASING[flavor];

  const showForm = siteConfig.features.showInquiry;
  const fullAddress = `${contact.address.street}, ${contact.address.district}, ${contact.address.cityStateZip}`;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`;

  const channels = [
    { icon: Phone, label: contact.phone, href: `tel:${contact.phone}`, dir: "ltr" as const },
    { icon: Mail, label: contact.email, href: `mailto:${contact.email}` },
    ...(siteConfig.features.showLocation
      ? [{ icon: MapPin, label: contact.address.district, href: mapsUrl, external: true }]
      : []),
  ];

  return (
    <section id="contact" className="relative overflow-hidden py-16 transition-colors duration-300 sm:py-24 lg:py-32">
      {/* ── Veiled photographic backdrop ─────────────────────────────── */}
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
        <div className="absolute inset-0 bg-background" style={{ opacity: getOverlayOpacity(0.82) }} />
        <div className="gs-gradient absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,var(--secondary),transparent_70%)] opacity-70 dark:opacity-30" />
      </div>

      <div className="relative mx-auto max-w-2xl px-5 sm:px-6">
        {/* ── Header above the card ────────────────────────────────────── */}
        <div className="mb-10 text-center sm:mb-12">
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
        </div>

        {/* ── Floating card ────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: Y_LG, scale: 0.985 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={VIEWPORT_ONCE}
          transition={{ duration: dur * 1.15, ease, delay: 0.1 }}
          className="rounded-[0.75rem] border border-border bg-card/95 p-7 shadow-elevated backdrop-blur-sm sm:p-10"
        >
          {showForm && <EsteticaContactForm idPrefix="ecv3" compact />}

          {/* Direct channels row */}
          {channels.length > 0 && (
            <div className={showForm ? "mt-8 border-t border-border pt-6" : undefined}>
              <ul className="flex flex-col items-stretch justify-center gap-1 sm:flex-row sm:items-center sm:gap-8">
                {channels.map(({ icon: Icon, label, href, dir, external }, i) => (
                  <li key={i} className="min-w-0">
                    <a
                      href={href}
                      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                      className="flex min-h-[44px] touch-manipulation items-center justify-center gap-2.5 text-sm text-muted-foreground hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 [transition:color_0.3s_cubic-bezier(0.23,1,0.32,1)]"
                    >
                      <Icon size={14} className="shrink-0 text-accent" aria-hidden />
                      <span dir={dir} className="truncate font-light">{label}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
}
