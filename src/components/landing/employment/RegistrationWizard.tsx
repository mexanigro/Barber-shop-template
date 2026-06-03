/**
 * RegistrationWizard.tsx
 *
 * Multi-step job-seeker registration wizard for the employment niche.
 * 6 data-collection steps + success state (step 7).
 * Saves to Firestore `employment_registrations` on submit.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check, ChevronLeft, ChevronRight, HelpCircle } from "lucide-react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db, isFirebaseConfigured } from "../../../lib/firebase";
import { siteConfig } from "../../../config/site";
import { localeConfig } from "../../../config/locale";
import { resolveLucideIcon } from "../../../lib/lucide-icons";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormData {
  firstName: string;
  lastName: string;
  city: string;
  interests: string[];
  hasExperience: boolean;
  availability: string;
  hasDriversLicense: boolean;
  languages: string[];
  phone: string;
  email: string;
}

interface FieldError {
  [key: string]: string | undefined;
}

interface CategoryItem {
  id: string;
  label: string;
  iconName: string;
  description: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TOTAL_STEPS = 6;
const SLIDE_OFFSET = 30;
const TRANSITION_DURATION = 0.25;
const TRANSITION_EASE = [0.25, 0.46, 0.45, 0.94] as const;

// Israeli phone: starts with 0 (local) or +972
const ISRAELI_PHONE_RE = /^(\+972|0)[0-9\s\-]{7,12}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ─── Data helpers ─────────────────────────────────────────────────────────────

function getFormData() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s = (siteConfig.sections as any);
  return s.employmentForm as {
    title: string;
    subtitle: string;
    steps: {
      name: { title: string; firstNameLabel: string; lastNameLabel: string };
      city: { title: string; label: string; placeholder: string };
      interest: { title: string };
      experience: {
        title: string;
        experienceLabel: string;
        availabilityLabel: string;
        driversLicenseLabel: string;
        languagesLabel: string;
        languages: Array<{ id: string; label: string }>;
        availabilityOptions: Array<{ id: string; label: string }>;
      };
      contact: { title: string; phoneLabel: string; emailLabel: string };
      summary: {
        title: string;
        submitLabel: string;
        successTitle: string;
        successMessage: string;
      };
    };
    cities: string[];
  };
}

function getCategories(): CategoryItem[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s = (siteConfig.sections as any);
  return s.jobCategories?.categories ?? [];
}

function isRtl(): boolean {
  return document.documentElement.dir === "rtl";
}

function getWizardLocale() {
  return (localeConfig as Record<string, unknown>).employment as {
    wizard: {
      next: string;
      back: string;
      stepOf: string;
      required: string;
      invalidPhone: string;
      invalidEmail: string;
      selectAtLeastOne: string;
      submitting: string;
      submitError: string;
    };
  };
}

// ─── Progress indicator ───────────────────────────────────────────────────────

interface ProgressProps {
  currentStep: number;
  stepTitle: string;
}

function ProgressBar({ currentStep, stepTitle }: ProgressProps) {
  return (
    <div
      className="px-6 pt-6 pb-4 sm:px-8 sm:pt-8"
      role="progressbar"
      aria-valuenow={currentStep}
      aria-valuemin={1}
      aria-valuemax={TOTAL_STEPS}
      aria-label={`Step ${currentStep} of ${TOTAL_STEPS}: ${stepTitle}`}
    >
      {/* Dots row */}
      <div className="flex items-center justify-center gap-2 sm:gap-3">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => {
          const stepNum = i + 1;
          const isDone = stepNum < currentStep;
          const isCurrent = stepNum === currentStep;

          return (
            <div key={stepNum} className="flex items-center gap-2 sm:gap-3">
              {/* Dot */}
              <div
                className={[
                  "flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-full",
                  "text-xs font-bold transition-all duration-300",
                  isDone
                    ? "bg-[#0891B2] text-white"
                    : isCurrent
                    ? "bg-[#0891B2] text-white ring-2 ring-[#0891B2] ring-offset-2 ring-offset-background"
                    : "bg-muted text-muted-foreground",
                ].join(" ")}
              >
                {isDone ? (
                  <Check size={13} strokeWidth={2.5} aria-hidden />
                ) : (
                  <span>{stepNum}</span>
                )}
              </div>

              {/* Connector line (not after last) */}
              {stepNum < TOTAL_STEPS && (
                <div
                  className="h-[2px] w-4 sm:w-6 rounded-full transition-all duration-300"
                  style={{
                    background:
                      stepNum < currentStep
                        ? "#0891B2"
                        : "rgba(255,255,255,0.12)",
                  }}
                  aria-hidden
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Current step label (desktop: visible; mobile: condensed) */}
      <p className="mt-3 text-center text-xs font-semibold uppercase tracking-widest text-[#0891B2] sm:text-sm">
        <span className="hidden sm:inline">{stepTitle}</span>
        <span className="sm:hidden">
          {currentStep} / {TOTAL_STEPS}
        </span>
      </p>
    </div>
  );
}

// ─── Shared input styles ──────────────────────────────────────────────────────

const inputClass = [
  "w-full rounded-xl border border-border bg-background px-4",
  "h-12 text-sm text-foreground placeholder:text-muted-foreground",
  "transition-all duration-150 outline-none",
  "focus:border-[#0891B2] focus:ring-2 focus:ring-[#0891B2]/25",
].join(" ");

const inputErrorClass = "border-red-400 focus:border-red-400 focus:ring-red-400/25";

interface FieldWrapProps {
  label: string;
  error?: string;
  children: React.ReactNode;
}

function FieldWrap({ label, error, children }: FieldWrapProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-foreground/80">{label}</label>
      {children}
      {error && (
        <p role="alert" className="text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

// ─── Step 1 — Name ────────────────────────────────────────────────────────────

interface StepNameProps {
  formData: FormData;
  errors: FieldError;
  onChange: (field: keyof FormData, value: string) => void;
  onBlur: (field: keyof FormData) => void;
}

function StepName({ formData, errors, onChange, onBlur }: StepNameProps) {
  const d = getFormData();
  const s = d.steps.name;

  return (
    <div className="flex flex-col gap-4">
      <FieldWrap label={s.firstNameLabel} error={errors.firstName}>
        <input
          type="text"
          autoComplete="given-name"
          value={formData.firstName}
          onChange={(e) => onChange("firstName", e.target.value)}
          onBlur={() => onBlur("firstName")}
          placeholder={s.firstNameLabel}
          className={[inputClass, errors.firstName ? inputErrorClass : ""].join(" ")}
          aria-invalid={!!errors.firstName}
        />
      </FieldWrap>
      <FieldWrap label={s.lastNameLabel} error={errors.lastName}>
        <input
          type="text"
          autoComplete="family-name"
          value={formData.lastName}
          onChange={(e) => onChange("lastName", e.target.value)}
          onBlur={() => onBlur("lastName")}
          placeholder={s.lastNameLabel}
          className={[inputClass, errors.lastName ? inputErrorClass : ""].join(" ")}
          aria-invalid={!!errors.lastName}
        />
      </FieldWrap>
    </div>
  );
}

// ─── Step 2 — City ────────────────────────────────────────────────────────────

interface StepCityProps {
  formData: FormData;
  errors: FieldError;
  onChange: (field: keyof FormData, value: string) => void;
  onBlur: (field: keyof FormData) => void;
}

function StepCity({ formData, errors, onChange, onBlur }: StepCityProps) {
  const d = getFormData();
  const s = d.steps.city;
  const [query, setQuery] = useState("");

  const filtered = d.cities.filter((c) =>
    c.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Search */}
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={s.placeholder}
        className={inputClass}
        aria-label={s.label}
      />
      {errors.city && (
        <p role="alert" className="text-xs text-red-400">
          {errors.city}
        </p>
      )}

      {/* Scrollable chips */}
      <div
        className="flex max-h-52 flex-wrap gap-2 overflow-y-auto rounded-xl border border-border bg-background/50 p-3"
        role="listbox"
        aria-label={s.label}
        onBlur={() => onBlur("city")}
      >
        {filtered.map((city) => {
          const selected = formData.city === city;
          return (
            <button
              key={city}
              type="button"
              role="option"
              aria-selected={selected}
              onClick={() => onChange("city", city)}
              className={[
                "rounded-xl border px-3 py-2 text-sm font-medium transition-all duration-150",
                "active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0891B2]",
                "min-h-[44px]",
                selected
                  ? "border-[#0891B2] bg-[#0891B2]/15 text-[#0891B2]"
                  : "border-border bg-background text-foreground/70 hover:border-[#0891B2]/50",
              ].join(" ")}
            >
              {city}
            </button>
          );
        })}
        {filtered.length === 0 && (
          <p className="py-2 text-sm text-muted-foreground">{query}</p>
        )}
      </div>
    </div>
  );
}

// ─── Step 3 — Job interest ────────────────────────────────────────────────────

interface StepInterestProps {
  formData: FormData;
  errors: FieldError;
  onToggle: (id: string) => void;
}

function StepInterest({ formData, errors, onToggle }: StepInterestProps) {
  const categories = getCategories();

  return (
    <div className="flex flex-col gap-3">
      {errors.interests && (
        <p role="alert" className="text-xs text-red-400">
          {errors.interests}
        </p>
      )}
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {categories.map((cat) => {
          const selected = formData.interests.includes(cat.id);
          const Icon = resolveLucideIcon(cat.iconName, HelpCircle);
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onToggle(cat.id)}
              aria-pressed={selected}
              className={[
                "relative flex flex-col items-start gap-2 rounded-xl border p-3 sm:p-4",
                "transition-all duration-150 active:scale-[0.97]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0891B2]",
                "min-h-[80px] text-start",
                selected
                  ? "border-[#0891B2] bg-[#0891B2]/10"
                  : "border-border bg-background/50 hover:border-[#0891B2]/40",
              ].join(" ")}
            >
              {/* Checkmark badge */}
              {selected && (
                <span className="absolute end-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#0891B2]">
                  <Check size={11} strokeWidth={3} className="text-white" aria-hidden />
                </span>
              )}
              <span
                className="flex h-8 w-8 items-center justify-center rounded-lg"
                style={{ background: "rgba(8,145,178,0.12)", color: "#0891B2" }}
              >
                <Icon size={16} aria-hidden />
              </span>
              <span className="text-xs font-semibold leading-snug text-foreground sm:text-sm">
                {cat.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Step 4 — Experience ──────────────────────────────────────────────────────

interface StepExperienceProps {
  formData: FormData;
  errors: FieldError;
  onChange: (field: keyof FormData, value: boolean | string | string[]) => void;
}

function StepExperience({ formData, errors, onChange }: StepExperienceProps) {
  const d = getFormData();
  const s = d.steps.experience;

  const toggleLanguage = (id: string) => {
    const next = formData.languages.includes(id)
      ? formData.languages.filter((l) => l !== id)
      : [...formData.languages, id];
    onChange("languages", next);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Has experience */}
      <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-background/50 px-4 py-3">
        <input
          type="checkbox"
          checked={formData.hasExperience}
          onChange={(e) => onChange("hasExperience", e.target.checked)}
          className="h-4 w-4 rounded accent-[#0891B2]"
        />
        <span className="text-sm font-medium text-foreground">
          {s.experienceLabel}
        </span>
      </label>

      {/* Availability chips */}
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-foreground/80">{s.availabilityLabel}</p>
        {errors.availability && (
          <p role="alert" className="text-xs text-red-400">
            {errors.availability}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {s.availabilityOptions.map((opt) => {
            const selected = formData.availability === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChange("availability", opt.id)}
                aria-pressed={selected}
                className={[
                  "rounded-xl border px-4 py-2 text-sm font-medium transition-all duration-150",
                  "active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0891B2]",
                  "min-h-[44px]",
                  selected
                    ? "border-[#0891B2] bg-[#0891B2]/15 text-[#0891B2]"
                    : "border-border bg-background text-foreground/70 hover:border-[#0891B2]/50",
                ].join(" ")}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Driver's license */}
      <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-background/50 px-4 py-3">
        <input
          type="checkbox"
          checked={formData.hasDriversLicense}
          onChange={(e) => onChange("hasDriversLicense", e.target.checked)}
          className="h-4 w-4 rounded accent-[#0891B2]"
        />
        <span className="text-sm font-medium text-foreground">
          {s.driversLicenseLabel}
        </span>
      </label>

      {/* Languages */}
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-foreground/80">{s.languagesLabel}</p>
        <div className="flex flex-wrap gap-2">
          {s.languages.map((lang) => {
            const selected = formData.languages.includes(lang.id);
            return (
              <button
                key={lang.id}
                type="button"
                onClick={() => toggleLanguage(lang.id)}
                aria-pressed={selected}
                className={[
                  "rounded-xl border px-3 py-2 text-sm font-medium transition-all duration-150",
                  "active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0891B2]",
                  "min-h-[44px]",
                  selected
                    ? "border-[#0891B2] bg-[#0891B2]/15 text-[#0891B2]"
                    : "border-border bg-background text-foreground/70 hover:border-[#0891B2]/50",
                ].join(" ")}
              >
                {lang.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Step 5 — Contact ─────────────────────────────────────────────────────────

interface StepContactProps {
  formData: FormData;
  errors: FieldError;
  onChange: (field: keyof FormData, value: string) => void;
  onBlur: (field: keyof FormData) => void;
}

function StepContact({ formData, errors, onChange, onBlur }: StepContactProps) {
  const d = getFormData();
  const s = d.steps.contact;

  return (
    <div className="flex flex-col gap-4">
      <FieldWrap label={s.phoneLabel} error={errors.phone}>
        <input
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          value={formData.phone}
          onChange={(e) => onChange("phone", e.target.value)}
          onBlur={() => onBlur("phone")}
          placeholder="050-000-0000"
          className={[inputClass, errors.phone ? inputErrorClass : ""].join(" ")}
          aria-invalid={!!errors.phone}
          dir="ltr"
        />
      </FieldWrap>
      <FieldWrap label={s.emailLabel} error={errors.email}>
        <input
          type="email"
          autoComplete="email"
          inputMode="email"
          value={formData.email}
          onChange={(e) => onChange("email", e.target.value)}
          onBlur={() => onBlur("email")}
          placeholder="name@email.com"
          className={[inputClass, errors.email ? inputErrorClass : ""].join(" ")}
          aria-invalid={!!errors.email}
          dir="ltr"
        />
      </FieldWrap>
    </div>
  );
}

// ─── Step 6 — Summary ────────────────────────────────────────────────────────

interface StepSummaryProps {
  formData: FormData;
  submitting: boolean;
  submitError: string;
  onSubmit: () => void;
}

function StepSummary({ formData, submitting, submitError, onSubmit }: StepSummaryProps) {
  const d = getFormData();
  const s = d.steps.summary;
  const expData = d.steps.experience;
  const categories = getCategories();

  const interestLabels = formData.interests
    .map((id) => categories.find((c) => c.id === id)?.label ?? id)
    .join(", ");

  const availLabel =
    expData.availabilityOptions.find((o) => o.id === formData.availability)?.label ??
    formData.availability;

  const langLabels = formData.languages
    .map((id) => expData.languages.find((l) => l.id === id)?.label ?? id)
    .join(", ");

  const rows: Array<{ label: string; value: string }> = [
    { label: d.steps.name.firstNameLabel, value: `${formData.firstName} ${formData.lastName}` },
    { label: d.steps.city.label, value: formData.city },
    { label: d.steps.interest.title, value: interestLabels },
    { label: expData.availabilityLabel, value: availLabel },
    { label: expData.languagesLabel, value: langLabels || "—" },
    { label: d.steps.contact.phoneLabel, value: formData.phone },
    ...(formData.email ? [{ label: d.steps.contact.emailLabel, value: formData.email }] : []),
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Summary card */}
      <div className="rounded-xl border border-border bg-background/60 divide-y divide-border overflow-hidden">
        {rows.map(({ label, value }) => (
          <div key={label} className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </span>
            <span className="text-sm font-semibold text-foreground">{value}</span>
          </div>
        ))}
      </div>

      {/* Submit error */}
      {submitError && (
        <p role="alert" className="rounded-lg bg-red-400/10 px-4 py-3 text-sm text-red-400">
          {submitError}
        </p>
      )}

      {/* Submit button */}
      <motion.button
        type="button"
        onClick={onSubmit}
        disabled={submitting}
        whileTap={{ scale: 0.97 }}
        className={[
          "flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3",
          "min-h-[48px] text-sm font-bold tracking-wide text-white transition-all duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0891B2] focus-visible:ring-offset-2",
          "active:scale-[0.97]",
          submitting
            ? "cursor-wait bg-[#0891B2]/50 text-white/70"
            : "bg-[#0891B2] hover:bg-[#0e7490] shadow-[0_8px_30px_-8px_rgba(8,145,178,0.5)]",
        ].join(" ")}
      >
        {submitting ? (
          <>
            <span
              className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
              aria-hidden
            />
            <span>...</span>
          </>
        ) : (
          s.submitLabel
        )}
      </motion.button>
    </div>
  );
}

// ─── Success state (step 7) ───────────────────────────────────────────────────

function StepSuccess() {
  const d = getFormData();
  const s = d.steps.summary;

  return (
    <div className="flex flex-col items-center gap-5 py-6 text-center">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
        className="flex h-20 w-20 items-center justify-center rounded-full bg-[#0891B2]/15 ring-1 ring-[#0891B2]/20"
      >
        <Check
          size={40}
          className="text-[#0891B2]"
          strokeWidth={2.5}
          aria-hidden
        />
      </motion.div>

      <motion.h3
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1, ease: TRANSITION_EASE }}
        className="text-xl font-black tracking-tight text-foreground sm:text-2xl"
      >
        {s.successTitle}
      </motion.h3>

      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.18, ease: TRANSITION_EASE }}
        className="max-w-sm text-sm leading-relaxed text-muted-foreground"
      >
        {s.successMessage}
      </motion.p>
    </div>
  );
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validateStep(step: number, formData: FormData): FieldError {
  const errors: FieldError = {};
  const t = getWizardLocale().wizard;
  if (step === 1) {
    if (!formData.firstName.trim() || formData.firstName.trim().length < 2)
      errors.firstName = t.required;
    if (!formData.lastName.trim() || formData.lastName.trim().length < 2)
      errors.lastName = t.required;
  }
  if (step === 2) {
    if (!formData.city) errors.city = t.required;
  }
  if (step === 3) {
    if (formData.interests.length === 0) errors.interests = t.selectAtLeastOne;
  }
  if (step === 4) {
    if (!formData.availability) errors.availability = t.required;
  }
  if (step === 5) {
    if (!formData.phone.trim()) {
      errors.phone = t.required;
    } else if (!ISRAELI_PHONE_RE.test(formData.phone.trim())) {
      errors.phone = t.invalidPhone;
    }
    if (formData.email.trim() && !EMAIL_RE.test(formData.email.trim())) {
      errors.email = t.invalidEmail;
    }
  }
  return errors;
}

function isStepValid(step: number, formData: FormData): boolean {
  return Object.keys(validateStep(step, formData)).length === 0;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function RegistrationWizard() {
  const d = getFormData();

  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [errors, setErrors] = useState<FieldError>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    lastName: "",
    city: "",
    interests: [],
    hasExperience: false,
    availability: "",
    hasDriversLicense: false,
    languages: [],
    phone: "",
    email: "",
  });

  // Listen for category-select events from JobCategories component
  useEffect(() => {
    const handler = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      setFormData((prev) => ({
        ...prev,
        interests: prev.interests.includes(id)
          ? prev.interests
          : [...prev.interests, id],
      }));
    };
    window.addEventListener("employment-category-select", handler);
    return () => window.removeEventListener("employment-category-select", handler);
  }, []);

  const handleChange = useCallback(
    (field: keyof FormData, value: string | boolean | string[]) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    },
    []
  );

  const handleBlur = useCallback(
    (field: keyof FormData) => {
      const stepErrors = validateStep(step, formData);
      if (stepErrors[field]) {
        setErrors((prev) => ({ ...prev, [field]: stepErrors[field] }));
      }
    },
    [step, formData]
  );

  const handleToggleInterest = useCallback((id: string) => {
    setFormData((prev) => {
      const next = prev.interests.includes(id)
        ? prev.interests.filter((i) => i !== id)
        : [...prev.interests, id];
      return { ...prev, interests: next };
    });
    setErrors((prev) => ({ ...prev, interests: undefined }));
  }, []);

  const goNext = useCallback(() => {
    const stepErrors = validateStep(step, formData);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }
    setErrors({});
    setDirection(1);
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }, [step, formData]);

  const goBack = useCallback(() => {
    setErrors({});
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 1));
  }, []);

  const handleSubmit = useCallback(async () => {
    const stepErrors = validateStep(6, formData);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }

    if (!isFirebaseConfigured) {
      console.warn("Firebase not configured, skipping registration save");
      setStep(7);
      return;
    }

    setSubmitting(true);
    setSubmitError("");

    try {
      await addDoc(collection(db, "employment_registrations"), {
        clientId: siteConfig.tenant?.clientId ?? "demo",
        firstName: formData.firstName,
        lastName: formData.lastName,
        city: formData.city,
        interests: formData.interests,
        hasExperience: formData.hasExperience,
        availability: formData.availability,
        hasDriversLicense: formData.hasDriversLicense,
        languages: formData.languages,
        phone: formData.phone,
        email: formData.email || null,
        status: "pending",
        createdAt: serverTimestamp(),
      });
      setStep(7);
    } catch (err) {
      console.error("Registration failed:", err);
      setSubmitError(getWizardLocale().wizard.submitError);
    } finally {
      setSubmitting(false);
    }
  }, [formData]);

  // Step title for progress bar
  const stepTitles = [
    d.steps.name.title,
    d.steps.city.title,
    d.steps.interest.title,
    d.steps.experience.title,
    d.steps.contact.title,
    d.steps.summary.title,
  ];

  const currentTitle = step <= TOTAL_STEPS ? stepTitles[step - 1] : "";
  const valid = step <= TOTAL_STEPS && isStepValid(step, formData);
  const rtl = isRtl();

  // Slide directions: forward = enter from right (ltr) or left (rtl)
  const enterX = direction * SLIDE_OFFSET * (rtl ? -1 : 1);
  const exitX = direction * -SLIDE_OFFSET * (rtl ? -1 : 1);

  // Scroll wizard into view on mount
  const wizardRef = useRef<HTMLDivElement>(null);

  return (
    <section
      id="employment-form"
      className="relative py-16 sm:py-20 md:py-24 bg-muted/20"
    >
      {/* Ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 100%, rgba(8,145,178,0.05) 0%, transparent 70%)",
        }}
      />

      <div className="relative mx-auto max-w-lg px-4 sm:px-6">
        {/* Section header */}
        <div className="mb-8 text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#0891B2]">
            {d.title}
          </p>
          <h2 className="font-serif text-2xl font-black tracking-tight text-foreground sm:text-3xl">
            {d.subtitle}
          </h2>
        </div>

        {/* Wizard card */}
        <div
          ref={wizardRef}
          className="overflow-hidden rounded-2xl border border-border bg-card shadow-xl shadow-black/10"
        >
          {/* Progress bar (hidden on success) */}
          {step <= TOTAL_STEPS && (
            <ProgressBar currentStep={step} stepTitle={currentTitle} />
          )}

          {/* Divider */}
          {step <= TOTAL_STEPS && (
            <div className="h-px bg-border/60 mx-6" aria-hidden />
          )}

          {/* Step content */}
          <div className="relative overflow-hidden">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={step}
                initial={{ opacity: 0, x: enterX }}
                animate={{ opacity: 1, x: 0, transition: { duration: TRANSITION_DURATION, ease: TRANSITION_EASE } }}
                exit={{ opacity: 0, x: exitX, transition: { duration: TRANSITION_DURATION * 0.65, ease: TRANSITION_EASE } }}
                className="p-6 sm:p-8"
              >
                {/* Step title heading */}
                {step <= TOTAL_STEPS && (
                  <h3 className="mb-5 text-lg font-bold text-foreground sm:text-xl">
                    {currentTitle}
                  </h3>
                )}

                {/* Step content */}
                {step === 1 && (
                  <StepName
                    formData={formData}
                    errors={errors}
                    onChange={handleChange as (f: keyof FormData, v: string) => void}
                    onBlur={handleBlur}
                  />
                )}
                {step === 2 && (
                  <StepCity
                    formData={formData}
                    errors={errors}
                    onChange={handleChange as (f: keyof FormData, v: string) => void}
                    onBlur={handleBlur}
                  />
                )}
                {step === 3 && (
                  <StepInterest
                    formData={formData}
                    errors={errors}
                    onToggle={handleToggleInterest}
                  />
                )}
                {step === 4 && (
                  <StepExperience
                    formData={formData}
                    errors={errors}
                    onChange={handleChange}
                  />
                )}
                {step === 5 && (
                  <StepContact
                    formData={formData}
                    errors={errors}
                    onChange={handleChange as (f: keyof FormData, v: string) => void}
                    onBlur={handleBlur}
                  />
                )}
                {step === 6 && (
                  <StepSummary
                    formData={formData}
                    submitting={submitting}
                    submitError={submitError}
                    onSubmit={handleSubmit}
                  />
                )}
                {step === 7 && <StepSuccess />}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation buttons (steps 1–5 only; step 6 has inline submit) */}
          {step >= 1 && step <= 5 && (
            <div
              className={[
                "flex items-center px-6 pb-6 sm:px-8 sm:pb-8",
                step === 1 ? "justify-end" : "justify-between",
              ].join(" ")}
            >
              {/* Back */}
              {step > 1 && (
                <motion.button
                  type="button"
                  onClick={goBack}
                  whileTap={{ scale: 0.97 }}
                  className={[
                    "flex items-center gap-1.5 rounded-xl border border-border px-5 py-2.5",
                    "min-h-[44px] text-sm font-medium text-foreground/70 transition-all duration-150",
                    "hover:border-[#0891B2]/50 hover:text-foreground active:scale-[0.97]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0891B2]",
                  ].join(" ")}
                >
                  {rtl ? (
                    <ChevronRight size={16} aria-hidden />
                  ) : (
                    <ChevronLeft size={16} aria-hidden />
                  )}
                  <span>{step - 1}</span>
                </motion.button>
              )}

              {/* Next */}
              <motion.button
                type="button"
                onClick={goNext}
                disabled={!valid}
                whileTap={valid ? { scale: 0.97 } : undefined}
                aria-label={`Step ${step + 1}`}
                className={[
                  "flex items-center gap-1.5 rounded-xl px-5 py-2.5",
                  "min-h-[44px] min-w-[44px] text-sm font-bold text-white transition-all duration-150",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0891B2] focus-visible:ring-offset-2",
                  "active:scale-[0.97]",
                  valid
                    ? "bg-[#0891B2] hover:bg-[#0e7490]"
                    : "cursor-not-allowed bg-[#0891B2]/40 text-white/60",
                ].join(" ")}
              >
                <span>{step + 1}</span>
                {rtl ? (
                  <ChevronLeft size={16} aria-hidden />
                ) : (
                  <ChevronRight size={16} aria-hidden />
                )}
              </motion.button>
            </div>
          )}

          {/* Back button on summary step */}
          {step === 6 && (
            <div className="px-6 pb-6 sm:px-8 sm:pb-8">
              <button
                type="button"
                onClick={goBack}
                aria-label={`Back to step ${step - 1}`}
                className={[
                  "flex items-center gap-1.5 rounded-xl border border-border px-5 py-2.5",
                  "min-h-[44px] min-w-[44px] text-sm font-medium text-foreground/70 transition-all duration-150",
                  "hover:border-[#0891B2]/50 hover:text-foreground active:scale-[0.97]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0891B2]",
                ].join(" ")}
              >
                {rtl ? (
                  <ChevronRight size={16} aria-hidden />
                ) : (
                  <ChevronLeft size={16} aria-hidden />
                )}
                <span>{step - 1}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
