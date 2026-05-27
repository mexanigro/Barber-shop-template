import React, { useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  ExternalLink,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Send,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { siteConfig } from "../../config/site";
import { localeConfig } from "../../config/locale";
import { interpolate } from "../../lib/interpolate";
import { cn } from "../../lib/utils";
import type { BusinessHours as BHType } from "../../types";
import { AmbientParticles } from "../3d-impact/ambient-particles";
import { CTAButton3D } from "../3d-impact/cta-button-3d";
import { HeroObject3D } from "../3d-impact/hero-object-3d";
import {
  DUR_ENTER,
  NICHE_DURATION,
  NICHE_EASING,
  VIEWPORT_ONCE,
  Y_LG,
  Y_MD,
  Y_SM,
  getNicheFlavor,
  nicheStagger,
} from "../../lib/motion";

/* ── Constants ────────────────────────────────────────────────────────────── */

const DEFAULT_FORM_FIELDS = ["name", "email", "service", "date", "message"] as const;

type FormField = "name" | "email" | "phone" | "service" | "date" | "message";

const DAY_KEYS: (keyof BHType)[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const JS_DAY_TO_KEY: Record<number, keyof BHType> = {
  0: "sunday",
  1: "monday",
  2: "tuesday",
  3: "wednesday",
  4: "thursday",
  5: "friday",
  6: "saturday",
};

function fmtTime(time: string): string {
  const [hStr, mStr] = time.split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return time;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12} ${period}` : `${h12}:${mStr} ${period}`;
}

const inputClass =
  "w-full rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-foreground outline-none transition-all duration-300 placeholder:text-muted-foreground focus:border-accent focus:ring-2 focus:ring-accent/20 dark:bg-muted/30";

let warnedMissingMapData = false;
let warnedMissingHoursData = false;

/* ── Component ────────────────────────────────────────────────────────────── */

/**
 * `<BookingFormMapHours3D>` — opt-in Booking/Contact variant
 * (`bookingVariant: "form-map-hours-3d"`).
 *
 * Aurea/Onyx-blended layout. Centred header on top, then a 60/40 grid
 * at `lg+`:
 *
 *   • Form column (left, 60%) — booking-flavoured contact form whose
 *     visible fields are driven by `formFields` (defaults to
 *     name / email / service / date / message — phone is opt-in).
 *   • Stack column (right, 40%) — map widget on top, hours card
 *     below, both rendered as bordered cards.
 *
 * A floating `<HeroObject3D>` cameo peeks from the top-end of the
 * section at `lg+` only (mirrors the services-treatment-card-grid
 * cameo position so the two variants read as a pair).
 *
 * Below `lg` the layout collapses to a single column (form, map,
 * hours) and the cameo hides — the bento-style cameo positioning
 * reads poorly at narrow widths.
 *
 * Missing data falls back gracefully:
 *   • No `contact.address` → map column hides, form spans full width.
 *   • Empty `hours` → hours card hides, only the map stays in the stack.
 *   • Both absent → the variant collapses to a single full-width form.
 *
 * Submits to the same `/api/contact` endpoint the legacy `ContactHub`
 * uses, so the existing Resend + inbox plumbing is preserved without
 * a server-side change.
 */
export function BookingFormMapHours3D() {
  const { sections, contact, hours, brand, heroObjects, services } = siteConfig;
  const sectionConfig = sections.contact;
  const prefersReduced = useReducedMotion();

  if (!sectionConfig) return null;

  const niche = siteConfig.business.type;
  const flavor = getNicheFlavor(niche);
  const stagger = nicheStagger(niche);

  // Section text — same interpolation contract every 3D variant uses.
  const brandVars = { brand: brand?.name ?? "" };
  const eyebrow = sectionConfig.title
    ? interpolate(sectionConfig.title, brandVars)
    : "";
  const headline = interpolate(sectionConfig.subtitle ?? "", brandVars);
  const description = sectionConfig.description
    ? interpolate(sectionConfig.description, brandVars)
    : "";

  // Column toggles. Hide each column when its underlying data is missing
  // so the variant never ships an empty card. Warn once in dev so the
  // misconfiguration surfaces during local development.
  const hasAddress = Boolean(
    contact?.address?.street ||
      contact?.address?.district ||
      contact?.address?.cityStateZip,
  );
  const hasHoursData = useMemo(
    () => Boolean(hours) && DAY_KEYS.some((d) => hours?.[d] !== undefined),
    [hours],
  );

  const wantsMap = sectionConfig.showMap !== false;
  const wantsHours = sectionConfig.showHours !== false;
  const showMap = wantsMap && hasAddress;
  const showHours = wantsHours && hasHoursData;

  if (import.meta.env.DEV) {
    if (wantsMap && !hasAddress && !warnedMissingMapData) {
      warnedMissingMapData = true;
      // eslint-disable-next-line no-console
      console.warn(
        `[BookingFormMapHours3D] showMap is true but contact.address is empty — map column will be hidden.`,
      );
    }
    if (wantsHours && !hasHoursData && !warnedMissingHoursData) {
      warnedMissingHoursData = true;
      // eslint-disable-next-line no-console
      console.warn(
        `[BookingFormMapHours3D] showHours is true but hours is empty — hours card will be hidden.`,
      );
    }
  }

  // Cameo slot — defaults to "accent" to match the Aurea services /
  // gallery variants in tenants that ship all three.
  const requestedSlot = sectionConfig.heroObjectSlot ?? "accent";
  const resolvedSlot =
    heroObjects?.[requestedSlot]?.src
      ? requestedSlot
      : heroObjects?.primary?.src
        ? "primary"
        : null;
  const showCameo = sectionConfig.show3DObject !== false && resolvedSlot !== null;
  const particles = resolvedSlot ? heroObjects?.[resolvedSlot]?.particles : undefined;

  // Field set. The schema's `formFields` is preserved when provided
  // (caller controls the order); otherwise the default booking
  // inquiry set is rendered.
  const fieldList: FormField[] = (sectionConfig.formFields && sectionConfig.formFields.length > 0
    ? sectionConfig.formFields
    : (DEFAULT_FORM_FIELDS as readonly FormField[])) as FormField[];

  // Stack collapses to a single column when only one of map/hours
  // renders — keeps the 60/40 split visually balanced.
  const stackHasContent = showMap || showHours;

  return (
    <section
      id="contact"
      className="relative isolate overflow-hidden bg-background px-6 py-24 transition-colors duration-300 md:px-10 md:py-28 lg:py-32"
    >
      {/* Warm bloom keyed to the accent — same treatment as the Aurea
          services / gallery variants so the three sections read as a
          coherent set when shipped together. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_8%,var(--brand-accent)/0.10,transparent_55%)]"
      />

      <div className="relative mx-auto w-full max-w-7xl">
        {/* ── Floating 3D cameo — top-end on lg+. `end-0` logical
            property keeps the bento contrast under RTL. ─────────── */}
        {showCameo && (
          <div
            aria-hidden
            className="pointer-events-none absolute -top-10 end-0 hidden lg:block xl:-end-4"
          >
            {particles && particles !== "none" && (
              <div className="pointer-events-none absolute inset-0 -z-10">
                <AmbientParticles type={particles} density="medium" />
              </div>
            )}
            <HeroObject3D
              slotName={resolvedSlot ?? "accent"}
              size="md"
              alt=""
              fallback={null}
            />
          </div>
        )}

        {/* ── Section header — centred, Aurea style ──────────────── */}
        <header className="mx-auto mb-14 max-w-3xl text-center lg:mb-20">
          {eyebrow && (
            <motion.p
              initial={prefersReduced ? false : { opacity: 0, y: Y_SM }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={VIEWPORT_ONCE}
              transition={{ duration: DUR_ENTER }}
              className="mb-4 text-[11px] font-semibold uppercase tracking-[0.32em] text-accent"
            >
              {eyebrow}
            </motion.p>
          )}
          {headline && (
            <motion.h2
              initial={prefersReduced ? false : { opacity: 0, y: Y_MD }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={VIEWPORT_ONCE}
              transition={{ duration: NICHE_DURATION[flavor], ease: NICHE_EASING[flavor] }}
              className="text-[clamp(2rem,4.2vw,3.5rem)] font-black leading-[1.05] tracking-tight text-foreground"
            >
              {headline}
            </motion.h2>
          )}
          {description && (
            <motion.p
              initial={prefersReduced ? false : { opacity: 0, y: Y_SM }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={VIEWPORT_ONCE}
              transition={{ duration: DUR_ENTER, delay: 0.1 }}
              className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg"
            >
              {description}
            </motion.p>
          )}
        </header>

        {/* ── Form (60%) + stack (40%) ───────────────────────────── */}
        <div
          className={cn(
            "grid gap-8 lg:gap-10",
            stackHasContent
              ? "lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]"
              : "",
          )}
        >
          {/* ── Form column ─────────────────────────────────────── */}
          <BookingForm
            fields={fieldList}
            services={services}
            ctaLabel={sectionConfig.ctaSubmitLabel}
            flavor={flavor}
            stagger={stagger}
            prefersReduced={prefersReduced ?? false}
          />

          {/* ── Map + Hours stack ────────────────────────────────── */}
          {stackHasContent && (
            <div className="flex min-w-0 flex-col gap-6">
              {showMap && (
                <MapCard
                  street={contact.address.street}
                  district={contact.address.district}
                  cityStateZip={contact.address.cityStateZip}
                  flavor={flavor}
                  prefersReduced={prefersReduced ?? false}
                />
              )}
              {showHours && (
                <HoursCard
                  hours={hours}
                  phone={contact.phone}
                  email={contact.email}
                  flavor={flavor}
                  stagger={stagger}
                  prefersReduced={prefersReduced ?? false}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ── Form sub-component ───────────────────────────────────────────────────── */

type FormState = {
  name: string;
  email: string;
  phone: string;
  service: string;
  date: string;
  message: string;
};

type FormStatus = "idle" | "submitting" | "success" | "error";

function BookingForm({
  fields,
  services,
  ctaLabel,
  flavor,
  stagger,
  prefersReduced,
}: {
  fields: FormField[];
  services: typeof siteConfig.services;
  ctaLabel: string | undefined;
  flavor: "bold" | "sharp" | "soft" | "clinical";
  stagger: (i: number) => number;
  prefersReduced: boolean;
}) {
  const [formData, setFormData] = useState<FormState>({
    name: "",
    email: "",
    phone: "",
    service: "",
    date: "",
    message: "",
  });
  const [status, setStatus] = useState<FormStatus>("idle");

  const submitLabel = ctaLabel ?? localeConfig.inquiry.send;

  // Today's date for the date input's `min` — block past dates without
  // forcing a future timezone library.
  const todayIso = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("submitting");

    // Build a subject the inbox can scan at a glance — the legacy
    // /api/contact only stores name/email/subject/message, so we
    // fold service+date+phone into the subject + message body
    // without changing the server contract.
    const subjectParts: string[] = [];
    if (formData.service) subjectParts.push(formData.service);
    if (formData.date) subjectParts.push(formData.date);
    const subject = subjectParts.length > 0
      ? subjectParts.join(" · ")
      : "Booking inquiry";

    const messageParts: string[] = [];
    if (formData.message) messageParts.push(formData.message);
    if (formData.phone) messageParts.push(`Phone: ${formData.phone}`);
    if (formData.service) messageParts.push(`Service: ${formData.service}`);
    if (formData.date) messageParts.push(`Preferred date: ${formData.date}`);
    const message = messageParts.join("\n").trim();

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          subject,
          message,
        }),
      });
      if (response.ok) {
        setStatus("success");
        setFormData({
          name: "",
          email: "",
          phone: "",
          service: "",
          date: "",
          message: "",
        });
        setTimeout(() => setStatus("idle"), 5000);
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={prefersReduced ? false : { opacity: 0, y: Y_MD }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={VIEWPORT_ONCE}
      transition={{ duration: NICHE_DURATION[flavor], ease: NICHE_EASING[flavor] }}
      className="flex h-full flex-col gap-4 rounded-3xl border border-border/60 bg-card p-6 shadow-sm sm:p-8 lg:p-9"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {fields.includes("name") && (
          <FieldWrapper index={fields.indexOf("name")} stagger={stagger} prefersReduced={prefersReduced}>
            <label htmlFor="bk-name" className="sr-only">
              {localeConfig.inquiry.placeholderName}
            </label>
            <input
              id="bk-name"
              required
              type="text"
              placeholder={localeConfig.inquiry.placeholderName}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={inputClass}
            />
          </FieldWrapper>
        )}

        {fields.includes("email") && (
          <FieldWrapper index={fields.indexOf("email")} stagger={stagger} prefersReduced={prefersReduced}>
            <label htmlFor="bk-email" className="sr-only">
              {localeConfig.inquiry.placeholderEmail}
            </label>
            <input
              id="bk-email"
              required
              type="email"
              placeholder={localeConfig.inquiry.placeholderEmail}
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className={inputClass}
            />
          </FieldWrapper>
        )}

        {fields.includes("phone") && (
          <FieldWrapper index={fields.indexOf("phone")} stagger={stagger} prefersReduced={prefersReduced}>
            <label htmlFor="bk-phone" className="sr-only">
              {localeConfig.booking.placeholderPhone}
            </label>
            <input
              id="bk-phone"
              type="tel"
              placeholder={localeConfig.booking.placeholderPhone}
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className={inputClass}
            />
          </FieldWrapper>
        )}

        {fields.includes("service") && services.length > 0 && (
          <FieldWrapper index={fields.indexOf("service")} stagger={stagger} prefersReduced={prefersReduced}>
            <label htmlFor="bk-service" className="sr-only">
              {localeConfig.booking.chooseService}
            </label>
            <select
              id="bk-service"
              value={formData.service}
              onChange={(e) => setFormData({ ...formData, service: e.target.value })}
              className={cn(inputClass, "appearance-none bg-muted/40")}
            >
              <option value="">{localeConfig.booking.chooseService}</option>
              {services.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </FieldWrapper>
        )}

        {fields.includes("date") && (
          <FieldWrapper index={fields.indexOf("date")} stagger={stagger} prefersReduced={prefersReduced}>
            <label htmlFor="bk-date" className="sr-only">
              {localeConfig.booking.chooseDate}
            </label>
            <input
              id="bk-date"
              type="date"
              min={todayIso}
              placeholder={localeConfig.booking.chooseDate}
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className={inputClass}
            />
          </FieldWrapper>
        )}
      </div>

      {fields.includes("message") && (
        <FieldWrapper index={fields.indexOf("message")} stagger={stagger} prefersReduced={prefersReduced}>
          <label htmlFor="bk-message" className="sr-only">
            {localeConfig.inquiry.placeholderMessage}
          </label>
          <textarea
            id="bk-message"
            required
            rows={5}
            placeholder={localeConfig.inquiry.placeholderMessage}
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            className={cn(inputClass, "resize-none")}
          />
        </FieldWrapper>
      )}

      <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CTAButton3D
          variant="primary"
          type="submit"
          disabled={status === "submitting"}
          aria-busy={status === "submitting"}
          className="w-full sm:w-auto"
        >
          {status === "submitting" ? (
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          ) : (
            <>
              <Send size={15} aria-hidden />
              <span>{submitLabel}</span>
            </>
          )}
        </CTAButton3D>

        <div aria-live="polite" aria-atomic="true" className="min-h-[2.5rem] sm:min-w-[14rem]">
          <AnimatePresence>
            {status === "success" && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="status-success flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold"
              >
                <CheckCircle size={15} aria-hidden />
                <span>{localeConfig.inquiry.success}</span>
              </motion.div>
            )}
            {status === "error" && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="status-error flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm font-semibold"
              >
                <span className="flex items-center gap-2">
                  <AlertCircle size={15} aria-hidden />
                  <span>{localeConfig.inquiry.error}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setStatus("idle")}
                  className="text-xs font-black uppercase tracking-widest opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                  aria-label="Reset"
                >
                  ↻
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.form>
  );
}

function FieldWrapper({
  index,
  stagger,
  prefersReduced,
  children,
}: {
  index: number;
  stagger: (i: number) => number;
  prefersReduced: boolean;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={prefersReduced ? false : { opacity: 0, y: Y_SM }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={VIEWPORT_ONCE}
      transition={{ delay: stagger(Math.max(index, 0)), duration: DUR_ENTER }}
    >
      {children}
    </motion.div>
  );
}

/* ── Map sub-component ────────────────────────────────────────────────────── */

function MapCard({
  street,
  district,
  cityStateZip,
  flavor,
  prefersReduced,
}: {
  street: string;
  district: string;
  cityStateZip: string;
  flavor: "bold" | "sharp" | "soft" | "clinical";
  prefersReduced: boolean;
}) {
  const fullAddress = [street, district, cityStateZip].filter(Boolean).join(", ");
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`;
  const embedSrc = `https://www.google.com/maps?q=${encodeURIComponent(fullAddress)}&output=embed`;

  return (
    <motion.div
      initial={prefersReduced ? false : { opacity: 0, clipPath: "inset(100% 0 0 0)" }}
      whileInView={{ opacity: 1, clipPath: "inset(0 0 0 0)" }}
      viewport={VIEWPORT_ONCE}
      transition={{ delay: 0.15, duration: NICHE_DURATION[flavor] * 1.2, ease: NICHE_EASING[flavor] }}
      className="overflow-hidden rounded-3xl border border-border/60 bg-card shadow-sm"
    >
      <div className="relative aspect-[16/10] bg-muted">
        <iframe
          title={localeConfig.location.mapAlt}
          src={embedSrc}
          className="absolute inset-0 h-full w-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      </div>
      <div className="space-y-3 p-5">
        <div className="flex items-center gap-2">
          <MapPin size={14} className="shrink-0 text-accent" aria-hidden />
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            {localeConfig.location.address}
          </span>
        </div>
        <p className="text-sm leading-relaxed text-foreground">{fullAddress}</p>
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-accent transition-colors hover:text-accent-light focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
        >
          <span>{localeConfig.location.openInMaps}</span>
          <ExternalLink
            size={11}
            className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 rtl:rotate-180"
            aria-hidden
          />
        </a>
      </div>
    </motion.div>
  );
}

/* ── Hours sub-component ──────────────────────────────────────────────────── */

function HoursCard({
  hours,
  phone,
  email,
  flavor,
  stagger,
  prefersReduced,
}: {
  hours: BHType;
  phone: string;
  email: string;
  flavor: "bold" | "sharp" | "soft" | "clinical";
  stagger: (i: number) => number;
  prefersReduced: boolean;
}) {
  const todayKey = JS_DAY_TO_KEY[new Date().getDay()];

  return (
    <motion.div
      initial={prefersReduced ? false : { opacity: 0, y: Y_LG }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={VIEWPORT_ONCE}
      transition={{ delay: 0.2, duration: NICHE_DURATION[flavor], ease: NICHE_EASING[flavor] }}
      className="flex flex-col rounded-3xl border border-border/60 bg-card p-6 shadow-sm sm:p-7"
    >
      <div className="mb-5 flex items-center gap-2">
        <Clock size={14} className="text-accent" aria-hidden />
        <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">
          {localeConfig.businessHours.eyebrow}
        </span>
      </div>

      <ul className="flex-1 divide-y divide-border/60">
        {DAY_KEYS.map((dayKey, i) => {
          const slot = hours[dayKey];
          const isToday = dayKey === todayKey;
          const isOpen = slot !== null;

          return (
            <motion.li
              key={dayKey}
              initial={prefersReduced ? false : { opacity: 0, x: -8 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={VIEWPORT_ONCE}
              transition={{ delay: stagger(i), duration: DUR_ENTER }}
              className={cn(
                "flex items-center justify-between py-2.5 text-sm transition-colors duration-200",
                !isOpen && "opacity-40",
              )}
            >
              <div className="flex items-center gap-2">
                {isToday && (
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
                )}
                <span
                  className={cn(
                    "font-medium",
                    isToday ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {localeConfig.businessHours.days[dayKey].label}
                </span>
                {isToday && (
                  <span className="rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-accent">
                    {localeConfig.businessHours.today}
                  </span>
                )}
              </div>

              {isOpen ? (
                <span className="font-semibold tabular-nums text-foreground">
                  {fmtTime(slot!.start)} – {fmtTime(slot!.end)}
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

      {(phone || email) && (
        <div className="mt-5 space-y-2 border-t border-border/60 pt-5">
          {phone && (
            <a
              href={`tel:${phone}`}
              className="group flex items-center gap-3 text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
            >
              <Phone size={14} className="shrink-0 text-accent" aria-hidden />
              <span className="font-medium">{phone}</span>
            </a>
          )}
          {email && (
            <a
              href={`mailto:${email}`}
              className="group flex items-center gap-3 text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
            >
              <Mail size={14} className="shrink-0 text-accent" aria-hidden />
              <span className="font-medium">{email}</span>
            </a>
          )}
          {phone && (
            <a
              href={`https://wa.me/${phone.replace(/[^0-9+]/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 text-sm text-muted-foreground transition-colors duration-200 hover:text-[#25D366] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
            >
              <MessageCircle size={14} className="shrink-0 text-[#25D366]" aria-hidden />
              <span className="font-medium">WhatsApp</span>
            </a>
          )}
        </div>
      )}
    </motion.div>
  );
}
