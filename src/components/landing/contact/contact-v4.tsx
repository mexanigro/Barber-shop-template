import { useRef, useState } from "react";
import { ArrowRight, CheckCircle, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../../../lib/utils";
import { localeConfig } from "../../../config/locale";
import { siteConfig } from "../../../config/site";
import type { BusinessHours as BHType } from "../../../types";
import {
  Y_SM, Y_MD, VIEWPORT_ONCE,
  getNicheFlavor, NICHE_DURATION, NICHE_EASING,
  EASE_OUT_STRONG,
} from "../../../lib/motion";

/* ── Shared helpers (mirrors ContactHub v1) ──────────────────────────────── */

import { fmtRange } from "../../../lib/hours-display";

const JS_DAY_TO_KEY: Record<number, keyof BHType> = {
  0: "sunday", 1: "monday", 2: "tuesday", 3: "wednesday",
  4: "thursday", 5: "friday", 6: "saturday",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** UI microcopy local to this variant — business copy stays in config/locales. */
const STRINGS: Record<"en" | "he" | "ru" | "ar", {
  required: string;
  invalidEmail: string;
  retry: string;
  today: string;
}> = {
  en: { required: "This field is required", invalidEmail: "Enter a valid email address", retry: "Try again", today: "Today" },
  he: { required: "שדה חובה", invalidEmail: "יש להזין כתובת אימייל תקינה", retry: "נסו שוב", today: "היום" },
  ru: { required: "Обязательное поле", invalidEmail: "Введите корректный адрес почты", retry: "Повторить", today: "Сегодня" },
  ar: { required: "هذا الحقل مطلوب", invalidEmail: "يرجى إدخال بريد إلكتروني صحيح", retry: "حاول مرة أخرى", today: "اليوم" },
};

type FieldKey = "name" | "email" | "message";
type FormValues = { name: string; email: string; subject: string; message: string };

/**
 * ContactV4 — minimal inline (`sections.contact.variant: "v4"`).
 *
 * Radical typographic reduction: generous whitespace, an oversized serif
 * invitation line, a single-line inline form at lg+ (hairline bottom
 * borders only, no card chrome; stacked on mobile), and a quiet one-line
 * meta row condensing phone / email / address / today's hours.
 */
export function ContactV4() {
  const { sections, contact, hours } = siteConfig;
  const sectionConfig = sections.contact;

  const niche = siteConfig.business.type;
  const flavor = getNicheFlavor(niche);
  const S = STRINGS[localeConfig.lang as keyof typeof STRINGS] ?? STRINGS.en;

  const showForm = siteConfig.features.showInquiry;
  const showHours = siteConfig.features.showBusinessHours;
  const showMap = siteConfig.features.showLocation;

  if (!showForm && !showHours && !showMap) return null;

  const todayKey = JS_DAY_TO_KEY[new Date().getDay()];
  const todaySlot = hours[todayKey];
  // Label and time range kept as separate nodes: a single interpolated
  // string lets the bidi algorithm shuffle "9 AM – 8 PM" around the Hebrew
  // label ("AM – 8 PM 9 :היום"). The range itself must stay LTR.
  const todayValue = todaySlot ? fmtRange(todaySlot) : localeConfig.businessHours.closed;

  const fullAddress = [contact.address.street, contact.address.district, contact.address.cityStateZip]
    .filter((p) => p && p.trim())
    .join(", ");
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`;

  const metaLinkClass =
    "inline-flex min-h-[44px] touch-manipulation items-center font-medium text-muted-foreground underline-offset-4 transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:text-foreground hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50";

  return (
    <section
      id="contact"
      className="bg-background px-5 py-24 transition-colors duration-300 sm:px-6 sm:py-32 lg:py-40"
    >
      <div className="mx-auto max-w-5xl">
        {/* ── Oversized serif invitation ── */}
        <motion.div
          initial={{ opacity: 0, y: Y_MD }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEWPORT_ONCE}
          transition={{ duration: NICHE_DURATION[flavor], ease: NICHE_EASING[flavor] }}
        >
          <p className="mb-5 text-xs font-bold uppercase tracking-[0.35em] text-accent-light">
            {sectionConfig.title}
          </p>
          <h2 className="max-w-3xl text-balance font-serif text-[clamp(2.25rem,5.5vw,3.75rem)] leading-[1.08] text-foreground">
            {sectionConfig.subtitle}
          </h2>
          <p className="mt-6 max-w-xl text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
            {sectionConfig.description}
          </p>
        </motion.div>

        {/* ── Inline form ── */}
        {showForm && <V4InlineForm />}

        {/* ── Quiet one-line meta row ── */}
        <motion.div
          initial={{ opacity: 0, y: Y_SM }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEWPORT_ONCE}
          transition={{ delay: 0.15, duration: NICHE_DURATION[flavor], ease: NICHE_EASING[flavor] }}
          className={cn(
            "flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted-foreground",
            showForm ? "mt-14" : "mt-12",
          )}
        >
          {contact.phone && (
            <a href={`tel:${contact.phone}`} className={metaLinkClass}>
              <span dir="ltr">{contact.phone}</span>
            </a>
          )}
          {contact.email && (
            <>
              {contact.phone && <span aria-hidden className="text-border">·</span>}
              <a href={`mailto:${contact.email}`} className={metaLinkClass}>
                {contact.email}
              </a>
            </>
          )}
          {showMap && (
            <>
              {(contact.phone || contact.email) && <span aria-hidden className="text-border">·</span>}
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={metaLinkClass}
              >
                {fullAddress}
              </a>
            </>
          )}
          {showHours && (
            <>
              <span aria-hidden className="text-border">·</span>
              <span className="inline-flex min-h-[44px] items-center gap-1 font-medium">
                <span>{S.today}:</span>
                <span dir={todaySlot ? "ltr" : undefined}>{todayValue}</span>
              </span>
            </>
          )}
        </motion.div>
      </div>
    </section>
  );
}

/* ── Inline form (same endpoint/payload/UX semantics as ContactHub v1) ───── */

function V4InlineForm() {
  const niche = siteConfig.business.type;
  const flavor = getNicheFlavor(niche);
  const S = STRINGS[localeConfig.lang as keyof typeof STRINGS] ?? STRINGS.en;

  const [values, setValues] = useState<FormValues>({ name: "", email: "", subject: "", message: "" });
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");

  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLInputElement>(null);

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

  const handleChange = (field: FieldKey, value: string) => {
    const next = { ...values, [field]: value };
    setValues(next);
    if (touched[field]) {
      setErrors((e) => ({ ...e, [field]: validate(field, next) }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: Partial<Record<FieldKey, string>> = {
      name: validate("name", values),
      email: validate("email", values),
      message: validate("message", values),
    };
    if (Object.values(nextErrors).some(Boolean)) {
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

  const labelClass = "mb-1 block text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground";
  const inputClass = (invalid: boolean) => cn(
    "min-h-[44px] w-full rounded-sm border-0 border-b bg-transparent px-0 py-2.5 text-base text-foreground outline-none placeholder:text-muted-foreground/50",
    "transition-[border-color,box-shadow] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]",
    "focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    invalid
      ? "border-b-red-500/70 focus:border-b-red-500"
      : "border-b-border focus:border-b-foreground",
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
      initial={{ opacity: 0, y: Y_MD }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={VIEWPORT_ONCE}
      transition={{ delay: 0.1, duration: NICHE_DURATION[flavor], ease: NICHE_EASING[flavor] }}
      className="mt-14"
    >
      {/* Stacked on mobile; single hairline row at lg+ */}
      <div className="flex flex-col gap-7 lg:flex-row lg:items-start lg:gap-8">
        <div className="lg:w-48 lg:shrink-0">
          <label htmlFor="cv4-name" className={labelClass}>
            {localeConfig.inquiry.placeholderName}
          </label>
          <input
            ref={nameRef}
            id="cv4-name"
            type="text"
            autoComplete="name"
            value={values.name}
            onChange={(e) => handleChange("name", e.target.value)}
            onBlur={() => handleBlur("name")}
            aria-invalid={Boolean(touched.name && errors.name)}
            aria-describedby={touched.name && errors.name ? "cv4-name-error" : undefined}
            className={inputClass(Boolean(touched.name && errors.name))}
          />
          {fieldError("name", "cv4-name-error")}
        </div>

        <div className="lg:w-56 lg:shrink-0">
          <label htmlFor="cv4-email" className={labelClass}>
            {localeConfig.inquiry.placeholderEmail}
          </label>
          <input
            ref={emailRef}
            id="cv4-email"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={values.email}
            onChange={(e) => handleChange("email", e.target.value)}
            onBlur={() => handleBlur("email")}
            aria-invalid={Boolean(touched.email && errors.email)}
            aria-describedby={touched.email && errors.email ? "cv4-email-error" : undefined}
            className={inputClass(Boolean(touched.email && errors.email))}
          />
          {fieldError("email", "cv4-email-error")}
        </div>

        {/* Message grows to fill the line */}
        <div className="flex-1">
          <label htmlFor="cv4-message" className={labelClass}>
            {localeConfig.inquiry.placeholderMessage}
          </label>
          <input
            ref={messageRef}
            id="cv4-message"
            type="text"
            value={values.message}
            onChange={(e) => handleChange("message", e.target.value)}
            onBlur={() => handleBlur("message")}
            aria-invalid={Boolean(touched.message && errors.message)}
            aria-describedby={touched.message && errors.message ? "cv4-message-error" : undefined}
            className={inputClass(Boolean(touched.message && errors.message))}
          />
          {fieldError("message", "cv4-message-error")}
        </div>

        {/* Send — quiet arrow button aligned with the hairline */}
        <motion.button
          type="submit"
          disabled={status === "submitting"}
          aria-label={localeConfig.inquiry.send}
          whileTap={status !== "submitting" ? { scale: 0.97 } : undefined}
          transition={{ duration: 0.16, ease: EASE_OUT_STRONG }}
          className="group flex h-12 w-full shrink-0 touch-manipulation items-center justify-center gap-2.5 rounded-full border border-foreground/80 bg-transparent px-7 text-sm font-semibold text-foreground transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-foreground hover:text-background disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 lg:mt-5 lg:h-12 lg:w-12 lg:rounded-full lg:px-0"
        >
          {status === "submitting" ? (
            <div className="h-4.5 w-4.5 animate-spin rounded-full border-2 border-current/30 border-t-current" aria-hidden />
          ) : (
            <>
              <span className="lg:hidden">{localeConfig.inquiry.send}</span>
              <ArrowRight
                size={17}
                aria-hidden
                className="transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5"
              />
            </>
          )}
        </motion.button>
      </div>

      <div aria-live="polite" aria-atomic="true" className="mt-5">
        <AnimatePresence>
          {status === "success" && (
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400"
            >
              <CheckCircle size={15} aria-hidden />
              <span>{localeConfig.inquiry.success}</span>
            </motion.p>
          )}
          {status === "error" && (
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-medium text-red-700 dark:text-red-400"
            >
              <span className="flex items-center gap-2">
                <AlertCircle size={15} aria-hidden />
                <span>{localeConfig.inquiry.error}</span>
              </span>
              <button
                type="button"
                onClick={() => setStatus("idle")}
                className="min-h-[44px] touch-manipulation px-2 font-bold underline underline-offset-2 transition-opacity duration-200 hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
              >
                {S.retry}
              </button>
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </motion.form>
  );
}
