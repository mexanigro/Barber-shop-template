import React from "react";
import { MapPin, Phone, Mail, ExternalLink } from "lucide-react";
import { motion } from "motion/react";
import { localeConfig } from "../../config/locale";
import { siteConfig } from "../../config/site";
import { getNicheFlavor, nicheStagger, nicheScaleIn, NICHE_DURATION, NICHE_EASING } from "../../lib/motion";

export function Location() {
  const { contact, sections } = siteConfig;
  const { location: sectionConfig } = sections;
  const niche = siteConfig.business.type;
  const flavor = getNicheFlavor(niche);
  const stagger = nicheStagger(niche);
  const mapScaleIn = nicheScaleIn(niche);

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${contact.address.street}, ${contact.address.district}, ${contact.address.cityStateZip}`
  )}`;

  return (
    <section id="location" className="bg-card px-6 py-28 transition-colors duration-300">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-2 lg:gap-20">

          {/* ── Left: info ──────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: NICHE_DURATION[flavor], ease: NICHE_EASING[flavor] }}
            className="space-y-10"
          >
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-accent-light">
                {sectionConfig.title}
              </p>
              <h2 className={
                siteConfig.business.type === "estetica"
                  ? "text-3xl font-normal tracking-wide text-card-foreground sm:text-4xl md:text-5xl"
                  : siteConfig.business.type === "nails"
                    ? "text-3xl font-black uppercase tracking-wide text-card-foreground sm:text-4xl md:text-5xl"
                    : "text-3xl font-black uppercase tracking-tighter text-card-foreground sm:text-4xl md:text-5xl"
              }>
                {sectionConfig.subtitle}
              </h2>
            </div>

            <div className="space-y-4">
              {/* Address card */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: stagger(0), duration: NICHE_DURATION[flavor], ease: NICHE_EASING[flavor] }}
                className="rounded-2xl border border-border bg-background p-6 transition-colors duration-300"
              >
                <div className="mb-4 flex items-center gap-2">
                  <MapPin size={15} className="text-accent-light" />
                  <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    {localeConfig.location.address}
                  </span>
                </div>
                <p className="mb-4 text-sm leading-relaxed text-foreground">
                  {contact.address.street}<br />
                  {contact.address.district}<br />
                  {contact.address.cityStateZip}
                </p>
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-accent-light transition-colors hover:text-foreground"
                >
                  <span>{localeConfig.location.openInMaps}</span>
                  <ExternalLink size={11} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </a>
              </motion.div>

              {/* Phone & Email */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <motion.a
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: stagger(1), duration: NICHE_DURATION[flavor], ease: NICHE_EASING[flavor] }}
                  href={`tel:${contact.phone}`}
                  className="group flex items-center gap-3 rounded-2xl border border-border bg-background p-5 transition-all duration-300 hover:border-accent/30"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-light/10 text-accent-light">
                    <Phone size={16} />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      {localeConfig.location.phone}
                    </p>
                    <p className="text-sm font-bold text-foreground">{contact.phone}</p>
                  </div>
                </motion.a>

                <motion.a
                  href={`mailto:${contact.email}`}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: stagger(2), duration: NICHE_DURATION[flavor], ease: NICHE_EASING[flavor] }}
                  className="group flex items-center gap-3 rounded-2xl border border-border bg-background p-5 transition-all duration-300 hover:border-accent/30"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-light/10 text-accent-light">
                    <Mail size={16} />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      {localeConfig.location.email}
                    </p>
                    <p className="truncate text-sm font-bold text-foreground">{contact.email}</p>
                  </div>
                </motion.a>
              </div>
            </div>
          </motion.div>

          {/* ── Right: Google Maps embed ─────────────────────────────── */}
          <motion.div
            {...mapScaleIn}
            className="relative"
          >
            <div className="overflow-hidden rounded-3xl border border-border shadow-elevated">
              <div className="relative aspect-[4/3] bg-muted">
                <iframe
                  title={localeConfig.location.mapAlt}
                  src={`https://www.google.com/maps?q=${encodeURIComponent(
                    `${contact.address.street}, ${contact.address.district}, ${contact.address.cityStateZip}`
                  )}&output=embed`}
                  className="h-full w-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                />
              </div>
              {/* Footer bar with business name + open-in-maps link */}
              <div className="flex items-center justify-between gap-4 bg-card px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-foreground">
                    {siteConfig.brand.name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {contact.address.street}, {contact.address.cityStateZip}
                  </p>
                </div>
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex shrink-0 items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-bold uppercase tracking-widest text-accent-light transition-all duration-300 hover:border-accent/40 hover:bg-accent-light/10"
                >
                  <ExternalLink size={11} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  <span>{localeConfig.location.openGoogleMaps}</span>
                </a>
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
