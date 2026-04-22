import React, { useState } from "react";
import { Send, CheckCircle, AlertCircle, Mail, Phone, Instagram, Twitter } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { localeConfig } from "../../config/locale";
import { siteConfig } from "../../config/site";

const inputClass =
  "w-full rounded-2xl border border-border bg-muted/50 px-4 py-3.5 text-sm text-foreground outline-none transition-all duration-300 placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 dark:bg-muted/30";

export function QuickInquiry() {
  const { sections, contact } = siteConfig;
  const { contact: sectionConfig } = sections;
  const [formData, setFormData] = useState({ name: "", email: "", subject: "", message: "" });
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("submitting");
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (response.ok) {
        setStatus("success");
        setFormData({ name: "", email: "", subject: "", message: "" });
        setTimeout(() => setStatus("idle"), 5000);
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  return (
    <section id="contact" className="bg-background px-6 py-28 transition-colors duration-300">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 gap-16 lg:grid-cols-2 lg:gap-24">

          {/* ── Left: info column ───────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="flex flex-col justify-center gap-10"
          >
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-accent-light">
                {sectionConfig.title}
              </p>
              <h2 className="mb-5 text-4xl font-black uppercase tracking-tighter text-foreground md:text-6xl">
                {sectionConfig.subtitle}
              </h2>
              <div className="h-px w-16 bg-gradient-to-r from-accent-light to-transparent" />
            </div>

            <p className="text-sm leading-relaxed text-muted-foreground">
              {sectionConfig.description}
            </p>

            {/* Contact details */}
            <div className="space-y-4">
              <a
                href={`tel:${contact.phone}`}
                className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-5 transition-all duration-300 hover:border-accent/30 hover:shadow-md"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-light/10 text-accent-light transition-colors group-hover:bg-accent-light/20">
                  <Phone size={18} />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    {localeConfig.inquiry.phone}
                  </p>
                  <p className="text-sm font-bold text-foreground">{contact.phone}</p>
                </div>
              </a>

              <a
                href={`mailto:${contact.email}`}
                className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-5 transition-all duration-300 hover:border-accent/30 hover:shadow-md"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-light/10 text-accent-light transition-colors group-hover:bg-accent-light/20">
                  <Mail size={18} />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    {localeConfig.inquiry.email}
                  </p>
                  <p className="text-sm font-bold text-foreground">{contact.email}</p>
                </div>
              </a>
            </div>

            {/* Social links */}
            {(contact.social?.instagram || contact.social?.twitter) && (
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {localeConfig.inquiry.followUs}
                </span>
                <div className="h-px flex-1 bg-border" />
                <div className="flex gap-2">
                  {contact.social?.instagram && (
                    <a
                      href={contact.social.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-all duration-300 hover:border-accent/30 hover:text-accent-light"
                    >
                      <Instagram size={15} />
                    </a>
                  )}
                  {contact.social?.twitter && (
                    <a
                      href={contact.social.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-all duration-300 hover:border-accent/30 hover:text-accent-light"
                    >
                      <Twitter size={15} />
                    </a>
                  )}
                </div>
              </div>
            )}
          </motion.div>

          {/* ── Right: form ─────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <form
              onSubmit={handleSubmit}
              className="space-y-4 rounded-3xl border border-border bg-card p-7 shadow-elevated transition-colors duration-300 sm:p-8"
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <input
                  required
                  type="text"
                  placeholder={localeConfig.inquiry.placeholderName}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={inputClass}
                />
                <input
                  required
                  type="email"
                  placeholder={localeConfig.inquiry.placeholderEmail}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={inputClass}
                />
              </div>
              <input
                type="text"
                placeholder={localeConfig.inquiry.placeholderSubject}
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className={inputClass}
              />
              <textarea
                required
                rows={5}
                placeholder={localeConfig.inquiry.placeholderMessage}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className={`${inputClass} resize-none`}
              />

              <button
                disabled={status === "submitting"}
                type="submit"
                className="group flex w-full items-center justify-center gap-2.5 rounded-2xl bg-primary py-4 text-sm font-bold text-primary-foreground shadow-md shadow-accent/20 transition-all duration-300 hover:bg-accent-light hover:text-zinc-950 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-accent/25 active:scale-95 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
              >
                {status === "submitting" ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                ) : (
                  <>
                    <Send size={16} className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    <span>{localeConfig.inquiry.send}</span>
                  </>
                )}
              </button>

              <AnimatePresence>
                {status === "success" && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="status-success flex items-center gap-3 rounded-2xl p-4 text-sm font-semibold"
                  >
                    <CheckCircle size={16} />
                    <span>{localeConfig.inquiry.success}</span>
                  </motion.div>
                )}
                {status === "error" && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="status-error flex items-center gap-3 rounded-2xl p-4 text-sm font-semibold"
                  >
                    <AlertCircle size={16} />
                    <span>{localeConfig.inquiry.error}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </form>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
