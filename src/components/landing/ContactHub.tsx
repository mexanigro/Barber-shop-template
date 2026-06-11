import React, { useState } from "react";
import {
  Send, CheckCircle, AlertCircle,
  Mail, Phone, MapPin, Clock, ExternalLink, MessageCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../../lib/utils";
import { localeConfig } from "../../config/locale";
import { orderedDayKeys, fmtRange } from "../../lib/hours-display";
import { siteConfig } from "../../config/site";
import type { BusinessHours as BHType } from "../../types";
import {
  Y_SM, VIEWPORT_ONCE,
  getNicheFlavor, nicheStagger, NICHE_DURATION, NICHE_EASING,
  EASE_OUT_STRONG, BUTTON_PRESS,
} from "../../lib/motion";
import { BookingFormMapHours3D } from "./booking-form-map-hours-3d";
import { resolveVariant } from "../../lib/section-variants";

/* ── 5-variant system (sections.contact.variant "v2".."v5") — lazy modules ── */
const ContactV2Module = React.lazy(() => import("./contact/contact-v2").then(m => ({ default: m.ContactV2 })));
const ContactV3Module = React.lazy(() => import("./contact/contact-v3").then(m => ({ default: m.ContactV3 })));
const ContactV4Module = React.lazy(() => import("./contact/contact-v4").then(m => ({ default: m.ContactV4 })));
const ContactV5Module = React.lazy(() => import("./contact/contact-v5").then(m => ({ default: m.ContactV5 })));
const CONTACT_VARIANT_MODULES = {
  v2: ContactV2Module,
  v3: ContactV3Module,
  v4: ContactV4Module,
  v5: ContactV5Module,
} as const;

/* ── Estética-specific variant modules (porcelain editorial family). Same
   flag values; the dispatcher swaps the map when business.type === "estetica". */
const CONTACT_VARIANT_MODULES_ESTETICA = {
  v2: React.lazy(() => import("./contact/estetica/contact-v2").then(m => ({ default: m.EsteticaContactV2 }))),
  v3: React.lazy(() => import("./contact/estetica/contact-v3").then(m => ({ default: m.EsteticaContactV3 }))),
  v4: React.lazy(() => import("./contact/estetica/contact-v4").then(m => ({ default: m.EsteticaContactV4 }))),
  v5: React.lazy(() => import("./contact/estetica/contact-v5").then(m => ({ default: m.EsteticaContactV5 }))),
} as const;

/* ── Helpers ──────────────────────────────────────────────────────────────── */

const JS_DAY_TO_KEY: Record<number, keyof BHType> = {
  0: "sunday", 1: "monday", 2: "tuesday", 3: "wednesday",
  4: "thursday", 5: "friday", 6: "saturday",
};

/** Address parts joined without leaving orphan commas when a part is empty. */
function joinAddress(...parts: Array<string | undefined>): string {
  return parts.filter((p) => p && p.trim()).join(", ");
}

const inputBaseClass =
  "w-full border border-border bg-muted/50 px-4 py-3.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 dark:bg-muted/30 lg:hover:border-accent/25 lg:hover:bg-muted/70";

const inputTransitionStyle = {
  transition: "border-color 0.2s cubic-bezier(0.23,1,0.32,1), box-shadow 0.2s cubic-bezier(0.23,1,0.32,1), background-color 0.3s ease",
} as const;

function getInputClass(niche: string) {
  return `${inputBaseClass} ${niche === "tattoo" ? "rounded-lg" : "rounded-xl"}`;
}

/* ── Component ────────────────────────────────────────────────────────────── */

export function ContactHub() {
  const { sections, contact, hours } = siteConfig;
  const { contact: sectionConfig } = sections;

  /* ── 5-variant system dispatcher ──
     Legacy values (undefined / unknown strings) resolve to "v1" and fall
     through to all existing logic untouched. */
  const variantCode = resolveVariant(sectionConfig?.variant);
  if (variantCode !== "v1") {
    const VariantModule = (siteConfig.business.type === "estetica"
      ? CONTACT_VARIANT_MODULES_ESTETICA
      : CONTACT_VARIANT_MODULES)[variantCode];
    return (
      <React.Suspense fallback={null}>
        <VariantModule />
      </React.Suspense>
    );
  }

  /* ── 3D Impact: booking variants ────────────────────────────────────
     Opt-in via `contact.bookingVariant`. The variant handles its own
     column rendering (form / map / hours) and slot resolution
     (`heroObjectSlot` defaults to `"accent"` and falls back to
     `"primary"`). Missing data hides the affected column without
     disabling the section — the variant still renders the form. */
  if (sectionConfig?.bookingVariant === "aura") {
    const AuraContactModule = React.lazy(() => import("./aura/aura-contact").then(m => ({ default: m.AuraContact })));
    return <React.Suspense fallback={null}><AuraContactModule /></React.Suspense>;
  }
  if (sectionConfig?.bookingVariant === "form-map-hours-3d") {
    return <BookingFormMapHours3D />;
  }

  const niche = siteConfig.business.type;
  const flavor = getNicheFlavor(niche);
  const stagger = nicheStagger(niche);

  const isTattoo = niche === "tattoo";
  const isNails = niche === "nails";
  const isEstetica = niche === "estetica";
  const isCafeteria = niche === "cafeteria";
  const isRemodelaciones = niche === "remodelaciones";

  const showForm = siteConfig.features.showInquiry;
  const showHours = siteConfig.features.showBusinessHours;
  const showMap = siteConfig.features.showLocation;

  // Don't render anything if all three are disabled
  if (!showForm && !showHours && !showMap) return null;

  const todayKey = JS_DAY_TO_KEY[new Date().getDay()];

  const addressLine = joinAddress(
    contact.address.street, contact.address.district, contact.address.cityStateZip,
  );
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressLine)}`;

  // Count active columns to decide grid layout
  const activeCols = [showForm, showHours, showMap].filter(Boolean).length;

  const headingClass = isCafeteria
    ? "font-serif text-3xl font-normal tracking-wide text-foreground sm:text-4xl"
    : isRemodelaciones
      ? "text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl"
      : isEstetica
        ? "text-3xl font-normal tracking-wide text-foreground sm:text-4xl"
        : isNails
          ? "text-3xl font-black uppercase tracking-wide text-foreground sm:text-4xl"
          : "text-3xl font-black uppercase tracking-tighter text-foreground sm:text-4xl";

  const cardRadius = isTattoo ? "rounded-xl" : "rounded-2xl";

  return (
    <section
      id="contact"
      className="flex flex-col justify-center bg-background px-5 py-8 transition-colors duration-300 sm:px-6 sm:py-24 lg:block"
    >
      <div className="mx-auto max-w-7xl">
        {/* ── Section header ──────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: Y_SM }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEWPORT_ONCE}
          transition={{ duration: NICHE_DURATION[flavor], ease: NICHE_EASING[flavor] }}
          className="mb-14"
        >
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-accent-light">
            {sectionConfig.title}
          </p>
          <h2 className={headingClass}>
            {sectionConfig.subtitle}
          </h2>
          {/* Divider — anchored to the visual start: grows from the right in RTL.
              Tailwind v4 has no logical bg-gradient direction, so we flip both
              the motion origin and the gradient direction together. */}
          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            whileInView={{ scaleX: 1, opacity: 1 }}
            viewport={VIEWPORT_ONCE}
            transition={{ duration: NICHE_DURATION[flavor] * 0.8, ease: NICHE_EASING[flavor], delay: 0.15 }}
            style={{ originX: localeConfig.dir === "rtl" ? 1 : 0 }}
            className={cn(
              "mt-4 h-px w-16",
              localeConfig.dir === "rtl"
                ? "bg-gradient-to-l from-accent-light to-transparent"
                : "bg-gradient-to-r from-accent-light to-transparent",
            )}
          />
        </motion.div>

        {/* ── Content grid ────────────────────────────────────────── */}
        <div
          className={cn(
            "grid grid-cols-1 gap-6",
            activeCols === 3 && "lg:grid-cols-[1fr_auto_1fr]",
            activeCols === 2 && "lg:grid-cols-2",
          )}
        >
          {/* ── Column: Contact form ──────────────────────────────── */}
          {showForm && <ContactForm flavor={flavor} niche={niche} cardRadius={cardRadius} stagger={stagger} />}

          {/* ── Column: Hours + contact details ───────────────────── */}
          {showHours && (
            <motion.div
              initial={{ opacity: 0, y: Y_SM }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={VIEWPORT_ONCE}
              transition={{ delay: 0.1, duration: NICHE_DURATION[flavor], ease: NICHE_EASING[flavor] }}
              className={cn(
                "flex flex-col border border-border bg-card p-6 transition-colors duration-300",
                cardRadius,
                activeCols === 3 && "lg:w-72 xl:w-80",
              )}
            >
              {/* Hours header */}
              <div className="mb-5 flex items-center gap-2">
                <Clock size={14} className="text-accent-light" />
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-accent-light">
                  {localeConfig.businessHours.eyebrow}
                </span>
              </div>

              {/* Day rows */}
              <ul className="flex-1 space-y-0 divide-y divide-border/60">
                {orderedDayKeys().map((dayKey, i) => {
                  const slot = hours[dayKey];
                  const isToday = dayKey === todayKey;
                  const isOpen = slot !== null;

                  return (
                    <motion.li
                      key={dayKey}
                      initial={{ opacity: 0, x: localeConfig.dir === "rtl" ? 8 : -8 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={VIEWPORT_ONCE}
                      transition={{ delay: stagger(i), duration: NICHE_DURATION[flavor], ease: NICHE_EASING[flavor] }}
                      className={cn(
                        "flex items-center justify-between py-2.5 text-sm transition-colors duration-200",
                        !isOpen && "opacity-40",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {isToday && (
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent-light" />
                        )}
                        <span className={cn(
                          "font-medium",
                          isToday ? "text-foreground" : "text-muted-foreground",
                        )}>
                          {localeConfig.businessHours.days[dayKey].label}
                        </span>
                        {isToday && (
                          <span className="rounded-full bg-accent-light/15 px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-widest text-accent-light">
                            {localeConfig.businessHours.today}
                          </span>
                        )}
                      </div>

                      {isOpen ? (
                        <span dir="ltr" className="font-semibold tabular-nums text-foreground">
                          {fmtRange(slot!)}
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50">
                          {localeConfig.businessHours.closed}
                        </span>
                      )}
                    </motion.li>
                  );
                })}
              </ul>

              {/* Quick contact links below schedule */}
              <div className="mt-5 space-y-2 border-t border-border/60 pt-5">
                {contact.phone && (
                  <a
                    href={`tel:${contact.phone}`}
                    className="group flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 [transition:color_0.2s_cubic-bezier(0.23,1,0.32,1)]"
                  >
                    <Phone size={14} className="shrink-0 text-accent-light" />
                    <span dir="ltr" className="truncate font-medium">{contact.phone}</span>
                  </a>
                )}
                {contact.email && (
                  <a
                    href={`mailto:${contact.email}`}
                    className="group flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 [transition:color_0.2s_cubic-bezier(0.23,1,0.32,1)]"
                  >
                    <Mail size={14} className="shrink-0 text-accent-light" />
                    <span className="truncate font-medium">{contact.email}</span>
                  </a>
                )}
                {contact.phone && (
                  <a
                    href={`https://wa.me/${contact.phone.replace(/[^0-9+]/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-3 text-sm text-muted-foreground hover:text-[#25D366] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 [transition:color_0.2s_cubic-bezier(0.23,1,0.32,1)]"
                  >
                    <MessageCircle size={14} className="shrink-0 text-[#25D366]" />
                    <span className="font-medium">WhatsApp</span>
                  </a>
                )}
              </div>
            </motion.div>
          )}

          {/* ── Column: Map + address ─────────────────────────────── */}
          {showMap && (
            <motion.div
              initial={{ opacity: 0, clipPath: "inset(100% 0 0 0)" }}
              whileInView={{ opacity: 1, clipPath: "inset(0 0 0 0)" }}
              viewport={VIEWPORT_ONCE}
              transition={{ delay: 0.2, duration: NICHE_DURATION[flavor] * 1.3, ease: NICHE_EASING[flavor] }}
              className={cn(
                "flex flex-col overflow-hidden border border-border bg-card transition-colors duration-300",
                cardRadius,
              )}
            >
              {/* Map iframe */}
              <div className="relative aspect-[16/10] bg-muted lg:flex-1 lg:aspect-auto lg:min-h-[280px]">
                <iframe
                  title={localeConfig.location.mapAlt}
                  src={`https://www.google.com/maps?q=${encodeURIComponent(addressLine)}&output=embed&hl=${localeConfig.lang}`}
                  className="h-full w-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                />
              </div>

              {/* Address footer */}
              <div className="p-5">
                <div className="mb-3 flex items-center gap-2">
                  <MapPin size={14} className="shrink-0 text-accent-light" />
                  <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    {localeConfig.location.address}
                  </span>
                </div>
                <p className="mb-3 line-clamp-2 text-sm leading-relaxed text-foreground">
                  {addressLine}
                </p>
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-accent-light transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                >
                  <span>{localeConfig.location.openInMaps}</span>
                  <ExternalLink size={11} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" />
                </a>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ── Contact form sub-component ───────────────────────────────────────────── */

function ContactForm({
  flavor,
  niche,
  cardRadius,
  stagger,
}: {
  flavor: "bold" | "sharp" | "soft" | "clinical";
  niche: string;
  cardRadius: string;
  stagger: (i: number) => number;
}) {
  const [formData, setFormData] = useState({ name: "", email: "", subject: "", message: "" });
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const inputClass = getInputClass(niche);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("submitting");
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (response.ok) {
        setStatus("success");
        setFormData({ name: "", email: "", subject: "", message: "" });
        setTimeout(() => setStatus("idle"), 5000);
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: Y_SM }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={VIEWPORT_ONCE}
      transition={{ duration: NICHE_DURATION[flavor], ease: NICHE_EASING[flavor] }}
    >
      <form
        onSubmit={handleSubmit}
        className={cn(
          "flex h-full flex-col border border-border bg-card p-6 transition-colors duration-300 sm:p-7",
          cardRadius,
        )}
      >
        <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
          {siteConfig.sections.contact.description}
        </p>

        <div className="flex-1 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="hub-name" className="sr-only">{localeConfig.inquiry.placeholderName}</label>
              <input
                id="hub-name"
                required
                type="text"
                placeholder={localeConfig.inquiry.placeholderName}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={inputClass}
                style={inputTransitionStyle}
              />
            </div>
            <div>
              <label htmlFor="hub-email" className="sr-only">{localeConfig.inquiry.placeholderEmail}</label>
              <input
                id="hub-email"
                required
                type="email"
                placeholder={localeConfig.inquiry.placeholderEmail}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={inputClass}
                style={inputTransitionStyle}
              />
            </div>
          </div>
          <div>
            <label htmlFor="hub-subject" className="sr-only">{localeConfig.inquiry.placeholderSubject}</label>
            <input
              id="hub-subject"
              type="text"
              placeholder={localeConfig.inquiry.placeholderSubject}
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              className={inputClass}
              style={inputTransitionStyle}
            />
          </div>
          <div>
            <label htmlFor="hub-message" className="sr-only">{localeConfig.inquiry.placeholderMessage}</label>
            <textarea
              id="hub-message"
              required
              rows={4}
              placeholder={localeConfig.inquiry.placeholderMessage}
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              className={cn(inputClass, "resize-none")}
              style={inputTransitionStyle}
            />
          </div>
        </div>

        <motion.button
          disabled={status === "submitting"}
          type="submit"
          whileHover={status !== "submitting" ? { y: -2 } : undefined}
          whileTap={status !== "submitting" ? { scale: 0.97 } : undefined}
          transition={{ duration: 0.16, ease: EASE_OUT_STRONG }}
          className={cn(
            "group mt-4 flex w-full items-center justify-center gap-2.5 bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-md shadow-accent/15 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 [transition:background-color_0.3s_cubic-bezier(0.23,1,0.32,1),box-shadow_0.3s_cubic-bezier(0.23,1,0.32,1),transform_0.16s_cubic-bezier(0.23,1,0.32,1)]",
            niche === "tattoo" ? "rounded-lg" : "rounded-xl",
          )}
        >
          {status === "submitting" ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
          ) : (
            <>
              <Send size={15} className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" />
              <span>{localeConfig.inquiry.send}</span>
            </>
          )}
        </motion.button>

        <div aria-live="polite" aria-atomic="true" className="mt-3">
          <AnimatePresence>
            {status === "success" && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="status-success flex items-center gap-2.5 rounded-xl p-3 text-sm font-semibold"
              >
                <CheckCircle size={15} />
                <span>{localeConfig.inquiry.success}</span>
              </motion.div>
            )}
            {status === "error" && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="status-error flex items-center justify-between rounded-xl p-3 text-sm font-semibold"
              >
                <div className="flex items-center gap-2.5">
                  <AlertCircle size={15} />
                  <span>{localeConfig.inquiry.error}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setStatus("idle")}
                  className="text-xs font-black uppercase tracking-widest opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                >
                  ↻
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </form>
    </motion.div>
  );
}
