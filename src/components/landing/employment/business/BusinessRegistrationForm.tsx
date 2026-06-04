/**
 * BusinessRegistrationForm.tsx
 *
 * Hiring request form for companies. Single-page (unlike the 6-step worker
 * wizard) — businesses want speed over hand-holding. Fields are grouped
 * into "About you" and "About the role" with intentional spacing for
 * scannability. Saves to Firestore `employment_business_registrations`.
 *
 * Pre-selects the category passed via the `business-category-select` event
 * dispatched from `WorkerCategories`.
 */

import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { Check, ChevronDown, Send } from "lucide-react";
import { db, isFirebaseConfigured } from "../../../../lib/firebase";
import { siteConfig } from "../../../../config/site";
import { useBusinessLocale } from "./useBusinessLocale";
import { localeConfig } from "../../../../config/locale";

const EASE = [0.23, 1, 0.32, 1] as const;
const ISRAELI_PHONE_RE = /^(\+972|0)[0-9\s\-]{7,12}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FormState = {
  companyName: string;
  contactName: string;
  phone: string;
  email: string;
  jobType: string;
  workerCount: string;
  city: string;
  urgency: string;
  notes: string;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

const INITIAL: FormState = {
  companyName: "",
  contactName: "",
  phone: "",
  email: "",
  jobType: "",
  workerCount: "",
  city: "",
  urgency: "",
  notes: "",
};

// ─── Shared input style — reused so every field feels like one family ────────

const baseInputClass = [
  "w-full rounded-xl border border-border bg-background px-4",
  "h-12 text-[15px] text-foreground placeholder:text-muted-foreground/70",
  "outline-none transition-all duration-150",
  "focus:border-[#E8820C] focus:ring-2 focus:ring-[#E8820C]/25",
].join(" ");

const errorInputClass =
  "border-red-400/70 focus:border-red-400 focus:ring-red-400/20";

interface FieldProps {
  id: string;
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  hint?: string;
}

function Field({ id, label, error, required, children, hint }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="flex items-baseline gap-1 font-sans text-[13px] font-medium text-foreground/80"
      >
        <span>{label}</span>
        {required && (
          <span aria-hidden className="text-[#E8820C]">
            *
          </span>
        )}
        {hint && (
          <span className="ms-auto text-[11px] font-normal text-muted-foreground/70">
            {hint}
          </span>
        )}
      </label>
      {children}
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -2 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: EASE }}
            role="alert"
            className="text-xs text-red-400"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

export function BusinessRegistrationForm() {
  const data = useBusinessLocale().form;
  const workersData = useBusinessLocale().workers;
  const wizardLocale = (localeConfig as unknown as {
    employment?: { wizard?: { required: string; invalidPhone: string; invalidEmail: string } };
  }).employment?.wizard ?? {
    required: "Required",
    invalidPhone: "Enter a valid phone",
    invalidEmail: "Enter a valid email",
  };

  const [form, setForm] = React.useState<FormState>(INITIAL);
  const [errors, setErrors] = React.useState<FormErrors>({});
  const [status, setStatus] = React.useState<"idle" | "submitting" | "success" | "error">("idle");

  // Listen for category pre-selection from the WorkerCategories tiles.
  React.useEffect(() => {
    const handler = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      const match = workersData.categories.find((c) => c.id === id);
      if (match) setForm((f) => ({ ...f, jobType: match.id }));
    };
    window.addEventListener("business-category-select", handler);
    return () => window.removeEventListener("business-category-select", handler);
  }, [workersData.categories]);

  const update = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = (): FormErrors => {
    const e: FormErrors = {};
    if (!form.companyName.trim()) e.companyName = wizardLocale.required;
    if (!form.contactName.trim()) e.contactName = wizardLocale.required;
    if (!form.phone.trim()) e.phone = wizardLocale.required;
    else if (!ISRAELI_PHONE_RE.test(form.phone.trim())) e.phone = wizardLocale.invalidPhone;
    if (form.email.trim() && !EMAIL_RE.test(form.email.trim())) e.email = wizardLocale.invalidEmail;
    if (!form.jobType) e.jobType = wizardLocale.required;
    if (!form.workerCount.trim()) e.workerCount = wizardLocale.required;
    if (!form.city.trim()) e.city = wizardLocale.required;
    if (!form.urgency) e.urgency = wizardLocale.required;
    return e;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const ve = validate();
    if (Object.keys(ve).length) {
      setErrors(ve);
      return;
    }

    if (!isFirebaseConfigured) {
      // Dev fallback — pretend success so the success state is visible
      // when Firebase env vars are missing locally.
      setStatus("success");
      return;
    }

    setStatus("submitting");
    try {
      await addDoc(collection(db, "employment_business_registrations"), {
        clientId: siteConfig.tenant?.clientId ?? "demo",
        companyName: form.companyName,
        contactName: form.contactName,
        phone: form.phone,
        email: form.email || null,
        jobType: form.jobType,
        workerCount: form.workerCount,
        city: form.city,
        urgency: form.urgency,
        notes: form.notes || null,
        status: "pending",
        createdAt: serverTimestamp(),
      });
      setStatus("success");
    } catch (err) {
      console.error("Business registration failed:", err);
      setStatus("error");
    }
  };

  // ─── Render ────────────────────────────────────────────────────────

  return (
    <section
      id="business-form"
      className="relative overflow-hidden bg-muted/30 py-20 sm:py-28 md:py-32"
    >
      {/* Ambient pull */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(232,130,12,0.05) 0%, transparent 70%)",
        }}
      />

      <div className="relative mx-auto grid max-w-6xl grid-cols-1 gap-12 px-5 sm:px-8 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16 lg:px-12">
        {/* ── Left column: framing copy ─────────────────────────────── */}
        <div className="flex flex-col gap-6 lg:sticky lg:top-32 lg:self-start">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, ease: EASE }}
            className="font-sans text-xs font-semibold uppercase tracking-[0.22em] text-[#E8820C]"
          >
            {data.eyebrow}
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, delay: 0.06, ease: EASE }}
            className="font-serif text-3xl font-black leading-tight tracking-tight text-foreground sm:text-4xl md:text-[2.75rem]"
            style={{ textWrap: "balance" } as React.CSSProperties}
          >
            {data.title}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, delay: 0.18, ease: EASE }}
            className="max-w-md text-base leading-relaxed text-muted-foreground sm:text-[1.0625rem]"
            style={{ textWrap: "pretty" } as React.CSSProperties}
          >
            {data.sub}
          </motion.p>

          {/* Tiny reassurance row */}
          <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Check size={12} className="text-[#E8820C]" strokeWidth={2.5} />
              <span>{useBusinessLocale().benefits.benefits[4].title}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Check size={12} className="text-[#E8820C]" strokeWidth={2.5} />
              <span>{useBusinessLocale().benefits.benefits[0].title}</span>
            </span>
          </div>
        </div>

        {/* ── Right column: form card ───────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.65, ease: EASE }}
          className="relative"
        >
          <div className="overflow-hidden rounded-3xl border border-border/70 bg-card/95 p-7 shadow-[0_30px_70px_-20px_rgba(232,130,12,0.18)] sm:p-9 md:p-10">
            <AnimatePresence mode="wait" initial={false}>
              {status === "success" ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35, ease: EASE }}
                  className="flex flex-col items-center gap-5 py-10 text-center"
                >
                  <span
                    className="flex h-20 w-20 items-center justify-center rounded-full bg-[rgba(232,130,12,0.15)] ring-1 ring-[#E8820C]/25"
                    aria-hidden
                  >
                    <Check size={42} className="text-[#E8820C]" strokeWidth={2.4} />
                  </span>
                  <h3 className="font-serif text-2xl font-black tracking-tight text-foreground">
                    {data.successTitle}
                  </h3>
                  <p
                    className="max-w-md text-base leading-relaxed text-muted-foreground"
                    style={{ textWrap: "pretty" } as React.CSSProperties}
                  >
                    {data.successMessage}
                  </p>
                </motion.div>
              ) : (
                <motion.form
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25, ease: EASE }}
                  onSubmit={handleSubmit}
                  className="flex flex-col gap-7"
                  noValidate
                >
                  {/* Section A — about you */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field id="bf-company" label={data.fields.companyName} required error={errors.companyName}>
                      <input
                        id="bf-company"
                        autoComplete="organization"
                        value={form.companyName}
                        onChange={(e) => update("companyName", e.target.value)}
                        className={[baseInputClass, errors.companyName ? errorInputClass : ""].join(" ")}
                      />
                    </Field>
                    <Field id="bf-contact" label={data.fields.contactName} required error={errors.contactName}>
                      <input
                        id="bf-contact"
                        autoComplete="name"
                        value={form.contactName}
                        onChange={(e) => update("contactName", e.target.value)}
                        className={[baseInputClass, errors.contactName ? errorInputClass : ""].join(" ")}
                      />
                    </Field>
                    <Field id="bf-phone" label={data.fields.phone} required error={errors.phone}>
                      <input
                        id="bf-phone"
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        dir="ltr"
                        placeholder="050-000-0000"
                        value={form.phone}
                        onChange={(e) => update("phone", e.target.value)}
                        className={[baseInputClass, errors.phone ? errorInputClass : ""].join(" ")}
                      />
                    </Field>
                    <Field id="bf-email" label={data.fields.email} error={errors.email}>
                      <input
                        id="bf-email"
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        dir="ltr"
                        placeholder="name@company.com"
                        value={form.email}
                        onChange={(e) => update("email", e.target.value)}
                        className={[baseInputClass, errors.email ? errorInputClass : ""].join(" ")}
                      />
                    </Field>
                  </div>

                  {/* Divider — full hairline, NOT a side stripe accent */}
                  <div aria-hidden className="h-px bg-border/70" />

                  {/* Section B — about the role */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field id="bf-jobtype" label={data.fields.jobType} required error={errors.jobType}>
                      <div className="relative">
                        <select
                          id="bf-jobtype"
                          value={form.jobType}
                          onChange={(e) => update("jobType", e.target.value)}
                          className={[
                            baseInputClass,
                            "appearance-none pe-10",
                            !form.jobType ? "text-muted-foreground/70" : "",
                            errors.jobType ? errorInputClass : "",
                          ].join(" ")}
                        >
                          <option value="">{data.fields.jobTypePlaceholder}</option>
                          {workersData.categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown
                          size={16}
                          aria-hidden
                          className="pointer-events-none absolute end-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                        />
                      </div>
                    </Field>
                    <Field id="bf-count" label={data.fields.workerCount} required error={errors.workerCount}>
                      <input
                        id="bf-count"
                        type="text"
                        inputMode="numeric"
                        placeholder={data.fields.workerCountPlaceholder}
                        value={form.workerCount}
                        onChange={(e) => update("workerCount", e.target.value)}
                        className={[baseInputClass, errors.workerCount ? errorInputClass : ""].join(" ")}
                      />
                    </Field>
                    <Field id="bf-city" label={data.fields.city} required error={errors.city}>
                      <input
                        id="bf-city"
                        type="text"
                        placeholder={data.fields.cityPlaceholder}
                        value={form.city}
                        onChange={(e) => update("city", e.target.value)}
                        className={[baseInputClass, errors.city ? errorInputClass : ""].join(" ")}
                      />
                    </Field>
                    <Field id="bf-urgency" label={data.fields.urgency} required error={errors.urgency}>
                      <div className="flex flex-wrap gap-2">
                        {data.urgencyOptions.map((opt) => {
                          const selected = form.urgency === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => update("urgency", opt.id)}
                              aria-pressed={selected}
                              className={[
                                "rounded-xl border px-3.5 py-2 font-sans text-sm font-medium transition-all duration-150 active:scale-[0.97]",
                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8820C]",
                                "min-h-[44px]",
                                selected
                                  ? "border-[#E8820C] bg-[rgba(232,130,12,0.15)] text-[#E8820C]"
                                  : "border-border bg-background text-foreground/70 hover:border-[#E8820C]/50",
                              ].join(" ")}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </Field>
                  </div>

                  {/* Notes — full row */}
                  <Field id="bf-notes" label={data.fields.notes} hint="—">
                    <textarea
                      id="bf-notes"
                      value={form.notes}
                      onChange={(e) => update("notes", e.target.value)}
                      placeholder={data.fields.notesPlaceholder}
                      rows={3}
                      className={[
                        "w-full rounded-xl border border-border bg-background px-4 py-3",
                        "text-[15px] text-foreground placeholder:text-muted-foreground/70",
                        "outline-none transition-all duration-150 resize-none",
                        "focus:border-[#E8820C] focus:ring-2 focus:ring-[#E8820C]/25",
                      ].join(" ")}
                    />
                  </Field>

                  {status === "error" && (
                    <p role="alert" className="rounded-lg bg-red-400/10 px-4 py-3 text-sm text-red-400">
                      {data.errorMessage}
                    </p>
                  )}

                  <motion.button
                    type="submit"
                    disabled={status === "submitting"}
                    whileTap={{ scale: 0.97 }}
                    className={[
                      "flex w-full items-center justify-center gap-2.5 rounded-xl px-6 py-4",
                      "min-h-[52px] font-sans text-base font-bold tracking-wide text-white",
                      "shadow-[0_16px_44px_-16px_rgba(232,130,12,0.7)] transition-all duration-150",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8820C] focus-visible:ring-offset-2",
                      status === "submitting"
                        ? "cursor-wait bg-[#E8820C]/50 text-white/70"
                        : "bg-[#E8820C] hover:bg-[#C46A08]",
                    ].join(" ")}
                  >
                    {status === "submitting" ? (
                      <>
                        <span
                          className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
                          aria-hidden
                        />
                        <span>{data.submitting}</span>
                      </>
                    ) : (
                      <>
                        <span>{data.submit}</span>
                        <Send size={16} strokeWidth={2.4} className="rtl:-scale-x-100" aria-hidden />
                      </>
                    )}
                  </motion.button>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export default BusinessRegistrationForm;
