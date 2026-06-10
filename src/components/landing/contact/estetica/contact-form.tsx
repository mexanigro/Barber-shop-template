/**
 * contact/estetica/contact-form.tsx — shared inquiry form for the estética
 * contact variants. Same endpoint, payload, validation and a11y semantics as
 * ContactHub v1 / contact-v2, restyled for the porcelain editorial family.
 *
 * `fieldStyle="underline"` swaps the boxed inputs for hairline underlines
 * (used by the concierge variant); "boxed" is the default soft input.
 */
import React, { useRef, useState } from "react";
import { Send, CheckCircle, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../../../../lib/utils";
import { localeConfig } from "../../../../config/locale";
import { EASE_OUT_STRONG } from "../../../../lib/motion";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const STRINGS: Record<"en" | "he" | "ru" | "ar", { required: string; invalidEmail: string; retry: string }> = {
  en: { required: "This field is required", invalidEmail: "Enter a valid email address", retry: "Try again" },
  he: { required: "שדה חובה", invalidEmail: "יש להזין כתובת אימייל תקינה", retry: "נסו שוב" },
  ru: { required: "Обязательное поле", invalidEmail: "Введите корректный адрес почты", retry: "Повторить" },
  ar: { required: "هذا الحقل مطلوب", invalidEmail: "يرجى إدخال بريد إلكتروني صحيح", retry: "حاول مرة أخرى" },
};

type FieldKey = "name" | "email" | "message";
type FormValues = { name: string; email: string; subject: string; message: string };

export function EsteticaContactForm({
  idPrefix,
  fieldStyle = "boxed",
  compact = false,
}: {
  /** Unique prefix so multiple variants never collide on input ids. */
  idPrefix: string;
  fieldStyle?: "boxed" | "underline";
  /** Compact drops the subject field (floating-card / map variants). */
  compact?: boolean;
}) {
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

  const labelClass = "mb-1.5 block text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground";
  const inputClass = (invalid: boolean) =>
    fieldStyle === "underline"
      ? cn(
          "min-h-[48px] w-full border-0 border-b bg-transparent px-0 py-3 font-serif text-base text-foreground outline-none placeholder:text-muted-foreground/60",
          "transition-[border-color] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]",
          invalid ? "border-red-500/70 focus:border-red-500" : "border-border focus:border-accent",
        )
      : cn(
          "min-h-[48px] w-full rounded-[0.5rem] border bg-card px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground/60",
          "transition-[border-color,box-shadow] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]",
          invalid
            ? "border-red-500/60 focus:border-red-500 focus:ring-2 focus:ring-red-500/15"
            : "border-border focus:border-accent focus:ring-2 focus:ring-accent/15",
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
    <form noValidate onSubmit={handleSubmit} className="space-y-5">
      <div className={cn("grid grid-cols-1 gap-5", !compact && "sm:grid-cols-2")}>
        <div>
          <label htmlFor={`${idPrefix}-name`} className={labelClass}>{localeConfig.inquiry.placeholderName}</label>
          <input
            ref={nameRef}
            id={`${idPrefix}-name`}
            type="text"
            autoComplete="name"
            value={values.name}
            onChange={(e) => handleChange("name", e.target.value)}
            onBlur={() => handleBlur("name")}
            aria-invalid={Boolean(touched.name && errors.name)}
            aria-describedby={touched.name && errors.name ? `${idPrefix}-name-error` : undefined}
            className={inputClass(Boolean(touched.name && errors.name))}
          />
          {fieldError("name", `${idPrefix}-name-error`)}
        </div>
        <div>
          <label htmlFor={`${idPrefix}-email`} className={labelClass}>{localeConfig.inquiry.placeholderEmail}</label>
          <input
            ref={emailRef}
            id={`${idPrefix}-email`}
            type="email"
            autoComplete="email"
            inputMode="email"
            value={values.email}
            onChange={(e) => handleChange("email", e.target.value)}
            onBlur={() => handleBlur("email")}
            aria-invalid={Boolean(touched.email && errors.email)}
            aria-describedby={touched.email && errors.email ? `${idPrefix}-email-error` : undefined}
            className={inputClass(Boolean(touched.email && errors.email))}
          />
          {fieldError("email", `${idPrefix}-email-error`)}
        </div>
      </div>

      {!compact && (
        <div>
          <label htmlFor={`${idPrefix}-subject`} className={labelClass}>{localeConfig.inquiry.placeholderSubject}</label>
          <input
            id={`${idPrefix}-subject`}
            type="text"
            value={values.subject}
            onChange={(e) => handleChange("subject", e.target.value)}
            className={inputClass(false)}
          />
        </div>
      )}

      <div>
        <label htmlFor={`${idPrefix}-message`} className={labelClass}>{localeConfig.inquiry.placeholderMessage}</label>
        <textarea
          ref={messageRef}
          id={`${idPrefix}-message`}
          rows={compact ? 3 : 4}
          value={values.message}
          onChange={(e) => handleChange("message", e.target.value)}
          onBlur={() => handleBlur("message")}
          aria-invalid={Boolean(touched.message && errors.message)}
          aria-describedby={touched.message && errors.message ? `${idPrefix}-message-error` : undefined}
          className={cn(inputClass(Boolean(touched.message && errors.message)), "resize-none", fieldStyle === "underline" && "min-h-[72px]")}
        />
        {fieldError("message", `${idPrefix}-message-error`)}
      </div>

      <motion.button
        type="submit"
        disabled={status === "submitting"}
        whileTap={status !== "submitting" ? { scale: 0.97 } : undefined}
        transition={{ duration: 0.16, ease: EASE_OUT_STRONG }}
        className="flex min-h-[50px] w-full touch-manipulation items-center justify-center gap-2.5 rounded-full bg-primary py-3.5 text-sm font-medium text-primary-foreground shadow-elevated hover:bg-accent-light disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 [transition:background-color_0.35s_cubic-bezier(0.23,1,0.32,1)]"
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
              className="status-success flex items-center gap-2.5 rounded-[0.5rem] p-3 text-sm font-medium"
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
              className="status-error flex items-center justify-between gap-3 rounded-[0.5rem] p-3 text-sm font-medium"
            >
              <div className="flex items-center gap-2.5">
                <AlertCircle size={15} aria-hidden />
                <span>{localeConfig.inquiry.error}</span>
              </div>
              <button
                type="button"
                onClick={() => setStatus("idle")}
                className="min-h-[44px] touch-manipulation px-2 text-xs font-medium uppercase tracking-[0.14em] underline-offset-2 opacity-70 transition-opacity duration-200 hover:underline hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
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

/* ── Shared hour helpers for the estética contact variants ── */

export const DAY_KEYS = [
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
] as const;

export const JS_DAY_TO_KEY: Record<number, (typeof DAY_KEYS)[number]> = {
  0: "sunday", 1: "monday", 2: "tuesday", 3: "wednesday",
  4: "thursday", 5: "friday", 6: "saturday",
};

export function fmtTime(time: string): string {
  const [hStr, mStr] = time.split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12} ${period}` : `${h12}:${mStr} ${period}`;
}
