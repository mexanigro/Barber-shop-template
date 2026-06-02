import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Mail, Phone, MapPin, Clock, Send, Check,
  ExternalLink, Navigation,
} from "lucide-react";
import { siteConfig } from "../../../config/site";
import { localeConfig } from "../../../config/locale";

const EASE_OUT_EXPO: [number, number, number, number] = [0.23, 1, 0.32, 1];

type FormData = {
  name: string;
  email: string;
  phone: string;
  treatment: string;
  comments: string;
  timeSlot: string;
};

const INITIAL_FORM: FormData = {
  name: "",
  email: "",
  phone: "",
  treatment: "",
  comments: "",
  timeSlot: "",
};

const inputClasses =
  "w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm text-foreground " +
  "transition-[border-color,box-shadow] duration-200 min-h-[44px] " +
  "focus:border-accent focus:ring-1 focus:ring-accent/30 focus:outline-none " +
  "placeholder:text-muted-foreground";

const DAY_ORDER = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export function AuraContact() {
  const { sections, contact, hours, services } = siteConfig;
  const sectionConfig = sections.contact;

  const [formData, setFormData] = useState<FormData>(INITIAL_FORM);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${contact.address.street}, ${contact.address.district}, ${contact.address.cityStateZip}`,
  )}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("submitting");
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          subject: formData.treatment || "General inquiry",
          message: `Phone: ${formData.phone}\nTime slot: ${formData.timeSlot}\n\n${formData.comments}`,
        }),
      });
      if (response.ok) {
        setStatus("success");
        setTimeout(() => {
          setFormData(INITIAL_FORM);
          setStatus("idle");
        }, 5000);
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  const patch = (field: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setFormData((prev) => ({ ...prev, [field]: e.target.value }));

  return (
    <section
      id="contact"
      className="py-20 md:py-28 bg-background scroll-mt-6 border-b border-border/50"
    >
      <div className="container mx-auto px-6 max-w-7xl">

        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
          className="text-center space-y-3 max-w-2xl mx-auto mb-16"
        >
          <div className="inline-flex items-center justify-center space-x-1.5 text-xs font-semibold tracking-widest text-accent uppercase">
            <Mail size={14} />
            <span>{sectionConfig?.title}</span>
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl text-foreground leading-tight">
            {sectionConfig?.subtitle}
          </h2>
          <div className="h-0.5 w-12 bg-accent/60 mx-auto" />
          {"description" in (sectionConfig ?? {}) && (sectionConfig as { description?: string }).description && (
            <p className="text-sm text-muted-foreground">
              {(sectionConfig as { description?: string }).description}
            </p>
          )}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-start">

          {/* Form column */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
            className="lg:col-span-7 bg-card border border-border p-6 md:p-8 rounded-2xl shadow-sm"
          >
            <AnimatePresence mode="wait">
              {status !== "success" ? (
                <motion.form
                  key="form"
                  onSubmit={handleSubmit}
                  className="space-y-5"
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="space-y-1">
                    <h3 className="font-serif text-lg md:text-xl text-foreground">
                      {localeConfig.inquiry.placeholderMessage}
                    </h3>
                  </div>

                  <div className="space-y-4">
                    {/* Name */}
                    <div>
                      <label
                        htmlFor="aura-contact-name"
                        className="block text-[11px] font-bold text-foreground uppercase tracking-wider mb-1"
                      >
                        {localeConfig.inquiry.placeholderName} *
                      </label>
                      <input
                        id="aura-contact-name"
                        type="text"
                        required
                        value={formData.name}
                        onChange={patch("name")}
                        placeholder={localeConfig.inquiry.placeholderName}
                        className={inputClasses}
                      />
                    </div>

                    {/* Phone + email */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="aura-contact-phone"
                          className="block text-[11px] font-bold text-foreground uppercase tracking-wider mb-1"
                        >
                          {localeConfig.inquiry.phone} *
                        </label>
                        <input
                          id="aura-contact-phone"
                          type="tel"
                          required
                          value={formData.phone}
                          onChange={patch("phone")}
                          placeholder="+1 000 000 0000"
                          className={inputClasses}
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="aura-contact-email"
                          className="block text-[11px] font-bold text-foreground uppercase tracking-wider mb-1"
                        >
                          {localeConfig.inquiry.email} *
                        </label>
                        <input
                          id="aura-contact-email"
                          type="email"
                          required
                          value={formData.email}
                          onChange={patch("email")}
                          placeholder={localeConfig.inquiry.placeholderEmail}
                          className={inputClasses}
                        />
                      </div>
                    </div>

                    {/* Service select + time slot */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="aura-contact-treatment"
                          className="block text-[11px] font-bold text-foreground uppercase tracking-wider mb-1"
                        >
                          {localeConfig.inquiry.placeholderSubject}
                        </label>
                        <select
                          id="aura-contact-treatment"
                          value={formData.treatment}
                          onChange={patch("treatment")}
                          className={`${inputClasses} cursor-pointer`}
                        >
                          <option value="">—</option>
                          {services.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label
                          htmlFor="aura-contact-timeslot"
                          className="block text-[11px] font-bold text-foreground uppercase tracking-wider mb-1"
                        >
                          Preferred time
                        </label>
                        <select
                          id="aura-contact-timeslot"
                          value={formData.timeSlot}
                          onChange={patch("timeSlot")}
                          className={`${inputClasses} cursor-pointer`}
                        >
                          <option value="">Any time</option>
                          <option value="9-13">Morning (9:00 – 13:00)</option>
                          <option value="13-17">Midday (13:00 – 17:00)</option>
                          <option value="17-20">Afternoon (17:00 – 20:30)</option>
                        </select>
                      </div>
                    </div>

                    {/* Comments */}
                    <div>
                      <label
                        htmlFor="aura-contact-comments"
                        className="block text-[11px] font-bold text-foreground uppercase tracking-wider mb-1"
                      >
                        {localeConfig.inquiry.placeholderMessage}
                      </label>
                      <textarea
                        id="aura-contact-comments"
                        rows={3}
                        value={formData.comments}
                        onChange={patch("comments")}
                        placeholder={localeConfig.inquiry.placeholderMessage}
                        className={`${inputClasses} resize-none`}
                      />
                    </div>
                  </div>

                  {status === "error" && (
                    <p className="text-xs text-destructive">{localeConfig.inquiry.error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={status === "submitting"}
                    className="w-full bg-foreground border border-foreground py-3 rounded-xl text-xs font-semibold tracking-widest text-background shadow-sm cursor-pointer flex items-center justify-center space-x-2 min-h-[48px] active:scale-[0.97] transition-[transform,background-color] duration-200 disabled:opacity-75 disabled:pointer-events-none"
                    style={{ transitionTimingFunction: "cubic-bezier(0.23,1,0.32,1)" }}
                  >
                    {status === "submitting" ? (
                      <span className="flex items-center space-x-2">
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>{localeConfig.inquiry.send}...</span>
                      </span>
                    ) : (
                      <>
                        <Send size={13} />
                        <span>{localeConfig.inquiry.send.toUpperCase()}</span>
                      </>
                    )}
                  </button>
                </motion.form>
              ) : (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, ease: EASE_OUT_EXPO }}
                  className="py-12 text-center space-y-5"
                >
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent/15 text-accent">
                    <Check size={28} />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-serif text-2xl text-foreground leading-snug">
                      {localeConfig.inquiry.success}
                    </h3>
                    <p className="text-xs text-accent italic">
                      * {localeConfig.inquiry.email}: {formData.email}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Right info column */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, delay: 0.1, ease: EASE_OUT_EXPO }}
            className="lg:col-span-5 space-y-8"
          >
            {/* Hours */}
            <div className="bg-card rounded-2xl p-6 border border-border space-y-4">
              <h3 className="font-serif text-lg text-foreground flex items-center">
                <Clock size={16} className="text-accent mr-2 shrink-0" />
                {localeConfig.businessHours.eyebrow}
              </h3>

              <div className="space-y-2.5 text-xs">
                {DAY_ORDER.map((dayKey, i) => {
                  const slot = hours[dayKey];
                  const isLast = i === DAY_ORDER.length - 1;
                  return (
                    <div
                      key={dayKey}
                      className={`flex justify-between pb-1.5 ${!isLast ? "border-b border-border/50" : ""}`}
                    >
                      <span className="text-muted-foreground font-semibold uppercase">
                        {localeConfig.businessHours.days[dayKey].label}
                      </span>
                      {slot ? (
                        <span className="font-bold text-foreground">
                          {slot.start} – {slot.end}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/50 font-bold uppercase text-[10px] tracking-wider">
                          {localeConfig.businessHours.closed}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Contact links */}
            <div className="space-y-4">
              <h3 className="font-serif text-lg text-foreground flex items-center">
                <Navigation size={16} className="text-accent mr-2 shrink-0" />
                {localeConfig.location.address}
              </h3>

              <div className="space-y-3">
                <div className="flex items-start text-xs text-foreground">
                  <MapPin size={16} className="text-accent mr-3 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <span className="block truncate font-bold">{localeConfig.location.address}</span>
                    <span className="line-clamp-2">
                      {contact.address.street}, {contact.address.district},{" "}
                      {contact.address.cityStateZip}
                    </span>
                  </div>
                </div>

                <div className="flex items-start text-xs text-foreground">
                  <Phone size={16} className="text-accent mr-3 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <span className="block truncate font-bold">{localeConfig.location.phone}</span>
                    <a
                      href={`tel:${contact.phone}`}
                      className="truncate block transition-colors duration-200 hover:text-accent"
                    >
                      {contact.phone}
                    </a>
                  </div>
                </div>

                <div className="flex items-start text-xs text-foreground">
                  <Mail size={16} className="text-accent mr-3 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <span className="block truncate font-bold">{localeConfig.location.email}</span>
                    <a
                      href={`mailto:${contact.email}`}
                      className="truncate block transition-colors duration-200 hover:text-accent"
                    >
                      {contact.email}
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Google Maps link */}
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center space-x-2 bg-card border border-border rounded-2xl px-4 py-3 text-xs font-bold uppercase tracking-widest text-foreground hover:border-accent hover:text-accent transition-colors duration-200 min-h-[44px]"
            >
              <MapPin size={12} className="text-accent shrink-0" />
              <span>{localeConfig.location.openInMaps}</span>
              <ExternalLink size={11} />
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
