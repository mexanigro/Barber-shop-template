import { useRef, useState } from "react";
import {
  Send, CheckCircle, AlertCircle,
  Mail, Phone, MapPin, Clock, ChevronDown, MessageCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../../../lib/utils";
import { localeConfig } from "../../../config/locale";
import { siteConfig } from "../../../config/site";
import { getOverlayOpacity } from "../../../lib/section-variants";
import type { BusinessHours as BHType } from "../../../types";
import {
  Y_SM, Y_MD, VIEWPORT_ONCE,
  getNicheFlavor, NICHE_DURATION, NICHE_EASING,
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
 * ContactV3 — floating card (`sections.contact.variant: "v3"`).
 *
 * Full-width atmospheric backdrop (desaturated map, or brand-toned image
 * band when showLocation is off) with the contact form floating as one
 * elevated card overlapping the backdrop. Phone/email/address render as
 * icon rows in the card footer; hours live in a slim collapsible.
 */
export function ContactV3() {
  const [hoursOpen, setHoursOpen] = useState(false);

  const { sections, contact, hours } = siteConfig;
  const sectionConfig = sections.contact;

  const niche = siteConfig.business.type;
  const flavor = getNicheFlavor(niche);

  const showForm = siteConfig.features.showInquiry;
  const showHours = siteConfig.features.showBusinessHours;
  const showMap = siteConfig.features.showLocation;

  if (!showForm && !showHours && !showMap) return null;

  const todayKey = JS_DAY_TO_KEY[new Date().getDay()];
  const todaySlot = hours[todayKey];

  const fullAddress = `${contact.address.street}, ${contact.address.district}, ${contact.address.cityStateZip}`;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`;

  return (
    <section id="contact" className="bg-background pb-16 transition-colors duration-300 sm:pb-24">
      {/* ── Atmospheric backdrop band ── */}
      <div className="relative h-[300px] overflow-hidden sm:h-[360px]" aria-hidden>
        {showMap ? (
          <>
            {/* Decorative, non-interactive map at low saturation */}
            <iframe
              title={localeConfig.location.mapAlt}
              src={`https://www.google.com/maps?q=${encodeURIComponent(fullAddress)}&output=embed`}
              className="pointer-events-none h-full w-full border-0 grayscale-[0.65] opacity-90"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              tabIndex={-1}
            />
            <div className="gs-gradient absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
          </>
        ) : (
          <>
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
            <div className="gs-gradient absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
          </>
        )}
      </div>

      {/* ── Floating card overlapping the backdrop ── */}
      <div className="px-5 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: Y_MD }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEWPORT_ONCE}
          transition={{ duration: NICHE_DURATION[flavor], ease: NICHE_EASING[flavor] }}
          className="relative z-10 mx-auto -mt-44 max-w-xl rounded-2xl border border-border bg-card p-6 shadow-elevated transition-colors duration-300 sm:-mt-48 sm:p-8"
        >
          {/* Header */}
          <div className="mb-6">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.3em] text-accent-light">
              {sectionConfig.title}
            </p>
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {sectionConfig.subtitle}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {sectionConfig.description}
            </p>
          </div>

          {showForm && <V3Form />}

          {/* ── Card footer: direct channels as icon rows ── */}
          <div className={cn("space-y-1", showForm && "mt-7 border-t border-border pt-6")}>
            <a
              href={`tel:${contact.phone}`}
              className="flex min-h-[44px] items-center gap-3 rounded-lg px-1 text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
            >
              <Phone size={15} className="shrink-0 text-accent-light" aria-hidden />
              <span dir="ltr" className="truncate font-medium">{contact.phone}</span>
            </a>
            <a
              href={`mailto:${contact.email}`}
              className="flex min-h-[44px] items-center gap-3 rounded-lg px-1 text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
            >
              <Mail size={15} className="shrink-0 text-accent-light" aria-hidden />
              <span className="truncate font-medium">{contact.email}</span>
            </a>
            {contact.phone && (
              <a
                href={`https://wa.me/${contact.phone.replace(/[^0-9+]/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-[44px] items-center gap-3 rounded-lg px-1 text-sm text-muted-foreground transition-colors duration-200 hover:text-[#25D366] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
              >
                <MessageCircle size={15} className="shrink-0 text-[#25D366]" aria-hidden />
                <span className="font-medium">{localeConfig.inquiry.whatsapp}</span>
              </a>
            )}
            {showMap && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-[44px] items-center gap-3 rounded-lg px-1 text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
              >
                <MapPin size={15} className="shrink-0 text-accent-light" aria-hidden />
                <span className="truncate font-medium">{fullAddress}</span>
              </a>
            )}
          </div>

          {/* ── Slim collapsible hours ── */}
          {showHours && (
            <div className="mt-4 border-t border-border pt-4">
              <button
                type="button"
                onClick={() => setHoursOpen((o) => !o)}
                aria-expanded={hoursOpen}
                aria-controls="cv3-hours-panel"
                className="flex min-h-[44px] w-full items-center justify-between gap-3 rounded-lg px-1 text-start focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
              >
                <span className="flex items-center gap-3 text-sm font-medium text-foreground">
                  <Clock size={15} className="shrink-0 text-accent-light" aria-hidden />
                  {localeConfig.businessHours.eyebrow}
                </span>
                <span className="flex items-center gap-2.5">
                  {todaySlot ? (
                    <span dir="ltr" className="text-xs font-semibold tabular-nums text-muted-foreground">
                      {fmtTime(todaySlot.start)} – {fmtTime(todaySlot.end)}
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                      {localeConfig.businessHours.closed}
                    </span>
                  )}
                  <ChevronDown
                    size={15}
                    aria-hidden
                    className={cn(
                      "shrink-0 text-muted-foreground transition-transform duration-300",
                      hoursOpen && "rotate-180",
                    )}
                  />
                </span>
              </button>

              <AnimatePresence initial={false}>
                {hoursOpen && (
                  <motion.div
                    id="cv3-hours-panel"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.4, ease: EASE_OUT_STRONG }}
                    className="overflow-hidden"
                  >
                    <ul className="space-y-0 divide-y divide-border/60 px-1 pt-2">
                      {DAY_KEYS.map((dayKey) => {
                        const slot = hours[dayKey];
                        const isToday = dayKey === todayKey;
                        return (
                          <li
                            key={dayKey}
                            className={cn(
                              "flex items-center justify-between py-2 text-[13px]",
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
                          </li>
                        );
                      })}
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
}

/* ── Form (same endpoint/payload/UX semantics as ContactHub v1) ──────────── */

function V3Form() {
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

  const labelClass = "mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground";
  const inputClass = (invalid: boolean) => cn(
    "min-h-[48px] w-full rounded-xl border bg-muted/50 px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground/70 dark:bg-muted/30",
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
    <form noValidate onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="cv3-name" className={labelClass}>{localeConfig.inquiry.placeholderName}</label>
          <input
            ref={nameRef}
            id="cv3-name"
            type="text"
            autoComplete="name"
            value={values.name}
            onChange={(e) => handleChange("name", e.target.value)}
            onBlur={() => handleBlur("name")}
            aria-invalid={Boolean(touched.name && errors.name)}
            aria-describedby={touched.name && errors.name ? "cv3-name-error" : undefined}
            className={inputClass(Boolean(touched.name && errors.name))}
          />
          {fieldError("name", "cv3-name-error")}
        </div>
        <div>
          <label htmlFor="cv3-email" className={labelClass}>{localeConfig.inquiry.placeholderEmail}</label>
          <input
            ref={emailRef}
            id="cv3-email"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={values.email}
            onChange={(e) => handleChange("email", e.target.value)}
            onBlur={() => handleBlur("email")}
            aria-invalid={Boolean(touched.email && errors.email)}
            aria-describedby={touched.email && errors.email ? "cv3-email-error" : undefined}
            className={inputClass(Boolean(touched.email && errors.email))}
          />
          {fieldError("email", "cv3-email-error")}
        </div>
      </div>

      <div>
        <label htmlFor="cv3-subject" className={labelClass}>{localeConfig.inquiry.placeholderSubject}</label>
        <input
          id="cv3-subject"
          type="text"
          value={values.subject}
          onChange={(e) => handleChange("subject", e.target.value)}
          className={inputClass(false)}
        />
      </div>

      <div>
        <label htmlFor="cv3-message" className={labelClass}>{localeConfig.inquiry.placeholderMessage}</label>
        <textarea
          ref={messageRef}
          id="cv3-message"
          rows={4}
          value={values.message}
          onChange={(e) => handleChange("message", e.target.value)}
          onBlur={() => handleBlur("message")}
          aria-invalid={Boolean(touched.message && errors.message)}
          aria-describedby={touched.message && errors.message ? "cv3-message-error" : undefined}
          className={cn(inputClass(Boolean(touched.message && errors.message)), "resize-none")}
        />
        {fieldError("message", "cv3-message-error")}
      </div>

      <motion.button
        type="submit"
        disabled={status === "submitting"}
        whileTap={status !== "submitting" ? { scale: 0.97 } : undefined}
        transition={{ duration: 0.16, ease: EASE_OUT_STRONG }}
        className="flex min-h-[48px] w-full items-center justify-center gap-2.5 rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-md shadow-accent/15 transition-colors duration-300 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
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
    </form>
  );
}
