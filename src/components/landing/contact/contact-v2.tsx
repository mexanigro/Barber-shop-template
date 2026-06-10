import { useRef, useState } from "react";
import {
  Send, CheckCircle, AlertCircle,
  Mail, Phone, MapPin, Clock, ExternalLink,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../../../lib/utils";
import { localeConfig } from "../../../config/locale";
import { siteConfig } from "../../../config/site";
import { getOverlayOpacity } from "../../../lib/section-variants";
import type { BusinessHours as BHType } from "../../../types";
import {
  Y_SM, VIEWPORT_ONCE,
  getNicheFlavor, nicheStagger, NICHE_DURATION, NICHE_EASING,
  EASE_OUT_STRONG,
} from "../../../lib/motion";

/* ── Shared helpers (mirrors ContactHub v1) ──────────────────────────────── */

const DAY_KEYS: (keyof BHType)[] = [
  "monday", "tuesday", "wednesday", "thursday",
  "friday", "saturday", "sunday",
];

const JS_DAY_TO_KEY: Record<number, keyof BHType> = {
  0: "sunday", 1: "monday", 2: "tuesday", 3: "wednesday",
  4: "thursday", 5: "friday", 6: "saturday",
};

function fmtTime(time: string): string {
  const [hStr, mStr] = time.split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12} ${period}` : `${h12}:${mStr} ${period}`;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** UI microcopy local to this variant — business copy stays in config/locales. */
const STRINGS: Record<"en" | "he" | "ru" | "ar", {
  required: string;
  invalidEmail: string;
  retry: string;
}> = {
  en: { required: "This field is required", invalidEmail: "Enter a valid email address", retry: "Try again" },
  he: { required: "שדה חובה", invalidEmail: "יש להזין כתובת אימייל תקינה", retry: "נסו שוב" },
  ru: { required: "Обязательное поле", invalidEmail: "Введите корректный адрес почты", retry: "Повторить" },
  ar: { required: "هذا الحقل مطلوب", invalidEmail: "يرجى إدخال بريد إلكتروني صحيح", retry: "حاول مرة أخرى" },
};

type FieldKey = "name" | "email" | "message";
type FormValues = { name: string; email: string; subject: string; message: string };

/**
 * ContactV2 — split map + form (`sections.contact.variant: "v2"`).
 *
 * 50/50 at lg+: full-bleed map panel (photographic fallback when
 * showLocation is off) beside the form panel; business hours render as a
 * compact row strip beneath the form. Stacked on mobile, form first.
 */
export function ContactV2() {
  const { sections, contact, hours } = siteConfig;
  const sectionConfig = sections.contact;

  const niche = siteConfig.business.type;
  const flavor = getNicheFlavor(niche);
  const stagger = nicheStagger(niche);

  const showForm = siteConfig.features.showInquiry;
  const showHours = siteConfig.features.showBusinessHours;
  const showMap = siteConfig.features.showLocation;

  if (!showForm && !showHours && !showMap) return null;

  const todayKey = JS_DAY_TO_KEY[new Date().getDay()];

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${contact.address.street}, ${contact.address.district}, ${contact.address.cityStateZip}`,
  )}`;

  return (
    <section id="contact" className="bg-background transition-colors duration-300">
      <div className="grid grid-cols-1 lg:min-h-[640px] lg:grid-cols-2">
        {/* ── Form panel — first in DOM (mobile first), end side at lg ── */}
        <div className="order-1 flex flex-col justify-center px-5 py-14 sm:px-10 sm:py-20 lg:order-2 lg:px-14 lg:py-24">
          <motion.div
            initial={{ opacity: 0, y: Y_SM }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT_ONCE}
            transition={{ duration: NICHE_DURATION[flavor], ease: NICHE_EASING[flavor] }}
            className="mb-8"
          >
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-accent-light">
              {sectionConfig.title}
            </p>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {sectionConfig.subtitle}
            </h2>
            <p className="mt-4 max-w-prose text-sm leading-relaxed text-muted-foreground">
              {sectionConfig.description}
            </p>
          </motion.div>

          {showForm ? (
            <V2Form />
          ) : (
            /* Form disabled — surface direct channels instead */
            <motion.div
              initial={{ opacity: 0, y: Y_SM }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={VIEWPORT_ONCE}
              transition={{ duration: NICHE_DURATION[flavor], ease: NICHE_EASING[flavor] }}
              className="space-y-3"
            >
              <a
                href={`tel:${contact.phone}`}
                className="flex min-h-[44px] items-center gap-3 text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
              >
                <Phone size={15} className="shrink-0 text-accent-light" aria-hidden />
                <span dir="ltr" className="font-medium">{contact.phone}</span>
              </a>
              <a
                href={`mailto:${contact.email}`}
                className="flex min-h-[44px] items-center gap-3 text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
              >
                <Mail size={15} className="shrink-0 text-accent-light" aria-hidden />
                <span className="font-medium">{contact.email}</span>
              </a>
            </motion.div>
          )}

          {/* ── Compact hours strip beneath the form ── */}
          {showHours && (
            <motion.div
              initial={{ opacity: 0, y: Y_SM }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={VIEWPORT_ONCE}
              transition={{ delay: 0.1, duration: NICHE_DURATION[flavor], ease: NICHE_EASING[flavor] }}
              className="mt-10 border-t border-border pt-7"
            >
              <div className="mb-4 flex items-center gap-2">
                <Clock size={13} className="text-accent-light" aria-hidden />
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent-light">
                  {localeConfig.businessHours.eyebrow}
                </span>
              </div>
              <ul className="grid grid-cols-1 gap-x-8 gap-y-1.5 sm:grid-cols-2">
                {DAY_KEYS.map((dayKey, i) => {
                  const slot = hours[dayKey];
                  const isToday = dayKey === todayKey;
                  return (
                    <motion.li
                      key={dayKey}
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={VIEWPORT_ONCE}
                      transition={{ delay: stagger(i), duration: NICHE_DURATION[flavor], ease: NICHE_EASING[flavor] }}
                      className={cn(
                        "flex items-baseline justify-between gap-4 text-[13px]",
                        !slot && "opacity-45",
                      )}
                    >
                      <span className={cn(
                        "flex items-center gap-1.5 font-medium",
                        isToday ? "text-foreground" : "text-muted-foreground",
                      )}>
                        {isToday && <span className="h-1 w-1 shrink-0 rounded-full bg-accent-light" aria-hidden />}
                        {localeConfig.businessHours.days[dayKey].label}
                      </span>
                      {slot ? (
                        <span dir="ltr" className="font-semibold tabular-nums text-foreground">
                          {fmtTime(slot.start)} – {fmtTime(slot.end)}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
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

        {/* ── Map panel — full-bleed (photo fallback when no map) ── */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={VIEWPORT_ONCE}
          transition={{ duration: NICHE_DURATION[flavor] * 1.1, ease: NICHE_EASING[flavor] }}
          className="relative order-2 min-h-[340px] lg:order-1 lg:min-h-full"
        >
          {showMap ? (
            <>
              <iframe
                title={localeConfig.location.mapAlt}
                src={`https://www.google.com/maps?q=${encodeURIComponent(
                  `${contact.address.street}, ${contact.address.district}, ${contact.address.cityStateZip}`,
                )}&output=embed`}
                className="absolute inset-0 h-full w-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
              {/* Address card floating over the map */}
              <motion.div
                initial={{ opacity: 0, y: Y_SM }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={VIEWPORT_ONCE}
                transition={{ delay: 0.15, duration: NICHE_DURATION[flavor], ease: EASE_OUT_STRONG }}
                className="absolute inset-x-4 bottom-4 rounded-xl border border-border bg-card/95 p-4 shadow-elevated backdrop-blur-sm sm:inset-x-6 sm:bottom-6 sm:max-w-sm"
              >
                <div className="mb-1.5 flex items-center gap-2">
                  <MapPin size={13} className="shrink-0 text-accent-light" aria-hidden />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    {localeConfig.location.address}
                  </span>
                </div>
                <p className="mb-2 text-sm leading-relaxed text-foreground">
                  {contact.address.street}, {contact.address.district},
                  {" "}{contact.address.cityStateZip}
                </p>
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex min-h-[28px] items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-accent-light transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                >
                  <span>{localeConfig.location.openInMaps}</span>
                  <ExternalLink size={11} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" aria-hidden />
                </a>
              </motion.div>
            </>
          ) : (
            /* Photographic fallback when the map is disabled (full-bleed, no radius) */
            <div className="absolute inset-0 overflow-hidden" aria-hidden>
              <img
                src={siteConfig.hero.backgroundImage}
                alt=""
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
                draggable={false}
              />
              <div
                className="absolute inset-0 bg-black"
                style={{ opacity: getOverlayOpacity(0.5) }}
              />
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
}

/* ── Form (same endpoint/payload/UX semantics as ContactHub v1) ──────────── */

function V2Form() {
  const niche = siteConfig.business.type;
  const flavor = getNicheFlavor(niche);
  const S = STRINGS[localeConfig.lang as keyof typeof STRINGS] ?? STRINGS.en;

  const [values, setValues] = useState<FormValues>({ name: "", email: "", subject: "", message: "" });
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");

  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);

  const validate = (field: FieldKey, vals: FormValues): string | undefined => {
    const v = vals[field].trim();
    if (!v) return S.required;
    if (field === "email" && !EMAIL_RE.test(v)) return S.invalidEmail;
    return undefined;
  };

  const handleBlur = (field: FieldKey) => {
    setTouched((t) => ({ ...t, [field]: true }));
    setErrors((e) => ({ ...e, [field]: validate(field, values) }));
  };

  const handleChange = (field: keyof FormValues, value: string) => {
    const next = { ...values, [field]: value };
    setValues(next);
    if (field !== "subject" && touched[field as FieldKey]) {
      setErrors((e) => ({ ...e, [field]: validate(field as FieldKey, next) }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: Partial<Record<FieldKey, string>> = {
      name: validate("name", values),
      email: validate("email", values),
      message: validate("message", values),
    };
    const hasErrors = Object.values(nextErrors).some(Boolean);
    if (hasErrors) {
      setErrors(nextErrors);
      setTouched({ name: true, email: true, message: true });
      if (nextErrors.name) nameRef.current?.focus();
      else if (nextErrors.email) emailRef.current?.focus();
      else if (nextErrors.message) messageRef.current?.focus();
      return;
    }
    setStatus("submitting");
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (response.ok) {
        setStatus("success");
        setValues({ name: "", email: "", subject: "", message: "" });
        setTouched({});
        setErrors({});
        setTimeout(() => setStatus("idle"), 5000);
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  const labelClass = "mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground";
  const inputClass = (invalid: boolean) => cn(
    "min-h-[48px] w-full rounded-lg border bg-muted/50 px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground/70 dark:bg-muted/30",
    "transition-[border-color,box-shadow] duration-200",
    invalid
      ? "border-red-500/60 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
      : "border-border focus:border-primary focus:ring-2 focus:ring-primary/20",
  );

  const fieldError = (field: FieldKey, id: string) => (
    <div aria-live="polite">
      {touched[field] && errors[field] && (
        <p id={id} className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">
          {errors[field]}
        </p>
      )}
    </div>
  );

  return (
    <motion.form
      noValidate
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: Y_SM }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={VIEWPORT_ONCE}
      transition={{ duration: NICHE_DURATION[flavor], ease: NICHE_EASING[flavor], delay: 0.05 }}
      className="space-y-4"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="cv2-name" className={labelClass}>{localeConfig.inquiry.placeholderName}</label>
          <input
            ref={nameRef}
            id="cv2-name"
            type="text"
            autoComplete="name"
            value={values.name}
            onChange={(e) => handleChange("name", e.target.value)}
            onBlur={() => handleBlur("name")}
            aria-invalid={Boolean(touched.name && errors.name)}
            aria-describedby={touched.name && errors.name ? "cv2-name-error" : undefined}
            className={inputClass(Boolean(touched.name && errors.name))}
          />
          {fieldError("name", "cv2-name-error")}
        </div>
        <div>
          <label htmlFor="cv2-email" className={labelClass}>{localeConfig.inquiry.placeholderEmail}</label>
          <input
            ref={emailRef}
            id="cv2-email"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={values.email}
            onChange={(e) => handleChange("email", e.target.value)}
            onBlur={() => handleBlur("email")}
            aria-invalid={Boolean(touched.email && errors.email)}
            aria-describedby={touched.email && errors.email ? "cv2-email-error" : undefined}
            className={inputClass(Boolean(touched.email && errors.email))}
          />
          {fieldError("email", "cv2-email-error")}
        </div>
      </div>

      <div>
        <label htmlFor="cv2-subject" className={labelClass}>{localeConfig.inquiry.placeholderSubject}</label>
        <input
          id="cv2-subject"
          type="text"
          value={values.subject}
          onChange={(e) => handleChange("subject", e.target.value)}
          className={inputClass(false)}
        />
      </div>

      <div>
        <label htmlFor="cv2-message" className={labelClass}>{localeConfig.inquiry.placeholderMessage}</label>
        <textarea
          ref={messageRef}
          id="cv2-message"
          rows={4}
          value={values.message}
          onChange={(e) => handleChange("message", e.target.value)}
          onBlur={() => handleBlur("message")}
          aria-invalid={Boolean(touched.message && errors.message)}
          aria-describedby={touched.message && errors.message ? "cv2-message-error" : undefined}
          className={cn(inputClass(Boolean(touched.message && errors.message)), "resize-none")}
        />
        {fieldError("message", "cv2-message-error")}
      </div>

      <motion.button
        type="submit"
        disabled={status === "submitting"}
        whileTap={status !== "submitting" ? { scale: 0.97 } : undefined}
        transition={{ duration: 0.16, ease: EASE_OUT_STRONG }}
        className="flex min-h-[48px] w-full items-center justify-center gap-2.5 rounded-lg bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-md shadow-accent/15 transition-colors duration-300 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
      >
        {status === "submitting" ? (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" aria-hidden />
        ) : (
          <>
            <Send size={15} className="rtl:-scale-x-100" aria-hidden />
            <span>{localeConfig.inquiry.send}</span>
          </>
        )}
      </motion.button>

      <div aria-live="polite" aria-atomic="true">
        <AnimatePresence>
          {status === "success" && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="status-success flex items-center gap-2.5 rounded-xl p-3 text-sm font-semibold"
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
              className="status-error flex items-center justify-between gap-3 rounded-xl p-3 text-sm font-semibold"
            >
              <div className="flex items-center gap-2.5">
                <AlertCircle size={15} aria-hidden />
                <span>{localeConfig.inquiry.error}</span>
              </div>
              <button
                type="button"
                onClick={() => setStatus("idle")}
                className="text-xs font-black uppercase tracking-widest underline-offset-2 opacity-70 transition-opacity hover:underline hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
              >
                {S.retry}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.form>
  );
}
