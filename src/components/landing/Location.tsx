import React from "react";
import { MapPin, Phone, Mail, ExternalLink } from "lucide-react";
import { motion } from "motion/react";
import { localeConfig } from "../../config/locale";
import { siteConfig } from "../../config/site";

export function Location() {
  const { contact, sections } = siteConfig;
  const { location: sectionConfig } = sections;

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${contact.address.street}, ${contact.address.district}, ${contact.address.cityStateZip}`
  )}`;

  return (
    <section id="location" className="bg-card px-6 py-28 transition-colors duration-300">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2 lg:gap-20">

          {/* ── Left: info ──────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-10"
          >
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-accent-light">
                {sectionConfig.title}
              </p>
              <h2 className={siteConfig.business.type === "estetica"
                ? "text-4xl font-normal tracking-wide text-card-foreground md:text-5xl"
                : "text-4xl font-black uppercase tracking-tighter text-card-foreground md:text-6xl lg:text-5xl xl:text-6xl"
              }>
                {sectionConfig.subtitle}
              </h2>
            </div>

            <div className="space-y-4">
              {/* Address card */}
              <div className="rounded-2xl border border-border bg-background p-6 transition-colors duration-300">
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
              </div>

              {/* Phone & Email */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <a
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
                </a>

                <a
                  href={`mailto:${contact.email}`}
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
                </a>
              </div>
            </div>
          </motion.div>

          {/* ── Right: map placeholder ──────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="relative"
          >
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group block overflow-hidden rounded-3xl border border-border shadow-elevated transition-all duration-300 hover:border-accent/30 hover:shadow-xl"
            >
              {/* Map placeholder with image */}
              <div className="relative aspect-[4/3] bg-muted">
                <img
                  src="https://images.unsplash.com/photo-1512690196236-724d90957dc3?auto=format&fit=crop&q=80&w=1000"
                  className="h-full w-full object-cover opacity-30 transition-opacity duration-500 group-hover:opacity-40"
                  alt={localeConfig.location.mapAlt}
                  referrerPolicy="no-referrer"
                />
                {/* Pin overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-light shadow-lg shadow-accent/30">
                    <MapPin size={28} className="text-zinc-950" fill="currentColor" />
                  </div>
                  <div className="rounded-2xl border border-border bg-card/90 px-6 py-4 text-center shadow-lg backdrop-blur-sm">
                    <p className="text-xs font-bold uppercase tracking-widest text-accent-light">
                      {siteConfig.brand.name}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {contact.address.street}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {contact.address.cityStateZip}
                    </p>
                  </div>
                  <span className="flex items-center gap-1.5 rounded-full bg-black/40 px-4 py-1.5 text-xs font-semibold text-white backdrop-blur-sm transition-all duration-300 group-hover:bg-accent-light group-hover:text-zinc-950">
                    <ExternalLink size={11} />
                    {localeConfig.location.openGoogleMaps}
                  </span>
                </div>
              </div>
            </a>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
