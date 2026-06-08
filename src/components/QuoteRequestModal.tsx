import React, { useState, useEffect, useRef, useCallback } from "react";
import { X, Send, CheckCircle, AlertCircle, ChevronDown, Calendar, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { siteConfig } from "../config/site";
import { localeConfig } from "../config/locale";
import { cn } from "../lib/utils";

type FormData = {
  name: string;
  email: string;
  phone: string;
  serviceId: string;
  description: string;
  budgetRange: string;
  preferredDate: string;
};

type FormStatus = "idle" | "submitting" | "success" | "error";

const BUDGET_RANGES = [
  { value: "", label: "Seleccionar rango" },
  { value: "under-500", label: "< $500" },
  { value: "500-1000", label: "$500 - $1,000" },
  { value: "1000-3000", label: "$1,000 - $3,000" },
  { value: "3000-5000", label: "$3,000 - $5,000" },
  { value: "5000-10000", label: "$5,000 - $10,000" },
  { value: "over-10000", label: "$10,000+" },
  { value: "not-sure", label: localeConfig.lang === "he" ? "לא בטוח" : "Not sure yet" },
];

const INPUT_CLASS =
  "w-full rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-foreground outline-none transition-all duration-200 placeholder:text-muted-foreground/50 focus:border-accent focus:ring-2 focus:ring-accent/20";

const LABEL_CLASS = "mb-1.5 block text-xs font-medium text-foreground/70";

function validate(data: FormData): Partial<Record<keyof FormData, string>> {
  const errors: Partial<Record<keyof FormData, string>> = {};
  if (!data.name.trim()) errors.name = "Required";
  if (!data.email.trim()) errors.email = "Required";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.email = "Invalid email";
  if (!data.phone.trim()) errors.phone = "Required";
  if (!data.serviceId) errors.serviceId = "Required";
  if (!data.description.trim()) errors.description = "Required";
  return errors;
}

export function QuoteRequestModal({
  isOpen,
  onClose,
  preselectedServiceId,
}: {
  isOpen: boolean;
  onClose: () => void;
  preselectedServiceId?: string;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState<FormData>({
    name: "",
    email: "",
    phone: "",
    serviceId: preselectedServiceId || "",
    description: "",
    budgetRange: "",
    preferredDate: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [touched, setTouched] = useState<Set<keyof FormData>>(new Set());
  const [status, setStatus] = useState<FormStatus>("idle");

  useEffect(() => {
    if (preselectedServiceId) {
      setForm(prev => ({ ...prev, serviceId: preselectedServiceId }));
    }
  }, [preselectedServiceId]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === overlayRef.current) onClose();
    },
    [onClose],
  );

  function updateField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
    setTouched(prev => new Set(prev).add(key));
  }

  function handleBlur(key: keyof FormData) {
    setTouched(prev => new Set(prev).add(key));
    setErrors(validate(form));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate(form);
    setErrors(errs);
    setTouched(new Set(Object.keys(form) as (keyof FormData)[]));
    if (Object.keys(errs).length > 0) return;

    setStatus("submitting");
    try {
      const service = siteConfig.services.find(s => s.id === form.serviceId);
      const message = [
        `Service: ${service?.name || form.serviceId}`,
        form.budgetRange ? `Budget: ${BUDGET_RANGES.find(b => b.value === form.budgetRange)?.label || form.budgetRange}` : null,
        form.preferredDate ? `Preferred date: ${form.preferredDate}` : null,
        `\n${form.description}`,
      ].filter(Boolean).join("\n");

      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          subject: `Quote Request: ${service?.name || form.serviceId}`,
          message,
        }),
      });
      if (!res.ok) throw new Error("Failed to submit");

      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  function handleReset() {
    setForm({ name: "", email: "", phone: "", serviceId: "", description: "", budgetRange: "", preferredDate: "" });
    setErrors({});
    setTouched(new Set());
    setStatus("idle");
  }

  const services = siteConfig.services;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={overlayRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={handleOverlayClick}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-foreground">
                  {localeConfig.lang === "he" ? "בקשת הצעת מחיר" : "Request a Quote"}
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {localeConfig.lang === "he"
                    ? "מלאו את הפרטים ונחזור אליכם תוך 24 שעות"
                    : "Fill in the details and we'll get back within 24 hours"}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
              <AnimatePresence mode="wait">
                {status === "success" ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center py-10 text-center"
                  >
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10">
                      <CheckCircle size={28} className="text-green-500" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground">
                      {localeConfig.lang === "he" ? "הבקשה נשלחה!" : "Request Sent!"}
                    </h3>
                    <p className="mt-2 max-w-xs text-sm text-muted-foreground">
                      {localeConfig.lang === "he"
                        ? "נחזור אליכם עם הצעת מחיר מפורטת תוך 24 שעות."
                        : "We'll review your project and send a detailed quote within 24 hours."}
                    </p>
                    <button
                      type="button"
                      onClick={() => { handleReset(); onClose(); }}
                      className="mt-6 rounded-xl bg-accent px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent/90"
                    >
                      {localeConfig.lang === "he" ? "סגור" : "Close"}
                    </button>
                  </motion.div>
                ) : status === "error" ? (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center py-10 text-center"
                  >
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10">
                      <AlertCircle size={28} className="text-red-500" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground">
                      {localeConfig.lang === "he" ? "שגיאה" : "Something went wrong"}
                    </h3>
                    <p className="mt-2 max-w-xs text-sm text-muted-foreground">
                      {localeConfig.lang === "he"
                        ? "אנא נסו שנית או צרו קשר ישירות."
                        : "Please try again or contact us directly."}
                    </p>
                    <button
                      type="button"
                      onClick={() => setStatus("idle")}
                      className="mt-6 rounded-xl border border-border px-6 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                    >
                      {localeConfig.lang === "he" ? "נסה שנית" : "Try Again"}
                    </button>
                  </motion.div>
                ) : (
                  <motion.form
                    key="form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onSubmit={handleSubmit}
                    className="space-y-4"
                  >
                    {/* Name + Phone row */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className={LABEL_CLASS}>
                          {localeConfig.lang === "he" ? "שם מלא" : "Full Name"} *
                        </label>
                        <input
                          type="text"
                          value={form.name}
                          onChange={e => updateField("name", e.target.value)}
                          onBlur={() => handleBlur("name")}
                          placeholder={localeConfig.lang === "he" ? "השם שלך" : "Your name"}
                          className={cn(INPUT_CLASS, touched.has("name") && errors.name && "border-red-400 focus:border-red-400 focus:ring-red-400/20")}
                        />
                        {touched.has("name") && errors.name && (
                          <p className="mt-1 text-[11px] text-red-400">{errors.name}</p>
                        )}
                      </div>
                      <div>
                        <label className={LABEL_CLASS}>
                          {localeConfig.lang === "he" ? "טלפון" : "Phone"} *
                        </label>
                        <input
                          type="tel"
                          value={form.phone}
                          onChange={e => updateField("phone", e.target.value)}
                          onBlur={() => handleBlur("phone")}
                          placeholder="+972..."
                          className={cn(INPUT_CLASS, touched.has("phone") && errors.phone && "border-red-400 focus:border-red-400 focus:ring-red-400/20")}
                        />
                        {touched.has("phone") && errors.phone && (
                          <p className="mt-1 text-[11px] text-red-400">{errors.phone}</p>
                        )}
                      </div>
                    </div>

                    {/* Email */}
                    <div>
                      <label className={LABEL_CLASS}>
                        {localeConfig.lang === "he" ? "אימייל" : "Email"} *
                      </label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={e => updateField("email", e.target.value)}
                        onBlur={() => handleBlur("email")}
                        placeholder="you@example.com"
                        className={cn(INPUT_CLASS, touched.has("email") && errors.email && "border-red-400 focus:border-red-400 focus:ring-red-400/20")}
                      />
                      {touched.has("email") && errors.email && (
                        <p className="mt-1 text-[11px] text-red-400">{errors.email}</p>
                      )}
                    </div>

                    {/* Service select */}
                    <div>
                      <label className={LABEL_CLASS}>
                        {localeConfig.lang === "he" ? "שירות" : "Service"} *
                      </label>
                      <div className="relative">
                        <select
                          value={form.serviceId}
                          onChange={e => updateField("serviceId", e.target.value)}
                          onBlur={() => handleBlur("serviceId")}
                          className={cn(
                            INPUT_CLASS,
                            "appearance-none pr-10",
                            touched.has("serviceId") && errors.serviceId && "border-red-400 focus:border-red-400 focus:ring-red-400/20",
                          )}
                        >
                          <option value="">
                            {localeConfig.lang === "he" ? "בחרו שירות" : "Select a service"}
                          </option>
                          {services.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                        <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      </div>
                      {touched.has("serviceId") && errors.serviceId && (
                        <p className="mt-1 text-[11px] text-red-400">{errors.serviceId}</p>
                      )}
                    </div>

                    {/* Description */}
                    <div>
                      <label className={LABEL_CLASS}>
                        {localeConfig.lang === "he" ? "תיאור הפרויקט" : "Project Description"} *
                      </label>
                      <textarea
                        value={form.description}
                        onChange={e => updateField("description", e.target.value)}
                        onBlur={() => handleBlur("description")}
                        rows={3}
                        placeholder={
                          localeConfig.lang === "he"
                            ? "ספרו לנו על הפרויקט שלכם..."
                            : "Tell us about your project, rooms, surfaces, or any special requirements..."
                        }
                        className={cn(
                          INPUT_CLASS,
                          "resize-none",
                          touched.has("description") && errors.description && "border-red-400 focus:border-red-400 focus:ring-red-400/20",
                        )}
                      />
                      {touched.has("description") && errors.description && (
                        <p className="mt-1 text-[11px] text-red-400">{errors.description}</p>
                      )}
                    </div>

                    {/* Budget + Date row */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className={LABEL_CLASS}>
                          {localeConfig.lang === "he" ? "טווח תקציב" : "Budget Range"}
                        </label>
                        <div className="relative">
                          <select
                            value={form.budgetRange}
                            onChange={e => updateField("budgetRange", e.target.value)}
                            className={cn(INPUT_CLASS, "appearance-none pr-10")}
                          >
                            {BUDGET_RANGES.map(b => (
                              <option key={b.value} value={b.value}>{b.label}</option>
                            ))}
                          </select>
                          <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        </div>
                      </div>
                      <div>
                        <label className={LABEL_CLASS}>
                          <Calendar size={12} className="mr-1 inline" />
                          {localeConfig.lang === "he" ? "תאריך מועדף" : "Preferred Date"}
                        </label>
                        <input
                          type="date"
                          value={form.preferredDate}
                          onChange={e => updateField("preferredDate", e.target.value)}
                          min={new Date().toISOString().split("T")[0]}
                          className={INPUT_CLASS}
                        />
                      </div>
                    </div>

                    {/* Submit */}
                    <button
                      type="submit"
                      disabled={status === "submitting"}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3.5 text-sm font-bold text-white transition-all duration-200 hover:bg-accent/90 active:scale-[0.98] disabled:opacity-60"
                    >
                      {status === "submitting" ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          {localeConfig.lang === "he" ? "שולח..." : "Sending..."}
                        </>
                      ) : (
                        <>
                          <Send size={16} />
                          {localeConfig.lang === "he" ? "שלחו בקשה" : "Send Quote Request"}
                        </>
                      )}
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
