import { useRef, useState } from "react";
import {
  Send, CheckCircle, AlertCircle,
  Mail, Phone, MapPin, MessageCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../../../lib/utils";
import { localeConfig } from "../../../config/locale";
import { siteConfig } from "../../../config/site";
import { getOverlayOpacity } from "../../../lib/section-variants";
import type { BusinessHours as BHType } from "../../../types";
import {
  Y_SM, Y_MD, VIEWPORT_ONCE,
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
  dayShort: Record<keyof BHType, string>;
}> = {
  en: {
    required: "This field is required",
    invalidEmail: "Enter a valid email address",
    retry: "Try again",
    dayShort: { monday: "Mon", tuesday: "Tue", wednesday: "Wed", thursday: "Thu", friday: "Fri", saturday: "Sat", sunday: "Sun" },
  },
  he: {
    required: "שדה חובה",
    invalidEmail: "יש להזין כתובת אימייל תקינה",
    retry: "נסו שוב",
    dayShort: { monday: "ב׳", tuesday: "ג׳", wednesday: "ד׳", thursday: "ה׳", friday: "ו׳", saturday: "שבת", sunday: "א׳" },
  },
  ru: {
    required: "Обязательное поле",
    invalidEmail: "Введите корректный адрес почты",
    retry: "Повторить",
    dayShort: { monday: "Пн", tuesday: "Вт", wednesday: "Ср", thursday: "Чт", friday: "Пт", saturday: "Сб", sunday: "Вс" },
  },
  ar: {
    required: "هذا الحقل مطلوب",
    invalidEmail: "يرجى إدخال بريد إلكتروني صحيح",
    retry: "حاول مرة أخرى",
    dayShort: { monday: "الاثنين", tuesday: "الثلاثاء", wednesday: "الأربعاء", thursday: "الخميس", friday: "الجمعة", saturday: "السبت", sunday: "الأحد" },
  },
};

type FieldKey = "name" | "email" | "message";
type FormValues = { name: string; email: string; subject: string; message: string };

/**
 * ContactV5 — full-width immersive (`sections.contact.variant: "v5"`).
 *
 * Full-viewport-feel section over a darkened photographic background.
 * Deliberately light-on-dark in BOTH color modes (the copy sits on a dark
 * photo): centered massive headline, translucent glass form fields,
 * contact channels as icon chips, hours as a horizontal strip at the
 * bottom.
 */
export function ContactV5() {
  const { sections, contact, hours } = siteConfig;
  const sectionConfig = sections.contact;

  const niche = siteConfig.business.type;
  const flavor = getNicheFlavor(niche);
  const stagger = nicheStagger(niche);
  const S = STRINGS[localeConfig.lang as keyof typeof STRINGS] ?? STRINGS.en;

  const showForm = siteConfig.features.showInquiry;
  const showHours = siteConfig.features.showBusinessHours;
  const showMap = siteConfig.features.showLocation;

  if (!showForm && !showHours && !showMap) return null;

  const todayKey = JS_DAY_TO_KEY[new Date().getDay()];

  const fullAddress = `${contact.address.street}, ${contact.address.district}, ${contact.address.cityStateZip}`;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`;

  const chipClass =
    "inline-flex min-h-[44px] items-center gap-2.5 rounded-full border border-white/20 bg-white/10 px-5 text-sm font-medium text-white backdrop-blur-sm transition-colors duration-300 hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60";

  return (
    <section
      id="contact"
      className="relative flex min-h-[90dvh] flex-col justify-center overflow-hidden"
    >
      {/* ── Photographic backdrop + darkening overlay (both modes) ── */}
      <div className="absolute inset-0" aria-hidden>
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
          style={{ opacity: getOverlayOpacity(0.65) }}
        />
        {/* Decorative depth layer — honors the gradientEnabled flag */}
        <div className="gs-gradient absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/35" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-3xl px-5 pb-12 pt-20 sm:px-6 sm:pb-16 sm:pt-28">
        {/* ── Centered massive headline ── */}
        <motion.div
          initial={{ opacity: 0, y: Y_MD }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEWPORT_ONCE}
          transition={{ duration: NICHE_DURATION[flavor], ease: NICHE_EASING[flavor] }}
          className="mb-10 text-center sm:mb-12"
        >
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.35em] text-white/75">
            {sectionConfig.title}
          </p>
          <h2 className="text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
            {sectionConfig.subtitle}
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-white/85 sm:text-base">
            {sectionConfig.description}
          </p>
        </motion.div>

        {/* ── Glass form ── */}
        {showForm && <V5GlassForm />}

        {/* ── Contact channels as icon chips ── */}
        <motion.div
          initial={{ opacity: 0, y: Y_SM }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEWPORT_ONCE}
          transition={{ delay: 0.15, duration: NICHE_DURATION[flavor], ease: NICHE_EASING[flavor] }}
          className={cn("flex flex-wrap justify-center gap-3", showForm ? "mt-10" : "mt-2")}
        >
          <a href={`tel:${contact.phone}`} className={chipClass}>
            <Phone size={14} aria-hidden />
            <span dir="ltr">{contact.phone}</span>
          </a>
          <a href={`mailto:${contact.email}`} className={chipClass}>
            <Mail size={14} aria-hidden />
            <span>{contact.email}</span>
          </a>
          {contact.phone && (
            <a
              href={`https://wa.me/${contact.phone.replace(/[^0-9+]/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className={chipClass}
            >
              <MessageCircle size={14} aria-hidden />
              <span>{localeConfig.inquiry.whatsapp}</span>
            </a>
          )}
          {showMap && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={chipClass}
            >
              <MapPin size={14} aria-hidden />
              <span className="max-w-[260px] truncate">{fullAddress}</span>
            </a>
          )}
        </motion.div>
      </div>

      {/* ── Hours strip at the bottom ── */}
      {showHours && (
        <div className="relative z-10 mt-auto border-t border-white/15">
          <ul className="mx-auto flex max-w-6xl flex-wrap items-stretch justify-center gap-x-2 gap-y-1 px-5 py-5 sm:gap-x-0 sm:px-6">
            {DAY_KEYS.map((dayKey, i) => {
              const slot = hours[dayKey];
              const isToday = dayKey === todayKey;
              return (
                <motion.li
                  key={dayKey}
                  initial={{ opacity: 0, y: Y_SM }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={VIEWPORT_ONCE}
                  transition={{ delay: stagger(i), duration: NICHE_DURATION[flavor], ease: NICHE_EASING[flavor] }}
                  className={cn(
                    "flex min-w-[96px] flex-col items-center gap-0.5 px-3 py-1 text-center sm:flex-1",
                    !slot && "opacity-50",
                  )}
                >
                  <span className={cn(
                    "flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest",
                    isToday ? "text-white" : "text-white/65",
                  )}>
                    {isToday && <span className="h-1 w-1 shrink-0 rounded-full bg-white" aria-hidden />}
                    {S.dayShort[dayKey]}
                  </span>
                  {slot ? (
                    <span dir="ltr" className="text-[13px] font-semibold tabular-nums text-white/90">
                      {fmtTime(slot.start)} – {fmtTime(slot.end)}
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/55">
                      {localeConfig.businessHours.closed}
                    </span>
                  )}
                </motion.li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}

/* ── Glass form (same endpoint/payload/UX semantics as ContactHub v1) ────── */

function V5GlassForm() {
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

  const labelClass = "mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-white/75";
  const inputClass = (invalid: boolean) => cn(
    "min-h-[48px] w-full rounded-xl border bg-white/10 px-4 py-3 text-sm text-white outline-none backdrop-blur-sm placeholder:text-white/45",
    "transition-[border-color,background-color] duration-200 focus:bg-white/15",
    invalid
      ? "border-red-300/80 focus:border-red-300"
      : "border-white/20 focus:border-white/60",
  );

  const fieldError = (field: FieldKey, id: string) => (
    <div aria-live="polite">
      {touched[field] && errors[field] && (
        <p id={id} className="mt-1.5 text-xs font-semibold text-red-200">
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
      className="space-y-4"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="cv5-name" className={labelClass}>{localeConfig.inquiry.placeholderName}</label>
          <input
            ref={nameRef}
            id="cv5-name"
            type="text"
            autoComplete="name"
            value={values.name}
            onChange={(e) => handleChange("name", e.target.value)}
            onBlur={() => handleBlur("name")}
            aria-invalid={Boolean(touched.name && errors.name)}
            aria-describedby={touched.name && errors.name ? "cv5-name-error" : undefined}
            className={inputClass(Boolean(touched.name && errors.name))}
          />
          {fieldError("name", "cv5-name-error")}
        </div>
        <div>
          <label htmlFor="cv5-email" className={labelClass}>{localeConfig.inquiry.placeholderEmail}</label>
          <input
            ref={emailRef}
            id="cv5-email"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={values.email}
            onChange={(e) => handleChange("email", e.target.value)}
            onBlur={() => handleBlur("email")}
            aria-invalid={Boolean(touched.email && errors.email)}
            aria-describedby={touched.email && errors.email ? "cv5-email-error" : undefined}
            className={inputClass(Boolean(touched.email && errors.email))}
          />
          {fieldError("email", "cv5-email-error")}
        </div>
      </div>

      <div>
        <label htmlFor="cv5-subject" className={labelClass}>{localeConfig.inquiry.placeholderSubject}</label>
        <input
          id="cv5-subject"
          type="text"
          value={values.subject}
          onChange={(e) => handleChange("subject", e.target.value)}
          className={inputClass(false)}
        />
      </div>

      <div>
        <label htmlFor="cv5-message" className={labelClass}>{localeConfig.inquiry.placeholderMessage}</label>
        <textarea
          ref={messageRef}
          id="cv5-message"
          rows={4}
          value={values.message}
          onChange={(e) => handleChange("message", e.target.value)}
          onBlur={() => handleBlur("message")}
          aria-invalid={Boolean(touched.message && errors.message)}
          aria-describedby={touched.message && errors.message ? "cv5-message-error" : undefined}
          className={cn(inputClass(Boolean(touched.message && errors.message)), "resize-none")}
        />
        {fieldError("message", "cv5-message-error")}
      </div>

      <motion.button
        type="submit"
        disabled={status === "submitting"}
        whileTap={status !== "submitting" ? { scale: 0.97 } : undefined}
        transition={{ duration: 0.16, ease: EASE_OUT_STRONG }}
        className="flex min-h-[48px] w-full items-center justify-center gap-2.5 rounded-xl bg-white py-3.5 text-sm font-bold text-neutral-900 transition-colors duration-300 hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
      >
        {status === "submitting" ? (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-900/25 border-t-neutral-900" aria-hidden />
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
              className="flex items-center gap-2.5 rounded-xl border border-emerald-300/40 bg-emerald-400/15 p-3 text-sm font-semibold text-emerald-100 backdrop-blur-sm"
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
              className="flex items-center justify-between gap-3 rounded-xl border border-red-300/40 bg-red-400/15 p-3 text-sm font-semibold text-red-100 backdrop-blur-sm"
            >
              <div className="flex items-center gap-2.5">
                <AlertCircle size={15} aria-hidden />
                <span>{localeConfig.inquiry.error}</span>
              </div>
              <button
                type="button"
                onClick={() => setStatus("idle")}
                className="text-xs font-black uppercase tracking-widest underline-offset-2 opacity-80 transition-opacity hover:underline hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
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
