import React, { useState } from "react";
import { Send, CheckCircle, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { siteConfig } from "../../config/site";

/** Stripe-style fields — visual only */
const inputClass =
  "w-full rounded-2xl border border-border bg-muted/50 px-4 py-4 text-sm text-foreground outline-none transition-all duration-300 placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-muted/30";

export function QuickInquiry() {
  const { sections } = siteConfig;
  const { contact: sectionConfig } = sections;
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
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
    } catch (error) {
      console.error("Submission failed:", error);
      setStatus("error");
    }
  };

  return (
    <section id="contact" className="bg-background px-6 py-24 transition-colors duration-300">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.3em] text-accent-light">{sectionConfig.title}</h2>
          <h3 className="mb-6 text-4xl font-black uppercase tracking-tighter text-foreground md:text-5xl">{sectionConfig.subtitle}</h3>
          <p className="text-muted-foreground transition-colors duration-300">{sectionConfig.description}</p>
        </div>

        <div className="mx-auto max-w-xl">
          <form
            onSubmit={handleSubmit}
            className="space-y-4 rounded-3xl border border-border bg-card/95 p-6 shadow-elevated backdrop-blur-md transition-colors duration-300 sm:p-8 dark:bg-card/90"
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <input
                required
                type="text"
                placeholder="Full Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={inputClass}
              />
              <input
                required
                type="email"
                placeholder="Email Address"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={inputClass}
              />
            </div>
            <input
              type="text"
              placeholder="Subject (Optional)"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              className={inputClass}
            />
            <textarea
              required
              rows={4}
              placeholder="Your Message"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              className={`${inputClass} resize-none`}
            />

            <button
              disabled={status === "submitting"}
              type="submit"
              className="flex w-full items-center justify-center gap-3 rounded-2xl bg-primary p-5 font-black uppercase tracking-widest text-primary-foreground shadow-md transition-all duration-300 hover:bg-accent-light hover:text-zinc-950 disabled:cursor-not-allowed disabled:bg-secondary disabled:text-muted-foreground"
            >
              {status === "submitting" ? (
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
              ) : (
                <>
                  <Send size={20} />
                  <span>Send Message</span>
                </>
              )}
            </button>

            <AnimatePresence>
              {status === "success" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="status-success flex items-center gap-3 rounded-2xl p-4 text-sm font-bold"
                >
                  <CheckCircle size={18} />
                  <span>Message sent! We'll get back to you soon.</span>
                </motion.div>
              )}
              {status === "error" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="status-error flex items-center gap-3 rounded-2xl p-4 text-sm font-bold"
                >
                  <AlertCircle size={18} />
                  <span>Something went wrong. Please try again.</span>
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </div>
      </div>
    </section>
  );
}
